# -*- coding: utf-8 -*-
"""
structure.json의 각 행(한글 독음 + 허용 한자 이미지 bbox들)을 실제 픽셀로 크롭해
여러 행을 한 장의 합성 이미지로 이어붙인 뒤 Tesseract OCR을 배치로 돌린다.
행 구분은 우리가 계산해 둔 y좌표 범위로만 판단한다 (OCR 마커 텍스트에 의존하지 않음).

정확도 검증: Tesseract는 희귀한 한자를 사전(dawg) 기반으로 흔한 글자로 잘못
"교정"하는 경우가 많다. 이를 잡아내기 위해 Unicode Unihan 데이터베이스의
kHangul(한자의 공인 한국어 독음) 필드와, 해당 행의 한글 독음(두음법칙 변형 포함)이
일치하는지 교차검증한다. 일치하면 신뢰, 불일치+저신뢰면 수동검토 대상으로 분리한다.
"""
import fitz
import json
import re
import subprocess
import sys
from PIL import Image

PDF_PATH = "ETC/hanja.pdf"
STRUCT_PATH = "ETC/structure.json"
UNIHAN_READINGS = "ETC/unihan/Unihan_Readings.txt"
TESSERACT = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
TESSDATA_DIR = r"C:\Users\LGPC~1\AppData\Local\Temp\claude\C--Users-LG-PC-Desktop-KINGYONG-yourname\987a3de5-f4f4-4320-8018-8e77fda9eae2\scratchpad\tessdata"

DPI = 450
SCALE = DPI / 72.0
PAD = 6
CROP_GAP = 24  # 한 행 안에서 크롭 이미지 사이 간격(px). 넉넉히 둬서 OCR이 서로 다른
               # 크롭의 글자를 하나로 합쳐 인식하지 않도록 한다.
ROW_GAP = 60
MAX_BATCH_HEIGHT_PX = 15000  # Leptonica 최대 이미지 크기 제한(32767) 회피용 여유값
CONF_THRESHOLD = 60.0

HANGUL_RE = re.compile(r"[가-힣]")
HANJA_RE = re.compile(r"[㐀-䶿一-鿿豈-﫿]")

CHO = list("ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ")
JUNG = list("ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ")
I_Y_VOWELS = {"ㅑ", "ㅒ", "ㅕ", "ㅖ", "ㅛ", "ㅠ", "ㅣ"}


