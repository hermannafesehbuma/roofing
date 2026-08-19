'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { uploadToStorage, StorageFolder } from '@/lib/storage'

export type OwnProfile = {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  role: string
  department: string | null
  employeeId: string | null
  startDate: string | null
  avatarUrl: string | null
}

export async function getOwnProfile(userId: string): Promise<OwnProfile | null> {
  if (!userId) return null

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('users')
    .select('id, first_name, last_name, email, phone, role, department, employee_id, start_date, avatar_url')
    .eq('id', userId)
    .maybeSingle()

  if (error || !data) return null

  return {
    id: data.id,
    firstName: data.first_name ?? '',
    lastName: data.last_name ?? '',
    email: data.email ?? '',
    phone: data.phone,
    role: data.role,
    department: data.department,
    employeeId: data.employee_id,
    startDate: data.start_date,
    avatarUrl: data.avatar_url,
  }
}

/**
 * Self-service edit. Deliberately narrower than `updateEmployee`: name, phone
 * and photo only. Role, status and pay stay off this path so a client or
 * technician cannot promote themselves by calling it.
 */
export async function updateOwnProfile(input: {
  id: string
  firstName: string
  lastName: string
  phone: string
  avatarUrl?: string | null
}): Promise<{ success: true } | { error: string }> {
  if (!input.id) return { error: 'Not signed in' }
  if (!input.firstName.trim()) return { error: 'First name is required' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('users')
    .update({
      first_name: input.firstName.trim(),
      last_name: input.lastName.trim(),
      phone: input.phone.trim() || null,
      avatar_url: input.avatarUrl ?? undefined,
    })
    .eq('id', input.id)

  if (error) return { error: error.message }

  revalidatePath('/admin/profile')
  return { success: true }
}

export async function uploadProfilePhoto(formData: FormData): Promise<{ url: string } | { error: string }> {
  const file = formData.get('file') as File | null
  if (!file) return { error: 'No file provided' }

  const result = await uploadToStorage(StorageFolder.avatars, file)
  if ('error' in result) return { error: result.error }

  return { url: result.url }
}
