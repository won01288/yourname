// 결제(페이앱, CLAUDE.md 0.4) — PayApp.PaymentProvider 구현.
//
// REST API(cmd=payrequest)가 아니라 JS SDK(lite.js) 방식을 택했다: REST는 recvphone(수신
// 휴대폰번호)이 필수라고 문서에 명시돼 있는데, 이는 페이앱의 원래 용도인 "SMS로 결제링크 청구서
// 발송" 흐름 때문이다. 우리 서비스는 로그인 방식에 따라(이메일 가입, 카카오 로그인 등) 전화번호가
// 없는 사용자가 흔해 이 요구사항과 맞지 않는다. JS SDK는 recvphone이 선택사항이라 "내 사이트에서
// 바로 결제창 띄우기" 용도에 맞는 방식이다.
//
// 그래서 이 파일은 페이앱 서버에 API를 직접 호출하지 않는다 — buildCheckoutSession은 프론트가
// lite.js로 직접 결제창을 여는 데 필요한 파라미터만 구성해 돌려준다. 실제 결제 성사 여부의
// 유일한 신뢰 소스는 parseWebhook(feedbackurl 통보)이다.

import type { CancelResult, CheckoutContext, CheckoutSession, PaymentProvider, WebhookResult } from "./provider";

// CLAUDE.md 0.4 (2026.8.7 갱신) — 페이앱 담당자로부터 "카카오페이·네이버페이는 우리 서비스에서
// 지원 불가"라는 통보를 받아 제거하고, 대신 애플페이·페이코·가상계좌·휴대폰결제를 추가했다.
// 삼성페이는 여전히 불가능하다 — 페이앱 웹 결제(JS SDK/REST) openpaytype 자체에 옵션이 없고
// 오프라인 대면결제 전용 APP SDK에서만 제공된다(페이앱 개발자센터 문서로 재확인). 카카오페이/
// 네이버페이가 막힌 것도 이 코드가 아니라 페이앱 판매자 관리자센터 설정/계약 문제일 가능성이
// 높으므로, 여기서 openpaytype에 값을 넣어도 "판매자 결제 설정의 값이 우선"이라 실제 노출은
// 판매자 설정에서 별도 확인이 필요하다(6장 참고).
const OPEN_PAY_TYPE = "card,applepay,payco,vbank,phone";

// pay_state 코드 → 우리 쪽 상태. 페이앱 문서: 1=요청(최초 접수, 미완료), 4=결제완료, 8/32=요청취소,
// 9/64=승인취소, 그 외(10=결제대기, 70/71=부분취소 등)는 이번 범위에서 다루지 않고 무시한다.
// "요청" 통보는 결제 완료 여부와 무관하게 항상 먼저 오고, 이때 이미 mul_no(providerOrderId)가
// 함께 전달된다 — 결제 완료 전에 결제 취소(cancelPendingRequest)를 하려면 이 mul_no가 필요해서,
// 다른 상태와 달리 이 통보도 무시하지 않고 별도로 처리한다(webhook 라우트 참고).
const REQUESTED_STATES = new Set(["1"]);
const PAID_STATES = new Set(["4"]);
const CANCELED_STATES = new Set(["8", "32", "9", "64"]);

// pay_type(정수 코드, 페이앱 개발자센터 문서 기준) → 우리 쪽 openpaytype 값과 동일한 표기로 정규화.
// 현재 openpaytype에 없는 값(kakaopay/naverpay 등)도 매핑에 남겨둔다 — 판매자 설정이 코드와
// 별개로 다른 값을 허용할 가능성에 대한 방어적 처리이며, PG사 고유 코드는 이 파일 밖으로 새지
// 않는다. 페이코는 pay_type=1(카드)로 오되 paymethod_group=35로만 구분되는 특이 케이스라 별도 처리.
const PAY_TYPE_LABELS: Record<string, string> = {
  "1": "card",
  "2": "phone",
  "4": "offline",
  "6": "rbank",
  "7": "vbank",
  "15": "kakaopay",
  "16": "naverpay",
  "17": "registered",
  "21": "smilepay",
  "22": "wechat",
  "23": "applepay",
  "24": "myaccount",
  "25": "tosspay",
  "26": "dvpay",
};
const PAYCO_METHOD_GROUP = "35";

