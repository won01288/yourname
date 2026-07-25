# -*- coding: utf-8 -*-
"""
인명용 한자표 PDF에서 표 구조(행=한글 독음, 열=허용 한자 이미지)를 추출한다.
한자/한글 글리프가 전부 이미지(raster)로 박혀 있어 텍스트 추출이 불가능하므로,
표의 벡터 罫線(경계선) 좌표로 행/열 구조를 정확히 잡고, 각 칸에 속한 이미지 bbox만 모은다.
문자 인식(OCR)은 이 스크립트가 하지 않는다 (ocr_tiles.py에서 별도 처리).
"""
import fitz
import json
import sys

PDF_PATH = "ETC/hanja.pdf"
OUT_PATH = "ETC/structure.json"


def get_table_top_bottom(drawings):
    """표 전체 폭에 걸친 수평선(상단/하단 외곽선 + 행 구분선)들의 y좌표 중
    최소/최대값 = 표의 top/bottom 외곽 경계."""
    full_width_ys = set()
    for d in drawings:
        r = d["rect"]
        if abs(r.y1 - r.y0) < 0.5 and (r.x1 - r.x0) > 600:
            full_width_ys.add(round((r.y0 + r.y1) / 2, 1))
    if not full_width_ys:
        return None, None, full_width_ys
    return min(full_width_ys), max(full_width_ys), full_width_ys


def get_col1_right_edge(drawings, table_top, table_bottom):
    """한글(독음) 열과 나머지 열을 가르는 세로선 x좌표를 구한다."""
    xs = []
    for d in drawings:
        r = d["rect"]
        if abs(r.x1 - r.x0) < 0.5 and (r.y1 - r.y0) > (table_bottom - table_top) * 0.5:
            # 표 전체 높이에 가까운 세로선
            xs.append(round((r.x0 + r.x1) / 2, 1))
    xs = sorted(set(xs))
    # 가장 왼쪽 두 세로선 = 표 왼쪽 끝, 한글|나머지 경계
    if len(xs) < 2:
        return None
    return xs[1]


def get_header_bottom(drawings, table_bottom, col1_right):
    """헤더와 실제 데이터 행의 경계 y좌표.
    '한글'|'교육용' 내부 구분선(col1_right)이 표 맨 아래까지 이어지는 구간의
    시작점을 헤더 하단으로 본다. 이 내부 구분선은 헤더 셀(병합)에는 그려지지 않고
    데이터 행이 시작되는 지점부터만 그려지기 때문에, 표 바깥 테두리(항상 맨 위부터
    이어짐)와 달리 정확한 헤더/데이터 경계가 된다."""
    candidates = []
    for d in drawings:
        r = d["rect"]
        if abs(r.x1 - r.x0) < 0.5 and abs(r.y1 - table_bottom) < 1.0 and abs(r.x0 - col1_right) < 2.0:
            candidates.append(r.y0)
    if not candidates:
        return None
    return min(candidates)


def get_row_bands(drawings, header_bottom, full_width_ys):
    """헤더 하단부터 표 하단까지, 폭 전체 수평선들로 행 경계를 구한다."""
    ys = sorted(y for y in full_width_ys if y > header_bottom - 0.5)
    if header_bottom not in ys:
        ys = sorted(set([header_bottom] + ys))
    if len(ys) < 2:
        return []
    return list(zip(ys[:-1], ys[1:]))


def extract_page(page, page_no):
    drawings = page.get_drawings()
    table_top, table_bottom, full_width_ys = get_table_top_bottom(drawings)
    if table_top is None:
        return []
    col1_right = get_col1_right_edge(drawings, table_top, table_bottom)
    if col1_right is None:
        return []
    header_bottom = get_header_bottom(drawings, table_bottom, col1_right)
    if header_bottom is None:
        return []
    row_bands = get_row_bands(drawings, header_bottom, full_width_ys)
    if not row_bands:
        return []

    images = page.get_images(full=True)
    items = []
    for img in images:
        xref = img[0]
        rects = page.get_image_rects(xref)
        for r in rects:
            items.append((xref, r))

    rows = []
    for y0, y1 in row_bands:
        heading = None
        allowed = []
        for xref, r in items:
            ycenter = (r.y0 + r.y1) / 2
            if not (y0 <= ycenter <= y1):
                continue
            xcenter = (r.x0 + r.x1) / 2
            bbox = [round(r.x0, 2), round(r.y0, 2), round(r.x1, 2), round(r.y1, 2)]
            if xcenter < col1_right:
                heading = {"xref": xref, "bbox": bbox}
            else:
                allowed.append({"xref": xref, "bbox": bbox})
        # 같은 위치(bbox)에 서로 다른 xref로 중복 삽입된 이미지 제거 (원본 PDF 아티팩트)
        deduped = []
        seen_bbox = []
        for it in allowed:
            b = it["bbox"]
            if any(abs(b[0] - sb[0]) < 1 and abs(b[1] - sb[1]) < 1 and abs(b[2] - sb[2]) < 1 and abs(b[3] - sb[3]) < 1 for sb in seen_bbox):
                continue
            seen_bbox.append(b)
            deduped.append(it)
        allowed = deduped
        # 읽기 순서(위->아래, 좌->우)로 정렬
        allowed.sort(key=lambda it: (round(it["bbox"][1] / 5), it["bbox"][0]))
        if heading is None and not allowed:
            # 부동소수점 반올림으로 생기는 폭 0에 가까운 가짜 행 (내용 없음)
            continue
        rows.append({
            "page": page_no,
            "y_band": [y0, y1],
            "heading": heading,
            "allowed": allowed,
        })
    return rows


def main():
    doc = fitz.open(PDF_PATH)
    all_rows = []
    for i in range(len(doc)):
        page = doc[i]
        rows = extract_page(page, i + 1)
        all_rows.extend(rows)
        print(f"page {i+1}: rows={len(rows)} total_allowed={sum(len(r['allowed']) for r in rows)}", file=sys.stderr)

    total_allowed = sum(len(r["allowed"]) for r in all_rows)
    missing_heading = sum(1 for r in all_rows if r["heading"] is None)
    print(f"TOTAL rows={len(all_rows)} allowed_glyphs={total_allowed} missing_heading={missing_heading}", file=sys.stderr)

    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(all_rows, f, ensure_ascii=False)
    print(f"wrote {OUT_PATH}", file=sys.stderr)


if __name__ == "__main__":
    main()
