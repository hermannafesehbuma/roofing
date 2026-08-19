'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { uploadToStorage, StorageFolder } from '@/lib/storage'
import {
  defaultNotificationPreferences, type NotificationPreferences,
} from '@/lib/onboarding'

export type OwnProfile = {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  role: string
  department: string | null
  employeeId: string | null
  employeeType: string | null
  rateOfPay: number | null
  startDate: string | null
  managerName: string | null
  emergencyContactName: string | null
  emergencyContactPhone: string | null
  notificationPreferences: NotificationPreferences
  avatarUrl: string | null
  status: string | null
}

export async function getOwnProfile(userId: string): Promise<OwnProfile | null> {
  if (!userId) return null

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('users')
    .select('id, first_name, last_name, email, phone, role, department, employee_id, employee_type, rate_of_pay, start_date, avatar_url, status, emergency_contact_name, emergency_contact_phone, notification_preferences, manager:users!users_manager_id_fkey(first_name, last_name)')
    .eq('id', userId)
    .maybeSingle()

  if (error || !data) return null

  const manager = data.manager as unknown as { first_name?: string; last_name?: string } | null
  const storedPrefs = (data.notification_preferences ?? {}) as NotificationPreferences

  return {
    id: data.id,
    firstName: data.first_name ?? '',
    lastName: data.last_name ?? '',
    email: data.email ?? '',
    phone: data.phone,
    role: data.role,
    department: data.department,
    employeeId: data.employee_id,
    employeeType: data.employee_type,
    rateOfPay: data.rate_of_pay,
    startDate: data.start_date,
    managerName: manager ? `${manager.first_name ?? ''} ${manager.last_name ?? ''}`.trim() || null : null,
    emergencyContactName: data.emergency_contact_name,
    emergencyContactPhone: data.emergency_contact_phone,
    // Anything never toggled falls back to the default, so a newly added
    // notification type does not arrive switched off for everyone.
    notificationPreferences: { ...defaultNotificationPreferences(), ...storedPrefs },
    avatarUrl: data.avatar_url,
    status: data.status ?? null,
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

/* ── Certifications & pay stubs ──────────────────────────────────────────── */

export type ProfileCert = {
  id: string
  name: string
  expiryDate: string | null
  /** 'valid' | 'expiring_soon' | 'expired', as stored. */
  status: string
  /** Days until expiry; negative once past. Null when there is no expiry. */
  daysRemaining: number | null
}

export type ProfilePayStub = {
  id: string
  periodStart: string
  periodEnd: string
  hoursWorked: number | null
  netPay: number
  status: string
}

export type ProfileRecords = {
  certifications: ProfileCert[]
  payStubs: ProfilePayStub[]
}

function daysUntil(date: string | null): number | null {
  if (!date) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return Math.round((new Date(date + 'T00:00:00').getTime() - today.getTime()) / 86400000)
}

/**
 * The two record lists the profile screen shows beneath the identity card.
 *
 * Both are read-only here — certifications are maintained from Insurance and
 * pay stubs from payroll — so this is a plain fetch with no write counterpart.
 * Roles that have neither (clients) simply get empty arrays, which is what
 * hides the sections rather than a role check in the UI.
 */
export async function getProfileRecords(userId: string): Promise<ProfileRecords> {
  if (!userId) return { certifications: [], payStubs: [] }

  const admin = createAdminClient()
  const [certs, stubs] = await Promise.all([
    admin
      .from('certifications')
      .select('id, cert_name, expiry_date, status')
      .eq('user_id', userId)
      .order('expiry_date', { ascending: true }),
    admin
      .from('payroll')
      .select('id, pay_period_start, pay_period_end, hours_worked, net_pay, status')
      .eq('user_id', userId)
      .order('pay_period_end', { ascending: false })
      .limit(12),
  ])

  return {
    certifications: (certs.data ?? []).map((c) => ({
      id: c.id,
      name: c.cert_name ?? '',
      expiryDate: c.expiry_date,
      status: c.status ?? 'valid',
      daysRemaining: daysUntil(c.expiry_date),
    })),
    payStubs: (stubs.data ?? []).map((p) => ({
      id: p.id,
      periodStart: p.pay_period_start,
      periodEnd: p.pay_period_end,
      hoursWorked: p.hours_worked === null ? null : Number(p.hours_worked),
      netPay: Number(p.net_pay ?? 0),
      status: p.status ?? 'draft',
    })),
  }
}

/**
 * Technician Profile Settings save (Addendum Task 8).
 *
 * Same guarantee as `updateOwnProfile`: the Admin-controlled fields — role,
 * status, Employee ID, Department, Employee Type, Rate of Pay, Start Date and
 * Manager — are not in the payload at all, so they cannot be written from a
 * page the field crew can reach, however the form is tampered with.
 */
export async function updateProfileSettings(input: {
  id: string
  phone: string
  emergencyContactName: string
  emergencyContactPhone: string
  notificationPreferences: NotificationPreferences
  avatarUrl?: string | null
}): Promise<{ success: true } | { error: string }> {
  if (!input.id) return { error: 'Not signed in' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('users')
    .update({
      phone: input.phone.trim() || null,
      emergency_contact_name: input.emergencyContactName.trim() || null,
      emergency_contact_phone: input.emergencyContactPhone.trim() || null,
      notification_preferences: input.notificationPreferences,
      avatar_url: input.avatarUrl ?? undefined,
    })
    .eq('id', input.id)

  if (error) return { error: error.message }

  revalidatePath('/admin/profile')
  revalidatePath('/admin/settings')
  return { success: true }
}
