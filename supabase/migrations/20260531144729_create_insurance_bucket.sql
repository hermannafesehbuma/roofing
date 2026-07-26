-- =============================================================================
-- INSURANCE DOCUMENTS STORAGE BUCKET
-- Guarded so the migration sequence can be replayed from scratch.
-- =============================================================================

-- 1. Create the private storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('insurance_documents', 'insurance_documents', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Set up Storage Object Policies for the new bucket
-- Note: Supabase storage.objects table has RLS enabled by default.

-- Allow authenticated users to view insurance documents
DROP POLICY IF EXISTS "Allow authenticated users to view insurance documents" ON storage.objects;
CREATE POLICY "Allow authenticated users to view insurance documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'insurance_documents' AND auth.role() = 'authenticated');

-- Allow authenticated users to upload new insurance documents
DROP POLICY IF EXISTS "Allow authenticated users to upload insurance documents" ON storage.objects;
CREATE POLICY "Allow authenticated users to upload insurance documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'insurance_documents' AND auth.role() = 'authenticated');

-- Allow authenticated users to update existing insurance documents
DROP POLICY IF EXISTS "Allow authenticated users to update insurance documents" ON storage.objects;
CREATE POLICY "Allow authenticated users to update insurance documents"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'insurance_documents' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete insurance documents
DROP POLICY IF EXISTS "Allow authenticated users to delete insurance documents" ON storage.objects;
CREATE POLICY "Allow authenticated users to delete insurance documents"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'insurance_documents' AND auth.role() = 'authenticated');
