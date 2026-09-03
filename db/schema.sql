CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS technologies (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), slug TEXT UNIQUE NOT NULL, name TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS topics (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), technology_id UUID NOT NULL REFERENCES technologies(id), slug TEXT UNIQUE NOT NULL, name TEXT NOT NULL, description TEXT);
CREATE TABLE IF NOT EXISTS questions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), topic_id UUID NOT NULL REFERENCES topics(id), difficulty TEXT NOT NULL CHECK (difficulty IN ('easy','medium','hard')), prompt TEXT NOT NULL, code TEXT, options JSONB NOT NULL, correct_options JSONB NOT NULL, explanation TEXT NOT NULL, is_active BOOLEAN NOT NULL DEFAULT TRUE, UNIQUE(topic_id,difficulty,prompt));
INSERT INTO technologies(slug,name) VALUES ('html','HTML') ON CONFLICT (slug) DO NOTHING;
    