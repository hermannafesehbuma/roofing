-- =============================================================================
-- INSURANCE DOCUMENTS STORAGE BUCKET
-- Run this script in your Supabase SQL Editor
-- =============================================================================

-- 1. Create the private storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('insurance_documents', 'insurance_documents', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Set up Storage Object Policies for the new bucket
-- Note: Supabase storage.objects table has RLS enabled by default.

-- Allow authenticated users to view insurance documents
CREATE POLICY "Allow authenticated users to view insurance documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'insurance_documents' AND auth.role() = 'authenticated');

-- Allow authenticated users to upload new insurance documents
CREATE POLICY "Allow authenticated users to upload insurance documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'insurance_documents' AND auth.role() = 'authenticated');

-- Allow authenticated users to update existing insurance documents
CREATE POLICY "Allow authenticated users to update insurance documents"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'insurance_documents' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete insurance documents
CREATE POLICY "Allow authenticated users to delete insurance documents"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'insurance_documents' AND auth.role() = 'authenticated');
