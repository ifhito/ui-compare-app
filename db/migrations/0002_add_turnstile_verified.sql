ALTER TABLE vote_sessions
ADD COLUMN turnstile_verified INTEGER NOT NULL DEFAULT 0;

UPDATE vote_sessions SET turnstile_verified = 1;
