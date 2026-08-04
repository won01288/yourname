# -*- coding: utf-8 -*-
"""hanja.hun(3.10, hanjadic 출처)에서 "나쁜 뜻"은 아니지만 이름 소재로 어색한 구체명사/
형용사(하찮은 동물·사소한 음식/채소·신체부위·생활용품·막연한 지리군사 용어·물성 형용사·
부식노화·거친 자연현상·무기흉기·생리현상)를 스캔해 후보 목록을 뽑는다(2026.8.4, 5개
카테고리 → 10개로 확장).

**동형이의어 주의**: 한국어 짧은 단어(쓸/짤/창 등)는 서로 무관한 여러 뜻을 동시에
가리키는 경우가 흔하다("쓸"=쓰다/쓸다 vs 쓰다(苦), "짤"=짜다(weave/press) vs 짜다(salty),
"창"=window vs spear). exact-match라도 이 경우는 걸러지지 않으므로, 매 확장 라운드마다
사람이 결과를 직접 훑어 확인해야 한다(merge_awkward_hun_candidates*.py의 EXCLUDE_CHARS
참고).

find_negative_hun.py/find_negative_meaning.py(뜻흉함)와는 다른 축이다 — "까마귀"·"매운
채소"처럼 부정적이라기보다 "이름 뜻으로 자연스러운가"가 애매한 구체명사를 잡아낸다.
용/거북/봉황/표범/호랑이/학처럼 이미 3.4에서 "불용 아님"으로 명시적으로 보호된 상서로운
동물/식물은 이 키워드 목록에 넣지 않는다(EXCLUDE_EXACT_HUN도 같은 취지로 둔다).

이미 is_forbidden=true인 한자는 제외한다. 이 스크립트는 자동으로 DB나 nouse_hanja.csv를
바꾸지 않는다 - 사용자 검토용 후보 CSV(etc/awkward_hun_hanja_candidates.csv)만 생성한다.
검토 후 확정된 행만 수작업으로 etc/nouse_hanja.csv에 옮겨 붙이고 기존 파이프라인
(parse_nouse_hanja.py -> apply_nouse_hanja.py -> seed-hanja.js)을 재실행해 반영한다.

카테고리 목록은 사람이 작성한 것이며, 정부/학술 공인 목록이 아니다(3.4절과 동일한 한계).
"""
import csv
import json

FINAL_PATH = "scripts/db/data/final_hanja.json"
HUN_PATH = "scripts/db/data/hanja_hun.json"
OUT_PATH = "etc/awkward_hun_hanja_candidates.csv"

# 하찮거나 부정적 이미지의 동물/곤충/파충류. 용/거북/봉황/표범/호랑이/학처럼 상서로운
# 동물은 넣지 않는다(3.4에서 이미 "불용 아님"으로 명시 보호).
ANIMAL_KEYWORDS = [
    "까마귀", "올빼미", "부엉이", "박쥐", "두더지", "지네", "거머리", "파리", "모기",
    "벼룩", "바퀴벌레", "구더기", "지렁이", "달팽이", "두꺼비", "여우", "이리", "늑대",
    "멧돼지", "오소리", "살쾡이", "쥐", "뱀", "독사", "전갈", "좀벌레", "빈대", "진드기",
    "메뚜기", "굼벵이", "구렁이", "살모사", "귀뚜라미", "송충이", "쐐기벌레",
]

# 사소한 채소/조미료/가공식품(구체적 먹거리). 매화/난초/국화/연꽃/소나무 같은 사군자·
# 길상식물은 넣지 않는다.
FOOD_KEYWORDS = [
    "매운 채소", "마늘", "부추", "생강", "고추", "무", "오이", "가지", "감자", "고구마",
    "된장", "간장", "고추장", "젓갈", "김치", "두부", "메주", "누룩", "지게미", "찌꺼기",
]

# 구체적 신체 부위(장애/신체특징과는 별개 - 그건 기존 DISABILITY_KEYWORDS가 담당).
BODY_PART_KEYWORDS = [
    "코", "귀", "배꼽", "겨드랑이", "팔꿈치", "발가락", "손톱", "발톱", "정강이", "종아리",
    "엉덩이", "무릎뼈", "복사뼈", "콧구멍", "턱뼈",
]

# 사소한 생활용품/도구.
HOUSEHOLD_KEYWORDS = [
    "냄비", "솥뚜껑", "빗자루", "걸레", "요강", "쟁반", "항아리", "바가지", "젓가락",
    "숟가락", "광주리", "멍석", "지게", "쟁기", "호미", "낫", "도끼", "절구공이",
]

# 막연한 지리/행정/군사 용어(구체적 장소/직책이라 이름 소재로 어색함).
GEO_ADMIN_KEYWORDS = [
    "변방", "국경", "진영", "보루", "초소", "역참", "수자리", "파수", "성곽", "울타리",
    "담장", "굴뚝", "뒷간", "측간", "무덤", "묘지", "화장실",
]

