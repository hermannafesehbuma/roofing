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
  gps_lat: number | null
  gps_lng: number | null
  total_hours: number | null
  approved_at: string | null
  created_at: string
}

export type TimeFormOptions = {
  employees: { id: string; name: string; role: string; avatar_url: string | null }[]
  /** `location` lets the entry form fill Site / Location from the project. */
  projects:  { id: string; name: string; location: string | null }[]
}

const ENTRY_SELECT = `
  *,
  user:user_id(first_name, last_name, role),
  project:project_id(name)
`

/** A `time_entries` row as PostgREST returns it, joins included. */
type EntryRecord = {
  id: string
  code: string
  user_id: string
  project_id: string | null
  date: string
  clock_in: string
  clock_out: string | null
  status: DbTimeStatus
  note: string | null
  location: string | null
  // NUMERIC columns come back as strings.
  gps_lat: string | number | null
  gps_lng: string | number | null
  total_hours: string | number | null
  approved_at: string | null
  created_at: string
  user: { first_name: string; last_name: string; role: string } | null
  project: { name: string } | null
}

const numberOrNull = (value: string | number | null | undefined) =>
  value === null || value === undefined ? null : Number(value)

function toRow(row: EntryRecord): TimeEntryRow {
  return {
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
    gps_lat:       numberOrNull(row.gps_lat),
    gps_lng:       numberOrNull(row.gps_lng),
    total_hours:   numberOrNull(row.total_hours),
    approved_at:   row.approved_at ?? null,
    created_at:    row.created_at,
  }
}

function revalidate() {
  revalidatePath('/admin/time-tracking')
  revalidatePath('/admin/dashboard')
}

// ─── Queries ──────────────────────────────────────────────────────────────────
/**
 * Every entry, or just one person's when `userId` is given — the phone asks for
 * its own timesheet so a technician's device never receives the whole team's.
 */
export async function getTimeEntries(userId?: string): Promise<TimeEntryRow[]> {
  const admin = createAdminClient()
  let query = admin
    .from('time_entries')
    .select(ENTRY_SELECT)
    .order('date', { ascending: false })
    .order('clock_in', { ascending: false })

  if (userId) query = query.eq('user_id', userId)

  const { data, error } = await query
  if (error) { console.error('getTimeEntries:', error); return [] }

  return ((data ?? []) as unknown as EntryRecord[]).map(toRow)
}

export async function getTimeFormOptions(): Promise<TimeFormOptions> {
  const admin = createAdminClient()
  const [usersRes, projRes] = await Promise.all([
    admin.from('users').select('id, first_name, last_name, role, avatar_url').neq('role', 'client').order('first_name'),
    admin.from('projects').select('id, name, location').order('name'),
  ])
  return {
    employees: ((usersRes.data ?? []) as { id: string; first_name: string; last_name: string; role: string; avatar_url: string | null }[]).map((u) => ({
      id:   u.id,
      name: `${u.first_name} ${u.last_name}`.trim(),
      role: u.role,
      avatar_url: u.avatar_url,
    })),
    projects: (projRes.data ?? []) as { id: string; name: string; location: string | null }[],
  }
}

/**
 * The projects a person may book hours against: their crew assignments, the
 * projects they manage, and anything they hold an open work order or task on.
 * Active work sorts first so the picker opens on what they are likely on site
 * for today.
 */
export async function getAssignedProjects(userId: string): Promise<{ id: string; name: string }[]> {
  if (!userId) return []
  const admin = createAdminClient()

  const [crewRes, managedRes, workOrderRes, taskRes] = await Promise.all([
    admin.from('project_members').select('project:project_id(id, name, status)').eq('user_id', userId),
    admin.from('projects').select('id, name, status').eq('manager_id', userId),
    admin.from('work_orders').select('project:project_id(id, name, status)').eq('technician_id', userId),
    admin.from('tasks').select('project:project_id(id, name, status)').eq('assignee_id', userId),
  ])

  for (const res of [crewRes, managedRes, workOrderRes, taskRes]) {
    if (res.error) console.error('getAssignedProjects:', res.error)
  }

  type ProjectRef = { id: string; name: string; status: string }
  const byId = new Map<string, ProjectRef>()
  const collect = (project: ProjectRef | null | undefined) => {
    if (project?.id && !byId.has(project.id)) byId.set(project.id, project)
  }
  const joined = (rows: unknown) => (rows ?? []) as { project: ProjectRef | null }[]

  for (const row of joined(crewRes.data))      collect(row.project)
  for (const row of joined(workOrderRes.data)) collect(row.project)
  for (const row of joined(taskRes.data))      collect(row.project)
  for (const row of (managedRes.data ?? []) as unknown as ProjectRef[]) collect(row)

  return [...byId.values()]
    .sort((a, b) => {
      const rank = (s: string) => (s === 'in_progress' ? 0 : s === 'on_hold' ? 1 : 2)
      return rank(a.status) - rank(b.status) || a.name.localeCompare(b.name)
    })
    .map(({ id, name }) => ({ id, name }))
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
  gps_lat?:   number | null
  gps_lng?:   number | null
}

