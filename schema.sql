-- =============================================================================
-- Peak Roofing Co. — Database Schema
-- PostgreSQL via Supabase
-- Paste into the Supabase SQL Editor and run, or execute via psql.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE user_role               AS ENUM ('admin', 'manager', 'technician', 'client');
CREATE TYPE user_status             AS ENUM ('active', 'on_leave', 'inactive');
CREATE TYPE employee_type           AS ENUM ('full_time', 'part_time', 'contractor', 'subcontractor');

CREATE TYPE project_status          AS ENUM ('in_progress', 'completed', 'on_hold');
CREATE TYPE project_type            AS ENUM ('residential', 'commercial');

CREATE TYPE lead_stage              AS ENUM ('new_lead', 'contacted', 'proposal_sent', 'lost', 'won', 'closed');
CREATE TYPE lead_source             AS ENUM ('referral', 'website', 'cold_call', 'mobile', 'social');
CREATE TYPE client_portal_status    AS ENUM ('active', 'invited', 'inactive');

CREATE TYPE task_status             AS ENUM ('todo', 'in_progress', 'in_review', 'completed');
CREATE TYPE task_priority           AS ENUM ('high', 'medium', 'low');

CREATE TYPE work_order_status       AS ENUM ('open', 'closed');
CREATE TYPE work_order_priority     AS ENUM ('high', 'mid', 'low');

CREATE TYPE time_log_status         AS ENUM ('pending', 'approved', 'rejected');

CREATE TYPE invoice_status          AS ENUM ('draft', 'sent', 'paid', 'overdue', 'partial');
CREATE TYPE recurring_frequency     AS ENUM ('monthly', 'quarterly', 'annual');
CREATE TYPE payment_method          AS ENUM ('bank_transfer', 'check', 'card');
CREATE TYPE payment_status          AS ENUM ('cleared', 'pending');

CREATE TYPE rfi_status              AS ENUM ('open', 'in_review', 'closed');
CREATE TYPE inspection_result       AS ENUM ('pass', 'fail');
CREATE TYPE document_type           AS ENUM ('submittal', 'drawing', 'other');
CREATE TYPE document_status         AS ENUM ('pending', 'in_review', 'approved');

CREATE TYPE insurance_policy_status AS ENUM ('valid', 'expiring_soon', 'expired');
CREATE TYPE coverage_type           AS ENUM ('general_liability', 'workers_comp', 'auto_liability', 'umbrella');
CREATE TYPE certification_status    AS ENUM ('valid', 'expiring_soon', 'expired');

CREATE TYPE inventory_status        AS ENUM ('in_stock', 'low_stock', 'out_of_stock');
CREATE TYPE material_request_status AS ENUM ('pending', 'approved', 'fulfilled', 'rejected');
CREATE TYPE purchase_order_status   AS ENUM ('draft', 'sent', 'received');

CREATE TYPE payroll_status          AS ENUM ('draft', 'processed', 'paid');

-- =============================================================================
-- HELPER — auto-update updated_at
-- =============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- USERS
-- Internal staff only (admin / manager / technician).
-- Linked to Supabase Auth via supabase_id.
-- manager_id is a self-reference for org hierarchy.
-- =============================================================================

