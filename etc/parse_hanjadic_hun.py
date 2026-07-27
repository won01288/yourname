# CLAUDE.md 3.10/4.1 — hanjadic(happycgi.com 배포판) 원본을 재정리한
# NeoMindStd/HanjaDB(MIT, https://github.com/NeoMindStd/HanjaDB) 프로젝트의 원본 리소스
# (etc/hanjadic_raw.txt, 위 저장소 input/resource를 그대로 받아온 것)를 파싱해
# {char, hun, eum} 목록을 만든다.
#
# 위키낱말사전(1800자, 정부 공인 목록)보다 훨씬 넓은 범위를 커버하지만, hanjadic 자체는
# 정부 공인 자료가 아니라 오래된 커뮤니티 편찬 한자사전이다 — CLAUDE.md 4.1/6장에 이 출처
# 차이를 명시해뒀다. "전부 교체" 결정(2026.7.27)에 따라 기존 위키낱말사전 기반 값도 이
# 스크립트 결과로 덮어쓴다(교차검증 가능한 한자에 한해).
#
# 원본 형식 예:
#   [가]
#   佳=아름다울 가, good, auspicious; beautiful; delightful (8)
#   仮=假의 略字, falsehood, deception; vacation (6)   -> 훈/음이 아니라 이체자 설명이라 스킵
#   嘏=, felicity, prosperity; large and strong (14)   -> 훈 없음, 스킵
#
# 한 글자가 여러 음(여러 절)으로 등재될 수 있어, 우리 DB(final_hanja.json)의 공식 인명용
# readings 배열과 매칭되는 음의 훈만 채택한다(순서상 첫 번째 공식 음 우선) — 근거 없이
# 임의의 훈/음을 고르지 않는다(CLAUDE.md 2.1 환각 금지).
#
# 재현: python etc/parse_hanjadic_hun.py  ->  scripts/db/data/hanja_hun.json

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW_PATH = ROOT / "etc" / "hanjadic_raw.txt"
FINAL_HANJA_PATH = ROOT / "scripts" / "db" / "data" / "final_hanja.json"
OUT_PATH = ROOT / "scripts" / "db" / "data" / "hanja_hun.json"

LINE_RE = re.compile(r"^(\S)=(.*)$")
HANGUL_ONLY_RE = re.compile(r"^[가-힣\s]+$")
HANGUL_SYLLABLE_RE = re.compile(r"^[가-힣]$")


def parse_line(rest: str) -> list[tuple[str, str]]:
    # rest: "=" 뒤쪽 전체. 맨 끝 "(획수)"를 뗀 뒤, 콤마로 나눠 순수 한글 구간만 모은다.
    last_paren = rest.rfind("(")
    if last_paren == -1:
        return []
    body = rest[:last_paren]

    pairs = []
    for segment in body.split(","):
        segment = segment.strip()
        if not segment or not HANGUL_ONLY_RE.match(segment):
            break  # 한자/영문이 섞인 구간을 만나면 그 뒤는 영어 뜻풀이 — 중단
        tokens = segment.split()
        if len(tokens) < 2:
            continue
        eum = tokens[-1]
        hun = " ".join(tokens[:-1])
        if not HANGUL_SYLLABLE_RE.match(eum):
            continue
        pairs.append((hun, eum))
    return pairs


def main():
    raw = RAW_PATH.read_text(encoding="utf-8")

    # char -> [(hun, eum), ...] (등장 순서 보존)
    by_char: dict[str, list[tuple[str, str]]] = {}
    for line in raw.splitlines():
        line = line.strip()
        if not line or line.startswith("["):
            continue
        m = LINE_RE.match(line)
        if not m:
            continue
        char, rest = m.group(1), m.group(2)
        pairs = parse_line(rest)
        if pairs:
            by_char.setdefault(char, []).extend(pairs)

    final_hanja = json.loads(FINAL_HANJA_PATH.read_text(encoding="utf-8"))

    results = []
    for entry in final_hanja:
        char = entry["char"]
        candidates = by_char.get(char)
        if not candidates:
            continue

        readings = entry.get("readings") or []
        chosen = None
        for reading in readings:
            for hun, eum in candidates:
                if eum == reading:
                    chosen = hun
                    break
            if chosen:
                break

        if not chosen:
            # 공식 readings와 일치하는 음이 hanjadic에 없으면(예: court_list_docx의 음이
            # hanjadic 표기와 다른 극소수 사례), 임의로 추측하지 않고 이 글자는 건너뛴다.
            continue

        results.append({"char": char, "hun": chosen})

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"hanjadic 파싱: {len(by_char)}자 발견, DB {len(final_hanja)}자 중 {len(results)}자 매칭 -> {OUT_PATH}")


if __name__ == "__main__":
    main()
