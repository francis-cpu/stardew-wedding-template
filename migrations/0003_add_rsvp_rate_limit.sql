CREATE TABLE IF NOT EXISTS rsvp_submissions (
  ip TEXT PRIMARY KEY,
  submissions INTEGER NOT NULL DEFAULT 0,
  first_submitted_at INTEGER NOT NULL,
  blocked_until INTEGER NOT NULL DEFAULT 0
);
