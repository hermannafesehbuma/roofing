'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

export type DbTimeStatus = 'approved' | 'pending' | 'missed'

export type TimeEntryRow = {
  id: string
  code: string
  user_id: string
  employee_name: string
  employee_role: string
  project_id: string | null
  project_name: string | null
  date: string        // ISO: YYYY-MM-DD
  clock_in: string    // HH:MM:SS
  clock_out: string | null
  status: DbTimeStatus
  note: string | null
  location: string | null
  created_at: string
}

export type TimeFormOptions = {
  employees: { id: string; name: string; role: string }[]
  projects:  { id: string; name: string }[]
}

async function nextCode(admin: ReturnType<typeof createAdminClient>) {
  const { data } = await admin
    .from('time_entries')
    .select('code')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  const last = (data as any)?.code ? parseInt((data as any).code.replace(/\D/g, '')) : 0
  return `TE-${String((isNaN(last) ? 0 : last) + 1).padStart(4, '0')}`
}

// ─── Queries ──────────────────────────────────────────────────────────────────
export async function getTimeEntries(): Promise<TimeEntryRow[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('time_entries')
    .select(`
      *,
      user:user_id(first_name, last_name, role),
      project:project_id(name)
    `)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) { console.error('getTimeEntries:', error); return [] }

  return (data ?? []).map((row: any) => ({
    id:            row.id,
    code:          row.code,
    user_id:       row.user_id,
    employee_name: row.user ? `${row.user.first_name} ${row.user.last_name}` : 'Unknown',
    employee_role: row.user?.role ?? '',
    project_id:    row.project_id,
    project_name:  row.project?.name ?? null,
    date:          row.date,
    clock_in:      row.clock_in,
    clock_out:     row.clock_out ?? null,
    status:        row.status as DbTimeStatus,
    note:          row.note ?? null,
    location:      row.location ?? null,
    created_at:    row.created_at,
  }))
}

export async function getTimeFormOptions(): Promise<TimeFormOptions> {
  const admin = createAdminClient()
  const [usersRes, projRes] = await Promise.all([
    admin.from('users').select('id, first_name, last_name, role').neq('role', 'client').order('first_name'),
    admin.from('projects').select('id, name').order('name'),
  ])
  return {
    employees: (usersRes.data ?? []).map((u: any) => ({
      id:   u.id,
      name: `${u.first_name} ${u.last_name}`,
      role: u.role,
    })),
    projects: (projRes.data ?? []) as { id: string; name: string }[],
  }
}

// ─── Mutations ─────────────────────────────────────────────────────────────────
export type CreateTimeEntryInput = {
  user_id:    string
  project_id: string | null
  date:       string
  clock_in:   string
  clock_out:  string | null
  status:     DbTimeStatus
  note:       string | null
  location:   string | null
}

export async function createTimeEntry(input: CreateTimeEntryInput) {
  const admin = createAdminClient()
  const code  = await nextCode(admin)

  const { data, error } = await admin
    .from('time_entries')
    .insert({ ...input, code })
    .select('id')
    .single()

  if (error) return { error: error.message }
  revalidatePath('/admin/time-tracking')
  return { id: data.id, code }
}

export async function updateTimeEntry(id: string, input: Partial<CreateTimeEntryInput>) {
  const admin = createAdminClient()
  const { error } = await admin.from('time_entries').update(input).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/time-tracking')
  return { success: true }
}

export async function deleteTimeEntry(id: string) {
  const admin = createAdminClient()
  const { error } = await admin.from('time_entries').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/time-tracking')
  return { success: true }
}

export async function approveTimeEntry(id: string) {
  const admin = createAdminClient()
  const { error } = await admin.from('time_entries').update({ status: 'approved' }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/time-tracking')
  return { success: true }
}

export async function rejectTimeEntry(id: string) {
  const admin = createAdminClient()
  const { error } = await admin.from('time_entries').update({ status: 'missed' }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/time-tracking')
  return { success: true }
}
