# -*- coding: utf-8 -*-
"""
OCR 교차검증 결과(confirmed) + Unihan 교육용 기초한자 플래그 매칭 결과를 합쳐
최종 인명용 한자 데이터셋을 만든다. (사용자 결정: 이번 Phase는 검증된 것만 적재)

각 한자에 대해:
- readings: 이 문서에서 실제로 확인된 독음(행의 한글 헤딩)만 모은다.
- strokeOriginal/strokeActual/radical/element/meaning: Unihan 파생 데이터(build_unihan_data.py) 사용.
- isForbidden/forbiddenReason: noname_1/2.docx 파싱 결과(forbidden_hanja.json)와 매칭.
"""
import json
import re

CHO = list("ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ")
JUNG = list("ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ")
I_Y_VOWELS = {"ㅑ", "ㅒ", "ㅕ", "ㅖ", "ㅛ", "ㅠ", "ㅣ"}


def decompose(ch):
    code = ord(ch) - 0xAC00
    if not (0 <= code < 11172):
        return None
    return CHO[code // 588], JUNG[(code % 588) // 28]


def _replace_cho(ch, new_cho):
    code = ord(ch) - 0xAC00
    rest = code % 588
    return chr(0xAC00 + CHO.index(new_cho) * 588 + rest)


def dueum_alt(reading):
    if len(reading) != 1:
        return None
    d = decompose(reading)
    if d is None:
        return None
    cho, jung = d
    if cho == "ㄴ" and jung in I_Y_VOWELS:
        return _replace_cho(reading, "ㅇ")
    if cho == "ㄹ":
        return _replace_cho(reading, "ㅇ" if jung in I_Y_VOWELS else "ㄴ")
    return None


def main():
    unihan = json.load(open("ETC/unihan_data.json", encoding="utf-8"))
    ocr_rows = json.load(open("ETC/ocr_result.json", encoding="utf-8"))
    forbidden_list = json.load(open("ETC/forbidden_hanja.json", encoding="utf-8"))
    forbidden = {e["char"]: e for e in forbidden_list}

    readings_set = set(r["heading"] for r in ocr_rows if r["heading"])

    entries = {}  # char -> {readings:set, source:set}

    # 1) OCR 교차검증 confirmed
    for r in ocr_rows:
        heading = r["heading"]
        if not heading:
            continue
        for a in r["allowed"]:
            if a["status"] != "confirmed":
                continue
            ch = a["char"]
            entries.setdefault(ch, {"readings": set(), "source": set()})
            entries[ch]["readings"].add(heading)
            entries[ch]["source"].add("ocr")

    # 2) Unihan 교육용 기초한자 플래그 + 독음 매칭
    edu_matched = 0
    for ch, v in unihan.items():
        if not v["isEduHanja"]:
            continue
        for rd in v["readings"]:
            matched_reading = None
            if rd in readings_set:
                matched_reading = rd
            else:
                alt = dueum_alt(rd)
                if alt and alt in readings_set:
                    matched_reading = alt
            if matched_reading:
                entries.setdefault(ch, {"readings": set(), "source": set()})
                entries[ch]["readings"].add(matched_reading)
                entries[ch]["source"].add("unihan_edu")
                edu_matched += 1

    print(f"총 확정 한자 수: {len(entries)} (edu 매칭 {edu_matched}건)")

    out = []
    missing_unihan = 0
    for ch, info in entries.items():
        u = unihan.get(ch)
        if u is None:
            missing_unihan += 1
            continue
        fb = forbidden.get(ch)
        out.append({
            "char": ch,
            "readings": sorted(info["readings"]),
            "strokeOriginal": u["strokeOriginal"],
            "strokeActual": u["strokeActual"],
            "radicalIndex": u["radicalIndex"],
            "meaning": u["definition"],
            "isNameAllowed": True,
            "isForbidden": fb is not None,
            "forbiddenReason": " / ".join(fb["reasons"]) if fb else None,
            "verificationStatus": "confirmed",
            "source": sorted(info["source"]),
        })

    print(f"Unihan 데이터 없어서 제외된 글자: {missing_unihan}")
    out.sort(key=lambda e: e["char"])

    with open("ETC/final_hanja.json", "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print(f"wrote ETC/final_hanja.json ({len(out)}건)")


if __name__ == "__main__":
    main()
