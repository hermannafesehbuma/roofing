-- =============================================================================
-- TIME ENTRIES
-- The technician clock. Replaces the `time_logs` draft from the initial schema,
-- which no application code ever used.
--
-- Two deliberate differences from `time_logs`:
--
--   * The shift is stored as a local DATE plus wall-clock TIME pair rather than
--     a TIMESTAMPTZ. A timesheet asks "which day did the crew work, and from
--     when to when" — questions that must not change answer because the server
--     renders in UTC and the crew is in Mountain Time.
--   * GPS is a PostGIS geography point, so proximity questions ("was this punch
--     within 200m of the job site?") are index-backed instead of hand-rolled
--     haversine. `gps_lat` / `gps_lng` stay as plain numerics so the REST API
--     keeps returning readable coordinates; `geo` is derived from them.
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

-- Resolve postgis names whether the extension lives in `extensions` (Supabase's
-- default) or `public` (a bare CREATE EXTENSION on self-hosted).
SET search_path = public, extensions;

CREATE TYPE time_entry_status AS ENUM ('pending', 'approved', 'missed');

-- Codes are handed out by the sequence rather than by a read-then-increment in
-- application code, so two crews clocking in at once cannot collide.
CREATE SEQUENCE time_entry_code_seq;

CREATE TABLE time_entries (
  id             UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
  code           TEXT              NOT NULL UNIQUE
                                     DEFAULT 'TE-' || LPAD(nextval('time_entry_code_seq')::TEXT, 4, '0'),
  user_id        UUID              NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  project_id     UUID              REFERENCES projects(id) ON DELETE SET NULL,
  date           DATE              NOT NULL,
  clock_in       TIME              NOT NULL,
  clock_out      TIME,
  location       TEXT,
  note           TEXT,
  status         time_entry_status NOT NULL DEFAULT 'pending',

  gps_lat        NUMERIC(10, 7),
  gps_lng        NUMERIC(10, 7),
  -- WGS84 point for the clock-in punch, derived so it can never drift from the
  -- coordinates the API serves.
  geo            geography(Point, 4326) GENERATED ALWAYS AS (
                   CASE
                     WHEN gps_lat IS NULL OR gps_lng IS NULL THEN NULL
                     ELSE ST_SetSRID(ST_MakePoint(gps_lng::FLOAT8, gps_lat::FLOAT8), 4326)::geography
                   END
                 ) STORED,

  -- Elapsed shift length. A clock-out earlier than the clock-in means the shift
  -- crossed midnight, so it wraps rather than going negative.
  total_hours    NUMERIC(5, 2) GENERATED ALWAYS AS (
                   CASE
                     WHEN clock_out IS NULL THEN NULL
                     WHEN clock_out >= clock_in
                       THEN ROUND((EXTRACT(EPOCH FROM (clock_out - clock_in)) / 3600)::NUMERIC, 2)
                     ELSE ROUND((EXTRACT(EPOCH FROM (clock_out - clock_in + INTERVAL '24 hours')) / 3600)::NUMERIC, 2)
                   END
                 ) STORED,

  approved_by_id UUID              REFERENCES users(id) ON DELETE SET NULL,
  approved_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_time_entries_user_id    ON time_entries(user_id);
CREATE INDEX idx_time_entries_project_id ON time_entries(project_id);
CREATE INDEX idx_time_entries_status     ON time_entries(status);
CREATE INDEX idx_time_entries_date       ON time_entries(date DESC);
CREATE INDEX idx_time_entries_geo        ON time_entries USING GIST (geo);

-- One open punch per person: a forgotten clock-out must be corrected, not
-- stacked on top of.
CREATE UNIQUE INDEX idx_time_entries_one_open_punch
  ON time_entries(user_id) WHERE clock_out IS NULL;

CREATE TRIGGER trg_time_entries_updated_at
  BEFORE UPDATE ON time_entries FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Carry over any time_logs rows, then retire the table ──────────────────────
-- clock_in / clock_out were TIMESTAMPTZ; they are read back in the database's
-- own timezone, which is the closest thing to the wall clock that was recorded.
INSERT INTO time_entries (
  user_id, project_id, date, clock_in, clock_out, location, note, status,
  gps_lat, gps_lng, approved_by_id, approved_at, created_at
)
SELECT
  user_id,
  project_id,
  clock_in::DATE,
  clock_in::TIME,
  clock_out::TIME,
  location,
  notes,
  CASE status::TEXT WHEN 'approved' THEN 'approved' WHEN 'rejected' THEN 'missed' ELSE 'pending' END::time_entry_status,
  gps_lat,
  gps_lng,
  approved_by_id,
  approved_at,
  created_at
FROM time_logs;

DROP TABLE time_logs;
DROP TYPE time_log_status;

-- ── Row level security ────────────────────────────────────────────────────────
-- Mirrors the policies time_logs carried: crews manage their own punches,
-- admins see everything, managers read the whole team.
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "time_entries_own" ON time_entries FOR ALL
  USING (user_id = auth_user_id());

CREATE POLICY "time_entries_admin_all" ON time_entries FOR ALL
  USING (auth_user_role() = 'admin');

CREATE POLICY "time_entries_manager_read" ON time_entries FOR SELECT
  USING (auth_user_role() = 'manager');