def decompose(ch):
    code = ord(ch) - 0xAC00
    if not (0 <= code < 11172):
        return None
    cho = CHO[code // 588]
    jung = JUNG[(code % 588) // 28]
    return cho, jung


def dueum_alt(reading):
    """두음법칙: ㄴ/ㄹ 초성 한자가 다른 소리로도 쓰일 수 있는 경우 대체 독음을 준다.
    (가족관계등록규칙 별표 주1)"""
    if len(reading) != 1:
        return None
    d = decompose(reading)
    if d is None:
        return None
    cho, jung = d
    if cho == "ㄴ" and jung in I_Y_VOWELS:
        return "ㅇ" + reading[1:] if False else _replace_cho(reading, "ㅇ")
    if cho == "ㄹ":
        return _replace_cho(reading, "ㅇ" if jung in I_Y_VOWELS else "ㄴ")
    return None


def _replace_cho(ch, new_cho):
    code = ord(ch) - 0xAC00
    cho_i = code // 588
    rest = code % 588
    new_cho_i = CHO.index(new_cho)
    return chr(0xAC00 + new_cho_i * 588 + rest)


def load_khangul():
    """Unihan kHangul 필드에서 한자 -> 가능한 한국어 독음(초성만 비교할 필요없이 전체 음절) 목록."""
    table = {}
    with open(UNIHAN_READINGS, encoding="utf-8") as f:
        for line in f:
            if "\tkHangul\t" not in line:
                continue
            cp, _, value = line.rstrip("\n").split("\t")
            ch = chr(int(cp[2:], 16))
            readings = set()
            for tok in value.split():
                r = tok.split(":")[0]
                readings.add(r)
            table[ch] = readings
    return table


def render_pages(doc, page_nos):
    cache = {}
    for pno in page_nos:
        page = doc[pno - 1]
        pix = page.get_pixmap(dpi=DPI)
        img = Image.frombytes("RGB" if pix.n < 4 else "RGBA", (pix.width, pix.height), pix.samples)
        if img.mode != "RGB":
            img = img.convert("RGB")
        cache[pno] = img
    return cache


def crop_bbox(page_img, bbox):
    x0, y0, x1, y1 = bbox
    px0 = max(0, int(x0 * SCALE) - PAD)
    py0 = max(0, int(y0 * SCALE) - PAD)
    px1 = min(page_img.width, int(x1 * SCALE) + PAD)
    py1 = min(page_img.height, int(y1 * SCALE) + PAD)
    return page_img.crop((px0, py0, px1, py1))


def build_composite(rows, page_cache, mode):
    pieces = []
    max_w = 200
    row_ranges = []

    y_cursor = 10
    for row in rows:
        if mode == "heading":
            crops = [row["heading"]] if row["heading"] is not None else []
        else:
            crops = row["allowed"]

        if not crops:
            continue

        row_start = y_cursor
        for item in crops:
            img = crop_bbox(page_cache[row["page"]], item["bbox"])
            pieces.append((img, y_cursor))
            max_w = max(max_w, img.width + 20)
            y_cursor += img.height + CROP_GAP
        row_end = y_cursor
        row_ranges.append((row["idx"], row_start, row_end))
        y_cursor += ROW_GAP

    canvas = Image.new("RGB", (max_w + 40, y_cursor + 40), "white")
    for img, y in pieces:
        canvas.paste(img, (10, y))
    return canvas, row_ranges


def run_tesseract_tsv(img_path, lang):
    out_base = img_path + "_out"
    result = subprocess.run(
        [
            TESSERACT, img_path, out_base,
            "--tessdata-dir", TESSDATA_DIR, "-l", lang, "--psm", "6",
            "-c", "load_system_dawg=0", "-c", "load_freq_dawg=0",
            "-c", "language_model_penalty_non_dict_word=0",
            "tsv",
        ],
        capture_output=True, text=True,
    )
    if result.returncode != 0:
        print(result.stderr, file=sys.stderr)
        raise RuntimeError("tesseract failed")
    with open(out_base + ".tsv", encoding="utf-8") as f:
        lines = f.read().splitlines()
    words = []
    header = lines[0].split("\t")
    for line in lines[1:]:
        cols = line.split("\t")
        if len(cols) != len(header):
            continue
        rec = dict(zip(header, cols))
        text = rec.get("text", "").strip()
        if not text:
            continue
        top = int(rec["top"])
        height = int(rec["height"])
        try:
            conf = float(rec["conf"])
        except ValueError:
            conf = -1.0
        words.append((top + height / 2, text, conf))
    return words


def assign_to_rows(words, row_ranges, char_re):
    result = {idx: [] for idx, _, _ in row_ranges}
    for ycenter, text, conf in words:
        for idx, y0, y1 in row_ranges:
            if y0 - 5 <= ycenter <= y1 + 5:
                for ch in char_re.findall(text):
                    result[idx].append((ch, conf))
                break
    return result


def main():
    doc = fitz.open(PDF_PATH)
    rows = json.load(open(STRUCT_PATH, encoding="utf-8"))
    for i, r in enumerate(rows):
        r["idx"] = i

    only = None
    if len(sys.argv) > 1:
        only = int(sys.argv[1])
    target_rows = rows[:only] if only else rows

    khangul = load_khangul()
    print(f"kHangul entries: {len(khangul)}", file=sys.stderr)

    all_heading_result = {}
    all_allowed_result = {}

    def row_allowed_height(row):
        h = 0
        for item in row["allowed"]:
            b = item["bbox"]
            h += int((b[3] - b[1]) * SCALE) + 2 * PAD + CROP_GAP
        return h

    batches = []
    cur = []
    cur_h = 0
    for row in target_rows:
        rh = max(row_allowed_height(row), 40) + ROW_GAP
        if cur and cur_h + rh > MAX_BATCH_HEIGHT_PX:
            batches.append(cur)
            cur = []
            cur_h = 0
        cur.append(row)
        cur_h += rh
    if cur:
        batches.append(cur)
    print(f"총 {len(batches)}개 배치로 처리", file=sys.stderr)

    for bi, batch in enumerate(batches):
        b0 = bi
        page_nos = sorted(set(r["page"] for r in batch))
        page_cache = render_pages(doc, page_nos)

        head_img, head_ranges = build_composite(batch, page_cache, "heading")
        head_path = f"ETC/tmp_head_{b0}.png"
        head_img.save(head_path)
        head_words = run_tesseract_tsv(head_path, "kor")
        all_heading_result.update(assign_to_rows(head_words, head_ranges, HANGUL_RE))

        allow_img, allow_ranges = build_composite(batch, page_cache, "allowed")
        allow_path = f"ETC/tmp_allow_{b0}.png"
        allow_img.save(allow_path)
        allow_words = run_tesseract_tsv(allow_path, "chi_tra")
        all_allowed_result.update(assign_to_rows(allow_words, allow_ranges, HANJA_RE))

        print(f"batch {b0}~{b0+len(batch)} done", file=sys.stderr)

    out = []
    n_confirmed = 0
    n_unverified = 0
    n_flagged = 0
    for r in target_rows:
        heading_candidates = all_heading_result.get(r["idx"], [])
        heading = heading_candidates[0][0] if heading_candidates else None

        allowed_out = []
        for ch, conf in all_allowed_result.get(r["idx"], []):
            readings = khangul.get(ch)
            reading_ok = False
            if readings and heading:
                alt = dueum_alt(heading)
                reading_ok = heading in readings or (alt is not None and alt in readings)
            if reading_ok:
                status = "confirmed"
                n_confirmed += 1
            elif conf >= CONF_THRESHOLD:
                status = "unverified"
                n_unverified += 1
            else:
                status = "flagged"
                n_flagged += 1
            allowed_out.append({"char": ch, "conf": conf, "status": status})

        out.append({
            "idx": r["idx"],
            "page": r["page"],
            "heading": heading,
            "heading_candidates": heading_candidates,
            "allowed": allowed_out,
        })

    with open("ETC/ocr_result.json", "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print(f"wrote ETC/ocr_result.json  confirmed={n_confirmed} unverified={n_unverified} flagged={n_flagged}", file=sys.stderr)


if __name__ == "__main__":
    main()
