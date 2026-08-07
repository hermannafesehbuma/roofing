-- =============================================================================
-- COMPLETE THE RLS POLICY SET
--
-- Eighteen tables were created with `ENABLE ROW LEVEL SECURITY` but no policy.
-- In Postgres that is deny-all: the moment a query runs as a real user instead
-- of the service role, those tables return nothing and inserts fail. Nobody has
-- noticed because every server action currently uses the service-role key,
-- which carries BYPASSRLS.
--
-- This migration writes the missing policies so the app can be moved onto a
-- session-scoped client module by module. It changes NOTHING about today's
-- behaviour — service-role queries still bypass all of it.
--
-- The model, consistent with the policies already in place:
--
--   admin       everything
--   manager     everything operational; not user administration
--   technician  reads what is on their assigned projects, writes their own work
--   client      their own records only
--
-- Note on nesting: a subquery inside a policy is itself filtered by the
-- referenced table's policies. Child tables therefore inherit their parent's
-- visibility with a plain EXISTS, and stay correct when the parent changes.
--
-- SAFE TO RE-RUN. Every policy drops itself first, and every block skips a
-- table that does not exist in this database, raising a notice instead of
-- aborting. Supabase's SQL editor runs the whole file in one transaction, so
-- without that, one absent table rolls back all forty-odd policies. Read the
-- notices after running: a skipped table means this database is behind the
-- migrations in `supabase/migrations/`.
-- =============================================================================

-- ── Helpers ───────────────────────────────────────────────────────────────────

-- SECURITY DEFINER so it can read project_members while project_members' own
-- policy is being evaluated. Without this, a policy on project_members that
-- queries project_members recurses infinitely.
CREATE OR REPLACE FUNCTION is_project_member(p_project_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = p_project_id
      AND user_id = auth_user_id()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- Admin or manager — the "office" roles, as distinct from field crew.
CREATE OR REPLACE FUNCTION is_office()
RETURNS BOOLEAN AS $$
  SELECT auth_user_role() IN ('admin', 'manager');
$$ LANGUAGE sql STABLE SET search_path = public;

-- Applies one policy, skipping tables this database does not have. Dropped at
-- the end of the migration — it exists only for the duration of this script.
CREATE OR REPLACE FUNCTION apply_policy(
  p_table TEXT,
  p_name  TEXT,
  p_body  TEXT   -- e.g. 'FOR SELECT USING (is_office())'
) RETURNS VOID AS $$
BEGIN
  IF to_regclass('public.' || p_table) IS NULL THEN
    RAISE NOTICE 'SKIPPED %: table does not exist in this database', p_table;
    RETURN;
  END IF;
  EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p_name, p_table);
  EXECUTE format('CREATE POLICY %I ON public.%I %s', p_name, p_table, p_body);
END;
$$ LANGUAGE plpgsql;

-- ── project_members ───────────────────────────────────────────────────────────
-- Crew see their own assignments, plus who else is on those jobs.
SELECT apply_policy('project_members', 'project_members_office_all',
  'FOR ALL USING (is_office())');
SELECT apply_policy('project_members', 'project_members_crew_read',
  'FOR SELECT USING (user_id = auth_user_id() OR is_project_member(project_id))');

-- ── clients ───────────────────────────────────────────────────────────────────
-- Portal users read their own record; crew read customer details for the jobs
-- they are on, which they need for site contact information.
SELECT apply_policy('clients', 'clients_office_all',
  'FOR ALL USING (is_office())');
SELECT apply_policy('clients', 'clients_portal_own',
  'FOR SELECT USING (portal_user_id = auth_user_id())');
SELECT apply_policy('clients', 'clients_crew_read', $p$
  FOR SELECT USING (
    auth_user_role() = 'technician'
    AND EXISTS (
      SELECT 1 FROM projects p
      WHERE p.client_id = clients.id AND is_project_member(p.id)
    )
  )$p$);

