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
