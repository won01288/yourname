-- CLAUDE.md 4장 데이터 모델. Turso(libSQL)에 적용하는 스키마.

CREATE TABLE IF NOT EXISTS hanja (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  char TEXT NOT NULL UNIQUE,
  readings TEXT NOT NULL,            -- JSON 배열, 예: ["가"]
  stroke_original INTEGER,           -- 원획 (CLAUDE.md 3.2)
  stroke_actual INTEGER,             -- 필획
  radical TEXT,                      -- 부수 (강희자전 214부수 대표자)
  element TEXT,                      -- 자원오행 (木/火/土/金/水), 미배정 시 NULL
  meaning TEXT,                      -- 뜻풀이 (현재는 Unihan 영문 뜻풀이)
  is_name_allowed INTEGER NOT NULL DEFAULT 1,  -- 인명용 한자 여부
  is_forbidden INTEGER NOT NULL DEFAULT 0,     -- 불용문자 여부
  forbidden_reason TEXT,             -- 불용 사유 (nullable)
  verification_status TEXT NOT NULL DEFAULT 'confirmed'
    CHECK (verification_status IN ('confirmed', 'unverified')),
    -- confirmed: OCR 결과가 Unihan 공인 한국어 독음과 일치해 교차검증됨
    -- unverified: OCR 신뢰도는 높으나 독립 교차검증은 안 됨 (추후 보강 대상)
  is_common INTEGER NOT NULL DEFAULT 0,
    -- 교육용 기초한자(Unihan kKoreanEducationHanja, 대한민국 교육부 공식 1,800자) 포함 여부.
    -- CLAUDE.md 3.6 — 후보 생성 시 "생소한 한자" 억제용 가산점으로만 쓴다. 기존 테이블에는
    -- migrate-add-is-common.js로 추가했다(이 CREATE TABLE은 신규 설치 기준).
  hun TEXT
    -- 한글 훈(訓) 한 단어(예: "하늘"). 한국어 위키낱말사전 "부록:한문 교육용 기초 한자 1800"
    -- (CC BY-SA 4.0)에서 가져온 값 — LLM 번역이 아니라 공개 라이선스 데이터 재사용
    -- (CLAUDE.md 3.10). 이 표 밖 한자는 NULL. 기존 테이블에는 migrate-add-hun.js +
    -- seed-hanja-hun.js로 추가했다(이 CREATE TABLE은 신규 설치 기준).
);

CREATE INDEX IF NOT EXISTS idx_hanja_char ON hanja(char);

CREATE TABLE IF NOT EXISTS surname (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hangul TEXT NOT NULL,
  hanja TEXT NOT NULL,
  stroke_original INTEGER NOT NULL,
  initial_element TEXT NOT NULL,     -- 초성 발음오행
  UNIQUE(hangul, hanja)
);

CREATE TABLE IF NOT EXISTS numerology_81 (
  number INTEGER PRIMARY KEY,        -- 1~81
  fortune TEXT NOT NULL,             -- 길/흉/반길 등
  title TEXT,                        -- 수리 명칭
  description TEXT                   -- 해설
);

-- CLAUDE.md 3.6 확장(2026.7.26) — 후보 생성의 이름 후보 풀. 자유 조합이 아니라 이 표에 있는
-- 한글 이름만 후보로 나올 수 있다. GIVEN_NAME_LENGTH=2 제약에 맞춰 2글자만 적재한다.
-- 2026.8.2 재구성 — 기존 korean_name.xlsx 상위 300개(남녀 각) + namechart.kr 2020~2026 기반
-- 신규 풀을 합쳤다(재현: etc/build_final_given_names.py). is_featured는 그 재구성 시 "추천 시
-- 약간의 가중치를 줄 이름"(기존 상위 300개 전부 + 신규 풀 상위 500개)을 표시한다
-- (lib/naming/candidates.ts CANDIDATE_SCORE_WEIGHTS.featured 참고).
CREATE TABLE IF NOT EXISTS given_name (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hangul TEXT NOT NULL,              -- 한글 이름 2글자, 예: "서준"
  gender TEXT NOT NULL CHECK (gender IN ('M', 'F')),
  frequency INTEGER NOT NULL,        -- 원본 표의 실사용 빈도(순위 아님, 클수록 많이 쓰임)
  is_featured INTEGER NOT NULL DEFAULT 0, -- 추천 시 약간의 가중치를 줄 이름인지(0/1)
  UNIQUE(hangul, gender)
);