-- ── leads ─────────────────────────────────────────────────────────────────────
-- CRM is office-only; the seeded permissions already say view_crm_leads is admin.
SELECT apply_policy('leads', 'leads_office_all',
  'FOR ALL USING (is_office())');

-- ── tasks ─────────────────────────────────────────────────────────────────────
-- Crew see the board for their projects and may move their own cards.
SELECT apply_policy('tasks', 'tasks_office_all',
  'FOR ALL USING (is_office())');
SELECT apply_policy('tasks', 'tasks_crew_read',
  'FOR SELECT USING (assignee_id = auth_user_id() OR is_project_member(project_id))');
SELECT apply_policy('tasks', 'tasks_assignee_update',
  'FOR UPDATE USING (assignee_id = auth_user_id()) WITH CHECK (assignee_id = auth_user_id())');

-- ── work_orders ───────────────────────────────────────────────────────────────
SELECT apply_policy('work_orders', 'work_orders_office_all',
  'FOR ALL USING (is_office())');
SELECT apply_policy('work_orders', 'work_orders_crew_read',
  'FOR SELECT USING (technician_id = auth_user_id() OR is_project_member(project_id))');
SELECT apply_policy('work_orders', 'work_orders_technician_update',
  'FOR UPDATE USING (technician_id = auth_user_id()) WITH CHECK (technician_id = auth_user_id())');

-- ── documents ─────────────────────────────────────────────────────────────────
SELECT apply_policy('documents', 'documents_office_all',
  'FOR ALL USING (is_office())');
SELECT apply_policy('documents', 'documents_crew_read',
  'FOR SELECT USING (is_project_member(project_id))');
-- Crew upload site photos and paperwork against their own jobs.
SELECT apply_policy('documents', 'documents_crew_insert',
  'FOR INSERT WITH CHECK (uploaded_by_id = auth_user_id() AND is_project_member(project_id))');

-- ── rfis ──────────────────────────────────────────────────────────────────────
SELECT apply_policy('rfis', 'rfis_office_all',
  'FOR ALL USING (is_office())');
SELECT apply_policy('rfis', 'rfis_crew_read',
  'FOR SELECT USING (submitted_by_id = auth_user_id() OR is_project_member(project_id))');
SELECT apply_policy('rfis', 'rfis_crew_insert',
  'FOR INSERT WITH CHECK (submitted_by_id = auth_user_id() AND is_project_member(project_id))');

-- ── rfi_comments ──────────────────────────────────────────────────────────────
-- Visibility inherits from the RFI; authorship is enforced on write.
SELECT apply_policy('rfi_comments', 'rfi_comments_read',
  'FOR SELECT USING (EXISTS (SELECT 1 FROM rfis WHERE rfis.id = rfi_comments.rfi_id))');
SELECT apply_policy('rfi_comments', 'rfi_comments_insert_own',
  'FOR INSERT WITH CHECK (user_id = auth_user_id() AND EXISTS (SELECT 1 FROM rfis WHERE rfis.id = rfi_comments.rfi_id))');
SELECT apply_policy('rfi_comments', 'rfi_comments_office_all',
  'FOR ALL USING (is_office())');

-- ── inspections ───────────────────────────────────────────────────────────────
SELECT apply_policy('inspections', 'inspections_office_all',
  'FOR ALL USING (is_office())');
SELECT apply_policy('inspections', 'inspections_inspector_own',
  'FOR ALL USING (inspector_id = auth_user_id())');
SELECT apply_policy('inspections', 'inspections_crew_read',
  'FOR SELECT USING (is_project_member(project_id))');

-- ── inventory_items ───────────────────────────────────────────────────────────
-- Crew need to see stock to request it; only the office adjusts it.
SELECT apply_policy('inventory_items', 'inventory_items_office_all',
  'FOR ALL USING (is_office())');
