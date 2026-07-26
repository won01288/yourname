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

-- CLAUDE.md 3.6 확장(2026.7.26) — 사용자 제공 etc/korean_name.xlsx(성별별 실사용 이름 상위 표)의
-- A열(이름)만을 후보 생성의 이름 후보 풀로 쓴다. 자유 조합이 아니라 이 표에 있는 한글 이름만 후보로
-- 나올 수 있다. 원본 시트에는 1~4글자가 섞여 있었으나, GIVEN_NAME_LENGTH=2 제약에 맞춰 2글자만
-- 적재한다(재현: etc/parse_korean_names.py).
CREATE TABLE IF NOT EXISTS given_name (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hangul TEXT NOT NULL,              -- 한글 이름 2글자, 예: "서준"
  gender TEXT NOT NULL CHECK (gender IN ('M', 'F')),
  frequency INTEGER NOT NULL,        -- 원본 표의 실사용 빈도(순위 아님, 클수록 많이 쓰임)
  UNIQUE(hangul, gender)
);

CREATE INDEX IF NOT EXISTS idx_given_name_gender ON given_name(gender);
