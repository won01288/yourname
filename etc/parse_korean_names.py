"""
CLAUDE.md 3.6 확장 — 사용자가 제공한 etc/korean_name.xlsx(여자이름/남자이름 시트, 성별별
상위 실사용 이름 약 3,600행 + 사용빈도)를 파싱해 후보 생성의 "이름(한글) 후보 풀" 원본으로 삼는다.
이 파일이 있는 이상, 작명 엔진은 자유 조합이 아니라 이 표의 A열(이름)만을 후보로 쓴다.

데이터 관찰(2026.7.26):
- 시트마다 정확히 동일한 (이름, 빈도) 행이 중복되어 있다(1~4회, 원본 편집 과정의 산물로 보임 —
  빈도값이 중복 행마다 완전히 동일해 서로 다른 연도 스냅샷이 아니라 단순 반복임을 확인했다).
  이름 기준으로 dedupe한다.
- 대부분 2글자이지만 1글자(예: "샘")·3~4글자 이름도 소수 섞여 있다. 현재 작명 엔진
  (GIVEN_NAME_LENGTH=2, config.ts)이 2글자 이름만 지원하므로 2글자만 남긴다 — 학파 판단이 아니라
  기존에 이미 확정된 제약(3.6/Phase 4)을 그대로 따르는 것뿐이다.

실행: python etc/parse_korean_names.py
출력: scripts/db/data/given_names.json — [{ "hangul": str, "gender": "M"|"F", "frequency": int }]
"""
import json
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
SOURCE_XLSX = ROOT / "etc" / "korean_name.xlsx"
OUTPUT_JSON = ROOT / "scripts" / "db" / "data" / "given_names.json"

SHEET_TO_GENDER = {"여자이름": "F", "남자이름": "M"}


def main() -> None:
    wb = openpyxl.load_workbook(SOURCE_XLSX, read_only=True)
    result: list[dict] = []

    for sheet_name, gender in SHEET_TO_GENDER.items():
        ws = wb[sheet_name]
        rows = list(ws.iter_rows(values_only=True))

        seen: dict[str, int] = {}
        for hangul, frequency in rows:
            hangul = str(hangul)
            if hangul not in seen:
                seen[hangul] = int(frequency)

        skipped_wrong_length = 0
        kept = 0
        for hangul, frequency in seen.items():
            if len(hangul) != 2:
                skipped_wrong_length += 1
                continue
            result.append({"hangul": hangul, "gender": gender, "frequency": frequency})
            kept += 1

        print(
            f"{sheet_name}: 원본 {len(rows)}행 → 고유 {len(seen)}개 → 2글자만 {kept}개 "
            f"(길이 불일치로 제외 {skipped_wrong_length}개)"
        )

    OUTPUT_JSON.write_text(json.dumps(result, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"총 {len(result)}개 → {OUTPUT_JSON.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