function normalizePayType(form: Record<string, string>): string | null {
  if (!form.pay_type) return null;
  if (form.pay_type === "1" && form.paymethod_group === PAYCO_METHOD_GROUP) return "payco";
  return PAY_TYPE_LABELS[form.pay_type] ?? form.pay_type;
}

const PAYAPP_API_URL = "https://api.payapp.kr/oapi/apiLoad.html";

function buildClientConfig(ctx: CheckoutContext): Record<string, string> {
  const userid = requireEnv("PAYAPP_USERID");
  const shopname = process.env.PAYAPP_SHOPNAME ?? "유어네임";

  return {
    userid,
    shopname,
    goodname: ctx.goodName,
    price: String(ctx.order.amount),
    var1: String(ctx.order.id),
    feedbackurl: ctx.feedbackUrl,
    returnurl: ctx.returnUrl,
    openpaytype: OPEN_PAY_TYPE,
    smsuse: "y",
  };
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} 환경변수가 설정되지 않았습니다.`);
  return value;
}

function parseWebhook(form: Record<string, string>): WebhookResult {
  const userid = process.env.PAYAPP_USERID;
  const linkkey = process.env.PAYAPP_LINKKEY;
  const linkval = process.env.PAYAPP_LINKVAL;

  const recognized =
    Boolean(userid && linkkey && linkval) &&
    form.userid === userid &&
    form.linkkey === linkkey &&
    form.linkval === linkval;

  const orderId = form.var1 ? Number.parseInt(form.var1, 10) : null;
  const amount = form.price ? Number.parseInt(form.price, 10) : null;
  const providerOrderId = form.mul_no ?? null;

  let status: WebhookResult["status"] = "ignored";
  if (form.pay_state && PAID_STATES.has(form.pay_state)) status = "paid";
  else if (form.pay_state && CANCELED_STATES.has(form.pay_state)) status = "canceled";
  else if (form.pay_state && REQUESTED_STATES.has(form.pay_state)) status = "requested";

  return {
    recognized,
    orderId: orderId !== null && !Number.isNaN(orderId) ? orderId : null,
    providerOrderId,
    status,
    amount: amount !== null && !Number.isNaN(amount) ? amount : null,
    payType: normalizePayType(form),
  };
}

// 결제 요청 취소 — REST API cmd=paycancel. userid/linkkey는 웹훅 인증에도 쓰는 값 그대로 재사용한다.
// cancelmode=ready로 "아직 완료되지 않은 요청 상태"만 취소 대상으로 한정한다 — 사용자가 취소를
// 누른 순간과 거의 동시에 결제 승인이 끝나는 레이스에서, 이미 완료된 결제를 잘못 취소하지 않기
// 위함이다(이미 완료됐다면 이 호출은 실패로 응답하고, 호출부가 최신 주문 상태를 다시 확인한다).
async function cancelPendingRequest(providerOrderId: string): Promise<CancelResult> {
  const userid = requireEnv("PAYAPP_USERID");
  const linkkey = requireEnv("PAYAPP_LINKKEY");

  const body = new URLSearchParams({
    cmd: "paycancel",
    userid,
    linkkey,
    mul_no: providerOrderId,
    cancelmemo: "사용자 결제 취소",
    cancelmode: "ready",
  });

  const res = await fetch(PAYAPP_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const text = await res.text();
  const parsed = new URLSearchParams(text);
  return { success: parsed.get("state") === "1" };
}

export const payappProvider: PaymentProvider = {
  name: "payapp",
  buildCheckoutSession(ctx: CheckoutContext): CheckoutSession {
    return { provider: "payapp", clientConfig: buildClientConfig(ctx) };
  },
  parseWebhook,
  cancelPendingRequest,
};