CREATE INDEX IF NOT EXISTS idx_given_name_gender ON given_name(gender);

-- 로그인(이메일/비밀번호) 베타. 목적은 결과 재조회뿐이라 최소 스키마만 둔다.
-- 비밀번호는 Node 내장 crypto(scrypt)로 해시(신규 의존성 없음), 세션은 JWT가 아니라
-- DB-backed opaque 토큰(쿠키엔 원본, DB엔 SHA-256 해시만 저장 — 유출 시 재사용 불가).
-- 기존 4테이블처럼 FK 제약은 쓰지 않고, 소유권은 매 쿼리의 WHERE user_id = ?로 강제한다.
CREATE TABLE IF NOT EXISTS user (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,        -- 저장 전 소문자/trim 정규화(애플리케이션 레벨). 소셜 로그인이 이메일을
                                      -- 제공하지 않으면(카카오 이메일 미동의 등) 합성 placeholder를 저장한다.
  password_hash TEXT NOT NULL,       -- "scrypt:v1:<saltHex>:<hashHex>" (버전 접두어로 향후 파라미터 변경 대비).
                                      -- 소셜 로그인 전용 계정은 "oauth:v1:<provider>" 형식의 sentinel을 저장한다
                                      -- (verifyPassword가 parts[0]!=="scrypt"에서 바로 false를 반환해 로그인 불가 —
                                      -- password_hash NOT NULL 제약을 유지하면서 별도 마이그레이션 없이 처리).
  display_name TEXT,                 -- 소셜 로그인 닉네임(nullable). 이메일/비밀번호 가입자는 NULL로 남는다.
  phone TEXT,                        -- 소셜 로그인 시 제공자가 내려준 휴대전화번호(nullable). 네이버 response.mobile /
                                      -- 카카오 kakao_account.phone_number 원문 그대로 저장, 가공하지 않는다.
  real_name TEXT,                    -- 네이버가 제공하는 "회원이름"(실명, nullable). 카카오는 실명 제공 항목이 없어
                                      -- 항상 NULL. display_name(닉네임)과는 별개 값.
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS session (
  id TEXT PRIMARY KEY,               -- 원본 토큰이 아니라 SHA-256(hex)
  user_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL           -- 생성 시 datetime('now','+30 days')로 고정(슬라이딩 갱신 없음)
);

CREATE INDEX IF NOT EXISTS idx_session_user_id ON session(user_id);

-- SNS 로그인(카카오/네이버) — 어떤 소셜 계정이 어떤 회원(user.id)과 연결되는지 저장한다.
-- next-auth(Auth.js)는 OAuth 처리 전용으로만 쓰고, 세션 자체는 여전히 session 테이블(위)의
-- DB-backed opaque 토큰이 담당하지 않는다는 점에 유의 — OAuth 로그인은 next-auth의 JWT 세션을
-- 그대로 쓰되, 그 JWT 안에 이 테이블로 찾은 user.id를 실어 getCurrentUser()가 두 로그인 방식을
-- 하나의 AuthUser로 합쳐 반환한다(lib/auth.ts). provider_account_id는 각 제공자가 발급하는
-- 고유하고 불변인 회원 식별자(카카오 id, 네이버 response.id) — 이메일이 아니라 이 값을
-- 기준으로 매칭해야, 이메일 제공 여부와 무관하게(카카오는 이메일 동의가 별도 심사 대상) 항상
-- 동일 계정으로 재로그인된다. 이메일이 일치하는 기존 계정이 있으면 자동으로 연결한다(findOrCreateOAuthUser).
CREATE TABLE IF NOT EXISTS oauth_account (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('kakao', 'naver')),
  provider_account_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(provider, provider_account_id)
);

