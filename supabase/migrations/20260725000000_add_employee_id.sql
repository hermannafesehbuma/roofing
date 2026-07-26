-- =============================================================================
-- EMPLOYEE ID
-- Human-facing employee number shown on the Add/Edit Employee panel
-- (e.g. 'QW1202303'). Distinct from users.id (UUID).
-- =============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_id TEXT;

CREATE INDEX IF NOT EXISTS idx_users_employee_id ON users(employee_id);
