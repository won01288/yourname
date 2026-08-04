# -*- coding: utf-8 -*-
"""find_negative_meaning.py가 생성한 etc/negative_meaning_hanja_candidates.csv 중
확신도 상+중 264자를 사람이 한 글자씩 검토(2026.8.3)한 결과를 반영해
etc/nouse_hanja.csv에 병합한다.

검토 기준: Unihan meaning은 한 글자의 여러 뜻(때로는 서로 무관한 뜻)을 한 줄에 나열하므로,
부정적 낱말이 매칭되어도 그게 그 글자의 "주된/현대 한국어 상용" 의미가 아니면(예: 火=오행의
불, 爛=찬란하다의 그 글자, 凜=늠름하다의 그 글자, 踐=실천의 그 글자, 辯=변호사의 그 글자처럼
부정적 뜻이 부차적/고전적 용례일 뿐 실사용은 압도적으로 긍정/중립인 경우) 제외했다. 이 판단은
3.4절이 이미 인정하는 한계(사람이 작성한 큐레이션, 정부 공인 아님)와 같은 성격이다.

이 스크립트는 1회성 병합용이라 재실행 시 이미 nouse_hanja.csv에 있는 한자는 건너뛴다
(멱등). 실행 후 기존 파이프라인(parse_nouse_hanja.py -> apply_nouse_hanja.py ->
seed-hanja.js)을 그대로 재실행해 DB에 반영한다.
"""
import csv

NOUSE_PATH = "etc/nouse_hanja.csv"
CANDIDATES_PATH = "etc/negative_meaning_hanja_candidates.csv"

