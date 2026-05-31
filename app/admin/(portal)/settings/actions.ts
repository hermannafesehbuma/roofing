'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export type SettingsStats = {
  totalStaff: number
  activeMembers: number
  managers: number
  inactive: number
}

export async function getSettingsStats(): Promise<SettingsStats> {
  const supabase = createAdminClient()
  
  const { data: users, error } = await supabase
    .from('users')
    .select('role, status')
    .neq('role', 'client')

  if (error || !users) {
    console.error('Error fetching settings stats:', error)
    return { totalStaff: 0, activeMembers: 0, managers: 0, inactive: 0 }
  }

  const totalStaff = users.length
  const activeMembers = users.filter(u => u.status === 'active').length
  const managers = users.filter(u => u.role === 'manager' || u.role === 'admin').length
  const inactive = users.filter(u => u.status === 'inactive' || u.status === 'on_leave').length

  return {
    totalStaff,
    activeMembers,
    managers,
    inactive
  }
}

export type Permission = {
  id: string
  name: string
  category: string
  admin: boolean
  manager: boolean
  staff: boolean
  client: boolean
}

// Initial mock permissions
const defaultPermissions: Permission[] = [
  // Projects
  { id: 'create_projects', name: 'Create projects', category: 'Projects', admin: true, manager: false, staff: false, client: false },
  { id: 'view_projects', name: 'View all projects', category: 'Projects', admin: true, manager: true, staff: false, client: false },
  { id: 'edit_projects', name: 'Edit project details', category: 'Projects', admin: true, manager: false, staff: false, client: false },
  
  // Staff
  { id: 'add_staff', name: 'Add new staff', category: 'Staff', admin: true, manager: true, staff: false, client: false },
  { id: 'manage_staff_accounts', name: 'Manage staff accounts', category: 'Staff', admin: true, manager: true, staff: false, client: false },
  { id: 'export_reports', name: 'Export reports', category: 'Staff', admin: true, manager: true, staff: false, client: false },
  { id: 'assign_crew', name: 'Assign crew member', category: 'Staff', admin: true, manager: true, staff: false, client: false },
  
  // Finance
  { id: 'access_invoicing', name: 'Access invoicing', category: 'Finance', admin: true, manager: true, staff: false, client: false },
  
  // Task
  { id: 'create_task', name: 'Create Task', category: 'Task', admin: true, manager: true, staff: true, client: true },
  { id: 'assign_task', name: 'Assign Task', category: 'Task', admin: true, manager: true, staff: false, client: false },
  { id: 'view_task', name: 'View Task', category: 'Task', admin: true, manager: true, staff: false, client: false },
  
  // CRM
  { id: 'add_lead', name: 'Add New Lead', category: 'CRM', admin: true, manager: false, staff: false, client: false },
  { id: 'view_crm_leads', name: 'View CRM leads', category: 'CRM', admin: true, manager: false, staff: false, client: false }
]

