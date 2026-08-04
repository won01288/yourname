# -*- coding: utf-8 -*-
"""scripts/db/data/final_hanja.json의 영어 뜻풀이(meaning, Unihan 출처)에서 이름에 부적합한
부정적 의미 키워드를 스캔해 불용문자 후보 목록을 뽑는다.

find_negative_hun.py(hanjadic 한글 훈 스캔)와 같은 목적이지만 별도 소스를 본다: hanjadic의
hun은 원본 자체에 오탈자가 있을 수 있다(예: 朽=썩을 후가 hanjadic에는 "섞을 후"로 잘못
기재돼 있어 "썩을" 키워드 스캔에 안 걸림, 2026.8.3 확인). meaning은 Unihan 출처라 hun과
독립적이므로, hun 스캔에서 놓친 글자를 잡아내는 2차 안전망 역할을 한다.

이미 is_forbidden=true인 한자는 제외한다. 이 스크립트는 자동으로 DB나 nouse_hanja.csv를
바꾸지 않는다 - 사용자 검토용 후보 CSV(etc/negative_meaning_hanja_candidates.csv)만
생성한다. 검토 후 확정된 행만 수작업으로 etc/nouse_hanja.csv에 옮겨 붙이고 기존 파이프라인
(parse_nouse_hanja.py -> apply_nouse_hanja.py -> seed-hanja.js)을 재실행해 반영한다.

키워드 목록은 find_negative_hun.py의 한글 키워드 분류(죽음/질병/광기, 도둑/기만, 저주/욕설,
형벌/폭력, 추함/천함 등)와 같은 결로 대응시켜 사람이 작성한 것이며, 정부/학술 공인 목록이
아니다(3.4절과 동일한 한계) - 확신도(상/중/하)를 나눠 애매한 것은 사람이 걸러낼 수 있게 했다.
"""
import csv
import json
import re

FINAL_PATH = "scripts/db/data/final_hanja.json"
OUT_PATH = "etc/negative_meaning_hanja_candidates.csv"

# 확신도 "상": 문맥에 상관없이 이름에 쓰면 거의 항상 부적합한 의미.
HIGH_CONFIDENCE_KEYWORDS = [
    "die", "dead", "death", "kill", "corpse", "carcass",
    "disease", "sick", "illness", "plague", "leprosy",
    "insane", "crazy", "lunatic",
    "thief", "steal", "theft", "rob", "deceive", "deceit", "cheat", "fraud",
    "adultery", "adulterous", "lewd", "lascivious", "licentious", "fornication",
    "resent", "resentment", "hatred", "curse", "cursed", "scold", "rebuke",
    "reproach", "revile",
    "punish", "punishment", "penalty", "crime", "guilt", "calamity",
    "disaster", "ominous", "inauspicious", "evil", "wicked", "vicious",
    "cruel", "brutal", "savage", "ferocious", "malicious",
    "filthy", "vile", "servile", "slave", "bondsman", "menial",
    "imprison", "prison", "flog", "whip", "trample", "destroy", "demolish",
    "betray", "treachery", "slander", "defame", "libel", "torture", "torment",
    "oppress",
]

# 확신도 "중": 대체로 부정적이지만 이름 관행상 예외적으로 쓰이기도 하는 의미.
MEDIUM_CONFIDENCE_KEYWORDS = [
    "angry", "anger", "rage", "wrath", "sorrow", "grieve", "grief", "lament",
    "worry", "anxious", "anxiety",
    "foolish", "stupid", "fool", "idiot", "lazy", "indolent", "sloth",
    "quarrel", "dispute", "chaotic", "disorder", "confusion", "rebel", "riot",
    "turmoil",
    "collapse", "crumble", "shatter", "decline", "wither", "decay", "rotten",
    "rot",
    "arrogant", "haughty", "conceited", "greedy", "greed", "covet", "jealous",
    "envy", "envious",
    "afraid", "fearful", "dread", "timid", "cowardly", "coward",
    "vain", "futile", "worthless",
    "despise", "contempt", "mock", "ridicule", "scorn", "disdain",
    "hungry", "starve", "famine",
]

# 확신도 "하": 훈만 보면 걸리지만 문맥·다른 뜻이 있어 오탐 가능성이 큰 의미.
LOW_CONFIDENCE_KEYWORDS = [
    "poor", "poverty", "lonely", "solitary", "weak", "feeble", "lack",
    "stop", "cease", "block", "obstruct", "lose", "loss", "abandon",
    "discard", "depart", "scatter", "disperse",
]

# 신체 특징/장애 - 별도 분류(3.4·find_negative_hun.py와 동일 원칙).
DISABILITY_KEYWORDS = [
    "blind", "deaf", "dumb", "mute", "lame", "crippled", "hunchback",
    "paralyze", "paralysis",
]

KEYWORD_TIERS = [
    ("상", HIGH_CONFIDENCE_KEYWORDS),
    ("중", MEDIUM_CONFIDENCE_KEYWORDS),
    ("하", LOW_CONFIDENCE_KEYWORDS),
    ("별도(신체특징)", DISABILITY_KEYWORDS),
]

# 뜻풀이 안에서 부분 단어가 아니라 단어 경계 기준으로 매칭(예: "made" 안의 "mad" 오매칭 방지).
_WORD_RE_CACHE = {}


def _pattern(word: str) -> re.Pattern:
    if word not in _WORD_RE_CACHE:
        _WORD_RE_CACHE[word] = re.compile(r"\b" + re.escape(word) + r"\b", re.IGNORECASE)
    return _WORD_RE_CACHE[word]


def classify(meaning: str):
    """meaning 문자열에 매칭되는 키워드와 확신도 등급을 반환한다. 없으면 None."""
    for confidence, keywords in KEYWORD_TIERS:
        for kw in keywords:
            if _pattern(kw).search(meaning):
                return confidence, kw
    return None, None


def main():
    final_list = json.load(open(FINAL_PATH, encoding="utf-8"))

    rows = []
    skipped_already_forbidden = 0
    skipped_no_meaning = 0
    for entry in final_list:
        if entry.get("isForbidden"):
            skipped_already_forbidden += 1
            continue
        meaning = entry.get("meaning") or ""
        if not meaning:
            skipped_no_meaning += 1
            continue

        confidence, matched_kw = classify(meaning)
        if confidence is None:
            continue

        category = "신체특징(자동스캔-영문)" if confidence == "별도(신체특징)" else "뜻흉함(자동스캔-영문)"
        readings = entry.get("readings") or []
        rows.append({
            "hanja": entry["char"],
            "reading": "/".join(readings),
            "meaning_ko": meaning,
            "category": category,
            "confidence": confidence,
            "source_count": 0,
            "sources": "meaning(영문) 키워드 자동 스캔",
            "note": f"매칭 키워드: {matched_kw}",
        })

    order = {"상": 0, "중": 1, "하": 2, "별도(신체특징)": 3}
    rows.sort(key=lambda r: order[r["confidence"]])

    with open(OUT_PATH, "w", encoding="utf-8-sig", newline="") as f:
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
    print(f"meaning 값이 없어 건너뛴 글자: {skipped_no_meaning}자")
    print(
        f"신규 후보: {len(rows)}자 (상 {by_conf.get('상', 0)} / 중 {by_conf.get('중', 0)} / "
        f"하 {by_conf.get('하', 0)} / 별도-신체특징 {by_conf.get('별도(신체특징)', 0)})"
    )
    print(f"wrote {OUT_PATH}")


if __name__ == "__main__":
    main()