# 검토 후 제외 확정: 부정적 낱말이 매칭됐지만 그 글자의 주된/상용 의미는 중립·긍정적이라
# 이름에 부적합하다고 보기 어려운 경우 (2026.8.3 사람 검토).
EXCLUDE_CHARS = {
    # 상(High) 확신도 중 제외
    "消",  # "vanish, die out"는 관용구일 뿐, "die"(죽음) 자체를 뜻하지 않음.
    "策",  # 정책/대책 등 상용어의 그 글자. "채찍질하다"는 고전적 부차 의미.
    "骰",  # "die, dice" - 주사위. 죽음의 die와 무관한 동음이의 영단어 매칭.
    "說",  # 소설/설명 등 상용어의 그 글자. "꾸짖다"는 특정 훈(세)의 부차 의미.
    "飾",  # 장식/복식 등 상용어의 그 글자. "속이다"는 고전적 부차 의미(허식).
    "螭",  # 뿔 없는 전설의 용(이무기) 문양 한자. "잔인하다"는 무관한 훈 묶임으로 추정.
    "戩",  # 시경(詩經)에서 "福"(복)을 뜻하는 길자로도 쓰임. "멸하다"와 상반된 뜻이 병기됨.
    "跆",  # 태권도(跆拳道)의 그 글자. "밟다"가 무술의 맥락일 뿐 악의적 유린 의미 아님.
    "踏",  # 답사/답습 등 상용어의 그 글자.
    "踐",  # 실천(實踐)의 그 글자. "밟다"가 압도적으로 긍정/중립 상용의미(이행하다)로 쓰임.
    "禫",  # 담제(禫祭, 삼년상 탈상 의례)를 가리키는 전문 제례 용어. 흉함이 아니라 의례 명칭.
    "賣",  # 매매/판매 등 상용어의 그 글자. "배반하다"는 매국(賣國) 같은 특정 복합어의 뜻.
    "背",  # 배경/배후 등 상용어의 그 글자(신체의 "등"). "배신하다"는 특정 복합어의 뜻.
    "諝",  # "지혜, 분별력"이 주된 뜻으로 병기됨. "간교함"은 부차적.
    "頡",  # "날아오르다, 비상하다"가 주된 뜻으로 병기됨. "빼앗다"는 부차적.
    "黑",  # 흑백/흑인 등 색채를 가리키는 극히 일반적인 글자. "사악함"은 시적 부차 의미.
    # 중(Medium) 확신도 중 제외
    "却", "卻",  # 각하(却下)의 그 글자. "declining/retreating"는 사양·후퇴일 뿐 도덕적 흉함 아님.
    "昃", "暎",  # 해가 기우는 것을 가리키는 시적 표현("decline"은 태양의 위치 변화일 뿐).
    "謝",  # 감사/사례 등 상용어의 그 글자. "사양하다"는 부차 의미.
    "訟",  # 소송(訴訟)의 그 글자 - 현대 법률 전문용어일 뿐 그 자체로 흉하다 보기 어려움.
    "辯",  # 변호사/웅변 등 상용어의 그 글자.
    "虛",  # 겸허/허심 등 철학적으로 긍정적 맥락에도 쓰이는 글자. "무가치함"은 부차 의미.
    "醋",  # 식초(食醋)의 그 글자. "질투"는 중국어 관용구(吃醋)에서 빌려온 부차 의미.
    "羡", "羨",  # 선망(羨望)의 그 글자 - 현대 한국어에서 "동경/부러움"으로 대체로 긍정적.
    "變",  # 변화/변신 등 상용어의 그 글자. "반역"은 고전적 부차 의미(사변).
    "慮",  # 사려(思慮)깊다처럼 "숙고하다"가 주된 뜻 - 오히려 칭찬에 가까운 표현.
    "怦",  # "eager, ardent"(열정적인)가 주된 뜻으로 병기됨. "불안"은 부차적.
    "慇",  # "careful, attentive"(세심함, 정성)가 주된 뜻으로 병기됨.
    "凜",  # 늠름하다(凜凜)의 그 글자 - 씩씩하고 당당함을 뜻하는 대표적 칭찬 표현.
    "爛",  # 찬란하다(燦爛)의 그 글자 - "눈부시게 빛남"을 뜻하는 대표적 긍정 표현.
    "芚",  # "새싹"(green sprout)이 주된 뜻으로 병기됨 - 새로 돋는 싹의 긍정적 이미지.
    "閔",  # 실제 성씨(閔氏)로 쓰이는 한자. "애도하다"는 부차 의미.
    "霽",  # "비 갠 뒤 맑음"이 주된 뜻 - 제월광풍(霽月光風)처럼 인품을 기리는 긍정적 관용구에 쓰임.
    "火",  # 오행(五行)의 불(火) 그 자체. "분노"는 화나다 등 관용구의 은유일 뿐 글자 본뜻 아님.
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
        if row["confidence"] not in ("상", "중"):
            continue
        ch = row["hanja"]
        if ch in EXCLUDE_CHARS:
            skipped_excluded += 1
            continue
        if ch in existing_chars:
            skipped_duplicate += 1
            continue
        matched_kw = row["note"].replace("매칭 키워드: ", "").strip()
        added.append({
            "no": next_no,
            "hanja": ch,
            "reading": row["reading"],
            "meaning_ko": matched_kw,
            "category": "뜻흉함(자동스캔-영문)",
            "confidence": row["confidence"],
            "source_count": 0,
            "sources": "meaning(영문) 키워드 자동 스캔 + 사람 검토(2026.8.3)",
            # parse_nouse_hanja.py가 note를 reasons에 넣을 때 자체적으로 "참고: " 접두사를
            # 붙이므로(reasons.append(f"참고: {note}")) 여기서는 접두사 없이 원문만 둔다.
            "note": row["meaning_ko"],
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
    print(f"제외 목록(EXCLUDE_CHARS)에 걸려 건너뜀: {skipped_excluded}자")
    print(f"이미 존재해 건너뜀(중복): {skipped_duplicate}자")
    print(f"신규 추가: {len(added)}자")
    print(f"최종 nouse_hanja.csv 행 수: {len(existing_rows) + len(added)}자")


if __name__ == "__main__":
    main()
