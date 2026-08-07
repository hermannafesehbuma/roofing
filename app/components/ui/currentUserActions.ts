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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Reads the signed-in user straight from the database so the header shows a
 * live name / role / photo instead of whatever was cached at login.
 *
 * `supabaseId` is matched against BOTH `users.id` and `users.supabase_id`:
 * older sessions cached the Supabase auth id, newer ones cache the app's own
 * users.id, and either has to resolve. Email is the fallback for sessions
 * predating the id entirely.
 *
 * Always returns `users.id`. Every foreign key in the schema points there, so
 * a caller that writes `profile.id` into a row — a clock-in's `user_id`, an
 * approval's `approved_by_id` — must never be handed the auth id.
 */
export async function getCurrentUser(
  identity: { supabaseId?: string; email?: string }
): Promise<CurrentUser | null> {
  const { supabaseId, email } = identity
  if (!supabaseId && !email) return null

  const supabase = createAdminClient()
  const query = supabase
    .from('users')
    .select('id, supabase_id, first_name, last_name, email, role, avatar_url')

  const byId = supabaseId && UUID_RE.test(supabaseId)
  const { data, error } = await (byId
    ? query.or(`id.eq.${supabaseId},supabase_id.eq.${supabaseId}`)
    : query.ilike('email', email!)
  ).maybeSingle()

  if (error || !data) return null

  return {
    id: (data.id as string) ?? '',
    firstName: data.first_name ?? '',
    lastName: data.last_name ?? '',
    email: data.email ?? '',
    role: data.role === 'technician' ? 'staff' : data.role,
    avatarUrl: data.avatar_url,
  }
}