CREATE INDEX IF NOT EXISTS idx_oauth_account_user_id ON oauth_account(user_id);

-- 무료 "이름 점수 확인" 결과. 영구 보관, 사용자가 원하면 개별 삭제 가능(하드 삭제).
CREATE TABLE IF NOT EXISTS score_result (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  request_payload TEXT NOT NULL,     -- ScoreRequestPayload JSON 원본
  result TEXT NOT NULL,              -- ScoreApiResult JSON 원본 (ScoreDashboard가 그대로 재소비)
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_score_result_user_id ON score_result(user_id);

-- 프리미엄 "작명" 결과. 생성 후 30일간만 재조회 가능(별도 삭제 기능 없음, 조회 시점 expires_at 필터).
-- result에 LLM report까지 포함해 verbatim 저장 — 재열람 시 LLM을 다시 호출하지 않기 위함(비용 방지).
CREATE TABLE IF NOT EXISTS naming_result (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  request_payload TEXT NOT NULL,     -- NameRequestPayload JSON 원본
  result TEXT NOT NULL,              -- NameApiResult JSON 원본 (LLM report 포함)
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL           -- INSERT 시 datetime('now','+30 days')로 계산
);

CREATE INDEX IF NOT EXISTS idx_naming_result_user_id ON naming_result(user_id);

-- 결제(페이앱, CLAUDE.md 0.4) — 프리미엄 작명 유료화 1단계. candidate_count(3/5/10) 티어별
-- 가격을 관리자가 바꿀 수 있도록 코드 상수가 아니라 DB에 둔다.
CREATE TABLE IF NOT EXISTS price_tier (
  candidate_count INTEGER PRIMARY KEY CHECK (candidate_count IN (3, 5, 10)),
  price INTEGER NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 결제 주문 1건 = "candidate_count개 생성 1회 이용권". status는 pending(생성 직후)
-- -> paid(페이앱 feedbackurl 웹훅으로만 전이 — 유일한 신뢰 소스) -> consumed(app/api/name이
-- 원자적 UPDATE로 claim, 이중사용 방지) 순으로 진행하거나, paid 이전에 canceled/failed로 끝난다.
-- FK 제약은 기존 관례와 동일하게 쓰지 않고, 소유권은 매 조회 WHERE user_id = ?로 강제한다.
CREATE TABLE IF NOT EXISTS payment_order (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  candidate_count INTEGER NOT NULL,
  amount INTEGER NOT NULL,           -- 주문 시점 price_tier 가격 스냅샷(이후 가격이 바뀌어도 영향 없음)
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'consumed', 'canceled', 'failed')),
  provider TEXT NOT NULL DEFAULT 'payapp',
  provider_order_id TEXT,            -- 페이앱 mul_no 등 PG사 측 주문번호(웹훅 수신 후 채워짐)
  naming_result_id INTEGER,          -- 이 주문으로 생성된 naming_result.id (소비 후 best-effort 연결)
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payment_order_user_id ON payment_order(user_id);

-- 회원 문의하기(CLAUDE.md 0.5) — 로그인한 회원 전용, 다른 회원에게 공개되지 않는다(소유권은
-- 매 조회 WHERE user_id = ?로 강제, 기존 관례와 동일). answer/answered_at이 둘 다 NULL이면
-- "답변대기", 채워지면 "답변완료"다 — 별도 status 컬럼을 두지 않고 이 두 값으로 상태를 판별한다.
-- 텍스트 문의/답변만 지원하고, 영구 보관하되 관리자가 원하면 하드 삭제할 수 있다.
CREATE TABLE IF NOT EXISTS inquiry (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  answer TEXT,
  answered_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inquiry_user_id ON inquiry(user_id);
