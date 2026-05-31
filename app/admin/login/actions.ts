'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export type PermissionRow = {
  id: string
  name: string
  category: string
  admin: boolean
  manager: boolean
  staff: boolean
  client: boolean
}

const defaultPermissions: PermissionRow[] = [
  { id: 'create_projects', name: 'Create projects', category: 'Projects', admin: true, manager: false, staff: false, client: false },
  { id: 'view_projects', name: 'View all projects', category: 'Projects', admin: true, manager: true, staff: true, client: false },
  { id: 'edit_projects', name: 'Edit project details', category: 'Projects', admin: true, manager: false, staff: false, client: false },
  { id: 'add_staff', name: 'Add new staff', category: 'Staff', admin: true, manager: true, staff: false, client: false },
  { id: 'manage_staff_accounts', name: 'Manage staff accounts', category: 'Staff', admin: true, manager: true, staff: false, client: false },
  { id: 'export_reports', name: 'Export reports', category: 'Staff', admin: true, manager: true, staff: false, client: false },
  { id: 'assign_crew', name: 'Assign crew member', category: 'Staff', admin: true, manager: true, staff: true, client: false },
  { id: 'access_invoicing', name: 'Access invoicing', category: 'Finance', admin: true, manager: true, staff: false, client: false },
  { id: 'create_task', name: 'Create Task', category: 'Task', admin: true, manager: true, staff: true, client: true },
  { id: 'assign_task', name: 'Assign Task', category: 'Task', admin: true, manager: true, staff: true, client: false },
  { id: 'view_task', name: 'View Task', category: 'Task', admin: true, manager: true, staff: true, client: false },
  { id: 'add_lead', name: 'Add New Lead', category: 'CRM', admin: true, manager: false, staff: false, client: false },
  { id: 'view_crm_leads', name: 'View CRM leads', category: 'CRM', admin: true, manager: false, staff: false, client: false }
]

async function fetchPermissions(supabase: any): Promise<PermissionRow[]> {
  const { data, error } = await supabase
    .from('role_permissions')
    .select('*')

  if (error || !data || data.length === 0) {
    console.warn('Could not load permissions from database, using defaults:', error)
    return defaultPermissions
  }

  const permissionMap = new Map<string, PermissionRow>()

  defaultPermissions.forEach(p => {
    permissionMap.set(p.id, { ...p, admin: false, manager: false, staff: false, client: false })
  })

  data.forEach((row: any) => {
    let perm = permissionMap.get(row.permission_id)
    if (!perm) {
      perm = {
        id: row.permission_id,
        name: row.permission_id.replace(/_/g, ' '),
        category: row.module,
        admin: false,
        manager: false,
        staff: false,
        client: false,
      }
      permissionMap.set(row.permission_id, perm)
    }

    const roleName = row.role.toLowerCase()
    if (roleName === 'admin') perm.admin = row.is_enabled
    else if (roleName === 'manager') perm.manager = row.is_enabled
    else if (roleName === 'technician' || roleName === 'staff') perm.staff = row.is_enabled
    else if (roleName === 'client') perm.client = row.is_enabled
  })

  return Array.from(permissionMap.values())
}

export async function loginUser(email: string, password: string) {
  const supabase = createAdminClient()

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return { success: false as const, error: error.message }
    }

    if (!data.user) {
      return { success: false as const, error: 'Authentication failed: No user found.' }
    }

    // Fetch the authenticated user's role from public.users table
    const { data: userData } = await supabase
      .from('users')
      .select('role, first_name, last_name')
      .eq('supabase_id', data.user.id)
      .single()

    const role = userData?.role || 'staff'
    const mappedRole = role === 'technician' ? 'staff' : role

    // Fetch permissions from database
    const permissions = await fetchPermissions(supabase)

    return {
      success: true as const,
      user: {
        id: data.user.id,
        email: data.user.email,
        role: mappedRole,
        firstName: userData?.first_name || '',
        lastName: userData?.last_name || '',
      },
      permissions,
    }
  } catch (err: any) {
    return { success: false as const, error: err.message || 'An unexpected error occurred during authentication.' }
  }
}
