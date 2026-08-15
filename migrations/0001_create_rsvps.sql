CREATE TABLE IF NOT EXISTS rsvps (
  id TEXT PRIMARY KEY,
  guest_name TEXT NOT NULL,
  attendance TEXT NOT NULL CHECK (attendance IN ('yes', 'no')),
  party_size INTEGER NOT NULL DEFAULT 0 CHECK (party_size BETWEEN 0 AND 6),
  phone TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  edit_token_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rsvps_attendance ON rsvps(attendance);
CREATE INDEX IF NOT EXISTS idx_rsvps_updated_at ON rsvps(updated_at DESC);

CREATE TABLE IF NOT EXISTS admin_login_attempts (
  ip TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL DEFAULT 0,
  first_attempt_at INTEGER NOT NULL,
  blocked_until INTEGER NOT NULL DEFAULT 0
);
