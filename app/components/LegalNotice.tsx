// design.md 3.2 3단계 / CLAUDE.md 7장 — 리포트 하단에 상시 노출.
export default function LegalNotice() {
  return (
    <p className="mx-auto max-w-2xl px-6 pb-16 text-center text-[12px] leading-6 text-text-secondary">
      본 결과는 전통 성명학·사주 이론에 근거한 참고용 정보이며, 과학적으로 검증된 예측이 아닙니다.
      실제 출생신고 시 사용 가능한 한자인지(인명용 한자 여부·독음)는 관할 가족관계등록관서에서 다시
      확인해 주세요.
    </p>
  );
}
