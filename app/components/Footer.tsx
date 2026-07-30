import Link from "next/link";
import { Fill } from "./LegalPage";

// 전자상거래법상 필수 표시사항(상호·대표자·사업자등록번호·통신판매업신고번호·주소·연락처)을
// 모든 페이지 하단에 노출한다 — PG 심사·통신판매업 신고 시 사이트에서 바로 확인 가능해야 한다.
// 초안 — Fill로 표시된 값을 실제 정보로 교체할 것.
export default function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 text-[12px] leading-6 text-text-secondary sm:px-6">
        <nav className="flex flex-wrap gap-x-4 gap-y-1">
          <Link href="/terms" className="hover:text-text-primary hover:underline">
            이용약관
          </Link>
          <Link href="/privacy" className="font-medium text-text-primary hover:underline">
            개인정보처리방침
          </Link>
          <Link href="/refund" className="hover:text-text-primary hover:underline">
            환불정책
          </Link>
        </nav>
        <div className="mt-4 space-y-0.5">
          <p>상호: 드래곤아이티 · 대표자: 이하진</p>
          <p>
            사업자등록번호: 584-36-01826 · 통신판매업신고번호:{" "}
            <Fill>제0000-서울00-00000호</Fill>
          </p>
          <p>주소: 부산광역시 기장군 정관읍 구연방곡로 120 · 이메일: won01288@gmail.com</p>
          <p className="pt-2">© {new Date().getFullYear()} 유어네임. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
