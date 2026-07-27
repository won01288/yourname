# -*- coding: utf-8 -*-
"""nouse_hanja.csv(사용자 제공, 작명 실무 사이트 3곳 교차수집 불용문자 자료)를 파싱해
build_final_hanja_v2.py가 읽는 forbidden_hanja.json(기존 noname_1/2.docx 파싱 결과와 동일한
{char, reading, reasons} 형태)을 만든다.

CSV 컬럼: no,hanja,reading,meaning_ko,category,confidence,source_count,sources,note

- hanja 컬럼이 "姦/奸"처럼 "/"로 여러 한자를 묶어 표기한 행은 각 글자로 나눠 개별 항목을 만든다.
  (동일 reading/meaning_ko/category/note를 그대로 공유 — 글자별로 다시 판단하지 않음)
- confidence == "제외권장"인 행(예: 龍/龜/鳳/豹/虎/鶴 — 원 자료가 "불용문자 아님"이라고
  명시)은 불용문자 목록에서 제외한다.
- note(불확실성 경고 등)가 있으면 사유 목록에 "참고: ..."로 남겨, 불용 여부 판단 자체는
  바꾸지 않되 나중에 재검토할 수 있게 한다.
"""
import csv
import json

HANJA_RE_SPLIT = "/"


def main():
    entries = []
    excluded = []
    with open("etc/nouse_hanja.csv", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            hanja_field = (row.get("hanja") or "").strip()
            if not hanja_field:
                continue
            reading = (row.get("reading") or "").strip()
            meaning_ko = (row.get("meaning_ko") or "").strip()
            category = (row.get("category") or "").strip()
            confidence = (row.get("confidence") or "").strip()
            note = (row.get("note") or "").strip()

            chars = [c for c in hanja_field.split(HANJA_RE_SPLIT) if c]

            if confidence == "제외권장" or "불용아님" in category:
                excluded.extend(chars)
                continue

            reasons = [f"{category}: {meaning_ko}" if category else meaning_ko]
            if note:
                reasons.append(f"참고: {note}")

            for ch in chars:
                entries.append({
                    "char": ch,
                    "reading": reading,
                    "reasons": reasons,
                })

    print(f"파싱된 불용한자: {len(entries)}자")
    print(f"제외된(불용 아님으로 명시된) 글자: {excluded}")

    with open("etc/forbidden_hanja.json", "w", encoding="utf-8") as f:
        json.dump(entries, f, ensure_ascii=False, indent=1)
    print("wrote etc/forbidden_hanja.json")


if __name__ == "__main__":
    main()
