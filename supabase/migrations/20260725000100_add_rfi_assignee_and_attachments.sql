-- =============================================================================
-- RFI ASSIGNMENT + ATTACHMENTS
-- Backs the "Assign a manager" and "Attachment" features on the RFIs Filed tab
-- of the employee detail screen. Run this in your Supabase SQL Editor.
-- =============================================================================

-- 1. Who is responsible for answering the RFI, and when they were assigned.
ALTER TABLE rfis ADD COLUMN IF NOT EXISTS assigned_to_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE rfis ADD COLUMN IF NOT EXISTS assigned_at    TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_rfis_assigned_to_id ON rfis(assigned_to_id);

-- 2. Let a document hang off an RFI instead of only a project, so RFI
--    attachments reuse the existing documents table.
ALTER TABLE documents ADD COLUMN IF NOT EXISTS rfi_id UUID REFERENCES rfis(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_documents_rfi_id ON documents(rfi_id);

-- 3. Storage bucket for submittals, drawings and RFI attachments.
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Public read (bucket is public so "Click to view PDF" links work directly),
-- writes restricted to authenticated users.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read of documents') THEN
    CREATE POLICY "Allow public read of documents"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'documents');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated upload of documents') THEN
    CREATE POLICY "Allow authenticated upload of documents"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'documents' AND auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated delete of documents') THEN
    CREATE POLICY "Allow authenticated delete of documents"
      ON storage.objects FOR DELETE
      USING (bucket_id = 'documents' AND auth.role() = 'authenticated');
  END IF;
END $$;
