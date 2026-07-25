# -*- coding: utf-8 -*-
"""인명용한자_전체표.docx (대법원 전자가족관계등록시스템에서 수집된 실제 텍스트, 9,460행)를 파싱한다.
실제 텍스트 표라 OCR이 필요 없고, 유니코드 코드포인트까지 명시되어 있어 글자 식별이 명확하다."""
import json
import docx

def main():
    d = docx.Document("ETC/인명용한자_전체표.docx")
    t = d.tables[0]
    header = [c.text.strip() for c in t.rows[0].cells]
    print("header:", header)

    out = []
    mismatch = 0
    for row in t.rows[1:]:
        cells = [c.text.strip() for c in row.cells]
        if len(cells) != 5:
            continue
        num, char, primary, uni, all_readings = cells
        # 유니코드 코드포인트로 실제 글자 검증 (표에 적힌 char와 코드포인트가 일치하는지)
        try:
            cp = int(uni.replace("U+", ""), 16)
            expected_char = chr(cp)
        except ValueError:
            expected_char = None
        if expected_char is not None and expected_char != char:
            mismatch += 1
        readings = [r.strip() for r in all_readings.split(",") if r.strip() and r.strip() != "미상"]
        out.append({
            "num": num,
            "char": char,
            "unicode": uni,
            "primaryReading": primary,
            "readings": readings,
        })

    print(f"파싱된 행: {len(out)}, 코드포인트-글자 불일치: {mismatch}")
    with open("ETC/full_hanja_table.json", "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print("wrote ETC/full_hanja_table.json")


if __name__ == "__main__":
    main()
