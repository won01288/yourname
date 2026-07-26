// design.md 3.6 — 배경 앰비언트 글로우 + 그레인 + 오행 순환 시그니처 모티프.
// Hero / ResultsDashboard 헤더처럼 "배경"인 곳에만 쓰고, 카드·버튼 내부에는 쓰지 않는다.
// 오행 5색을 모티프 노드에 쓰는 것은 1.4 예외 조항(오행 순환 자체를 상징하는 장식) 근거.
export default function AmbientBackdrop() {
  return (
    <>
      <div className="ambient-glow" aria-hidden="true" />
      <div className="ambient-grain" aria-hidden="true" />
      <svg className="ambient-motif" viewBox="0 0 300 300" aria-hidden="true" focusable="false">
        <defs>
          <filter id="ambientNodeGlow" x="-120%" y="-120%" width="340%" height="340%">
            <feGaussianBlur stdDeviation="10" />
          </filter>
        </defs>
        <circle cx="150" cy="150" r="118" fill="none" stroke="var(--brand-400)" strokeWidth="1" opacity="0.7" />
        <path
          d="M150 32 L254.6 108 L214.7 231 L85.3 231 L45.4 108 Z"
          fill="none"
          stroke="var(--brand-400)"
          strokeWidth="1.1"
          opacity="0.75"
        />
        <g filter="url(#ambientNodeGlow)">
          <circle cx="150" cy="32" r="11" fill="var(--element-wood)" opacity="0.6" />
          <circle cx="254.6" cy="108" r="11" fill="var(--element-fire)" opacity="0.6" />
          <circle cx="214.7" cy="231" r="11" fill="var(--element-earth)" opacity="0.6" />
          <circle cx="85.3" cy="231" r="11" fill="var(--element-metal)" opacity="0.6" />
          <circle cx="45.4" cy="108" r="11" fill="var(--element-water)" opacity="0.6" />
        </g>
        <circle cx="150" cy="32" r="4.5" fill="var(--element-wood)" />
        <circle cx="254.6" cy="108" r="4.5" fill="var(--element-fire)" />
        <circle cx="214.7" cy="231" r="4.5" fill="var(--element-earth)" />
        <circle cx="85.3" cy="231" r="4.5" fill="var(--element-metal)" />
        <circle cx="45.4" cy="108" r="4.5" fill="var(--element-water)" />
      </svg>
    </>
  );
}
