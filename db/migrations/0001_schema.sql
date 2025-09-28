-- Base schema for UI Compare App
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  firebase_uid TEXT NOT NULL UNIQUE,
  display_name TEXT,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'viewer',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS comparisons (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  published_at TEXT,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS comparison_variants (
  id TEXT PRIMARY KEY,
  comparison_id TEXT NOT NULL REFERENCES comparisons(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  stackblitz_url TEXT NOT NULL,
  thumbnail_url TEXT,
  display_order INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (comparison_id, display_order)
);

CREATE TABLE IF NOT EXISTS vote_sessions (
  id TEXT PRIMARY KEY,
  comparison_id TEXT NOT NULL REFERENCES comparisons(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (comparison_id, user_id),
  UNIQUE (idempotency_key)
);

CREATE TABLE IF NOT EXISTS votes (
  id TEXT PRIMARY KEY,
  vote_session_id TEXT NOT NULL REFERENCES vote_sessions(id) ON DELETE CASCADE,
  comparison_id TEXT NOT NULL REFERENCES comparisons(id) ON DELETE CASCADE,
  variant_id TEXT NOT NULL REFERENCES comparison_variants(id) ON DELETE CASCADE,
  comment TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (vote_session_id)
);

CREATE INDEX IF NOT EXISTS idx_votes_comparison_id ON votes(comparison_id);
CREATE INDEX IF NOT EXISTS idx_vote_sessions_comparison_id ON vote_sessions(comparison_id);
