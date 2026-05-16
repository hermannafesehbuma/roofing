'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

export type DbPolicyStatus  = 'valid' | 'expiring_soon' | 'expired'
export type DbCoverageType  = 'general_liability' | 'workers_comp' | 'auto_liability' | 'umbrella'
export type DbCertStatus    = 'valid' | 'expiring_soon' | 'expired'

export type PolicyRow = {
  id: string
  policy_holder: string
  coverage_type: DbCoverageType
  insurer: string
  policy_number: string
  coverage_amount: number | null
  effective_date: string
  expiry_date: string
  renewal_reminder: number | null
  status: DbPolicyStatus
  file_url: string | null
  days_remaining: number
  created_at: string
}

export type CertRow = {
  id: string
  user_id: string
  employee_name: string
  employee_title: string | null
  cert_name: string
  issuing_body: string
  department: string | null
  issue_date: string
  expiry_date: string
  status: DbCertStatus
  file_url: string | null
  days_left: number
  created_at: string
}

export type EmployeeOption = { id: string; name: string; title: string | null }

// ─── Helpers ──────────────────────────────────────────────────────────────────
function daysDiff(expiryDate: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return Math.floor((new Date(expiryDate + 'T00:00:00').getTime() - today.getTime()) / 86400000)
}

function policyStatus(days: number, reminder: number): DbPolicyStatus {
  if (days < 0) return 'expired'
  if (days <= reminder) return 'expiring_soon'
  return 'valid'
}

function certStatus(days: number): DbCertStatus {
  if (days < 0) return 'expired'
  if (days <= 60) return 'expiring_soon'
  return 'valid'
}

// ─── Queries ──────────────────────────────────────────────────────────────────
export async function getPolicies(): Promise<PolicyRow[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('insurance_policies')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) { console.error('getPolicies error:', error); return [] }

  return (data ?? []).map((row: any) => {
    const days = daysDiff(row.expiry_date)
    return {
      id: row.id,
      policy_holder: row.policy_holder,
      coverage_type: row.coverage_type as DbCoverageType,
      insurer: row.insurer,
      policy_number: row.policy_number,
      coverage_amount: row.coverage_amount,
      effective_date: row.effective_date,
      expiry_date: row.expiry_date,
      renewal_reminder: row.renewal_reminder,
      status: policyStatus(days, row.renewal_reminder ?? 90),
      file_url: row.file_url,
      days_remaining: days,
      created_at: row.created_at,
    }
  })
}

export async function getCertifications(): Promise<CertRow[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('certifications')
    .select(`
      id, user_id, cert_name, issuing_body, department,
      issue_date, expiry_date, file_url, created_at,
      user:user_id(first_name, last_name, role)
    `)
    .order('created_at', { ascending: false })

  if (error) { console.error('getCertifications error:', error); return [] }

  return (data ?? []).map((row: any) => {
    const days = daysDiff(row.expiry_date)
    return {
      id: row.id,
      user_id: row.user_id,
      employee_name: row.user ? `${row.user.first_name} ${row.user.last_name}`.trim() : 'Unknown',
      employee_title: row.user?.role ?? null,
      cert_name: row.cert_name,
      issuing_body: row.issuing_body,
      department: row.department,
      issue_date: row.issue_date,
      expiry_date: row.expiry_date,
      status: certStatus(days),
      file_url: row.file_url,
      days_left: days,
      created_at: row.created_at,
    }
  })
}

export async function getEmployeeOptions(): Promise<EmployeeOption[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('users')
    .select('id, first_name, last_name, role')
    .order('first_name')

  return (data ?? []).map((u: any) => ({
    id: u.id,
    name: `${u.first_name} ${u.last_name}`.trim(),
    title: u.role,
  }))
}

// ─── Policy mutations ─────────────────────────────────────────────────────────
export type CreatePolicyInput = {
  policy_holder: string
  coverage_type: DbCoverageType
  insurer: string
  policy_number: string
  coverage_amount: number | null
  effective_date: string
  expiry_date: string
  renewal_reminder: number
  status: DbPolicyStatus
}

export async function createPolicy(input: CreatePolicyInput) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('insurance_policies')
    .insert(input)
    .select('id')
    .single()

  if (error) return { error: error.message }
  revalidatePath('/admin/insurance')
  return { id: data.id }
}

export async function updatePolicy(id: string, input: Partial<CreatePolicyInput>) {
  const admin = createAdminClient()
  const { error } = await admin.from('insurance_policies').update(input).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/insurance')
  return { success: true }
}

export async function deletePolicy(id: string) {
  const admin = createAdminClient()
  const { error } = await admin.from('insurance_policies').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/insurance')
  return { success: true }
}

// ─── Certification mutations ───────────────────────────────────────────────────
export type CreateCertInput = {
  user_id: string
  cert_name: string
  issuing_body: string
  department: string | null
  issue_date: string
  expiry_date: string
  status: DbCertStatus
}

export async function createCertification(input: CreateCertInput) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('certifications')
    .insert(input)
    .select('id')
    .single()

  if (error) return { error: error.message }
  revalidatePath('/admin/insurance')
  return { id: data.id }
}

export async function updateCertification(id: string, input: Partial<CreateCertInput>) {
  const admin = createAdminClient()
  const { error } = await admin.from('certifications').update(input).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/insurance')
  return { success: true }
}

export async function deleteCertification(id: string) {
  const admin = createAdminClient()
  const { error } = await admin.from('certifications').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/insurance')
  return { success: true }
}
