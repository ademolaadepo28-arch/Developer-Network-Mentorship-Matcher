-- PostgreSQL 16 Relational & JSONB Schema for Developer Network & Mentorship Matcher
-- Architecture Spec Section 4

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    github_id BIGINT UNIQUE NOT NULL,
    handle VARCHAR(255) NOT NULL,
    role VARCHAR(16) NOT NULL DEFAULT 'undecided' CHECK (role IN ('mentor', 'mentee', 'both', 'undecided')),
    avatar_url TEXT,
    bio TEXT,
    encrypted_token TEXT,
    token_iv TEXT,
    token_tag TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partial index on user role as defined in spec
CREATE INDEX IF NOT EXISTS idx_users_role_mentor ON users(role) WHERE role IN ('mentor', 'both');
CREATE INDEX IF NOT EXISTS idx_users_role_mentee ON users(role) WHERE role IN ('mentee', 'both');

-- Developer Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    languages JSONB NOT NULL DEFAULT '{}'::jsonb,
    topics TEXT[] NOT NULL DEFAULT '{}'::text[],
    commit_activity INTEGER NOT NULL DEFAULT 0,
    repo_count INTEGER NOT NULL DEFAULT 0,
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- GIN index for fast search on aggregated topic labels
CREATE INDEX IF NOT EXISTS idx_profiles_topics_gin ON profiles USING GIN (topics);
-- GIN index on jsonb languages for byte queries
CREATE INDEX IF NOT EXISTS idx_profiles_languages_gin ON profiles USING GIN (languages);

-- Mentorship Matches Table
CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    junior_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mentor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score NUMERIC(4,3) NOT NULL CHECK (score >= 0.000 AND score <= 1.000),
    status VARCHAR(16) NOT NULL DEFAULT 'suggested' CHECK (status IN ('suggested', 'requested', 'accepted')),
    breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_junior_mentor UNIQUE (junior_id, mentor_id)
);

CREATE INDEX IF NOT EXISTS idx_matches_junior ON matches(junior_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_matches_mentor ON matches(mentor_id, status);

-- ETag Cache Table for Rate Mitigation (Spec Section 5)
CREATE TABLE IF NOT EXISTS sync_etags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    resource_url TEXT NOT NULL,
    etag TEXT NOT NULL,
    cached_data JSONB,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_user_resource UNIQUE (user_id, resource_url)
);
