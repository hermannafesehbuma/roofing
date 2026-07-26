-- Migration: Create role_permissions and audit_logs tables
-- Run this in Supabase SQL Editor

-- auth_user_role() function already exists, skipping

-- 1. Role Permissions Table
CREATE TABLE IF NOT EXISTS role_permissions (
  id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  role            TEXT         NOT NULL,
  permission_id   TEXT         NOT NULL,
  module          TEXT         NOT NULL,
  is_enabled      BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (role, permission_id)
);

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_role_permissions_updated_at ON role_permissions;
CREATE TRIGGER trg_role_permissions_updated_at
  BEFORE UPDATE ON role_permissions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 2. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID         REFERENCES users(id) ON DELETE SET NULL,
  actor_name  TEXT         NOT NULL,
  email       TEXT         NOT NULL,
  action      TEXT         NOT NULL,
  module      TEXT         NOT NULL,
  ip_address  TEXT         NOT NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 3. RLS Policies
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs        ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "role_permissions_read_all" ON role_permissions;
CREATE POLICY "role_permissions_read_all" ON role_permissions FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "role_permissions_write_admin" ON role_permissions;
CREATE POLICY "role_permissions_write_admin" ON role_permissions FOR ALL USING (auth_user_role() = 'admin');

DROP POLICY IF EXISTS "audit_logs_read_admin" ON audit_logs;
CREATE POLICY "audit_logs_read_admin" ON audit_logs FOR SELECT USING (auth_user_role() = 'admin');

DROP POLICY IF EXISTS "audit_logs_write_all" ON audit_logs;
CREATE POLICY "audit_logs_write_all" ON audit_logs FOR INSERT WITH CHECK (TRUE);

-- 4. Seed Permissions
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

-- 5. Seed Audit Logs
INSERT INTO audit_logs (actor_name, email, action, module, ip_address, created_at) VALUES
  ('John Doe', 'john.doe@email.com', 'Updated security permissions', 'Permissions', '192.168.1.45', NOW() - INTERVAL '1 hour'),
  ('John Doe', 'john.doe@email.com', 'Deleted staff member (Jose Martinez)', 'Staff Directory', '192.168.1.45', NOW() - INTERVAL '2 hours'),
  ('John Doe', 'john.doe@email.com', 'Invited staff member (Sarah Kim)', 'Staff Directory', '192.168.1.45', NOW() - INTERVAL '5 hours'),
  ('Karen Brooks', 'karen.brooks@email.com', 'Approved time log for Troy Shaw', 'Time Tracking', '172.56.21.9', NOW() - INTERVAL '1 day'),
  ('Derek Owens', 'derek.owens@email.com', 'Created new project: Sumerlin Flat TPO Install', 'Projects', '104.244.72.106', NOW() - INTERVAL '2 days'),
  ('John Doe', 'john.doe@email.com', 'Modified general inventory item levels', 'Inventory', '192.168.1.45', NOW() - INTERVAL '2 days');