# 감각/촉감/성질 형용사(利=날카로울처럼 나쁜 뜻은 아니지만 물성 묘사라 이름 뜻으로 어색함).
SENSORY_ADJECTIVE_KEYWORDS = [
    "날카로울", "무딜", "딱딱할", "질길", "미끄러울", "끈적거릴", "비릴", "구릴",
    "떫을", "짤", "쓸", "시큼할", "매울", "미끈거릴", "거칠", "꺼끌거릴", "물컹할",
    "찐득거릴", "느끼할",
]

# 부식/노화/변질류(銹=동록처럼 산화·낡음 이미지).
DECAY_KEYWORDS = [
    "녹슬", "삭을", "곰팡이", "빛바랠", "낡을", "헐", "닳을", "곰팡이 슬",
    "곪을", "썩어 문드러질", "좀먹을",
]

# 거친 자연현상(서리·우박처럼 파괴적이거나 흉조로 여겨지는 기상 현상).
HARSH_WEATHER_KEYWORDS = [
    "서리", "우박", "가뭄", "장마", "홍수", "태풍", "벼락", "천둥", "폭풍", "폭우",
    "가물", "홍수질", "번개칠",
]

# 무기/흉기(구체적 살상 도구 - 이미 forbidden된 형벌/폭력 서술어와 별개로 사물 명사).
WEAPON_KEYWORDS = [
    "칼", "창", "몽둥이", "채찍", "곤봉", "쇠사슬", "방망이", "도끼날", "쇠몽둥이",
    "철퇴", "죽창",
]

# 생리현상/의성어(구체적이고 저속한 신체 소리·현상).
BODILY_NOISE_KEYWORDS = [
    "딸꾹질", "재채기", "트림", "방귀", "코골", "하품", "구역질", "딸꾹거릴",
]

CATEGORY_TIERS = [
    ("동물", ANIMAL_KEYWORDS),
    ("음식식물", FOOD_KEYWORDS),
    ("신체부위", BODY_PART_KEYWORDS),
    ("생활용품", HOUSEHOLD_KEYWORDS),
    ("지리행정", GEO_ADMIN_KEYWORDS),
    ("감각촉감", SENSORY_ADJECTIVE_KEYWORDS),
    ("부식노화", DECAY_KEYWORDS),
    ("거친자연현상", HARSH_WEATHER_KEYWORDS),
    ("무기흉기", WEAPON_KEYWORDS),
    ("생리현상", BODILY_NOISE_KEYWORDS),
]

# "무"(radish)가 "나무"·"무리"·"무늬"에, "가지"(eggplant)가 "나뭇가지"·"가지런할"에 걸리는
# 식으로 짧은 구체명사 키워드는 부분 문자열 대조 시 대량 오탐을 낸다(find_negative_hun.py의
# 키워드는 대부분 "~할" 형태 서술어라 이 문제가 덜했음). 그래서 이 스캐너는 부분 문자열이
# 아니라 hun 전체가 키워드와 "정확히 같을 때"만 매칭한다 — 수식어가 붙은 훈("무거울",
# "무당")은 애초에 대상이 아니다.
def classify(hun: str):
    for category, keywords in CATEGORY_TIERS:
        if hun in keywords:
            return category, hun
    return None, None


def main():
    final_list = json.load(open(FINAL_PATH, encoding="utf-8"))
    hun_list = json.load(open(HUN_PATH, encoding="utf-8"))
    hun_by_char = {e["char"]: e.get("hun") or "" for e in hun_list}

    rows = []
    skipped_already_forbidden = 0
    for entry in final_list:
        if entry.get("isForbidden"):
            skipped_already_forbidden += 1
            continue
        hun = hun_by_char.get(entry["char"], "")
        if not hun:
            continue

        category, matched_kw = classify(hun)
        if category is None:
            continue

        readings = entry.get("readings") or []
        rows.append({
            "hanja": entry["char"],
            "reading": "/".join(readings),
            "meaning_ko": hun,
            "category": f"이름뜻어색함-{category}(자동스캔)",
            "confidence": "검토필요",
            "source_count": 0,
            "sources": "hun 키워드 자동 스캔(어색함)",
            "note": f"매칭 키워드: {matched_kw}",
        })

    order = {c: i for i, (c, _) in enumerate(CATEGORY_TIERS)}
    rows.sort(key=lambda r: order[r["category"].split("-")[1].split("(")[0]])

    with open(OUT_PATH, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=["no", "hanja", "reading", "meaning_ko", "category",
                        "confidence", "source_count", "sources", "note"],
        )
        writer.writeheader()
        for i, row in enumerate(rows, start=1):
            writer.writerow({"no": i, **row})

    by_cat: dict[str, int] = {}
    for row in rows:
        by_cat[row["category"]] = by_cat.get(row["category"], 0) + 1

    print(f"이미 is_forbidden=true라 건너뛴 글자: {skipped_already_forbidden}자")
    print(f"신규 후보: {len(rows)}자")
    for cat, cnt in by_cat.items():
        print(f"  {cat}: {cnt}자")
    print(f"wrote {OUT_PATH}")


if __name__ == "__main__":
    main()
