'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { uploadToStorage, StorageFolder } from '@/lib/storage'
import { sendInvite } from '@/lib/email/sendInvite'

export type EmployeeRow = {
  id: string
  first_name: string
  last_name: string
  email: string
  employee_id: string | null
  role: 'admin' | 'manager' | 'technician' | 'client'
  status: 'active' | 'on_leave' | 'inactive'
  phone: string | null
  department: string | null
  employee_type: 'full_time' | 'part_time' | 'contractor' | 'subcontractor' | null
  gender: string | null
  rate_of_pay: number | null
  start_date: string | null
  avatar_url: string | null
}

export async function getEmployee(id: string): Promise<EmployeeRow | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, email, employee_id, role, status, phone, department, employee_type, gender, rate_of_pay, start_date, avatar_url')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}

export async function getEmployees(): Promise<EmployeeRow[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, email, employee_id, role, status, phone, department, employee_type, gender, rate_of_pay, start_date, avatar_url')
    .neq('role', 'client')
    .order('first_name')

  if (error) {
    console.error('getEmployees error:', error)
    return []
  }
  return data ?? []
}

export type CreateEmployeeInput = {
  firstName: string
  lastName: string
  email: string
  employeeId: string
  role: 'admin' | 'manager' | 'technician'
  employeeType: 'full_time' | 'part_time' | 'contractor' | 'subcontractor'
  status: 'active' | 'on_leave' | 'inactive'
  department: string
  gender: string
  rateOfPay: number | null
  startDate: string | null
  avatarUrl: string | null
  phone: string
}

export async function createEmployee(input: CreateEmployeeInput) {
  const admin = createAdminClient()

  // The auth user has to exist first so the employee row can hold its
  // supabase_id. It is created with a random password that is never stored,
  // shown, or sent — the invite below is the only way in, and the invitee sets
  // the real password themselves (Addendum Task 4).
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: input.email,
    email_confirm: true,
    password: crypto.randomUUID(),
    user_metadata: { full_name: `${input.firstName} ${input.lastName}` },
  })

  if (authError || !authData.user) {
    return { error: authError?.message ?? 'Failed to create auth user' }
  }

  const { data, error: dbError } = await admin
    .from('users')
    .insert({
      supabase_id: authData.user.id,
      email: input.email,
      first_name: input.firstName,
      last_name: input.lastName,
      employee_id: input.employeeId || null,
      role: input.role,
      status: input.status,
      phone: input.phone || null,
      department: input.department || null,
      employee_type: input.employeeType,
      gender: input.gender || null,
      rate_of_pay: input.rateOfPay,
      start_date: input.startDate || null,
      avatar_url: input.avatarUrl,
      onboarding_status: 'invited',
    })
    .select('id')
    .single()

  if (dbError) {
    // Roll back auth user
    await admin.auth.admin.deleteUser(authData.user.id)
    return { error: dbError.message }
  }

  // The account is unreachable until this lands, but a mail failure should not
  // undo a created employee — surface it and let an Admin resend.
  const invite = await sendInvite({
    email: input.email,
    name: `${input.firstName} ${input.lastName}`,
    table: 'users',
    id: data.id,
  })

  revalidatePath('/admin/employees')
  revalidatePath('/admin/settings')
  return invite.sent ? { id: data.id } : { id: data.id, inviteError: invite.error }
}

export type UpdateEmployeeInput = {
  id: string
  firstName: string
  lastName: string
  email: string
  employeeId: string
  role: 'admin' | 'manager' | 'technician'
  employeeType: 'full_time' | 'part_time' | 'contractor' | 'subcontractor'
  status: 'active' | 'on_leave' | 'inactive'
  department: string
  gender: string
  rateOfPay: number | null
  startDate: string | null
  avatarUrl: string | null
  phone: string
}

export async function updateEmployee(input: UpdateEmployeeInput) {
  const admin = createAdminClient()

  const { error } = await admin
    .from('users')
    .update({
      first_name: input.firstName,
      last_name: input.lastName,
      employee_id: input.employeeId || null,
      role: input.role,
      status: input.status,
      phone: input.phone || null,
      department: input.department || null,
      employee_type: input.employeeType,
      gender: input.gender || null,
      rate_of_pay: input.rateOfPay,
      start_date: input.startDate || null,
      avatar_url: input.avatarUrl ?? undefined,
    })
    .eq('id', input.id)

  if (error) return { error: error.message }

  revalidatePath('/admin/employees')
  return { success: true }
}

export async function uploadAvatar(formData: FormData): Promise<{ url: string } | { error: string }> {
  const file = formData.get('file') as File | null
  if (!file) return { error: 'No file provided' }

  const result = await uploadToStorage(StorageFolder.avatars, file)
  if ('error' in result) return { error: result.error }

  return { url: result.url }
}

export type ImportResult = { email: string; id?: string; error?: string }

/** Bulk-create employees from a CSV import. Rows are independent — one failure doesn't stop the rest. */
export async function importEmployees(rows: CreateEmployeeInput[]): Promise<ImportResult[]> {
  const results: ImportResult[] = []
  for (const row of rows) {
    const result = await createEmployee(row)
    results.push('error' in result ? { email: row.email, error: result.error } : { email: row.email, id: result.id })
  }
  revalidatePath('/admin/employees')
  return results
}

export async function deleteEmployee(id: string) {
  const admin = createAdminClient()

  // Get supabase_id first
  const { data, error: fetchError } = await admin
    .from('users')
    .select('supabase_id')
    .eq('id', id)
    .single()

  if (fetchError || !data) return { error: fetchError?.message ?? 'Employee not found' }

  // Delete the auth user (cascades to users row via ON DELETE CASCADE)
  const { error } = await admin.auth.admin.deleteUser(data.supabase_id)
  if (error) return { error: error.message }

  revalidatePath('/admin/employees')
  return { success: true }
}
