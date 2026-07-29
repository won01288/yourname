# -*- coding: utf-8 -*-
"""hanja_hun.json(hanjadic 출처, 7,046자 훈)의 훈(訓) 문자열에서 이름에 부적합한
부정적 의미 키워드를 스캔해 불용문자 후보 목록을 뽑는다.

이미 etc/nouse_hanja.csv(3곳 교차수집 89자)로 is_forbidden=true인 한자는 제외한다
(final_hanja.json 기준 중복 방지).

이 스크립트는 자동으로 DB나 nouse_hanja.csv를 바꾸지 않는다 - 사용자 검토용 후보
CSV(etc/negative_hun_hanja_candidates.csv)만 생성한다. 검토 후 확정된 행만 수작업으로
etc/nouse_hanja.csv에 옮겨 붙이고 기존 파이프라인(parse_nouse_hanja.py -> apply_nouse_hanja.py
-> seed-hanja.js)을 재실행해 반영한다.

키워드 목록은 etc/nouse_hanja.csv의 기존 category("뜻흉함" 등)와 같은 결로 사람이
작성한 것이며, 정부/학술 공인 목록이 아니다(3.4절과 동일한 한계) - 확신도(상/중/하)를
나눠 애매한 것은 사람이 걸러낼 수 있게 했다.
"""
import csv
import json

# 확신도 "상": 문맥에 상관없이 이름에 쓰면 거의 항상 부적합한 의미.
HIGH_CONFIDENCE_KEYWORDS = [
    "죽을", "죽일", "주검", "시체", "병들", "앓을", "미칠", "미친",
    "도둑", "도적", "속일", "훔칠", "거짓", "간사할", "간음할", "음란",
    "원망할", "미워할", "저주할", "욕할", "꾸짖을", "벌줄", "형벌",
    "더러울", "추할", "천할", "비루할", "노예", "머슴", "종(從)",
    "사나울", "흉악할", "잔인할", "해칠", "죄", "재앙", "흉할",
    # 2차 확장(2026.7.29): 형벌/폭력, 배신/모함, 불길함 계열 추가.
    "가둘", "때릴", "짓밟을", "부술", "깨뜨릴", "불태울",
    "배반할", "모함할", "비방할", "헐뜯을", "참소할",
    "학대할", "괴롭힐", "불길할", "흉조",
]

# 확신도 "중": 대체로 부정적이지만 이름 관행상 예외적으로 쓰이기도 하는 의미.
# "울"은 넣지 않는다 - "도울/아름다울/고울"처럼 ㅂ불규칙 형용사 어미(~울)에 전부
# 걸려 오탐이 압도적으로 많다("슬피 울"만 잡고 싶으면 "슬플"로 충분).
MEDIUM_CONFIDENCE_KEYWORDS = [
    "성낼", "화낼", "슬플", "한탄할", "탄식할", "근심", "걱정",
    "어리석을", "미련할", "게으를", "나태할", "다툴", "싸울", "어지러울",
    "어지럽힐", "번잡할", "무너질", "부서질", "썩을", "낮을", "쇠할",
    # 2차 확장: 교만/탐욕, 두려움/공포, 헛됨, 업신여김 계열 추가.
    "교만할", "거만할", "인색할", "탐할", "욕심낼", "시기할", "질투할",
    "두려울", "무서울", "겁낼", "헛될", "망령될",
    "업신여길", "비웃을", "조롱할", "낮잡을", "주릴",
]

# 부분 문자열 매칭이 우연히 걸리는 흔한 훈(예: "천천할"=서, 느릴/천천히 ->
# "천할" 키워드에 오탐). hun 전체가 이 목록과 정확히 같으면 매칭에서 제외한다.
EXCLUDE_EXACT_HUN = {
    "천천할",  # 徐 등 - "천할"(비루할)과 무관, "천천히"(느릴)의 뜻.
    "언약할",  # "약할"(나약함)과 무관, "약속하다"의 뜻.
    "기약할",  # 위와 동일.
    "염탐할",  # 俔/詗/諜 등 - "탐할"(탐욕)과 무관, "정탐하다"(spy)의 뜻.
    "연탐할",  # 위와 동일(같은 뜻의 이표기).
}

