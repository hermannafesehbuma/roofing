-- Tasks show an estimated duration chip beside the due date on the board, but
-- there was nowhere to store it — the UI had the figure hardcoded.
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC(5, 2);

COMMENT ON COLUMN tasks.estimated_hours IS
  'Estimated effort in hours, rendered as the "3hr" chip on task cards.';