export type CreatedEntry = { id: string; code: string } | { error: string }

export async function createTimeEntry(input: CreateTimeEntryInput): Promise<CreatedEntry> {
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('time_entries')
    .insert(input)
    .select('id, code')
    .single()

  if (error) return { error: error.message }
  revalidate()
  return { id: data.id as string, code: data.code as string }
}

export async function updateTimeEntry(id: string, input: Partial<CreateTimeEntryInput>) {
  const admin = createAdminClient()
  const { error } = await admin.from('time_entries').update(input).eq('id', id)
  if (error) return { error: error.message }
  revalidate()
  return { success: true }
}

export async function deleteTimeEntry(id: string) {
  const admin = createAdminClient()
  const { error } = await admin.from('time_entries').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidate()
  return { success: true }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Map whatever the browser calls "my id" onto a real `users.id`.
 *
 * The session cache can hold either the Supabase auth id or the app's own
 * users.id depending on how recently it reconciled, and `approved_by_id` has a
 * foreign key to users(id) — so handing the wrong one straight to the update
 * fails the constraint and silently loses the approval.
 */
async function resolveUserId(
  admin: ReturnType<typeof createAdminClient>,
  id: string | undefined
): Promise<string | null> {
  if (!id || !UUID_RE.test(id)) return null
  const { data } = await admin
    .from('users')
    .select('id')
    .or(`id.eq.${id},supabase_id.eq.${id}`)
    .maybeSingle()
  return (data?.id as string) ?? null
}

export async function approveTimeEntry(id: string, approverId?: string) {
  const admin = createAdminClient()
  const approver = await resolveUserId(admin, approverId)

  const { error } = await admin
    .from('time_entries')
    .update({ status: 'approved', approved_by_id: approver, approved_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidate()
  return { success: true }
}

export async function rejectTimeEntry(id: string) {
  const admin = createAdminClient()
  const { error } = await admin
    .from('time_entries')
    .update({ status: 'missed', approved_by_id: null, approved_at: null })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidate()
  return { success: true }
}

// ─── Field clock ───────────────────────────────────────────────────────────────
// The phone owns the clock: `date` and `clock_in` arrive as the technician's own
// wall time, which is what the timesheet is meant to record. GPS is optional —
// a punch from a basement with no fix still has to go through.

export type ClockInInput = {
  user_id:    string
  project_id: string | null
  date:       string   // YYYY-MM-DD, technician-local
  clock_in:   string   // HH:MM:SS, technician-local
  location:   string | null
  gps_lat:    number | null
  gps_lng:    number | null
}

/** The technician's punch that has not been closed out yet, if any. */
export async function getOpenEntry(userId: string): Promise<TimeEntryRow | null> {
  if (!userId) return null
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('time_entries')
    .select(ENTRY_SELECT)
    .eq('user_id', userId)
    .is('clock_out', null)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) { console.error('getOpenEntry:', error); return null }
  return data ? toRow(data) : null
}

export async function clockIn(input: ClockInInput): Promise<CreatedEntry> {
  if (!input.user_id) return { error: 'No signed-in user found.' }
  const admin = createAdminClient()

  // Guarded here for the message, and by a unique partial index for the race.
  const open = await getOpenEntry(input.user_id)
  if (open) return { error: 'You are already clocked in. Clock out before starting a new shift.' }

  const { data, error } = await admin
    .from('time_entries')
    .insert({ ...input, clock_out: null, status: 'pending' })
    .select('id, code')
    .single()

  if (error) return { error: error.message }
  revalidate()
  return { id: data.id as string, code: data.code as string }
}

export async function clockOut(
  entryId: string,
  input: { user_id: string; clock_out: string; note: string | null }
) {
  const admin = createAdminClient()
  const { error } = await admin
    .from('time_entries')
    .update({ clock_out: input.clock_out, note: input.note })
    .eq('id', entryId)
    .eq('user_id', input.user_id)   // a device may only close its own punch
    .is('clock_out', null)

  if (error) return { error: error.message }
  revalidate()
  return { success: true }
}
