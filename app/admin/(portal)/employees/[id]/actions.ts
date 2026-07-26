'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { bucketFor, StorageFolder } from '@/lib/storage'

/**
 * Data for the tabs on the employee detail screen. Everything here is scoped to
 * one employee — the projects they are on, the tasks they own, the RFIs they
 * filed, the documents they uploaded and the inspections they ran.
 */

const DOCUMENTS_BUCKET = bucketFor(StorageFolder.documents)

/** Discriminated so callers can narrow with `'error' in result`. */
type ActionResult = { success: true } | { error: string }

/** Shape of an embedded `users` join. */
type NamedUser = { first_name?: string | null; last_name?: string | null }

function fullName(u: NamedUser | null | undefined) {
  if (!u) return null
  return `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || null
}

// ─── Assigned Projects ────────────────────────────────────────────────────────
export type EmployeeProject = {
  id: string
  name: string
  type: 'residential' | 'commercial'
  status: 'in_progress' | 'completed' | 'on_hold'
  location: string | null
  manager: string | null
  client: string | null
  dueDate: string | null
  progress: number
  imageUrl: string | null
}

const PROJECT_SELECT = `
  id, name, type, status, location, due_date, progress, image_url,
  manager:manager_id(first_name, last_name),
  client:client_id(name)
`

type ProjectRow = {
  id: string
  name: string
  type: EmployeeProject['type']
  status: EmployeeProject['status']
  location: string | null
  due_date: string | null
  progress: number | null
  image_url: string | null
  manager: NamedUser | null
  client: { name: string } | null
}

function toEmployeeProject(row: ProjectRow): EmployeeProject {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    status: row.status,
    location: row.location ?? null,
    manager: fullName(row.manager),
    client: row.client?.name ?? null,
    dueDate: row.due_date ?? null,
    progress: row.progress ?? 0,
    imageUrl: row.image_url ?? null,
  }
}

/** Projects the employee is crew on, plus any they manage. */
export async function getEmployeeProjects(userId: string): Promise<EmployeeProject[]> {
  const admin = createAdminClient()

  const [memberships, managed] = await Promise.all([
    admin.from('project_members').select(`project:project_id(${PROJECT_SELECT})`).eq('user_id', userId),
    admin.from('projects').select(PROJECT_SELECT).eq('manager_id', userId),
  ])

  if (memberships.error) console.error('getEmployeeProjects (members):', memberships.error)
  if (managed.error) console.error('getEmployeeProjects (managed):', managed.error)

  const rows: ProjectRow[] = [
    ...((memberships.data ?? []) as unknown as { project: ProjectRow | null }[]).map((m) => m.project).filter((p): p is ProjectRow => !!p),
    ...((managed.data ?? []) as unknown as ProjectRow[]),
  ]

  // A manager who is also a crew member would otherwise appear twice.
  const byId = new Map<string, EmployeeProject>()
  for (const row of rows) byId.set(row.id, toEmployeeProject(row))
  return [...byId.values()]
}

// ─── Project Timeline ─────────────────────────────────────────────────────────
export type TimelineTask = {
  id: string
  title: string
  status: string
  projectId: string
  projectName: string
  /** ISO dates bounding the bar; both are always present. */
  from: string
  to: string
}

export type TimelineProject = {
  id: string
  name: string
  from: string
  to: string
}

export type EmployeeTimeline = { projects: TimelineProject[]; tasks: TimelineTask[] }

const DAY_MS = 86_400_000
const isoDay = (d: Date) => d.toISOString().slice(0, 10)

/**
 * Tasks assigned to the employee, grouped under their project. Tasks only store
 * a due date, so a bar runs from when the task was created to when it is due;
 * anything without a due date gets a nominal one-week bar so it still shows.
 */
export async function getEmployeeTimeline(userId: string): Promise<EmployeeTimeline> {
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('tasks')
    .select('id, title, status, due_date, created_at, project:project_id(id, name, start_date, due_date)')
    .eq('assignee_id', userId)
    .order('due_date', { ascending: true })

  if (error) {
    console.error('getEmployeeTimeline:', error)
    return { projects: [], tasks: [] }
  }

  const tasks: TimelineTask[] = []
  const projects = new Map<string, TimelineProject>()

  type TaskRow = {
    id: string
    title: string
    status: string
    due_date: string | null
    created_at: string
    project: { id: string; name: string; start_date: string | null; due_date: string | null } | null
  }

  for (const row of (data ?? []) as unknown as TaskRow[]) {
    if (!row.project) continue

    const created = new Date(row.created_at)
    const due = row.due_date ? new Date(`${row.due_date}T00:00:00`) : new Date(created.getTime() + 7 * DAY_MS)
    // Guard against a due date that predates creation — draw at least one day.
    const to = due > created ? due : new Date(created.getTime() + DAY_MS)

    tasks.push({
      id: row.id,
      title: row.title,
      status: row.status,
      projectId: row.project.id,
      projectName: row.project.name,
      from: isoDay(created),
      to: isoDay(to),
    })

    const existing = projects.get(row.project.id)
    const projFrom = row.project.start_date ?? isoDay(created)
    const projTo = row.project.due_date ?? isoDay(to)
    if (!existing) {
      projects.set(row.project.id, { id: row.project.id, name: row.project.name, from: projFrom, to: projTo })
    } else {
      // Widen the band to cover every task we found for that project.
      if (projFrom < existing.from) existing.from = projFrom
      if (projTo > existing.to) existing.to = projTo
    }
  }

  return { projects: [...projects.values()], tasks }
}

// ─── RFIs Filed ───────────────────────────────────────────────────────────────
export type RfiComment = { id: string; author: string; content: string; createdAt: string }
export type RfiAttachment = { id: string; name: string; url: string }

export type EmployeeRfi = {
  id: string
  title: string
  project: string
  projectId: string
  /** DB enum is open | in_review | closed; the UI only distinguishes closed. */
  status: 'open' | 'in_review' | 'closed'
  description: string | null
  createdAt: string
  createdBy: string | null
  assignee: string | null
  assigneeId: string | null
  assignedAt: string | null
  resolvedAt: string | null
  comments: RfiComment[]
  attachments: RfiAttachment[]
}

export async function getEmployeeRfis(userId: string): Promise<EmployeeRfi[]> {
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('rfis')
    .select(`
      id, title, description, status, created_at, resolved_at, assigned_at, assigned_to_id,
      project:project_id(id, name),
      submitter:submitted_by_id(first_name, last_name),
      assignee:assigned_to_id(first_name, last_name),
      comments:rfi_comments(id, content, created_at, author:user_id(first_name, last_name)),
      attachments:documents(id, name, url, rfi_id)
    `)
    .eq('submitted_by_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getEmployeeRfis:', error)
    return []
  }

  type RfiRow = {
    id: string
    title: string
    description: string | null
    status: EmployeeRfi['status']
    created_at: string
    resolved_at: string | null
    assigned_at: string | null
    assigned_to_id: string | null
    project: { id: string; name: string } | null
    submitter: NamedUser | null
    assignee: NamedUser | null
    comments: { id: string; content: string; created_at: string; author: NamedUser | null }[] | null
    attachments: { id: string; name: string; url: string; rfi_id: string | null }[] | null
  }

  return ((data ?? []) as unknown as RfiRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    project: row.project?.name ?? '—',
    projectId: row.project?.id ?? '',
    status: row.status,
    description: row.description ?? null,
    createdAt: row.created_at,
    createdBy: fullName(row.submitter),
    assignee: fullName(row.assignee),
    assigneeId: row.assigned_to_id ?? null,
    assignedAt: row.assigned_at ?? null,
    resolvedAt: row.resolved_at ?? null,
    comments: (row.comments ?? [])
      .map((c) => ({
        id: c.id,
        author: fullName(c.author) ?? 'Unknown',
        content: c.content,
        createdAt: c.created_at,
      }))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    // The embed returns every document on the project, so keep only this RFI's.
    attachments: (row.attachments ?? [])
      .filter((d) => d.rfi_id === row.id)
      .map((d) => ({ id: d.id, name: d.name, url: d.url })),
  }))
}

/** Managers and admins who can be put on an RFI. */
export async function getAssignableManagers(): Promise<{ id: string; name: string }[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('users')
    .select('id, first_name, last_name')
    .in('role', ['admin', 'manager'])
    .eq('status', 'active')
    .order('first_name')

  if (error) {
    console.error('getAssignableManagers:', error)
    return []
  }
  return (data ?? []).map((u) => ({ id: u.id, name: fullName(u) ?? 'Unknown' }))
}

export async function assignRfi(rfiId: string, managerId: string): Promise<ActionResult> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('rfis')
    .update({ assigned_to_id: managerId, assigned_at: new Date().toISOString(), status: 'in_review' })
    .eq('id', rfiId)

  if (error) return { error: error.message }
  revalidatePath('/admin/employees')
  return { success: true }
}

export async function closeRfi(rfiId: string): Promise<ActionResult> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('rfis')
    .update({ status: 'closed', resolved_at: new Date().toISOString() })
    .eq('id', rfiId)

  if (error) return { error: error.message }
  revalidatePath('/admin/employees')
  return { success: true }
}

/** `authSupabaseId` is the auth user id held in the client session. */
export async function addRfiComment(rfiId: string, authSupabaseId: string, content: string) {
  const body = content.trim()
  if (!body) return { error: 'Comment cannot be empty' }

  const admin = createAdminClient()
  const { data: author, error: authorError } = await admin
    .from('users')
    .select('id, first_name, last_name')
    .eq('supabase_id', authSupabaseId)
    .single()

  if (authorError || !author) return { error: 'Could not identify the signed-in user' }

  const { data, error } = await admin
    .from('rfi_comments')
    .insert({ rfi_id: rfiId, user_id: author.id, content: body })
    .select('id, content, created_at')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/admin/employees')
  return {
    comment: {
      id: data.id,
      author: fullName(author) ?? 'Unknown',
      content: data.content,
      createdAt: data.created_at,
    } satisfies RfiComment,
  }
}

export async function uploadRfiAttachment(formData: FormData): Promise<{ attachment: RfiAttachment } | { error: string }> {
  const file = formData.get('file') as File | null
  const rfiId = String(formData.get('rfiId') ?? '')
  const projectId = String(formData.get('projectId') ?? '')
  const authSupabaseId = String(formData.get('authSupabaseId') ?? '')

  if (!file || file.size === 0) return { error: 'No file provided' }
  if (!rfiId || !projectId) return { error: 'Missing RFI or project' }

  const admin = createAdminClient()
  const { data: uploader } = await admin
    .from('users')
    .select('id')
    .eq('supabase_id', authSupabaseId)
    .single()

  if (!uploader) return { error: 'Could not identify the signed-in user' }

  const ext = file.name.split('.').pop() ?? 'bin'
  const path = `rfi/${rfiId}/${crypto.randomUUID()}.${ext}`
  const bytes = await file.arrayBuffer()

  const { error: uploadError } = await admin.storage
    .from(DOCUMENTS_BUCKET)
    .upload(path, bytes, { contentType: file.type || 'application/octet-stream' })

  if (uploadError) return { error: uploadError.message }

  const { data: pub } = admin.storage.from(DOCUMENTS_BUCKET).getPublicUrl(path)

  const { data, error } = await admin
    .from('documents')
    .insert({
      project_id: projectId,
      rfi_id: rfiId,
      uploaded_by_id: uploader.id,
      name: file.name,
      type: 'other',
      status: 'pending',
      url: pub.publicUrl,
      size_bytes: file.size,
      mime_type: file.type || null,
    })
    .select('id, name, url')
    .single()

  if (error) {
    await admin.storage.from(DOCUMENTS_BUCKET).remove([path])
    return { error: error.message }
  }

  revalidatePath('/admin/employees')
  return { attachment: { id: data.id, name: data.name, url: data.url } }
}

export async function deleteRfiAttachment(documentId: string): Promise<ActionResult> {
  const admin = createAdminClient()
  const { data: doc } = await admin.from('documents').select('url').eq('id', documentId).single()

  const { error } = await admin.from('documents').delete().eq('id', documentId)
  if (error) return { error: error.message }

  // Best-effort storage cleanup — the row is already gone either way.
  if (doc?.url) {
    const marker = `/${DOCUMENTS_BUCKET}/`
    const idx = doc.url.indexOf(marker)
    if (idx !== -1) await admin.storage.from(DOCUMENTS_BUCKET).remove([doc.url.slice(idx + marker.length)])
  }

  revalidatePath('/admin/employees')
  return { success: true }
}

// ─── Submittals & Drawings ────────────────────────────────────────────────────
export type EmployeeDocument = {
  id: string
  name: string
  project: string
  status: 'pending' | 'in_review' | 'approved'
  url: string
  mimeType: string | null
  createdAt: string
}

export async function getEmployeeDocuments(userId: string): Promise<EmployeeDocument[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('documents')
    .select('id, name, status, url, mime_type, created_at, project:project_id(name)')
    .eq('uploaded_by_id', userId)
    .in('type', ['submittal', 'drawing'])
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getEmployeeDocuments:', error)
    return []
  }

  type DocRow = {
    id: string
    name: string
    status: EmployeeDocument['status']
    url: string
    mime_type: string | null
    created_at: string
    project: { name: string } | null
  }

  return ((data ?? []) as unknown as DocRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    project: row.project?.name ?? '—',
    status: row.status,
    url: row.url,
    mimeType: row.mime_type ?? null,
    createdAt: row.created_at,
  }))
}

export async function updateDocumentStatus(documentId: string, status: 'approved' | 'in_review'): Promise<ActionResult> {
  const admin = createAdminClient()
  const { error } = await admin.from('documents').update({ status }).eq('id', documentId)
  if (error) return { error: error.message }
  revalidatePath('/admin/employees')
  return { success: true }
}

// ─── Inspection Log ───────────────────────────────────────────────────────────
export type EmployeeInspection = {
  id: string
  title: string
  project: string
  result: 'pass' | 'fail'
  notes: string | null
  inspectedAt: string
}

export async function getEmployeeInspections(userId: string): Promise<EmployeeInspection[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('inspections')
    .select('id, title, result, notes, inspected_at, project:project_id(name)')
    .eq('inspector_id', userId)
    .order('inspected_at', { ascending: false })

  if (error) {
    console.error('getEmployeeInspections:', error)
    return []
  }

  type InspectionRow = {
    id: string
    title: string
    result: EmployeeInspection['result']
    notes: string | null
    inspected_at: string
    project: { name: string } | null
  }

  return ((data ?? []) as unknown as InspectionRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    project: row.project?.name ?? '—',
    result: row.result,
    notes: row.notes ?? null,
    inspectedAt: row.inspected_at,
  }))
}
