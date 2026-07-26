'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { Project, ProjectType, ProjectStatus, ProjectInvoiceStatus } from './data'
import { uploadToStorage, StorageFolder } from '@/lib/storage'

export async function getProjects(): Promise<Project[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('projects')
    .select(`
      *,
      manager:users (first_name, last_name, avatar_url),
      client:clients (name)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getProjects error:', error)
    return []
  }

  return (data ?? []) as Project[]
}

const PRIORITY_LABEL = { high: 'High', mid: 'Mid', low: 'Low' } as const
const CREW_ROLE_LABEL = { admin: 'Admin', manager: 'Manager', technician: 'Crew Member' } as const

function fullName(user?: { first_name?: string | null; last_name?: string | null } | null) {
  if (!user) return ''
  return `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim()
}

/**
 * Short label for the Documents table's File Type column. The filename wins
 * over the MIME type because uploads coming from other tools often arrive as a
 * generic `application/octet-stream`.
 */
function fileTypeLabel(name: string, mimeType: string | null) {
  const ext = name.includes('.') ? name.split('.').pop() : null
  if (ext) return ext.toUpperCase()
  const sub = mimeType?.split('/')[1]
  return sub ? sub.toUpperCase() : 'FILE'
}

/** A sent invoice inside a week of its due date reads as "Due Soon". */
const DUE_SOON_DAYS = 7

function invoiceStatus(status: string, dueDate: string | null): ProjectInvoiceStatus {
  // A sent invoice's real state depends on today: past its due date it is
  // overdue, not merely due soon, even though the column still says 'sent'.
  if (status === 'sent' && dueDate) {
    const daysLeft = (new Date(`${dueDate}T00:00:00`).getTime() - Date.now()) / 86_400_000
    if (daysLeft < 0) return 'overdue'
    if (daysLeft <= DUE_SOON_DAYS) return 'due_soon'
  }
  return (['draft', 'sent', 'paid', 'overdue', 'partial'].includes(status)
    ? status
    : 'draft') as ProjectInvoiceStatus
}

/**
 * One project by id. The detail tabs (Overview / Work Orders / Team) read from
 * `details`, so the work orders, crew and budget rollup are assembled here
 * rather than left undefined — an unpopulated `details` renders empty tabs.
 */
export async function getProject(id: string): Promise<Project | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('projects')
    .select(`
      *,
      manager:users (first_name, last_name, avatar_url),
      client:clients (name)
    `)
    .eq('id', id)
    .single()

  if (error) {
    console.error('getProject error:', error)
    return null
  }

  const [workOrdersRes, membersRes, documentsRes, invoicesRes] = await Promise.all([
    admin
      .from('work_orders')
      .select('id, name, priority, status, technician:users (first_name, last_name, avatar_url)')
      .eq('project_id', id)
      .order('created_at', { ascending: false }),
    admin
      .from('project_members')
      .select('user_id, crew_role, user:users (id, first_name, last_name, role, avatar_url)')
      .eq('project_id', id),
    admin
      .from('documents')
      .select('id, name, url, mime_type, created_at, uploader:users!documents_uploaded_by_id_fkey (first_name, last_name)')
      .eq('project_id', id)
      .order('created_at', { ascending: false }),
    admin
      .from('invoices')
      .select('id, invoice_number, status, total, due_date, client:clients (name)')
      .eq('project_id', id)
      .order('issued_date', { ascending: false }),
  ])

  if (workOrdersRes.error) console.error('getProject work orders error:', workOrdersRes.error)
  if (membersRes.error) console.error('getProject members error:', membersRes.error)
  if (documentsRes.error) console.error('getProject documents error:', documentsRes.error)
  if (invoicesRes.error) console.error('getProject invoices error:', invoicesRes.error)

  const project = data as Project & { spent?: number | null }
  const totalBudget = Number(project.budget ?? 0)
  const spent = Number(project.spent ?? 0)

  const workOrders = (workOrdersRes.data ?? []).map((wo) => {
    const technician = Array.isArray(wo.technician) ? wo.technician[0] : wo.technician
    const technicianName = fullName(technician)
    return {
      id: wo.id as string,
      code: `WO-${String(wo.id).slice(0, 8).toUpperCase()}`,
      name: wo.name as string,
      priority: PRIORITY_LABEL[wo.priority as keyof typeof PRIORITY_LABEL] ?? 'Mid',
      status: (wo.status === 'closed' ? 'Closed' : 'Open') as 'Open' | 'Closed',
      technician: technicianName
        ? { name: technicianName, avatar: technician?.avatar_url ?? undefined }
        : undefined,
    }
  })

  // The manager leads the crew, so they head the team list alongside members.
  const crew = (membersRes.data ?? []).flatMap((row) => {
    const user = Array.isArray(row.user) ? row.user[0] : row.user
    if (!user) return []
    return [{
      id: user.id as string,
      name: fullName(user),
      role: (row.crew_role as string | null) ?? CREW_ROLE_LABEL[user.role as keyof typeof CREW_ROLE_LABEL] ?? 'Crew Member',
      avatar: user.avatar_url ?? undefined,
    }]
  })

  const documents = (documentsRes.data ?? []).map((doc) => {
    const uploader = Array.isArray(doc.uploader) ? doc.uploader[0] : doc.uploader
    return {
      id: doc.id as string,
      name: doc.name as string,
      fileType: fileTypeLabel(doc.name as string, doc.mime_type as string | null),
      url: doc.url as string,
      dateSubmitted: doc.created_at as string,
      uploadedBy: fullName(uploader) || '—',
    }
  })

  const invoices = (invoicesRes.data ?? []).map((inv) => {
    const client = Array.isArray(inv.client) ? inv.client[0] : inv.client
    return {
      id: inv.id as string,
      code: (inv.invoice_number as string) ?? '—',
      clientName: client?.name ?? '—',
      amount: Number(inv.total ?? 0),
      status: invoiceStatus(inv.status as string, inv.due_date as string | null),
      dueDate: (inv.due_date as string) ?? '',
    }
  })

  const manager = Array.isArray(project.manager) ? project.manager[0] : project.manager
  const team = manager && project.manager_id && !crew.some((c) => c.id === project.manager_id)
    ? [{ id: project.manager_id, name: fullName(manager), role: 'Manager', avatar: manager.avatar_url ?? undefined }, ...crew]
    : crew

  return {
    ...project,
    details: {
      totalBudget,
      spent,
      remaining: totalBudget - spent,
      budgetUsedPercent: totalBudget > 0 ? Math.round((spent / totalBudget) * 100) : 0,
      startDate: project.start_date ?? '',
      crewSize: crew.length,
      workOrders,
      team,
      documents,
      invoices,
    },
  } as Project
}

