# -*- coding: utf-8 -*-
"""find_awkward_hun.py가 생성한 etc/awkward_hun_hanja_candidates.csv(92자)를 사람이 검토
(2026.8.3, 사용자+Claude 합의)한 결과를 반영해 etc/nouse_hanja.csv에 병합한다.

검토 결과: 92자 중 4자(枝/柯/條/戶)는 스캐너 설계상의 동형이의어 오탐이라 제외했다 -
"가지"라는 훈 문자열이 한국어에서 "채소(茄, 가지)"와 "나뭇가지(枝/柯/條)" 두 뜻을 모두
가리켜 부수가 木(나무)인 세 글자가 채소류로 잘못 분류됐고, "지게"도 戶(집 호)의 "문"이라는
옛뜻과 사물 "지게(A자형 운반틀)"가 동음이의라 잘못 걸렸다. 나머지 88자(동물29·음식식물14·
신체부위8·생활용품23·지리행정14, 城/郭 포함)는 사용자가 전부 제외에 동의했다.

이 스크립트는 1회성 병합용이라 재실행 시 이미 nouse_hanja.csv에 있는 한자는 건너뛴다
(멱등). 실행 후 기존 파이프라인(parse_nouse_hanja.py -> apply_nouse_hanja.py ->
seed-hanja.js)을 그대로 재실행해 DB에 반영한다.
"""
import csv

NOUSE_PATH = "etc/nouse_hanja.csv"
CANDIDATES_PATH = "etc/awkward_hun_hanja_candidates.csv"

# 스캐너 키워드가 동형이의어("가지"=채소/나뭇가지, "지게"=문/운반틀)를 구분 못해 잘못 잡은
# 글자. 부수가 木(나무)인 枝/柯/條는 "나뭇가지" 뜻이고, 戶는 "문/집" 뜻이 주된 의미다.
EXCLUDE_CHARS = {"枝", "柯", "條", "戶"}


def main():
    with open(NOUSE_PATH, encoding="utf-8-sig") as f:
        existing_rows = list(csv.DictReader(f))
    existing_chars = {r["hanja"] for r in existing_rows}
    next_no = max(int(r["no"]) for r in existing_rows) + 1

    with open(CANDIDATES_PATH, encoding="utf-8-sig") as f:
        candidates = list(csv.DictReader(f))

    added = []
    skipped_excluded = 0
    skipped_duplicate = 0
    for row in candidates:
        ch = row["hanja"]
        if ch in EXCLUDE_CHARS:
            skipped_excluded += 1
            continue
        if ch in existing_chars:
            skipped_duplicate += 1
            continue
        added.append({
            "no": next_no,
            "hanja": ch,
            "reading": row["reading"],
            "meaning_ko": row["meaning_ko"],
            "category": row["category"],
            "confidence": "중",
            "source_count": 0,
            "sources": "hun 키워드 자동 스캔(어색함) + 사람 검토(2026.8.3)",
            "note": f"매칭 키워드: {row['meaning_ko']}",
        })
        existing_chars.add(ch)
        next_no += 1

    with open(NOUSE_PATH, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=["no", "hanja", "reading", "meaning_ko", "category",
                        "confidence", "source_count", "sources", "note"],
        )
        writer.writeheader()
        for row in existing_rows:
            writer.writerow(row)
        for row in added:
            writer.writerow(row)

    print(f"기존 행: {len(existing_rows)}자")
    print(f"동형이의어 오탐으로 제외: {skipped_excluded}자")
    print(f"이미 존재해 건너뜀(중복): {skipped_duplicate}자")
    print(f"신규 추가: {len(added)}자")
    print(f"최종 nouse_hanja.csv 행 수: {len(existing_rows) + len(added)}자")


if __name__ == "__main__":
    main()