export async function getPermissions(): Promise<Permission[]> {
  const supabase = createAdminClient()
  try {
    const { data, error } = await supabase
      .from('role_permissions')
      .select('*')
    
    if (error || !data || data.length === 0) {
      console.warn('Could not load permissions from database, using defaults:', error)
      return defaultPermissions
    }

    const permissionMap = new Map<string, Permission>()
    
    defaultPermissions.forEach(p => {
      permissionMap.set(p.id, {
        id: p.id,
        name: p.name,
        category: p.category,
        admin: false,
        manager: false,
        staff: false,
        client: false
      })
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
          client: false
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
  } catch (err) {
    console.error('getPermissions exception:', err)
    return defaultPermissions
  }
}

export async function logAction(log: {
  action: string
  module: string
  ipAddress: string
}): Promise<{ success: boolean }> {
  const supabase = createAdminClient()
  try {
    const { error } = await supabase
      .from('audit_logs')
      .insert({
        actor_name: 'John Doe',
        email: 'john.doe@email.com',
        action: log.action,
        module: log.module,
        ip_address: log.ipAddress
      })

    if (error) {
      console.error('Error creating audit log:', error)
      return { success: false }
    }
    return { success: true }
  } catch (err) {
    console.error('logAction exception:', err)
    return { success: false }
  }
}

export async function savePermissions(permissions: Permission[]): Promise<{ success: boolean }> {
  const supabase = createAdminClient()
  try {
    const rowsToUpsert: any[] = []

    permissions.forEach(p => {
      rowsToUpsert.push({
        role: 'admin',
        permission_id: p.id,
        module: p.category,
        is_enabled: p.admin
      })
      rowsToUpsert.push({
        role: 'manager',
        permission_id: p.id,
        module: p.category,
        is_enabled: p.manager
      })
      rowsToUpsert.push({
        role: 'technician',
        permission_id: p.id,
        module: p.category,
        is_enabled: p.staff
      })
      rowsToUpsert.push({
        role: 'client',
        permission_id: p.id,
        module: p.category,
        is_enabled: p.client
      })
    })

    const { error } = await supabase
      .from('role_permissions')
      .upsert(rowsToUpsert, { onConflict: 'role, permission_id' })

    if (error) {
      console.error('Error saving permissions to database:', error)
      return { success: false }
    }

    await logAction({
      action: 'Updated security permissions',
      module: 'Permissions',
      ipAddress: '192.168.1.45'
    })

    return { success: true }
  } catch (err) {
    console.error('savePermissions exception:', err)
    return { success: false }
  }
}

export type AuditLogEntry = {
  id: string
  user: string
  email: string
  action: string
  module: string
  timestamp: string
  ipAddress: string
}

const mockAuditLogs: AuditLogEntry[] = [
  { id: '1', user: 'John Doe', email: 'john.doe@email.com', action: 'Updated security permissions', module: 'Permissions', timestamp: 'May 31, 2026 at 02:45 AM', ipAddress: '192.168.1.45' },
  { id: '2', user: 'John Doe', email: 'john.doe@email.com', action: 'Deleted staff member (Jose Martinez)', module: 'Staff Directory', timestamp: 'May 31, 2026 at 01:12 AM', ipAddress: '192.168.1.45' },
  { id: '3', user: 'John Doe', email: 'john.doe@email.com', action: 'Invited staff member (Sarah Kim)', module: 'Staff Directory', timestamp: 'May 30, 2026 at 09:30 PM', ipAddress: '192.168.1.45' },
  { id: '4', user: 'Karen Brooks', email: 'karen.brooks@email.com', action: 'Approved time log for Troy Shaw', module: 'Time Tracking', timestamp: 'May 30, 2026 at 06:15 PM', ipAddress: '172.56.21.9' },
  { id: '5', user: 'Derek Owens', email: 'derek.owens@email.com', action: 'Created new project: Sumerlin Flat TPO Install', module: 'Projects', timestamp: 'May 29, 2026 at 11:22 AM', ipAddress: '104.244.72.106' },
  { id: '6', user: 'John Doe', email: 'john.doe@email.com', action: 'Modified general inventory item levels', module: 'Inventory', timestamp: 'May 29, 2026 at 08:05 AM', ipAddress: '192.168.1.45' }
]

export async function getAuditLogs(): Promise<AuditLogEntry[]> {
  const supabase = createAdminClient()
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error || !data || data.length === 0) {
      console.warn('Could not load audit logs from database, using defaults:', error)
      return mockAuditLogs
    }

    return data.map((row: any) => ({
      id: row.id,
      user: row.actor_name,
      email: row.email,
      action: row.action,
      module: row.module,
      timestamp: new Date(row.created_at).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }).replace(',', ' at'),
      ipAddress: row.ip_address
    }))
  } catch (err) {
    console.error('getAuditLogs exception:', err)
    return mockAuditLogs
  }
}