export type CreateProjectInput = {
  name: string
  type: string
  status: string
  location?: string
  description?: string
  start_date?: string | null
  due_date?: string | null
  budget?: number | null
  manager_id?: string | null
  client_id?: string | null
  image_url?: string | null
}

/** Postgres unique-violation, raised when two inserts race for the same code. */
const UNIQUE_VIOLATION = '23505'

/**
 * Highest number currently used by a PRJ-### code. Read as rows rather than a
 * `head: true` count — a head request returns no data, which previously made
 * this always 0 and every new project collide on `PRJ-001`.
 */
async function maxProjectNumber(admin: ReturnType<typeof createAdminClient>): Promise<number> {
  const { data } = await admin.from('projects').select('code')
  let max = 0
  for (const row of data ?? []) {
    const n = parseInt(String(row.code ?? '').replace(/[^0-9]/g, ''), 10)
    if (!isNaN(n) && n > max) max = n
  }
  return max
}

function formatProjectCode(n: number) {
  return `PRJ-${String(n).padStart(3, '0')}`
}

export async function createProject(input: CreateProjectInput) {
  const admin = createAdminClient()

  // `code` is UNIQUE, so on a race retry with the next number instead of failing.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = formatProjectCode((await maxProjectNumber(admin)) + 1 + attempt)

    const { data, error } = await admin
      .from('projects')
      .insert({ ...input, code, progress: 0 })
      .select()
      .single()

    if (!error) {
      revalidatePath('/admin/projects')
      return { data }
    }
    if (error.code !== UNIQUE_VIOLATION) return { error: error.message }
  }

  return { error: 'Could not allocate a unique project code — please try again.' }
}

export async function updateProject(id: string, input: any) {
  const admin = createAdminClient()
  const { error } = await admin
    .from('projects')
    .update(input)
    .eq('id', id)

  if (error) return { error: error.message }
  
  revalidatePath('/admin/projects')
  return { success: true }
}

export async function deleteProject(id: string) {
  const admin = createAdminClient()
  const { error } = await admin
    .from('projects')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }
  
  revalidatePath('/admin/projects')
  return { success: true }
}