SELECT apply_policy('inventory_items', 'inventory_items_crew_read',
  $p$FOR SELECT USING (auth_user_role() IN ('admin', 'manager', 'technician'))$p$);

-- ── inventory_usage_log ───────────────────────────────────────────────────────
SELECT apply_policy('inventory_usage_log', 'inventory_usage_log_office_all',
  'FOR ALL USING (is_office())');
SELECT apply_policy('inventory_usage_log', 'inventory_usage_log_crew_read',
  'FOR SELECT USING (user_id = auth_user_id())');
SELECT apply_policy('inventory_usage_log', 'inventory_usage_log_crew_insert',
  'FOR INSERT WITH CHECK (user_id = auth_user_id())');

-- ── material_requests ─────────────────────────────────────────────────────────
SELECT apply_policy('material_requests', 'material_requests_office_all',
  'FOR ALL USING (is_office())');
SELECT apply_policy('material_requests', 'material_requests_crew_read',
  'FOR SELECT USING (requested_by_id = auth_user_id() OR is_project_member(project_id))');
SELECT apply_policy('material_requests', 'material_requests_crew_insert',
  'FOR INSERT WITH CHECK (requested_by_id = auth_user_id() AND is_project_member(project_id))');

-- ── purchase_orders ───────────────────────────────────────────────────────────
-- Procurement is office-only; there is no field-facing view of supplier cost.
SELECT apply_policy('purchase_orders', 'purchase_orders_office_all',
  'FOR ALL USING (is_office())');

-- ── invoice_items / payments / recurring_plans ────────────────────────────────
-- Billing mirrors `invoices_admin_manager_all`, which is already in place.
SELECT apply_policy('invoice_items',   'invoice_items_office_all',   'FOR ALL USING (is_office())');
SELECT apply_policy('payments',        'payments_office_all',        'FOR ALL USING (is_office())');
SELECT apply_policy('recurring_plans', 'recurring_plans_office_all', 'FOR ALL USING (is_office())');

-- ── insurance_policies ────────────────────────────────────────────────────────
SELECT apply_policy('insurance_policies', 'insurance_policies_office_all',
  'FOR ALL USING (is_office())');

-- ── message_attachments ───────────────────────────────────────────────────────
-- Inherits the parent message's visibility.
SELECT apply_policy('message_attachments', 'message_attachments_inherit',
  'FOR ALL USING (EXISTS (SELECT 1 FROM messages WHERE messages.id = message_attachments.message_id))');

-- =============================================================================
-- FIXES TO EXISTING POLICIES
-- =============================================================================

-- `support_tickets.client_id` references users(id), but these two policies
-- compared it to auth.uid(), which is the Supabase auth id — a different UUID.
-- The comparison never matched, so no client could see or open a ticket.
SELECT apply_policy('support_tickets', 'Tickets visible to clients',
  $p$FOR SELECT USING (auth_user_role() = 'client' AND client_id = auth_user_id())$p$);
SELECT apply_policy('support_tickets', 'Tickets insertable by clients',
  $p$FOR INSERT WITH CHECK (auth_user_role() = 'client' AND client_id = auth_user_id())$p$);

-- Support is an admin-facing module here, but only clients could ever INSERT,
-- so staff-raised tickets failed. Same for deletion, which had no policy at all.
SELECT apply_policy('support_tickets', 'Tickets insertable by office',
  'FOR INSERT WITH CHECK (is_office())');
SELECT apply_policy('support_tickets', 'Tickets deletable by admins',
  $p$FOR DELETE USING (auth_user_role() = 'admin')$p$);

-- Messages could be read but never written by staff, for the same reason.
SELECT apply_policy('support_messages', 'Messages insertable by office',
  'FOR INSERT WITH CHECK (is_office() AND sender_id = auth_user_id())');

-- ── Clean up ──────────────────────────────────────────────────────────────────
DROP FUNCTION apply_policy(TEXT, TEXT, TEXT);
