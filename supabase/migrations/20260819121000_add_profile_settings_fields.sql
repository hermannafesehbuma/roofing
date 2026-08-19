-- Technician Profile Settings (Addendum Task 8)
--
-- The module-access table has always said Technician's Settings = "Profile
-- settings only", but no page existed and the columns it needs were never
-- added. Emergency contact is self-service; notification preferences are
-- per-user delivery choices (Task 7 #1 keeps the *thresholds* company-wide).

ALTER TABLE users
  ADD COLUMN emergency_contact_name  TEXT,
  ADD COLUMN emergency_contact_phone TEXT,
  -- { "<notification type>": { "in_app": bool, "email": bool } }
  -- JSONB rather than a join table: this is a small, per-user preference blob
  -- read only by the owner, never queried across users.
  ADD COLUMN notification_preferences JSONB NOT NULL DEFAULT '{}'::jsonb;
