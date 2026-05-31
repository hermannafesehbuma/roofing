-- Fix client permissions: Only Projects, Invoices, Inbox, Support visible
-- Run this in Supabase SQL Editor

-- First reset ALL client permissions to FALSE
UPDATE role_permissions SET is_enabled = FALSE WHERE role = 'client';

-- Then enable ONLY the correct ones
UPDATE role_permissions SET is_enabled = TRUE WHERE role = 'client' AND permission_id = 'view_projects';
UPDATE role_permissions SET is_enabled = TRUE WHERE role = 'client' AND permission_id = 'access_invoicing';
UPDATE role_permissions SET is_enabled = TRUE WHERE role = 'client' AND permission_id = 'assign_task';
UPDATE role_permissions SET is_enabled = TRUE WHERE role = 'client' AND permission_id = 'create_task';
