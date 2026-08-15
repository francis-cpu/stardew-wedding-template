ALTER TABLE rsvps ADD COLUMN needs_accommodation INTEGER NOT NULL DEFAULT 0 CHECK (needs_accommodation IN (0, 1));
ALTER TABLE rsvps ADD COLUMN check_in_at TEXT;
ALTER TABLE rsvps ADD COLUMN check_out_at TEXT;

CREATE INDEX IF NOT EXISTS idx_rsvps_needs_accommodation ON rsvps(needs_accommodation);