# 확신도 "하": 훈만 보면 걸리지만 문맥·다른 뜻이 있어 오탐 가능성이 큰 의미.
LOW_CONFIDENCE_KEYWORDS = [
    "가난할", "쓸쓸할", "외로울", "약할", "적을", "없을", "그칠", "막을",
    "잃을", "버릴", "떠날", "흩어질",
]

# 신체 특징/장애를 가리키는 훈 - "부정적 의미"라기보다 별도 성격의 민감한
# 범주라 뜻흉함과 같은 신뢰도 등급에 섞지 않고 분리해서 보여준다(포함 여부는
# 사용자가 별도로 판단).
DISABILITY_KEYWORDS = [
    "눈멀", "귀먹을", "벙어리", "절뚝거릴", "곱사등", "문둥병",
]

KEYWORD_TIERS = [
    ("상", HIGH_CONFIDENCE_KEYWORDS),
    ("중", MEDIUM_CONFIDENCE_KEYWORDS),
    ("하", LOW_CONFIDENCE_KEYWORDS),
    ("별도(신체특징)", DISABILITY_KEYWORDS),
]


def classify(hun: str):
    """hun 문자열에 매칭되는 키워드와 그 확신도 등급을 반환한다. 없으면 None."""
    for confidence, keywords in KEYWORD_TIERS:
        for kw in keywords:
            if kw in hun:
                return confidence, kw
    return None, None


def main():
    hun_list = json.load(open("scripts/db/data/hanja_hun.json", encoding="utf-8"))
    final_list = json.load(open("scripts/db/data/final_hanja.json", encoding="utf-8"))
    final_by_char = {e["char"]: e for e in final_list}

    rows = []
    skipped_already_forbidden = 0
    for entry in hun_list:
        ch = entry["char"]
        hun = entry.get("hun") or ""
        if not hun or hun in EXCLUDE_EXACT_HUN:
            continue
        final = final_by_char.get(ch)
        if final is None:
            continue
        if final.get("isForbidden"):
            skipped_already_forbidden += 1
            continue

        confidence, matched_kw = classify(hun)
        if confidence is None:
            continue

        note = f"매칭 키워드: {matched_kw}"
        if matched_kw == "미칠":
            # "미칠"은 '미치다(insane)'과 '미치다(reach/extend)' 두 뜻의 동형이의어라
            # 실제로는 "~에 미칠"(도달하다, 중립적) 의미인 경우가 절반 이상이다.
            note += " (주의: '이르다/도달하다' 뜻과 '미치광이' 뜻이 동형이의어라 오탐 가능성 높음)"

        category = "신체특징(자동스캔)" if confidence == "별도(신체특징)" else "뜻흉함(자동스캔)"
        readings = final.get("readings") or []
        rows.append({
            "hanja": ch,
            "reading": "/".join(readings),
            "meaning_ko": hun,
            "category": category,
            "confidence": confidence,
            "source_count": 0,
            "sources": "hun 키워드 자동 스캔",
            "note": note,
        })

    # 확신도 상 -> 중 -> 하 -> 별도(신체특징) 순으로 정렬해 사람이 위에서부터 검토하기 쉽게.
    order = {"상": 0, "중": 1, "하": 2, "별도(신체특징)": 3}
    rows.sort(key=lambda r: order[r["confidence"]])

    with open("etc/negative_hun_hanja_candidates.csv", "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=["no", "hanja", "reading", "meaning_ko", "category",
                        "confidence", "source_count", "sources", "note"],
        )
        writer.writeheader()
        for i, row in enumerate(rows, start=1):
            writer.writerow({"no": i, **row})

    by_conf = {}
    for row in rows:
        by_conf[row["confidence"]] = by_conf.get(row["confidence"], 0) + 1

    print(f"이미 is_forbidden=true라 건너뛴 글자: {skipped_already_forbidden}자")
    print(
        f"신규 후보: {len(rows)}자 (상 {by_conf.get('상', 0)} / 중 {by_conf.get('중', 0)} / "
        f"하 {by_conf.get('하', 0)} / 별도-신체특징 {by_conf.get('별도(신체특징)', 0)})"
    )
    print("wrote etc/negative_hun_hanja_candidates.csv")


if __name__ == "__main__":
    main()
