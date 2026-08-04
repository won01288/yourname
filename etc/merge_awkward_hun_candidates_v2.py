# -*- coding: utf-8 -*-
"""find_awkward_hun.py 카테고리 확장(감각촉감·부식노화·거친자연현상·무기흉기·생리현상 5개
추가, 2026.8.4)으로 새로 나온 59자 후보를 사람이 검토(사용자+Claude 합의)한 결과를
etc/nouse_hanja.csv에 병합한다.

검토 결과: 18자는 한국어 동형이의어 때문에 스캐너가 잘못 잡은 오탐이라 제외했다.
- "쓸"(苦=쓰다/쓸다) vs "쓸"(짜다=매운맛과 무관): 用/書/庸/掃/埽/費 6자
- "짤"(짜다=squeeze/weave) vs "짤"(鹹=salty, 정답만 유지): 搾/絍/織 3자
- "창"(窓/窗=window) vs "창"(槍=spear, 정답 유지): 窓/窗 2자
- 屢(자주, "누차"의 그 글자 - 훈 데이터 자체가 "창"으로 잘못 매핑된 것으로 추정) 1자
- 策(정책 - 3.6.4/2026.8.3 라운드에서도 같은 이유로 이미 제외했던 흔한 글자) 1자
- 辛(사주 십간의 그 글자 - "매울/괴로울"은 부차 의미일 뿐 너무 근본적인 글자) 1자
- 枝/柯/條/戶(이전 라운드부터 반복 등장하는 "가지"/"지게" 동형이의어) 4자

나머지 41자(감각촉감 10·거친자연현상 10(霜 포함)·무기흉기 12·생리현상 3, 및 부식노화
6자는 이번 확장분 없음—이전 라운드에 이미 반영)는 사용자가 전부 제외에 동의했다.

이 스크립트는 1회성 병합용이라 재실행 시 이미 nouse_hanja.csv에 있는 한자는 건너뛴다
(멱등). 실행 후 기존 파이프라인(parse_nouse_hanja.py -> apply_nouse_hanja.py ->
seed-hanja.js)을 그대로 재실행해 DB에 반영한다.
"""
import csv

NOUSE_PATH = "etc/nouse_hanja.csv"
CANDIDATES_PATH = "etc/awkward_hun_hanja_candidates.csv"

EXCLUDE_CHARS = {
    "枝", "柯", "條", "戶",  # 이전 라운드부터 반복되는 "가지"/"지게" 동형이의어
    "用", "書", "庸", "掃", "埽", "費",  # "쓸"(쓰다/쓸다) - 매운맛 "쓸"과 무관
    "搾", "絍", "織",  # "짤"(짜다=squeeze/weave) - 짠맛 "짤"과 무관
    "窓", "窗",  # "창"(window) - 무기 "창"(spear)과 무관
    "屢",  # "자주"(frequently)가 본뜻, "창"은 데이터 오류로 추정
    "策",  # 정책/대책 등 상용어의 그 글자(2026.8.3 라운드와 동일 사유)
    "辛",  # 사주 십간(十干)에 쓰이는 근본적 글자, "매울/괴로울"은 부차 의미
}


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
            "sources": "hun 키워드 자동 스캔(어색함, 카테고리 확장) + 사람 검토(2026.8.4)",
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
