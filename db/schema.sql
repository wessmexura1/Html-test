CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS technologies (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), slug TEXT UNIQUE NOT NULL, name TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS topics (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), technology_id UUID NOT NULL REFERENCES technologies(id), slug TEXT UNIQUE NOT NULL, name TEXT NOT NULL, description TEXT);
CREATE TABLE IF NOT EXISTS questions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), topic_id UUID NOT NULL REFERENCES topics(id), difficulty TEXT NOT NULL CHECK (difficulty IN ('easy','medium','hard')), prompt TEXT NOT NULL, code TEXT, options JSONB NOT NULL, correct_options JSONB NOT NULL, explanation TEXT NOT NULL, is_active BOOLEAN NOT NULL DEFAULT TRUE, UNIQUE(topic_id,difficulty,prompt));
INSERT INTO technologies(slug,name)
VALUES ('html','HTML'), ('css','CSS'), ('git','Git')
ON CONFLICT (slug) DO NOTHING;

-- Additive migration for existing installations; old results retain their algorithm version.
ALTER TABLE questions ADD COLUMN IF NOT EXISTS template_id TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS micro_skill TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS context_key TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS is_transfer BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS consistency_group_id TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS consistency_claims JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS option_ids JSONB;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS correct_option_ids JSONB;
CREATE UNIQUE INDEX IF NOT EXISTS questions_template_id_idx ON questions(template_id) WHERE is_active;

CREATE TABLE IF NOT EXISTS diagnostic_attempts (
    id UUID PRIMARY KEY, technology_id UUID NOT NULL REFERENCES technologies(id),
    algorithm_version INTEGER NOT NULL, attempt_number INTEGER NOT NULL,
    started_at TIMESTAMPTZ NOT NULL, completed_at TIMESTAMPTZ,
    session_state JSONB NOT NULL, result JSONB
);
CREATE TABLE IF NOT EXISTS diagnostic_answers (
    attempt_id UUID NOT NULL REFERENCES diagnostic_attempts(id), question_id TEXT NOT NULL,
    template_id TEXT NOT NULL, difficulty TEXT NOT NULL CHECK (difficulty IN ('easy','medium','hard')),
    micro_skill TEXT NOT NULL, selected_answers JSONB NOT NULL,
    score NUMERIC CHECK (score IN (0, 0.5, 1)), skipped BOOLEAN NOT NULL,
    parameters JSONB NOT NULL DEFAULT '{}'::jsonb, consistency_group_id TEXT,
    answered_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY(attempt_id, question_id),
    CHECK ((skipped AND score IS NULL) OR (NOT skipped AND score IS NOT NULL))
);
