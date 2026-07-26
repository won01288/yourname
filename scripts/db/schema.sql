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
  is_common INTEGER NOT NULL DEFAULT 0
    -- 교육용 기초한자(Unihan kKoreanEducationHanja, 대한민국 교육부 공식 1,800자) 포함 여부.
    -- CLAUDE.md 3.6 — 후보 생성 시 "생소한 한자" 억제용 가산점으로만 쓴다. 기존 테이블에는
    -- migrate-add-is-common.js로 추가했다(이 CREATE TABLE은 신규 설치 기준).
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
