'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendInvite } from '@/lib/email/sendInvite'
import { resolveOnboardingStatus, type OnboardingStatus } from '@/lib/onboarding'

/**
 * Users & Access (Wireframe C) — staff and client logins in one list, so an
 * Admin can see at a glance who is still sitting on an unopened invite.
 */
export type AccessRow = {
  id: string
  kind: 'staff' | 'client'
  name: string
  email: string
  /** Role for staff; always 'Client' for portal logins. */
  role: string
  /** Projects the account is attached to — the FK that makes work visible. */
  linkedTo: string
  onboarding: OnboardingStatus
  invitedAt: string | null
}

export async function getAccessDirectory(): Promise<AccessRow[]> {
  const admin = createAdminClient()

  const [staffRes, clientRes, memberRes, projectRes] = await Promise.all([
    admin
      .from('users')
      .select('id, first_name, last_name, email, role, onboarding_status, invited_at')
      .neq('role', 'client')
      .order('first_name'),
    admin
      .from('clients')
      .select('id, name, email, onboarding_status, invited_at')
      .order('name'),
    admin.from('project_members').select('user_id'),
    admin.from('projects').select('name, client_id, manager_id'),
  ])

  const projects = projectRes.data ?? []

  // One project each is by far the common case, so name it rather than making
  // an Admin open the record to find out which one.
  const projectCount = new Map<string, number>()
  for (const row of memberRes.data ?? []) {
    projectCount.set(row.user_id, (projectCount.get(row.user_id) ?? 0) + 1)
  }
  for (const project of projects) {
    if (project.manager_id) {
      projectCount.set(project.manager_id, (projectCount.get(project.manager_id) ?? 0) + 1)
    }
  }

  const staff: AccessRow[] = (staffRes.data ?? []).map((row) => ({
    id: row.id,
    kind: 'staff' as const,
    name: `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim() || row.email,
    email: row.email ?? '',
    role: row.role === 'technician' ? 'Technician' : titleCase(row.role ?? ''),
    linkedTo: describeCount(projectCount.get(row.id) ?? 0),
    onboarding: resolveOnboardingStatus(row.onboarding_status, row.invited_at),
    invitedAt: row.invited_at,
  }))

  const clientProjects = new Map<string, string[]>()
  for (const project of projects) {
    if (!project.client_id) continue
    const list = clientProjects.get(project.client_id) ?? []
    list.push(project.name)
    clientProjects.set(project.client_id, list)
  }

  const clients: AccessRow[] = (clientRes.data ?? []).map((row) => {
    const names = clientProjects.get(row.id) ?? []
    return {
      id: row.id,
      kind: 'client' as const,
      name: row.name ?? row.email,
      email: row.email ?? '',
      role: 'Client',
      linkedTo: names.length === 0 ? 'No projects' : names.length === 1 ? names[0] : `${names[0]} +${names.length - 1}`,
      onboarding: resolveOnboardingStatus(row.onboarding_status, row.invited_at),
      invitedAt: row.invited_at,
    }
  })

  return [...staff, ...clients]
}

/**
 * Expired invites are resent, never re-created — the account, its role and its
 * project links all stay put, only the link is refreshed (Task 7 #4).
 */
export async function resendInvite(
  kind: 'staff' | 'client',
  id: string
): Promise<{ success: true } | { error: string }> {
  const admin = createAdminClient()
  const table = kind === 'staff' ? ('users' as const) : ('clients' as const)

  // Queried separately rather than through one dynamic select: the Supabase
  // client types the column list at compile time, so a ternary erases it.
  let email = ''
  let name = ''

  if (kind === 'staff') {
    const { data } = await admin
      .from('users')
      .select('email, first_name, last_name')
      .eq('id', id)
      .maybeSingle()
    email = data?.email ?? ''
    name = `${data?.first_name ?? ''} ${data?.last_name ?? ''}`.trim()
  } else {
    const { data } = await admin
      .from('clients')
      .select('email, name')
      .eq('id', id)
      .maybeSingle()
    email = data?.email ?? ''
    name = data?.name ?? ''
  }

  if (!email) return { error: 'No email address on this account' }

  const result = await sendInvite({ email, name, table, id })
  if (!result.sent) return { error: result.error }

  revalidatePath('/admin/settings')
  return { success: true }
}

function titleCase(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : ''
}

function describeCount(count: number) {
  if (count === 0) return 'No projects'
  return count === 1 ? '1 project' : `${count} projects`
}
