'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { uploadToStorage, StorageFolder, removeFromStorage } from '@/lib/storage'

export type DocumentRow = {
  id: string
  name: string
  type: string
  status: string
  url: string
  sizeBytes: number | null
  mimeType: string | null
  createdAt: string
  projectName: string
  projectCode: string
  uploadedBy: string
}

type DocumentQueryRow = {
  id: string
  name: string
  type: string | null
  status: string | null
  url: string
  size_bytes: number | null
  mime_type: string | null
  created_at: string
  project: { name: string; code: string } | null
  uploader: { first_name: string; last_name: string } | null
}

/** Project ids a client portal user is allowed to see, or null for staff. */
async function clientProjectIds(supabaseId: string | undefined) {
  if (!supabaseId) return null

  const admin = createAdminClient()
  const { data: user } = await admin
    .from('users')
    .select('id, role')
    .eq('supabase_id', supabaseId)
    .maybeSingle()

  if (!user || user.role !== 'client') return null

  const { data: clients } = await admin
    .from('clients')
    .select('id')
    .eq('portal_user_id', user.id)

  const clientIds = (clients ?? []).map((c) => c.id)
  if (clientIds.length === 0) return []

  const { data: projects } = await admin
    .from('projects')
    .select('id')
    .in('client_id', clientIds)

  return (projects ?? []).map((p) => p.id)
}

export async function getDocuments(supabaseId?: string): Promise<DocumentRow[]> {
  const admin = createAdminClient()
  const allowedProjects = await clientProjectIds(supabaseId)

  // A client with no linked projects sees an empty list, never everyone's files.
  if (allowedProjects?.length === 0) return []

  let query = admin
    .from('documents')
    .select(
      'id, name, type, status, url, size_bytes, mime_type, created_at, ' +
      'project:projects(name, code), uploader:users!documents_uploaded_by_id_fkey(first_name, last_name)'
    )
    .order('created_at', { ascending: false })

  if (allowedProjects) query = query.in('project_id', allowedProjects)

  const { data, error } = await query
  if (error) {
    console.error('getDocuments:', error.message)
    return []
  }

  return ((data ?? []) as unknown as DocumentQueryRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    type: row.type ?? 'other',
    status: row.status ?? 'pending',
    url: row.url,
    sizeBytes: row.size_bytes,
    mimeType: row.mime_type,
    createdAt: row.created_at,
    projectName: row.project?.name ?? '—',
    projectCode: row.project?.code ?? '',
    uploadedBy: row.uploader
      ? `${row.uploader.first_name} ${row.uploader.last_name}`.trim()
      : '—',
  }))
}

export async function getDocumentProjects(supabaseId?: string) {
  const admin = createAdminClient()
  const allowedProjects = await clientProjectIds(supabaseId)
  if (allowedProjects?.length === 0) return []

  let query = admin.from('projects').select('id, name, code').order('name')
  if (allowedProjects) query = query.in('id', allowedProjects)

  const { data } = await query
  return data ?? []
}

export async function uploadDocument(formData: FormData): Promise<{ id: string } | { error: string }> {
  const file = formData.get('file') as File | null
  const projectId = formData.get('projectId') as string | null
  const supabaseId = formData.get('supabaseId') as string | null
  if (!file) return { error: 'No file provided' }
  if (!projectId) return { error: 'Pick a project for this document' }

  const admin = createAdminClient()

  const { data: uploader } = await admin
    .from('users')
    .select('id')
    .eq('supabase_id', supabaseId ?? '')
    .maybeSingle()

  const uploaded = await uploadToStorage(StorageFolder.documents, file, { fallbackExtension: 'pdf' })
  if ('error' in uploaded) return { error: uploaded.error }

  const { data, error } = await admin
    .from('documents')
    .insert({
      project_id: projectId,
      uploaded_by_id: uploader?.id ?? null,
      name: file.name,
      type: 'other',
      status: 'pending',
      url: uploaded.url,
      size_bytes: file.size,
      mime_type: file.type || null,
    })
    .select('id')
    .single()

  if (error) {
    await removeFromStorage(StorageFolder.documents, uploaded.path)
    return { error: error.message }
  }

  revalidatePath('/admin/documents')
  return { id: data.id }
}

export async function deleteDocument(id: string): Promise<{ success: true } | { error: string }> {
  const admin = createAdminClient()
  const { data: doc } = await admin.from('documents').select('url').eq('id', id).maybeSingle()

  const { error } = await admin.from('documents').delete().eq('id', id)
  if (error) return { error: error.message }

  if (doc?.url) await removeFromStorage(StorageFolder.documents, doc.url)

  revalidatePath('/admin/documents')
  return { success: true as const }
}
