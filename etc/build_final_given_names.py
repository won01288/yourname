"""
given_name 후보 풀을 다음 규칙으로 재구성한다(사용자 지시, 2026.8.2):

1. 기존 given_name 원본(scripts/db/data/given_names.json, etc/korean_name.xlsx 기반,
   남 1,448 / 여 1,442)에서 frequency 상위 남녀 각 300개만 남긴다.
2. 새 이름 풀(etc/final_name_male.csv, etc/final_name_female.csv — namechart.kr
   2020~2026 수집 + 2글자/어감규칙/서양·종교/고유명사 필터를 거친 최종 결과, 남 3,077 /
   여 2,042)을 통째로 더한다.
3. 같은 이름(hangul)이 양쪽에 다 있으면 새 풀의 frequency로 덮어쓴다(더 최신 데이터 우선).
4. "featured"(추천 시 가중치 부여 대상) 표시: 기존 상위 300개 전부 + 새 풀 상위 남녀 각
   500개 전부. 그 외는 featured=False.

출력은 기존 스키마에 `isFeatured` 필드만 추가한 형태로 scripts/db/data/given_names.json을
덮어쓴다 — seed-given-names.js가 이 필드를 읽어 DB의 is_featured 컬럼에 반영한다(마이그레이션
별도 필요, migrate-add-given-name-featured.js 참고).

실행 전 원본은 scripts/db/data/given_names_v1_2890_backup.json으로 백업해둔다(이 스크립트가
자동으로 하지 않음 — 실행 전에 별도로 복사해뒀음).

실행: python etc/build_final_given_names.py
출력: scripts/db/data/given_names.json (덮어씀)
"""
import csv
import json
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parent.parent
OLD_JSON = ROOT / "scripts" / "db" / "data" / "given_names.json"
OUTPUT_JSON = ROOT / "scripts" / "db" / "data" / "given_names.json"

OLD_TOP_N = 300
NEW_TOP_N = 500

SOURCES = {
    "M": ROOT / "etc" / "final_name_male.csv",
    "F": ROOT / "etc" / "final_name_female.csv",
}


def load_old_top(gender: str, old_list: list[dict]) -> list[dict]:
    entries = [e for e in old_list if e["gender"] == gender]
    entries.sort(key=lambda e: -e["frequency"])
    return entries[:OLD_TOP_N]


def load_new_all(path: Path) -> list[dict]:
    with path.open(encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))
    # rank 오름차순 = count 내림차순으로 이미 정렬되어 있음
    return rows


def main() -> None:
    with OLD_JSON.open(encoding="utf-8") as f:
        old_list = json.load(f)

    final_entries: dict[str, dict] = {}  # key: f"{gender}:{hangul}"
    featured: set[str] = set()

    for gender, csv_path in SOURCES.items():
        old_top = load_old_top(gender, old_list)
        new_all = load_new_all(csv_path)
        new_top = new_all[:NEW_TOP_N]

        for e in old_top:
            key = f"{gender}:{e['hangul']}"
            final_entries[key] = {"hangul": e["hangul"], "gender": gender, "frequency": e["frequency"]}
            featured.add(key)

        for r in new_all:
            key = f"{gender}:{r['name']}"
            final_entries[key] = {"hangul": r["name"], "gender": gender, "frequency": int(r["count"])}

        for r in new_top:
            key = f"{gender}:{r['name']}"
            featured.add(key)

        print(
            f"{gender}: 기존 상위 {len(old_top)}개 + 신규 {len(new_all)}개 "
            f"(신규 상위 {len(new_top)}개 featured 추가) 처리"
        )

    result = []
    for key, entry in final_entries.items():
        entry = dict(entry)
        entry["isFeatured"] = key in featured
        result.append(entry)

    result.sort(key=lambda e: (e["gender"], -e["frequency"]))

    with OUTPUT_JSON.open("w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=1)

    m_count = sum(1 for e in result if e["gender"] == "M")
    f_count = sum(1 for e in result if e["gender"] == "F")
    m_featured = sum(1 for e in result if e["gender"] == "M" and e["isFeatured"])
    f_featured = sum(1 for e in result if e["gender"] == "F" and e["isFeatured"])
    print(f"\n최종: 남 {m_count}개(featured {m_featured}) / 여 {f_count}개(featured {f_featured})")
    print(f"저장: {OUTPUT_JSON.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
