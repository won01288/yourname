# -*- coding: utf-8 -*-
"""
Unihan 데이터베이스에서 한자별 필획(kTotalStrokes)·부수(kRSUnicode)·자원오행 계산에
필요한 원획 보정치·영문 뜻풀이·한국어 독음을 추출한다.

원획(原劃) 계산 원리 (CLAUDE.md 3.2):
  부수를 그릴 때 흔히 쓰는 축약형(예: 氵,扌,忄,艹)이 아니라 원래 형태(水,手,心,艸)의
  획수로 센다. kRSUnicode 필드는 "부수번호.잔여획수" 형태인데, 잔여획수는 항상 "실제
  그려진 부수 형태"를 기준으로 계산되어 있다. 즉:
    실제_그려진_부수_획수 = kTotalStrokes - 잔여획수
  이 값을 그 부수의 "원래" 형태 획수(=kRSUnicode가 "번호.0"인 글자의 kTotalStrokes,
  즉 그 부수 자신의 획수)와 비교해 차이만큼 보정한다.
    원획 = kTotalStrokes + (원래_부수_획수 - 실제_그려진_부수_획수)
  이 방식은 사람이 개별 한자마다 "이 글자는 원획이 몇 획"이라고 추측하는 게 아니라,
  Unihan 데이터만으로 기계적으로 유도되는 규칙이라 환각 위험이 없다.
"""
import json
import re

UNIHAN_DIR = "ETC/unihan"

# 강희자전(康熙字典) 214부수의 표준 획수 (부수번호 1~214, 만국 공통 표준값).
# 부수 자신의 "원래(축약 전) 형태" 획수 판정에 쓴다. Unihan에는 축약형(예: 艹)도
# 별도 글자로 등록되어 있어 자동 판별이 모호하므로, 이 표준표로 교차검증한다.
_STANDARD_RADICAL_STROKES_BY_RANGE = [
    (1, 6, 1), (7, 29, 2), (30, 60, 3), (61, 94, 4), (95, 117, 5),
    (118, 146, 6), (147, 166, 7), (167, 175, 8), (176, 186, 9),
    (187, 194, 10), (195, 200, 11), (201, 204, 12), (205, 208, 13),
    (209, 210, 14), (211, 211, 15), (212, 213, 16), (214, 214, 17),
]


def standard_radical_strokes():
    table = {}
    for lo, hi, strokes in _STANDARD_RADICAL_STROKES_BY_RANGE:
        for i in range(lo, hi + 1):
            table[i] = strokes
    assert len(table) == 214
    return table


def read_field(filename, field_name):
    result = {}
    with open(f"{UNIHAN_DIR}/{filename}", encoding="utf-8") as f:
        for line in f:
            if f"\t{field_name}\t" not in line:
                continue
            parts = line.rstrip("\n").split("\t", 2)
            if len(parts) != 3:
                continue
            cp, field, val = parts
            if field != field_name:
                continue
            ch = chr(int(cp[2:], 16))
            result[ch] = val
    return result


def main():
    total_strokes = read_field("Unihan_IRGSources.txt", "kTotalStrokes")
    rs_unicode = read_field("Unihan_IRGSources.txt", "kRSUnicode")
    definitions = read_field("Unihan_Readings.txt", "kDefinition")
    khangul_raw = read_field("Unihan_Readings.txt", "kHangul")
    edu_flag = read_field("Unihan_OtherMappings.txt", "kKoreanEducationHanja")

    print(f"kTotalStrokes: {len(total_strokes)}, kRSUnicode: {len(rs_unicode)}")

    # 1) 부수번호 -> (원래 형태 글자, 원래 획수) : kRSUnicode가 "번호.0"인 글자 자신.
    # 주의: 부수번호.0(자기 자신이 부수)인 글자가 여러 개인 경우가 있다
    # (예: 140번=艸(6획)뿐 아니라 축약형 艹(3~4획)도 독립된 글자로 residual 0을 가짐,
    # 심지어 85번=水(4획) 옆에 잘 안 쓰이는 이체자 氺(5획)도 있어 "최댓값 채택"은 틀렸다).
    # 그래서 강희자전 표준 획수표(_STANDARD_RADICAL_STROKES_BY_RANGE)와 일치하는
    # 후보를 우선 채택하고, 없으면 최솟값(=가장 단순한/축약 안 된 표준형에 가까움)으로 대체.
    candidates = {}  # idx -> [(strokes, char), ...]
    for ch, rs in rs_unicode.items():
        m = re.match(r"^(\d+)\.0$", rs.split()[0])
        if not m:
            continue
        idx = int(m.group(1))
        ts = total_strokes.get(ch)
        if ts is None:
            continue
        candidates.setdefault(idx, []).append((int(ts), ch))

    standard = standard_radical_strokes()
    radical_canonical_strokes = {}
    radical_canonical_char = {}
    n_fallback = 0
    for idx in range(1, 215):
        lst = candidates.get(idx, [])
        match = [t for t in lst if t[0] == standard[idx]]
        if match:
            strokes, ch = match[0]
        elif lst:
            strokes, ch = min(lst, key=lambda t: t[0])
            n_fallback += 1
            print(f"[fallback] 부수{idx}: 표준({standard[idx]}획)과 일치하는 후보 없음, 최솟값 {strokes}획({ch}) 사용")
        else:
            strokes, ch = standard[idx], None
            n_fallback += 1
            print(f"[fallback] 부수{idx}: Unihan 후보 없음, 표준값 {strokes}획 그대로 사용")
        radical_canonical_strokes[idx] = strokes
        radical_canonical_char[idx] = ch

    print(f"부수 원형 확보: {len(radical_canonical_strokes)} / 214 (표준표 불일치로 대체된 항목 {n_fallback}개)")

    # 2) 각 한자의 원획 계산
    out = {}
    n_corrected = 0
    for ch, ts_str in total_strokes.items():
        ts = int(ts_str)
        rs = rs_unicode.get(ch)
        radical_idx = None
        residual = None
        stroke_original = ts
        if rs:
            first = rs.split()[0]
            m = re.match(r"^(\d+)'?\.(\d+)$", first)
            if m:
                radical_idx = int(m.group(1))
                residual = int(m.group(2))
                as_drawn = ts - residual
                canonical = radical_canonical_strokes.get(radical_idx)
                if canonical is not None:
                    correction = canonical - as_drawn
                    stroke_original = ts + correction
                    if correction != 0:
                        n_corrected += 1

        readings = []
        if ch in khangul_raw:
            for tok in khangul_raw[ch].split():
                r = tok.split(":")[0]
                if r not in readings:
                    readings.append(r)

        out[ch] = {
            "strokeActual": ts,
            "strokeOriginal": stroke_original,
            "radicalIndex": radical_idx,
            "definition": definitions.get(ch),
            "readings": readings,
            "isEduHanja": ch in edu_flag,
        }

    print(f"원획 보정 적용된 글자 수: {n_corrected}")
    print(f"총 처리 글자 수: {len(out)}")

    with open("ETC/unihan_data.json", "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False)
    print("wrote ETC/unihan_data.json")

    # 라디컬 원형 테이블도 별도 저장 (검수용 + 나중에 자원오행 배속표 만들 때 재사용)
    radical_table = {
        str(i): {"char": radical_canonical_char.get(i), "strokes": radical_canonical_strokes.get(i)}
        for i in range(1, 215)
    }
    with open("ETC/radical_table.json", "w", encoding="utf-8") as f:
        json.dump(radical_table, f, ensure_ascii=False, indent=1)
    print("wrote ETC/radical_table.json")


if __name__ == "__main__":
    main()
