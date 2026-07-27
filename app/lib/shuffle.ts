// Phase 8 — 후보 표시 순서를 무작위화한다. lib/naming/의 점수 계산 순서를 그대로 화면에 노출하면
// "앞에 나온 후보에 선택이 몰리는" 위치 편향(primacy effect)이 생기고, 사실상 순위를 매긴 것과
// 같은 인상을 준다(CLAUDE.md 3.6 "순위 폐지" 결정). 계산 로직이 아니라 프레젠테이션 관심사라
// lib/naming/ 밖(app/lib/)에 둔다.

export function shuffleArray<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
