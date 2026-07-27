# -*- coding: utf-8 -*-
"""etc/forbidden_hanja.json(nouse_hanja.csv 파싱 결과)의 불용문자 판정을
scripts/db/data/final_hanja.json(실제 seed-hanja.js가 읽는 파일)에 반영한다.

전체 필드를 build_final_hanja_v2.py로 재빌드해 덮어쓰지 않는 이유: final_hanja.json에는
Phase 6에서 별도로 추가된 isCommon(한자 친숙도) 필드가 있는데, build_final_hanja_v2.py는
이 필드를 모른 채로 파일을 새로 쓰므로 그대로 덮어쓰면 isCommon 데이터가 통째로 사라진다.
isForbidden/forbiddenReason 두 필드만 정확히 교체하고 나머지는 그대로 둔다.
"""
import json

FINAL_PATH = "scripts/db/data/final_hanja.json"
FORBIDDEN_PATH = "etc/forbidden_hanja.json"


def main():
    final = json.load(open(FINAL_PATH, encoding="utf-8"))
    forbidden_list = json.load(open(FORBIDDEN_PATH, encoding="utf-8"))
    forbidden = {e["char"]: e for e in forbidden_list}

    changed = 0
    now_forbidden = 0
    for e in final:
        fb = forbidden.get(e["char"])
        new_is_forbidden = fb is not None
        new_reason = " / ".join(fb["reasons"]) if fb else None
        if e.get("isForbidden") != new_is_forbidden or e.get("forbiddenReason") != new_reason:
            changed += 1
        e["isForbidden"] = new_is_forbidden
        e["forbiddenReason"] = new_reason
        if new_is_forbidden:
            now_forbidden += 1

    matched_chars = {e["char"] for e in final} & set(forbidden.keys())
    unmatched = set(forbidden.keys()) - matched_chars
    print(f"CSV 파싱 불용한자: {len(forbidden)}자")
    print(f"hanja DB(9,063자)에 없어 반영 못한 글자: {sorted(unmatched)}")
    print(f"최종 isForbidden=true: {now_forbidden}자")
    print(f"필드 값이 바뀐 항목 수: {changed}건")

    with open(FINAL_PATH, "w", encoding="utf-8") as f:
        json.dump(final, f, ensure_ascii=False, indent=1)
    print(f"wrote {FINAL_PATH}")


if __name__ == "__main__":
    main()
