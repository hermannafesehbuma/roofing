'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

export type DbTaskStatus = 'todo' | 'in_progress' | 'in_review' | 'completed'
export type DbTaskPriority = 'high' | 'medium' | 'low'

export type TaskRow = {
  id: string
  project_id: string
  project_name: string | null
  title: string
  description: string | null
  status: DbTaskStatus
  priority: DbTaskPriority
  assignee_id: string | null
  assignee_name: string | null
  assignee_avatar: string | null
  due_date: string | null
  created_at: string
}

export type ProjectOption = { id: string; name: string }
export type AssigneeOption = { id: string; name: string; avatar_url: string | null }

export async function getTasks(): Promise<TaskRow[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('tasks')
    .select(`
      id, project_id, title, description, status, priority,
      assignee_id, due_date, created_at,
      project:project_id(name),
      assignee:assignee_id(first_name, last_name, avatar_url)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getTasks error:', error)
    return []
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    project_id: row.project_id,
    project_name: row.project?.name ?? null,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    assignee_id: row.assignee_id,
    assignee_name: row.assignee
      ? `${row.assignee.first_name} ${row.assignee.last_name}`.trim()
      : null,
    assignee_avatar: row.assignee?.avatar_url ?? null,
    due_date: row.due_date,
    created_at: row.created_at,
  }))
}

export async function getProjectOptions(): Promise<ProjectOption[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('projects')
    .select('id, name')
    .order('name')

  return (data ?? []).map((p: any) => ({ id: p.id, name: p.name }))
}

export async function getAssigneeOptions(): Promise<AssigneeOption[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('users')
    .select('id, first_name, last_name, avatar_url')
    .order('first_name')

  return (data ?? []).map((u: any) => ({
    id: u.id,
    name: `${u.first_name} ${u.last_name}`.trim(),
    avatar_url: u.avatar_url,
  }))
}

export type CreateTaskInput = {
  projectId: string
  title: string
  description: string
  status: DbTaskStatus
  priority: DbTaskPriority
  assigneeId: string | null
  dueDate: string | null
}

export async function createTask(input: CreateTaskInput) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('tasks')
    .insert({
      project_id: input.projectId,
      title: input.title,
      description: input.description || null,
      status: input.status,
      priority: input.priority,
      assignee_id: input.assigneeId || null,
      due_date: input.dueDate || null,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }
  revalidatePath('/admin/tasks')
  return { id: data.id }
}

export type UpdateTaskInput = Partial<CreateTaskInput> & { id: string }

export async function updateTask(input: UpdateTaskInput) {
  const admin = createAdminClient()
  const { error } = await admin
    .from('tasks')
    .update({
      ...(input.projectId !== undefined && { project_id: input.projectId }),
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description || null }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.priority !== undefined && { priority: input.priority }),
      ...(input.assigneeId !== undefined && { assignee_id: input.assigneeId || null }),
      ...(input.dueDate !== undefined && { due_date: input.dueDate || null }),
    })
    .eq('id', input.id)

  if (error) return { error: error.message }
  revalidatePath('/admin/tasks')
  return { success: true }
}

export async function deleteTask(id: string) {
  const admin = createAdminClient()
  const { error } = await admin.from('tasks').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/tasks')
  return { success: true }
}
