-- Allow anonymous scoring (API routes may not have a user_id for public score lookups)
ALTER TABLE credit_scores ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE attestations ALTER COLUMN user_id DROP NOT NULL;
