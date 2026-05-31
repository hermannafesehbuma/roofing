-- Fix permissions for Crew (technician) and Manager so they can see the correct left nav menu items.
-- Run this in your Supabase SQL Editor.

-- 1. Give Technician (Crew) access to Projects, Tasks, Time Tracking, and Inbox
UPDATE role_permissions 
SET is_enabled = TRUE 
WHERE role = 'technician' AND permission_id IN ('view_projects', 'view_task', 'assign_crew', 'assign_task');

-- 2. Ensure Manager has full operational access (just in case it was false)
UPDATE role_permissions 
SET is_enabled = TRUE 
WHERE role = 'manager' AND permission_id IN (
  'view_projects', 
  'add_staff', 
  'manage_staff_accounts', 
  'export_reports', 
  'assign_crew', 
  'access_invoicing', 
  'create_task', 
  'assign_task', 
  'view_task'
);
