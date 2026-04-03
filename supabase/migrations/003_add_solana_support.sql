-- Add Solana support: chain_type column for cross-chain identity linking

ALTER TABLE linked_wallets
ADD COLUMN IF NOT EXISTS chain_type TEXT NOT NULL DEFAULT 'evm'
CHECK (chain_type IN ('evm', 'solana'));

ALTER TABLE credit_scores
ADD COLUMN IF NOT EXISTS chain_type TEXT NOT NULL DEFAULT 'evm'
CHECK (chain_type IN ('evm', 'solana'));

ALTER TABLE attestations
ADD COLUMN IF NOT EXISTS chain_type TEXT NOT NULL DEFAULT 'evm'
CHECK (chain_type IN ('evm', 'solana'));

CREATE INDEX IF NOT EXISTS idx_linked_wallets_chain_type ON linked_wallets (chain_type);
CREATE INDEX IF NOT EXISTS idx_credit_scores_chain_type ON credit_scores (chain_type);
CREATE INDEX IF NOT EXISTS idx_attestations_chain_type ON attestations (chain_type);

-- Allow service-role inserts for anonymous Solana scoring
CREATE POLICY "credit_scores_insert_service" ON credit_scores
    FOR INSERT WITH CHECK (true);

CREATE POLICY "attestations_insert_service" ON attestations
    FOR INSERT WITH CHECK (true);
