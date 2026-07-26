"""
CLAUDE.md 3.6/6장 — "생소한 한자가 후보로 나온다" 문제 대응.
Unihan kKoreanEducationHanja(한문교육용 기초한자 1,800자, 대한민국 교육부 공식 목록)에 속하는지
여부를 isCommon 필드로 final_hanja_v2.json / scripts/db/data/final_hanja.json에 추가한다.

이 필드는 한자의 "뜻"을 판단하지 않는다 — Unihan의 사실적 플래그(교육과정 포함 여부)를
그대로 옮기는 조회일 뿐이라 CLAUDE.md 2.1의 "환각 금지/LLM은 오행·뜻을 판정하지 않는다" 원칙과
충돌하지 않는다(기존에 이미 8자 유지 근거로 같은 Unihan 필드를 썼던 것과 동일한 논리, 4.1 참고).

실행: python etc/add_common_hanja_flag.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
UNIHAN_OTHER_MAPPINGS = ROOT / "etc" / "unihan" / "Unihan_OtherMappings.txt"
TARGETS = [
    ROOT / "etc" / "final_hanja_v2.json",
    ROOT / "scripts" / "db" / "data" / "final_hanja.json",
]


def load_education_hanja() -> set[str]:
    chars: set[str] = set()
    with UNIHAN_OTHER_MAPPINGS.open(encoding="utf-8") as f:
        for line in f:
            if line.startswith("#") or not line.strip():
                continue
            parts = line.strip().split("\t")
            if len(parts) >= 2 and parts[1] == "kKoreanEducationHanja":
                codepoint = int(parts[0].replace("U+", ""), 16)
                chars.add(chr(codepoint))
    return chars


def main() -> None:
    edu_chars = load_education_hanja()
    print(f"교육용 기초한자(kKoreanEducationHanja): {len(edu_chars)}자")

    for target in TARGETS:
        data = json.loads(target.read_text(encoding="utf-8"))
        common_count = 0
        for entry in data:
            is_common = entry["char"] in edu_chars
            entry["isCommon"] = is_common
            if is_common:
                common_count += 1
        # 기존 파일과 동일한 1스페이스 들여쓰기를 유지해 diff를 최소화한다.
        target.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"{target.relative_to(ROOT)}: {len(data)}자 중 {common_count}자 isCommon=true 로 갱신")


if __name__ == "__main__":
    main()
