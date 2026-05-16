'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { Project, ProjectType, ProjectStatus } from './data'

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

export async function createProject(input: any) {
  const admin = createAdminClient()
  
  // Get count for code generation
  const { data: countData } = await admin
    .from('projects')
    .select('id', { count: 'exact', head: true })
  
  const count = countData?.length || 0
  const nextCode = `PRJ-${String(count + 1).padStart(3, '0')}`

  const { data, error } = await admin
    .from('projects')
    .insert({
      ...input,
      code: nextCode,
      progress: 0,
    })
    .select()
    .single()

  if (error) return { error: error.message }
  
  revalidatePath('/admin/projects')
  return { data }
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
  const admin = createAdminClient()
  const file = formData.get('file') as File
  if (!file) return { error: 'No file provided' }

  const ext = file.name.split('.').pop() ?? 'jpg'
  const fileName = `project-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const bytes = await file.arrayBuffer()

  const { error } = await admin.storage
    .from('projects')
    .upload(fileName, bytes, { contentType: file.type, upsert: false })

  if (error) return { error: error.message }

  const { data: { publicUrl } } = admin.storage
    .from('projects')
    .getPublicUrl(fileName)

  return { url: publicUrl }
}

export async function getProjectOptions() {
  const admin = createAdminClient()
  const [clientsRes, usersRes] = await Promise.all([
    admin.from('clients').select('id, name').order('name'),
    admin.from('users').select('id, first_name, last_name, role').order('first_name')
  ])
  
  return {
    clients: clientsRes.data || [],
    managers: (usersRes.data || [])
      .filter(u => u.role === 'admin' || u.role === 'manager')
      .map(u => ({ id: u.id, name: `${u.first_name} ${u.last_name}` })),
    crew: (usersRes.data || [])
      .map(u => ({ id: u.id, name: `${u.first_name} ${u.last_name}` }))
  }
}
