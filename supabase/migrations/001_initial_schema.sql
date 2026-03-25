-- CredBureau Initial Schema Migration
-- Creates the core tables, indexes, and RLS policies for the DeFi credit bureau.

-- =============================================================================
-- 1. users
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    primary_wallet TEXT UNIQUE NOT NULL,
    email       TEXT,
    settings    JSONB DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_primary_wallet ON users (primary_wallet);
CREATE INDEX idx_users_email ON users (email) WHERE email IS NOT NULL;

-- =============================================================================
-- 2. linked_wallets
-- =============================================================================
CREATE TABLE IF NOT EXISTS linked_wallets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    wallet_address  TEXT NOT NULL,
    chain           TEXT NOT NULL,
    linked_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    signature       TEXT,
    UNIQUE (wallet_address, chain)
);

CREATE INDEX idx_linked_wallets_user_id ON linked_wallets (user_id);
CREATE INDEX idx_linked_wallets_wallet_address ON linked_wallets (wallet_address);
CREATE INDEX idx_linked_wallets_chain ON linked_wallets (chain);

-- =============================================================================
-- 3. credit_scores
-- =============================================================================
CREATE TABLE IF NOT EXISTS credit_scores (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    wallet_address   TEXT NOT NULL,
    score            INTEGER NOT NULL CHECK (score >= 300 AND score <= 850),
    risk_tier        TEXT NOT NULL,
    breakdown        JSONB DEFAULT '{}'::jsonb,
    model_version    INTEGER NOT NULL DEFAULT 1,
    chains           TEXT[] DEFAULT '{}',
    has_offchain_data BOOLEAN DEFAULT false,
    confidence       DOUBLE PRECISION,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_credit_scores_user_id ON credit_scores (user_id);
CREATE INDEX idx_credit_scores_wallet_address ON credit_scores (wallet_address);
CREATE INDEX idx_credit_scores_created_at ON credit_scores (created_at DESC);
CREATE INDEX idx_credit_scores_score ON credit_scores (score);

-- =============================================================================
-- 4. attestations
-- =============================================================================
CREATE TABLE IF NOT EXISTS attestations (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    score_id         UUID NOT NULL REFERENCES credit_scores (id) ON DELETE CASCADE,
    attestation_uid  TEXT,
    chain            TEXT,
    tx_hash          TEXT,
    schema_uid       TEXT,
    is_onchain       BOOLEAN DEFAULT false,
    expires_at       TIMESTAMPTZ,
    revoked          BOOLEAN DEFAULT false,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_attestations_user_id ON attestations (user_id);
CREATE INDEX idx_attestations_score_id ON attestations (score_id);
CREATE INDEX idx_attestations_attestation_uid ON attestations (attestation_uid);
CREATE INDEX idx_attestations_chain ON attestations (chain);
CREATE INDEX idx_attestations_expires_at ON attestations (expires_at) WHERE expires_at IS NOT NULL;

-- =============================================================================
-- 5. offchain_verifications
-- =============================================================================
CREATE TABLE IF NOT EXISTS offchain_verifications (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    verification_type   TEXT NOT NULL,
    proof_hash          TEXT,
    verified_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at          TIMESTAMPTZ,
    metadata            JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_offchain_verifications_user_id ON offchain_verifications (user_id);
CREATE INDEX idx_offchain_verifications_type ON offchain_verifications (verification_type);
CREATE INDEX idx_offchain_verifications_expires_at ON offchain_verifications (expires_at) WHERE expires_at IS NOT NULL;

-- =============================================================================
-- 6. api_keys
-- =============================================================================
CREATE TABLE IF NOT EXISTS api_keys (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    key_hash     TEXT UNIQUE NOT NULL,
    name         TEXT,
    tier         TEXT NOT NULL DEFAULT 'free',
    rate_limit   INTEGER NOT NULL DEFAULT 100,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_used_at TIMESTAMPTZ,
    revoked      BOOLEAN DEFAULT false
);

CREATE INDEX idx_api_keys_user_id ON api_keys (user_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys (key_hash);
CREATE INDEX idx_api_keys_tier ON api_keys (tier);

-- =============================================================================
-- 7. webhooks
-- =============================================================================
CREATE TABLE IF NOT EXISTS webhooks (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    url        TEXT NOT NULL,
    events     TEXT[] DEFAULT '{}',
    secret     TEXT,
    active     BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_webhooks_user_id ON webhooks (user_id);
CREATE INDEX idx_webhooks_active ON webhooks (active) WHERE active = true;

-- =============================================================================
-- 8. waitlist
-- =============================================================================
CREATE TABLE IF NOT EXISTS waitlist (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           TEXT UNIQUE NOT NULL,
    wallet_address  TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_waitlist_email ON waitlist (email);
CREATE INDEX idx_waitlist_created_at ON waitlist (created_at DESC);

-- =============================================================================
-- Row Level Security (RLS)
-- =============================================================================

-- Enable RLS on every table
ALTER TABLE users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE linked_wallets       ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_scores        ENABLE ROW LEVEL SECURITY;
ALTER TABLE attestations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE offchain_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys             ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks             ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist             ENABLE ROW LEVEL SECURITY;

-- users: owners can read/update their own row
CREATE POLICY "users_select_own" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_update_own" ON users
    FOR UPDATE USING (auth.uid() = id);

-- linked_wallets: owners can manage their own wallets
CREATE POLICY "linked_wallets_select_own" ON linked_wallets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "linked_wallets_insert_own" ON linked_wallets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "linked_wallets_delete_own" ON linked_wallets
    FOR DELETE USING (auth.uid() = user_id);

-- credit_scores: owners can read their own scores
CREATE POLICY "credit_scores_select_own" ON credit_scores
    FOR SELECT USING (auth.uid() = user_id);

-- attestations: owners can read their own attestations
CREATE POLICY "attestations_select_own" ON attestations
    FOR SELECT USING (auth.uid() = user_id);

-- offchain_verifications: owners can read their own verifications
CREATE POLICY "offchain_verifications_select_own" ON offchain_verifications
    FOR SELECT USING (auth.uid() = user_id);

-- api_keys: owners can manage their own keys
CREATE POLICY "api_keys_select_own" ON api_keys
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "api_keys_insert_own" ON api_keys
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "api_keys_update_own" ON api_keys
    FOR UPDATE USING (auth.uid() = user_id);

-- webhooks: owners can manage their own webhooks
CREATE POLICY "webhooks_select_own" ON webhooks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "webhooks_insert_own" ON webhooks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "webhooks_update_own" ON webhooks
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "webhooks_delete_own" ON webhooks
    FOR DELETE USING (auth.uid() = user_id);

-- waitlist: anyone can insert (public sign-up), but only service role can read
CREATE POLICY "waitlist_insert_public" ON waitlist
    FOR INSERT WITH CHECK (true);

-- =============================================================================
-- Trigger: auto-update updated_at on users
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
