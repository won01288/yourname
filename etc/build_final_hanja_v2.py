# -*- coding: utf-8 -*-
"""
인명용한자_전체표.docx(대법원 전자가족관계등록시스템 수집, 텍스트 기반 9,460자)를
1차 출처로 승격해 hanja 테이블 데이터를 다시 만든다.

보수적 원칙:
- 원획/필획/부수는 Unihan DB에서 결정적으로 계산되는 것만 신뢰한다. Unihan에 없는 글자는
  수리 계산에 쓸 수 없으므로 이번 적재에서 제외한다(추측하지 않는다).
- 새 표에 없지만 기존 OCR+Unihan 교차검증에서 확정했던 8자(교육용 기초한자)는
  근거가 이미 있으므로 유지한다.
- 불용문자 매칭은 기존과 동일하게 noname_1/2.docx 파싱 결과를 사용한다.
"""
import json

def main():
    full = json.load(open("ETC/full_hanja_table.json", encoding="utf-8"))
    unihan = json.load(open("ETC/unihan_data.json", encoding="utf-8"))
    forbidden_list = json.load(open("ETC/forbidden_hanja.json", encoding="utf-8"))
    forbidden = {e["char"]: e for e in forbidden_list}
    old_final = json.load(open("ETC/final_hanja.json", encoding="utf-8"))
    old_by_char = {e["char"]: e for e in old_final}

    full_chars = {e["char"] for e in full}
    # 새 표에 없지만 기존에 교육용 기초한자 근거로 확정했던 글자들 (그대로 유지)
    kept_exceptions = [e for e in old_final if e["char"] not in full_chars]
    print(f"새 표 미포함이지만 유지하는 글자: {len(kept_exceptions)}건 -> {[e['char'] for e in kept_exceptions]}")

    out = []
    skipped_no_unihan = []

    for e in full:
        ch = e["char"]
        u = unihan.get(ch)
        if u is None:
            skipped_no_unihan.append(ch)
            continue
        readings = e["readings"] if e["readings"] else [e["primaryReading"]]
        fb = forbidden.get(ch)
        out.append({
            "char": ch,
            "readings": readings,
            "strokeOriginal": u["strokeOriginal"],
            "strokeActual": u["strokeActual"],
            "radicalIndex": u["radicalIndex"],
            "meaning": u["definition"],
            "isNameAllowed": True,
            "isForbidden": fb is not None,
            "forbiddenReason": " / ".join(fb["reasons"]) if fb else None,
            "verificationStatus": "confirmed",
            "source": ["court_list_docx"],
        })

    for e in kept_exceptions:
        # 기존 항목 그대로 유지 (이미 Unihan 데이터가 있었던 것들)
        e = dict(e)
        e["source"] = e.get("source", []) + ["kept_exception"]
        out.append(e)

    print(f"Unihan 데이터 없어서 이번에 제외된 글자: {len(skipped_no_unihan)}건")
    with open("ETC/skipped_no_unihan.json", "w", encoding="utf-8") as f:
        json.dump(skipped_no_unihan, f, ensure_ascii=False, indent=1)

    out.sort(key=lambda x: x["char"])
    print(f"최종 적재 대상: {len(out)}건")

    with open("ETC/final_hanja_v2.json", "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print("wrote ETC/final_hanja_v2.json")


if __name__ == "__main__":
    main()
