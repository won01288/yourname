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

import type { CheckoutContext, CheckoutSession, PaymentProvider, WebhookResult } from "./provider";

// CLAUDE.md 0.4 — 삼성페이는 페이앱 웹 결제(JS/REST) openpaytype에 없다(오프라인 대면결제 APP
// SDK 전용). 카드/카카오페이/네이버페이 3종만 지원한다.
const OPEN_PAY_TYPE = "card,kakaopay,naverpay";

// pay_state 코드 → 우리 쪽 상태. 페이앱 문서: 4=결제완료, 8/32=요청취소, 9/64=승인취소,
// 그 외(1=요청, 10=결제대기, 70/71=부분취소 등)는 이번 범위에서 다루지 않고 무시한다.
const PAID_STATES = new Set(["4"]);
const CANCELED_STATES = new Set(["8", "32", "9", "64"]);

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
    smsuse: "n",
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

  return {
    recognized,
    orderId: orderId !== null && !Number.isNaN(orderId) ? orderId : null,
    providerOrderId,
    status,
    amount: amount !== null && !Number.isNaN(amount) ? amount : null,
  };
}

export const payappProvider: PaymentProvider = {
  name: "payapp",
  buildCheckoutSession(ctx: CheckoutContext): CheckoutSession {
    return { provider: "payapp", clientConfig: buildClientConfig(ctx) };
  },
  parseWebhook,
};