CREATE TABLE users (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  supabase_id   UUID        UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT        UNIQUE NOT NULL,
  first_name    TEXT        NOT NULL,
  last_name     TEXT        NOT NULL,
  role          user_role   NOT NULL DEFAULT 'technician',
  status        user_status NOT NULL DEFAULT 'active',
  phone         TEXT,
  department    TEXT,
  employee_type employee_type,
  gender        TEXT,
  rate_of_pay   NUMERIC(10, 2),
  start_date    DATE,
  avatar_url    TEXT,
  manager_id    UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_role       ON users(role);
CREATE INDEX idx_users_manager_id ON users(manager_id);

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- CLIENTS
-- External clients. portal_user_id links to auth.users when portal is granted.
-- =============================================================================

CREATE TABLE clients (
  id              UUID                 PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT                 NOT NULL,
  email           TEXT                 UNIQUE NOT NULL,
  phone           TEXT,
  company         TEXT,
  address         TEXT,
  manager_id      UUID                 REFERENCES users(id) ON DELETE SET NULL,
  portal_user_id  UUID                 UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  portal_status   client_portal_status NOT NULL DEFAULT 'invited',
  created_at      TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ          NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_clients_manager_id ON clients(manager_id);

CREATE TRIGGER trg_clients_updated_at
  BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- LEADS
-- CRM pipeline: new_lead → contacted → proposal_sent → won → (Client created)
-- converted_client_id is set when a won lead is converted to a client.
-- =============================================================================

CREATE TABLE leads (
  id                   UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name           TEXT        NOT NULL,
  last_name            TEXT        NOT NULL,
  company              TEXT,
  email                TEXT,
  phone                TEXT,
  address              TEXT,
  stage                lead_stage  NOT NULL DEFAULT 'new_lead',
  source               lead_source,
  expected_value       NUMERIC(12, 2),
  assigned_rep_id      UUID        REFERENCES users(id) ON DELETE SET NULL,
  notes                TEXT,
  days_in_stage        INT         NOT NULL DEFAULT 0,
  converted_client_id  UUID        UNIQUE REFERENCES clients(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leads_stage           ON leads(stage);
CREATE INDEX idx_leads_assigned_rep_id ON leads(assigned_rep_id);

CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- PROJECTS
-- Central entity. code = human-readable display ID ("PRJ-001").
-- progress is 0–100. spent tracks actual costs vs budget.
-- =============================================================================

CREATE TABLE projects (
  id          UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  code        TEXT           UNIQUE NOT NULL,
  name        TEXT           NOT NULL,
  type        project_type   NOT NULL,
  status      project_status NOT NULL DEFAULT 'in_progress',
  location    TEXT,
  description TEXT,
  manager_id  UUID           REFERENCES users(id) ON DELETE SET NULL,
  client_id   UUID           REFERENCES clients(id) ON DELETE SET NULL,
  start_date  DATE,
  due_date    DATE,
  budget      NUMERIC(12, 2),
  spent       NUMERIC(12, 2) NOT NULL DEFAULT 0,
  progress    SMALLINT       NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  image_url   TEXT,
  created_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_status     ON projects(status);
CREATE INDEX idx_projects_manager_id ON projects(manager_id);
CREATE INDEX idx_projects_client_id  ON projects(client_id);

CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- PROJECT MEMBERS
-- Junction — which users are crew on which projects, with a per-project role.
-- =============================================================================

CREATE TABLE project_members (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  crew_role  TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, user_id)
);

CREATE INDEX idx_project_members_project_id ON project_members(project_id);
CREATE INDEX idx_project_members_user_id    ON project_members(user_id);

-- =============================================================================
-- TASKS
-- Project-scoped kanban items (To Do / In Progress / In Review / Completed).
-- =============================================================================

CREATE TABLE tasks (
  id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID          NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title       TEXT          NOT NULL,
  description TEXT,
  status      task_status   NOT NULL DEFAULT 'todo',
  priority    task_priority NOT NULL DEFAULT 'medium',
  assignee_id UUID          REFERENCES users(id) ON DELETE SET NULL,
  due_date    DATE,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_project_id_status ON tasks(project_id, status);
CREATE INDEX idx_tasks_assignee_id       ON tasks(assignee_id);

CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- WORK ORDERS
-- Project-scoped field work items, assigned to a technician.
-- =============================================================================

CREATE TABLE work_orders (
  id            UUID                PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id    UUID                NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name          TEXT                NOT NULL,
  description   TEXT,
  priority      work_order_priority NOT NULL DEFAULT 'mid',
  status        work_order_status   NOT NULL DEFAULT 'open',
  technician_id UUID                REFERENCES users(id) ON DELETE SET NULL,
  due_date      DATE,
  closed_at     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_work_orders_project_id_status ON work_orders(project_id, status);

CREATE TRIGGER trg_work_orders_updated_at
  BEFORE UPDATE ON work_orders FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- TIME LOGS
-- GPS clock-in/out with manager approval workflow.
-- total_hours is computed on clock-out and stored for reporting.
-- =============================================================================

CREATE TABLE time_logs (
  id             UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id     UUID            REFERENCES projects(id) ON DELETE SET NULL,
  location       TEXT,
  clock_in       TIMESTAMPTZ     NOT NULL,
  clock_out      TIMESTAMPTZ,
  total_hours    NUMERIC(5, 2),
  status         time_log_status NOT NULL DEFAULT 'pending',
  notes          TEXT,
  gps_lat        NUMERIC(10, 7),
  gps_lng        NUMERIC(10, 7),
  approved_by_id UUID            REFERENCES users(id) ON DELETE SET NULL,
  approved_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_time_logs_user_id    ON time_logs(user_id);
CREATE INDEX idx_time_logs_project_id ON time_logs(project_id);
CREATE INDEX idx_time_logs_status     ON time_logs(status);

CREATE TRIGGER trg_time_logs_updated_at
  BEFORE UPDATE ON time_logs FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- RECURRING PLANS
-- Auto-generate invoices on a Monthly / Quarterly / Annual schedule.
-- =============================================================================

CREATE TABLE recurring_plans (
  id          UUID                PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id   UUID                REFERENCES clients(id) ON DELETE SET NULL,
  description TEXT                NOT NULL,
  amount      NUMERIC(12, 2)      NOT NULL,
  frequency   recurring_frequency NOT NULL,
  next_date   DATE                NOT NULL,
  is_active   BOOLEAN             NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_recurring_plans_updated_at
  BEFORE UPDATE ON recurring_plans FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- INVOICES
-- Full lifecycle: Draft → Sent → Paid / Overdue.
-- tax_rate stored as a decimal fraction (e.g. 0.0825 = 8.25%).
-- stripe_payment_id set after Stripe checkout.
-- =============================================================================

CREATE TABLE invoices (
  id                UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number    TEXT           UNIQUE NOT NULL,
  project_id        UUID           REFERENCES projects(id)       ON DELETE SET NULL,
  client_id         UUID           REFERENCES clients(id)        ON DELETE SET NULL,
  recurring_plan_id UUID           REFERENCES recurring_plans(id) ON DELETE SET NULL,
  status            invoice_status NOT NULL DEFAULT 'draft',
  issued_date       DATE           NOT NULL,
  due_date          DATE           NOT NULL,
  subtotal          NUMERIC(12, 2) NOT NULL,
  tax_rate          NUMERIC(5, 4)  NOT NULL DEFAULT 0,
  tax_amount        NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total             NUMERIC(12, 2) NOT NULL,
  notes             TEXT,
  stripe_payment_id TEXT           UNIQUE,
  sent_at           TIMESTAMPTZ,
  paid_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoices_client_id  ON invoices(client_id);
CREATE INDEX idx_invoices_project_id ON invoices(project_id);
CREATE INDEX idx_invoices_status     ON invoices(status);

CREATE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- INVOICE ITEMS
-- Line items belonging to an invoice. amount = quantity × unit_price.
-- =============================================================================

CREATE TABLE invoice_items (
  id          UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id  UUID           NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT           NOT NULL,
  quantity    NUMERIC(10, 2) NOT NULL,
  unit_price  NUMERIC(12, 2) NOT NULL,
  amount      NUMERIC(12, 2) NOT NULL
);

CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);

-- =============================================================================
-- PAYMENTS
-- Individual payment records logged against an invoice.
-- =============================================================================

CREATE TABLE payments (
  id         UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID           NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount     NUMERIC(12, 2) NOT NULL,
  method     payment_method NOT NULL,
  reference  TEXT,
  status     payment_status NOT NULL DEFAULT 'pending',
  paid_at    TIMESTAMPTZ    NOT NULL,
  created_at TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);

-- =============================================================================
-- RFIs (Requests for Information)
-- Filed by technicians on a project; resolved by managers/admins.
-- =============================================================================

CREATE TABLE rfis (
  id              UUID       PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id      UUID       NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  submitted_by_id UUID       NOT NULL REFERENCES users(id)    ON DELETE RESTRICT,
  title           TEXT       NOT NULL,
  description     TEXT,
  status          rfi_status NOT NULL DEFAULT 'open',
  due_date        DATE,
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rfis_project_id_status ON rfis(project_id, status);

CREATE TRIGGER trg_rfis_updated_at
  BEFORE UPDATE ON rfis FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- RFI COMMENTS
-- Threaded discussion on an RFI.
-- =============================================================================

CREATE TABLE rfi_comments (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  rfi_id     UUID        NOT NULL REFERENCES rfis(id)   ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES users(id)  ON DELETE RESTRICT,
  content    TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rfi_comments_rfi_id ON rfi_comments(rfi_id);

-- =============================================================================
-- INSPECTIONS
-- Pass / Fail log entries per project.
-- =============================================================================

CREATE TABLE inspections (
  id           UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id   UUID              NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  inspector_id UUID              NOT NULL REFERENCES users(id)    ON DELETE RESTRICT,
  title        TEXT              NOT NULL,
  result       inspection_result NOT NULL,
  notes        TEXT,
  inspected_at TIMESTAMPTZ       NOT NULL,
  created_at   TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inspections_project_id ON inspections(project_id);

-- =============================================================================
-- DOCUMENTS
-- Submittals, drawings, and other files stored in Supabase Storage.
-- =============================================================================

CREATE TABLE documents (
  id             UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id     UUID            NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  uploaded_by_id UUID            NOT NULL REFERENCES users(id)    ON DELETE RESTRICT,
  name           TEXT            NOT NULL,
  type           document_type   NOT NULL DEFAULT 'other',
  status         document_status NOT NULL DEFAULT 'pending',
  url            TEXT            NOT NULL,
  size_bytes     INT,
  mime_type      TEXT,
  created_at     TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_project_id_type ON documents(project_id, type);

CREATE TRIGGER trg_documents_updated_at
  BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- INSURANCE POLICIES (COIs)
-- Company-level certificates of insurance with expiry alerting.
-- renewal_reminder = days before expiry_date to fire an alert.
-- =============================================================================

CREATE TABLE insurance_policies (
  id               UUID                  PRIMARY KEY DEFAULT uuid_generate_v4(),
  policy_holder    TEXT                  NOT NULL,
  coverage_type    coverage_type         NOT NULL,
  insurer          TEXT                  NOT NULL,
  policy_number    TEXT                  UNIQUE NOT NULL,
  coverage_amount  NUMERIC(14, 2),
  effective_date   DATE                  NOT NULL,
  expiry_date      DATE                  NOT NULL,
  renewal_reminder INT,
  status           insurance_policy_status NOT NULL DEFAULT 'valid',
  file_url         TEXT,
  created_at       TIMESTAMPTZ           NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ           NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_insurance_policies_status      ON insurance_policies(status);
CREATE INDEX idx_insurance_policies_expiry_date ON insurance_policies(expiry_date);

CREATE TRIGGER trg_insurance_policies_updated_at
  BEFORE UPDATE ON insurance_policies FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- CERTIFICATIONS
-- Per-employee trade certifications (OSHA, licenses, etc.).
-- =============================================================================

CREATE TABLE certifications (
  id           UUID                 PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID                 NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cert_name    TEXT                 NOT NULL,
  issuing_body TEXT                 NOT NULL,
  department   TEXT,
  issue_date   DATE                 NOT NULL,
  expiry_date  DATE                 NOT NULL,
  status       certification_status NOT NULL DEFAULT 'valid',
  file_url     TEXT,
  created_at   TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ          NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_certifications_user_id     ON certifications(user_id);
CREATE INDEX idx_certifications_expiry_date ON certifications(expiry_date);

CREATE TRIGGER trg_certifications_updated_at
  BEFORE UPDATE ON certifications FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- INVENTORY ITEMS
-- SKU catalog. Status auto-derives from qty_on_hand vs min_threshold,
-- but is stored explicitly so it can be indexed and filtered.
-- =============================================================================

CREATE TABLE inventory_items (
  id              UUID             PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT             NOT NULL,
  sku             TEXT             UNIQUE NOT NULL,
  category        TEXT,
  unit_of_measure TEXT             NOT NULL,
  qty_on_hand     NUMERIC(10, 2)   NOT NULL DEFAULT 0,
  min_threshold   NUMERIC(10, 2)   NOT NULL DEFAULT 0,
  unit_cost       NUMERIC(12, 2)   NOT NULL,
  supplier        TEXT,
  status          inventory_status NOT NULL DEFAULT 'in_stock',
  note            TEXT,
  created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inventory_items_status ON inventory_items(status);

CREATE TRIGGER trg_inventory_items_updated_at
  BEFORE UPDATE ON inventory_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- MATERIAL REQUESTS
-- Technicians request materials for a project; admin/manager fulfils.
-- =============================================================================

CREATE TABLE material_requests (
  id                 UUID                    PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id         UUID                    NOT NULL REFERENCES projects(id)        ON DELETE CASCADE,
  requested_by_id    UUID                    NOT NULL REFERENCES users(id)           ON DELETE RESTRICT,
  inventory_item_id  UUID                    NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  quantity_requested NUMERIC(10, 2)          NOT NULL,
  status             material_request_status NOT NULL DEFAULT 'pending',
  notes              TEXT,
  created_at         TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ             NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_material_requests_project_id        ON material_requests(project_id);
CREATE INDEX idx_material_requests_inventory_item_id ON material_requests(inventory_item_id);

CREATE TRIGGER trg_material_requests_updated_at
  BEFORE UPDATE ON material_requests FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- PURCHASE ORDERS
-- Admin restocking orders sent to suppliers.
-- =============================================================================

CREATE TABLE purchase_orders (
  id                UUID                  PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventory_item_id UUID                  NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  quantity          NUMERIC(10, 2)        NOT NULL,
  supplier          TEXT,
  unit_cost         NUMERIC(12, 2)        NOT NULL,
  total_cost        NUMERIC(12, 2)        NOT NULL,
  status            purchase_order_status NOT NULL DEFAULT 'draft',
  ordered_at        TIMESTAMPTZ,
  received_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ           NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_purchase_orders_item_status ON purchase_orders(inventory_item_id, status);

-- =============================================================================
-- PAYROLL
-- Pay-period records derived from approved time_logs.
-- =============================================================================

CREATE TABLE payroll (
  id               UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID           NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pay_period_start DATE           NOT NULL,
  pay_period_end   DATE           NOT NULL,
  hours_worked     NUMERIC(7, 2),
  gross_pay        NUMERIC(12, 2) NOT NULL,
  deductions       NUMERIC(12, 2) NOT NULL DEFAULT 0,
  net_pay          NUMERIC(12, 2) NOT NULL,
  status           payroll_status NOT NULL DEFAULT 'draft',
  processed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payroll_user_id ON payroll(user_id);
CREATE INDEX idx_payroll_period  ON payroll(pay_period_start, pay_period_end);

-- =============================================================================
-- MESSAGES
-- Internal inbox. project_id and client_id are optional tags.
-- =============================================================================

CREATE TABLE messages (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id  UUID        NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  project_id UUID        REFERENCES projects(id) ON DELETE SET NULL,
  client_id  UUID        REFERENCES clients(id)  ON DELETE SET NULL,
  subject    TEXT,
  body       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_sender_id  ON messages(sender_id);
CREATE INDEX idx_messages_project_id ON messages(project_id);

-- =============================================================================
-- MESSAGE RECIPIENTS
-- read_at = NULL means unread.
-- =============================================================================

CREATE TABLE message_recipients (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id   UUID        NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  recipient_id UUID        NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  read_at      TIMESTAMPTZ,
  UNIQUE (message_id, recipient_id)
);

CREATE INDEX idx_message_recipients_recipient_id ON message_recipients(recipient_id);

-- =============================================================================
-- MESSAGE ATTACHMENTS
-- Files stored in Supabase Storage. 10 MB limit enforced by CHECK.
-- =============================================================================

CREATE TABLE message_attachments (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID        NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  url        TEXT        NOT NULL,
  size_bytes INT         CHECK (size_bytes <= 10485760),
  mime_type  TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_message_attachments_message_id ON message_attachments(message_id);

-- =============================================================================
-- NOTIFICATIONS
-- System-generated alerts (cert expiry, RFI filed, time approval, etc.).
-- Fired by Supabase Edge Functions or database triggers.
-- type discriminator values:
--   'rfi' | 'cert_expiry' | 'coi_expiry' | 'invoice' |
--   'time_approval' | 'project_assigned' | 'message'
-- =============================================================================

CREATE TABLE notifications (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT        NOT NULL,
  body       TEXT,
  type       TEXT        NOT NULL,
  entity_id  UUID,
  is_read    BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id_is_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created_at      ON notifications(created_at DESC);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients              ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads                ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects             ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members      ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks                ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders          ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_logs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_plans      ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices             ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments             ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfis                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfi_comments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections          ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents            ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_policies   ENABLE ROW LEVEL SECURITY;
ALTER TABLE certifications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_requests    ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll              ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages             ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_recipients   ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications        ENABLE ROW LEVEL SECURITY;

-- ── Helpers for RLS policies ─────────────────────────────────────────────────

-- Returns the internal users.id for the currently authenticated Supabase user.
CREATE OR REPLACE FUNCTION auth_user_id()
RETURNS UUID AS $$
  SELECT id FROM users WHERE supabase_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Returns the role of the currently authenticated Supabase user.
CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS user_role AS $$
  SELECT role FROM users WHERE supabase_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── users ─────────────────────────────────────────────────────────────────────
-- Admin: full access. Everyone else: read own row only.
CREATE POLICY "users_admin_all"   ON users FOR ALL    USING (auth_user_role() = 'admin');
CREATE POLICY "users_self_read"   ON users FOR SELECT USING (supabase_id = auth.uid());
CREATE POLICY "users_self_update" ON users FOR UPDATE USING (supabase_id = auth.uid());

-- ── projects ──────────────────────────────────────────────────────────────────
-- Admin / manager: full access.
-- Technician: read only projects they are a member of.
CREATE POLICY "projects_admin_manager_all" ON projects FOR ALL
  USING (auth_user_role() IN ('admin', 'manager'));

CREATE POLICY "projects_technician_assigned" ON projects FOR SELECT
  USING (
    auth_user_role() = 'technician'
    AND id IN (
      SELECT project_id FROM project_members WHERE user_id = auth_user_id()
    )
  );

-- ── time_logs ─────────────────────────────────────────────────────────────────
-- Users manage their own logs. Admins see everything.
CREATE POLICY "time_logs_own"       ON time_logs FOR ALL    USING (user_id = auth_user_id());
CREATE POLICY "time_logs_admin_all" ON time_logs FOR ALL    USING (auth_user_role() = 'admin');
CREATE POLICY "time_logs_manager_read" ON time_logs FOR SELECT
  USING (auth_user_role() = 'manager');

-- ── payroll ───────────────────────────────────────────────────────────────────
-- Employees read their own. Admins manage all.
CREATE POLICY "payroll_own_read"  ON payroll FOR SELECT USING (user_id = auth_user_id());
CREATE POLICY "payroll_admin_all" ON payroll FOR ALL    USING (auth_user_role() = 'admin');

-- ── invoices ──────────────────────────────────────────────────────────────────
CREATE POLICY "invoices_admin_manager_all" ON invoices FOR ALL
  USING (auth_user_role() IN ('admin', 'manager'));

-- ── notifications ─────────────────────────────────────────────────────────────
CREATE POLICY "notifications_own" ON notifications FOR ALL USING (user_id = auth_user_id());

-- ── certifications ────────────────────────────────────────────────────────────
-- Users see their own; admins see all.
CREATE POLICY "certifications_own"       ON certifications FOR SELECT USING (user_id = auth_user_id());
CREATE POLICY "certifications_admin_all" ON certifications FOR ALL    USING (auth_user_role() = 'admin');

-- ── messages / recipients ─────────────────────────────────────────────────────
CREATE POLICY "messages_sender" ON messages FOR ALL USING (sender_id = auth_user_id());
CREATE POLICY "messages_admin"  ON messages FOR ALL USING (auth_user_role() = 'admin');

CREATE POLICY "message_recipients_own"   ON message_recipients FOR ALL
  USING (recipient_id = auth_user_id());
CREATE POLICY "message_recipients_admin" ON message_recipients FOR ALL
  USING (auth_user_role() = 'admin');

-- =============================================================================
-- ROLE PERMISSIONS & AUDIT LOGS
-- =============================================================================

CREATE TABLE role_permissions (
  id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  role            TEXT         NOT NULL,
  permission_id   TEXT         NOT NULL,
  module          TEXT         NOT NULL,
  is_enabled      BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (role, permission_id)
);

CREATE TRIGGER trg_role_permissions_updated_at
  BEFORE UPDATE ON role_permissions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE audit_logs (
  id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID         REFERENCES users(id) ON DELETE SET NULL,
  actor_name  TEXT         NOT NULL,
  email       TEXT         NOT NULL,
  action      TEXT         NOT NULL,
  module      TEXT         NOT NULL,
  ip_address  TEXT         NOT NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- RLS policies
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs        ENABLE ROW LEVEL SECURITY;

CREATE POLICY "role_permissions_read_all" ON role_permissions FOR SELECT USING (TRUE);
CREATE POLICY "role_permissions_write_admin" ON role_permissions FOR ALL USING (auth_user_role() = 'admin');

CREATE POLICY "audit_logs_read_admin" ON audit_logs FOR SELECT USING (auth_user_role() = 'admin');
CREATE POLICY "audit_logs_write_all" ON audit_logs FOR INSERT WITH CHECK (TRUE);

-- SEED DATA
-- Seed Role Permissions
INSERT INTO role_permissions (role, permission_id, module, is_enabled) VALUES
  ('admin', 'create_projects', 'Projects', TRUE),
  ('admin', 'view_projects', 'Projects', TRUE),
  ('admin', 'edit_projects', 'Projects', TRUE),
  ('admin', 'add_staff', 'Staff', TRUE),
  ('admin', 'manage_staff_accounts', 'Staff', TRUE),
  ('admin', 'export_reports', 'Staff', TRUE),
  ('admin', 'assign_crew', 'Staff', TRUE),
  ('admin', 'access_invoicing', 'Finance', TRUE),
  ('admin', 'create_task', 'Task', TRUE),
  ('admin', 'assign_task', 'Task', TRUE),
  ('admin', 'view_task', 'Task', TRUE),
  ('admin', 'add_lead', 'CRM', TRUE),
  ('admin', 'view_crm_leads', 'CRM', TRUE),

  ('manager', 'create_projects', 'Projects', FALSE),
  ('manager', 'view_projects', 'Projects', TRUE),
  ('manager', 'edit_projects', 'Projects', FALSE),
  ('manager', 'add_staff', 'Staff', TRUE),
  ('manager', 'manage_staff_accounts', 'Staff', TRUE),
  ('manager', 'export_reports', 'Staff', TRUE),
  ('manager', 'assign_crew', 'Staff', TRUE),
  ('manager', 'access_invoicing', 'Finance', TRUE),
  ('manager', 'create_task', 'Task', TRUE),
  ('manager', 'assign_task', 'Task', TRUE),
  ('manager', 'view_task', 'Task', TRUE),
  ('manager', 'add_lead', 'CRM', FALSE),
  ('manager', 'view_crm_leads', 'CRM', FALSE),

  ('technician', 'create_projects', 'Projects', FALSE),
  ('technician', 'view_projects', 'Projects', FALSE),
  ('technician', 'edit_projects', 'Projects', FALSE),
  ('technician', 'add_staff', 'Staff', FALSE),
  ('technician', 'manage_staff_accounts', 'Staff', FALSE),
  ('technician', 'export_reports', 'Staff', FALSE),
  ('technician', 'assign_crew', 'Staff', FALSE),
  ('technician', 'access_invoicing', 'Finance', FALSE),
  ('technician', 'create_task', 'Task', TRUE),
  ('technician', 'assign_task', 'Task', FALSE),
  ('technician', 'view_task', 'Task', FALSE),
  ('technician', 'add_lead', 'CRM', FALSE),
  ('technician', 'view_crm_leads', 'CRM', FALSE),

  ('client', 'create_projects', 'Projects', FALSE),
  ('client', 'view_projects', 'Projects', FALSE),
  ('client', 'edit_projects', 'Projects', FALSE),
  ('client', 'add_staff', 'Staff', FALSE),
  ('client', 'manage_staff_accounts', 'Staff', FALSE),
  ('client', 'export_reports', 'Staff', FALSE),
  ('client', 'assign_crew', 'Staff', FALSE),
  ('client', 'access_invoicing', 'Finance', FALSE),
  ('client', 'create_task', 'Task', TRUE),
  ('client', 'assign_task', 'Task', FALSE),
  ('client', 'view_task', 'Task', FALSE),
  ('client', 'add_lead', 'CRM', FALSE),
  ('client', 'view_crm_leads', 'CRM', FALSE)
ON CONFLICT (role, permission_id) DO UPDATE SET is_enabled = EXCLUDED.is_enabled;

-- Seed Audit Logs
INSERT INTO audit_logs (actor_name, email, action, module, ip_address, created_at) VALUES
  ('John Doe', 'john.doe@email.com', 'Updated security permissions', 'Permissions', '192.168.1.45', NOW() - INTERVAL '1 hour'),
  ('John Doe', 'john.doe@email.com', 'Deleted staff member (Jose Martinez)', 'Staff Directory', '192.168.1.45', NOW() - INTERVAL '2 hours'),
  ('John Doe', 'john.doe@email.com', 'Invited staff member (Sarah Kim)', 'Staff Directory', '192.168.1.45', NOW() - INTERVAL '5 hours'),
  ('Karen Brooks', 'karen.brooks@email.com', 'Approved time log for Troy Shaw', 'Time Tracking', '172.56.21.9', NOW() - INTERVAL '1 day'),
  ('Derek Owens', 'derek.owens@email.com', 'Created new project: Sumerlin Flat TPO Install', 'Projects', '104.244.72.106', NOW() - INTERVAL '2 days'),
  ('John Doe', 'john.doe@email.com', 'Modified general inventory item levels', 'Inventory', '192.168.1.45', NOW() - INTERVAL '2 days');



-- =============================================================================
-- SUPPORT TICKETS & MESSAGES
-- =============================================================================

CREATE TABLE support_tickets (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  code          TEXT        NOT NULL, -- e.g., '#TI1234'
  client_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_id      UUID        REFERENCES users(id) ON DELETE SET NULL,
  complaint     TEXT        NOT NULL,
  type          TEXT        NOT NULL,
  status        TEXT        NOT NULL DEFAULT 'opened' CHECK (status IN ('opened', 'pending', 'resolved')),
  priority      TEXT        NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  location      TEXT        NOT NULL,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_support_tickets_client_id ON support_tickets(client_id);
CREATE INDEX idx_support_tickets_agent_id ON support_tickets(agent_id);

CREATE TABLE support_messages (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id     UUID        NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text          TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_support_messages_ticket_id ON support_messages(ticket_id);
CREATE INDEX idx_support_messages_sender_id ON support_messages(sender_id);

-- Trigger for updated_at
CREATE TRIGGER trg_support_tickets_updated_at
BEFORE UPDATE ON support_tickets
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- Admins and Managers can see all tickets
CREATE POLICY "Tickets visible to admins/managers"
  ON support_tickets
  FOR SELECT
  USING (auth_user_role() IN ('admin', 'manager'));

-- Clients can only see their own tickets
CREATE POLICY "Tickets visible to clients"
  ON support_tickets
  FOR SELECT
  USING (auth_user_role() = 'client' AND client_id = auth.uid());

-- Admins and Managers can update tickets
CREATE POLICY "Tickets updatable by admins/managers"
  ON support_tickets
  FOR UPDATE
  USING (auth_user_role() IN ('admin', 'manager'));

-- Clients can create tickets
CREATE POLICY "Tickets insertable by clients"
  ON support_tickets
  FOR INSERT
  WITH CHECK (auth_user_role() = 'client' AND client_id = auth.uid());

-- Messages inherit visibility from tickets
CREATE POLICY "Messages visible to ticket viewers"
  ON support_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM support_tickets 
      WHERE support_tickets.id = support_messages.ticket_id
    )
  );

-- Allowed users can insert messages
CREATE POLICY "Messages insertable by participants"
  ON support_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
    )
  );

-- =============================================================================
-- INVENTORY UPDATES & USAGE LOG
-- =============================================================================

ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS inventory_usage_log (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id      UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  action       TEXT NOT NULL,
  qty_change   NUMERIC(10,2) NOT NULL,
  project_id   UUID REFERENCES projects(id) ON DELETE SET NULL,
  user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_usage_log_item_id ON inventory_usage_log(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_usage_log_project_id ON inventory_usage_log(project_id);

ALTER TABLE inventory_usage_log ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- INSURANCE DOCUMENTS STORAGE BUCKET
-- =============================================================================

INSERT INTO storage.buckets (id, name, public) 
VALUES ('insurance_documents', 'insurance_documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow authenticated users to view insurance documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'insurance_documents' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to upload insurance documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'insurance_documents' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update insurance documents"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'insurance_documents' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete insurance documents"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'insurance_documents' AND auth.role() = 'authenticated');
