import { describe, it, expect, vi } from "vitest";

// createSession이 실제 DB에 쓰지 않도록 db-auth를 스텁한다 — 이 테스트가 검증하는 건
// "토큰이 매번 다르게 생성되는가"이지 DB 왕복 자체가 아니다(lib/db.ts와 동일한 테스트 경계).
vi.mock("./db-auth", () => ({
  createSessionRow: vi.fn().mockResolvedValue(undefined),
  deleteSessionRow: vi.fn().mockResolvedValue(undefined),
  getSessionWithUser: vi.fn().mockResolvedValue(null),
}));

// SNS 로그인(lib/oauth.ts)은 next-auth를 통해 next/server를 불러오는데, 이는 Next.js 빌드/개발
// 파이프라인 밖(vitest의 순수 Node 환경)에서는 해석되지 않는다. 이 테스트는 getCurrentUser()를
// 쓰지 않으므로(비밀번호 해시·세션 토큰 생성만 검증) 실제 구현 대신 빈 스텁으로 충분하다.
vi.mock("./oauth", () => ({
  auth: vi.fn().mockResolvedValue(null),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

const { hashPassword, verifyPassword, createSession } = await import("./auth");

describe("hashPassword / verifyPassword", () => {
  it("올바른 비밀번호는 검증을 통과한다", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(await verifyPassword("correct horse battery staple", hash)).toBe(true);
  });

  it("틀린 비밀번호는 검증에 실패한다", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(await verifyPassword("wrong password", hash)).toBe(false);
  });

  it("같은 비밀번호를 두 번 해시해도 salt가 달라 결과 문자열이 다르다", async () => {
    const a = await hashPassword("same password");
    const b = await hashPassword("same password");
    expect(a).not.toBe(b);
    // 그럼에도 둘 다 원래 비밀번호로 검증은 통과해야 한다.
    expect(await verifyPassword("same password", a)).toBe(true);
    expect(await verifyPassword("same password", b)).toBe(true);
  });

  it("형식이 다른/손상된 stored 값에 대해 throw 없이 false를 반환한다", async () => {
    await expect(verifyPassword("anything", "not-a-valid-hash")).resolves.toBe(false);
    await expect(verifyPassword("anything", "scrypt:v1:onlytwoparts")).resolves.toBe(false);
    await expect(verifyPassword("anything", "bcrypt:v1:aa:bb")).resolves.toBe(false);
    await expect(verifyPassword("anything", "scrypt:v1:not-hex:not-hex")).resolves.toBe(false);
  });
});

describe("createSession", () => {
  it("호출할 때마다 다른 토큰을 생성한다", async () => {
    const a = await createSession(1);
    const b = await createSession(1);
    expect(a.token).not.toBe(b.token);
    expect(a.token.length).toBeGreaterThan(0);
  });
});
