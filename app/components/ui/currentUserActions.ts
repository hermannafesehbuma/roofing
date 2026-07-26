'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export type CurrentUser = {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
  avatarUrl: string | null
}

/**
 * Reads the signed-in user straight from the database so the header shows a
 * live name / role / photo instead of whatever was cached at login.
 *
 * Looks up by auth id, falling back to email — sessions created before the id
 * was stored still resolve, and the caller backfills the id afterwards.
 */
export async function getCurrentUser(
  identity: { supabaseId?: string; email?: string }
): Promise<CurrentUser | null> {
  const { supabaseId, email } = identity
  if (!supabaseId && !email) return null

  const supabase = createAdminClient()
  const query = supabase
    .from('users')
    .select('supabase_id, first_name, last_name, email, role, avatar_url')

  const { data, error } = await (supabaseId
    ? query.eq('supabase_id', supabaseId)
    : query.ilike('email', email!)
  ).maybeSingle()

  if (error || !data) return null

  return {
    id: data.supabase_id ?? supabaseId ?? '',
    firstName: data.first_name ?? '',
    lastName: data.last_name ?? '',
    email: data.email ?? '',
    role: data.role === 'technician' ? 'staff' : data.role,
    avatarUrl: data.avatar_url,
  }
}