export async function uploadProjectImage(formData: FormData) {
  const file = formData.get('file') as File | null
  if (!file) return { error: 'No file provided' }

  const result = await uploadToStorage(StorageFolder.projects, file)
  if ('error' in result) return { error: result.error }

  return { url: result.url }
}

/**
 * Lookups for the project form. Employees are every non-client user, so the
 * crew picker and the manager dropdown draw from the same list — the modal
 * greys out whoever is picked as manager instead of filtering roles apart.
 */
export async function getProjectOptions() {
  const admin = createAdminClient()
  const [clientsRes, usersRes] = await Promise.all([
    admin.from('clients').select('id, name').order('name'),
    admin
      .from('users')
      .select('id, first_name, last_name, role, avatar_url')
      .neq('role', 'client')
      .order('first_name'),
  ])

  const employees = (usersRes.data || []).map((u) => ({
    id: u.id,
    name: `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim(),
    role: u.role as 'admin' | 'manager' | 'technician',
    avatar_url: u.avatar_url ?? null,
  }))

  return {
    clients: clientsRes.data || [],
    employees,
  }
}

/** User ids currently on a project's crew. */
export async function getProjectCrew(projectId: string): Promise<string[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('project_members')
    .select('user_id')
    .eq('project_id', projectId)

  if (error) {
    console.error('getProjectCrew error:', error)
    return []
  }
  return (data ?? []).map((row) => row.user_id as string)
}

/**
 * Syncs project_members to the given ids. Diffed rather than replaced so that
 * per-member crew_role values survive an unrelated edit to the crew list.
 */
export async function setProjectCrew(projectId: string, userIds: string[]) {
  const admin = createAdminClient()
  const { data: existing, error: readError } = await admin
    .from('project_members')
    .select('user_id')
    .eq('project_id', projectId)

  if (readError) return { error: readError.message }

  const current = new Set((existing ?? []).map((row) => row.user_id as string))
  const next = new Set(userIds)
  const toRemove = [...current].filter((id) => !next.has(id))
  const toAdd = userIds.filter((id) => !current.has(id))

  if (toRemove.length) {
    const { error } = await admin
      .from('project_members')
      .delete()
      .eq('project_id', projectId)
      .in('user_id', toRemove)
    if (error) return { error: error.message }
  }

  if (toAdd.length) {
    const { error } = await admin
      .from('project_members')
      .insert(toAdd.map((user_id) => ({ project_id: projectId, user_id })))
    if (error) return { error: error.message }
  }

  revalidatePath('/admin/projects')
  return { success: true }
}

export type ProjectImportResult = { name: string; id?: string; error?: string }

/**
 * Bulk-creates projects from CSV rows. Manager and client arrive as display
 * names, so they are resolved against existing records here; unmatched names are
 * left null rather than failing the whole row. Codes continue the PRJ-### run.
 */
export async function importProjects(rows: {
  name: string
  location: string
  type: string
  status: string
  managerName: string
  clientName: string
  start_date: string | null
  due_date: string | null
  progress: number
  budget: number | null
}[]): Promise<ProjectImportResult[]> {
  const admin = createAdminClient()

  const [{ data: clients }, { data: users }, startNumber] = await Promise.all([
    admin.from('clients').select('id, name'),
    admin.from('users').select('id, first_name, last_name'),
    maxProjectNumber(admin),
  ])

  const key = (s: string) => s.trim().toLowerCase()
  const clientByName = new Map((clients ?? []).map((c) => [key(c.name), c.id]))
  const managerByName = new Map(
    (users ?? []).map((u) => [key(`${u.first_name} ${u.last_name}`), u.id]),
  )

  // Continue the existing PRJ-### sequence rather than restarting at 1.
  let nextNumber = startNumber

  const results: ProjectImportResult[] = []
  for (const row of rows) {
    nextNumber += 1
    const { data, error } = await admin
      .from('projects')
      .insert({
        code: formatProjectCode(nextNumber),
        name: row.name,
        location: row.location,
        type: row.type,
        status: row.status,
        manager_id: managerByName.get(key(row.managerName)) ?? null,
        client_id: clientByName.get(key(row.clientName)) ?? null,
        start_date: row.start_date,
        due_date: row.due_date,
        progress: row.progress,
        budget: row.budget,
      })
      .select('id')
      .single()

    results.push(error ? { name: row.name, error: error.message } : { name: row.name, id: data.id })
  }

  revalidatePath('/admin/projects')
  return results
}
