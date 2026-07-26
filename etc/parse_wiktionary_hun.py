# CLAUDE.md 3.10/4.1 — 한국어 위키낱말사전 "부록:한문 교육용 기초 한자 1800"(CC BY-SA 4.0,
# https://ko.wiktionary.org/wiki/부록:한문_교육용_기초_한자_1800) 원본 wikitext를 파싱해
# {char, hun, eum} 목록을 만든다. 크레딧이 드는 LLM 번역 대신, 정부가 공인한 바로 그 1800자
# 목록(hanja.is_common 플래그의 근거와 동일한 kKoreanEducationHanja)에 대해 이미 공개
# 라이선스로 배포된 훈음 표를 그대로 재사용한다 — 새 뜻을 창작하지 않는다(CLAUDE.md 2.1).
#
# 원본 형식 예: [[家]] <small>([[집]] 가)</small>  ->  char=家, hun=집, eum=가
#              [[佳]] <small>([[아름답다|아름다울]] 가)</small>  ->  hun=아름다울(표시형)
#              [[携]] <small>([[이끌다|이끌]]/[[가지다|가질]] 휴)</small>  ->  훈이 여럿이면 첫 번째만 취한다.
# 재현: python etc/parse_wiktionary_hun.py  ->  scripts/db/data/hanja_hun.json

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW_PATH = ROOT / "etc" / "wiktionary_1800_hanja_raw.txt"
OUT_PATH = ROOT / "scripts" / "db" / "data" / "hanja_hun.json"

# [[한자]] <small>(훈부분 음)</small> 형태의 항목을 전부 찾는다.
ENTRY_RE = re.compile(r"\[\[([^\]|]+?)\s*\]\]\s*<small>\(([^)]+)\)</small>")
# 훈 부분의 위키링크 하나를 표시 텍스트로 바꾼다: [[a|b]] -> b, [[a]] -> a.
LINK_RE = re.compile(r"\[\[(?:[^\]|]*\|)?([^\]]+)\]\]")


def extract_hun(inner: str, eum: str) -> str | None:
    # inner 예: "[[집]] 가" 또는 "[[아름답다|아름다울]] 가" 또는 "[[이끌다|이끌]]/[[가지다|가질]] 휴"
    # 맨 끝의 음(1글자, eum과 동일)을 떼고 남은 부분에서 첫 번째 위키링크의 표시 텍스트를 훈으로 쓴다.
    if not inner.endswith(eum):
        return None
    hun_part = inner[: -len(eum)].strip()
    match = LINK_RE.search(hun_part)
    if not match:
        return None
    # "이끌/가질"처럼 여러 훈이 '/'로 이어진 경우 첫 번째만 취한다.
    return match.group(1).split("/")[0].strip()


def main():
    text = RAW_PATH.read_text(encoding="utf-8")
    results = []
    seen = set()

    for match in ENTRY_RE.finditer(text):
        char = match.group(1).strip()
        inner = match.group(2).strip()
        if len(char) != 1 or char in seen:
            continue
        # 음(음절)은 항상 괄호 안 맨 끝 토큰 — 공백 기준 마지막 조각.
        tokens = inner.split()
        if not tokens:
            continue
        eum = tokens[-1]
        if len(eum) != 1:
            continue
        hun = extract_hun(inner, eum)
        if not hun:
            continue
        seen.add(char)
        results.append({"char": char, "hun": hun, "eum": eum})

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"{len(results)}자 파싱 완료 -> {OUT_PATH}")


if __name__ == "__main__":
    main()
