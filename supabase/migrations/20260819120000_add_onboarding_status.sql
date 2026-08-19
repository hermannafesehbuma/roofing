-- Onboarding status (Addendum Task 4)
--
-- Distinct from the two statuses that already exist:
--   users.status         — HR state (active / on_leave / inactive)
--   clients.portal_status — whether the portal login is usable
-- This tracks only the invite lifecycle: has this person activated the account
-- we created for them?
--
-- 'expired' is stored for completeness but is normally DERIVED at read time
-- from invited_at + the expiry window (see lib/onboarding.ts), so an invite
-- goes stale without needing a cron to sweep it.

CREATE TYPE onboarding_status AS ENUM ('invited', 'active', 'expired');

ALTER TABLE users
  ADD COLUMN onboarding_status onboarding_status NOT NULL DEFAULT 'invited',
  ADD COLUMN invited_at        TIMESTAMPTZ,
  ADD COLUMN activated_at      TIMESTAMPTZ;

ALTER TABLE clients
  ADD COLUMN onboarding_status onboarding_status NOT NULL DEFAULT 'invited',
  ADD COLUMN invited_at        TIMESTAMPTZ,
  ADD COLUMN activated_at      TIMESTAMPTZ;

-- Everyone who already exists predates invites and is by definition using the
-- app, so backfill them as active rather than showing the whole directory as
-- "Invited" the moment this ships.
UPDATE users
   SET onboarding_status = 'active',
       activated_at      = created_at;

UPDATE clients
   SET onboarding_status = CASE WHEN portal_status = 'active' THEN 'active'::onboarding_status
                                ELSE 'invited'::onboarding_status END,
       activated_at      = CASE WHEN portal_status = 'active' THEN created_at ELSE NULL END,
       invited_at        = CASE WHEN portal_status = 'active' THEN NULL ELSE created_at END;

CREATE INDEX users_onboarding_status_idx   ON users (onboarding_status);
CREATE INDEX clients_onboarding_status_idx ON clients (onboarding_status);

-- clients.portal_user_id: schema said auth.users(id), but every reader in the
-- app treats it as a public.users(id) — documents/actions.ts scopes a client's
-- projects with it, and invoices/actions.ts writes it straight into
-- notifications.user_id, which is a users(id) FK. Nothing wrote the column
-- until the client invite flow, so repoint it to the meaning the code already
-- assumes rather than leaving two contradictory definitions.
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_portal_user_id_fkey;
ALTER TABLE clients
  ADD CONSTRAINT clients_portal_user_id_fkey
  FOREIGN KEY (portal_user_id) REFERENCES users(id) ON DELETE SET NULL;
