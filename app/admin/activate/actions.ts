'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export type ActivationSession = { accessToken: string; refreshToken: string }

export type Invitee = {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
  avatarUrl: string | null
}

/**
 * Activation links are Supabase recovery links (see lib/email/sendInvite.ts),
 * so the newer `?token_hash=` template is exchanged the same way the reset
 * screen does it.
 */
export async function verifyActivationToken(tokenHash: string) {
  const supabase = createAdminClient()

  const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' })

  if (error || !data.session) {
    return {
      success: false as const,
      error: error?.message ?? 'This activation link is invalid or has expired.',
    }
  }

  return {
    success: true as const,
    session: { accessToken: data.session.access_token, refreshToken: data.session.refresh_token },
  }
}

/** Who the link belongs to — the screen greets them by name. */
export async function getInvitee(session: ActivationSession): Promise<Invitee | null> {
  const supabase = createAdminClient()

  const { data: authUser, error } = await supabase.auth.getUser(session.accessToken)
  if (error || !authUser.user) return null

  const { data } = await supabase
    .from('users')
    .select('id, first_name, last_name, email, role, avatar_url')
    .eq('supabase_id', authUser.user.id)
    .maybeSingle()

  if (!data) return null

  return {
    id: data.id,
    firstName: data.first_name ?? '',
    lastName: data.last_name ?? '',
    email: data.email ?? '',
    role: data.role === 'technician' ? 'staff' : data.role,
    avatarUrl: data.avatar_url,
  }
}

/**
 * Sets the password the invitee chose and flips the account to Active.
 *
 * This is the only place an account becomes usable — no Admin path writes a
 * password, so `onboarding_status` moving to 'active' always means the account
 * holder themselves did it (Addendum Task 4 acceptance criteria).
 */
export async function activateAccount(session: ActivationSession, newPassword: string) {
  if (newPassword.length < 8) {
    return { success: false as const, error: 'Password must be at least 8 characters.' }
  }

  const supabase = createAdminClient()

  const { data: authUser, error: authErr } = await supabase.auth.getUser(session.accessToken)
  if (authErr || !authUser.user) {
    return {
      success: false as const,
      error: 'This activation link is invalid or has expired. Ask an administrator to resend it.',
    }
  }

  const { error: pwErr } = await supabase.auth.admin.updateUserById(authUser.user.id, {
    password: newPassword,
  })
  if (pwErr) return { success: false as const, error: pwErr.message }

  const now = new Date().toISOString()

  const { data: user } = await supabase
    .from('users')
    .update({ onboarding_status: 'active', activated_at: now })
    .eq('supabase_id', authUser.user.id)
    .select('id, first_name, last_name, email, role, avatar_url')
    .maybeSingle()

  // A client's portal record carries its own onboarding state, so both move
  // together — otherwise Users & Access would still show the invite pending.
  if (user) {
    await supabase
      .from('clients')
      .update({ onboarding_status: 'active', activated_at: now, portal_status: 'active' })
      .eq('portal_user_id', user.id)
  }

  return {
    success: true as const,
    user: user
      ? {
          id: user.id,
          email: user.email ?? '',
          role: user.role === 'technician' ? 'staff' : user.role,
          firstName: user.first_name ?? '',
          lastName: user.last_name ?? '',
          avatarUrl: user.avatar_url as string | null,
        }
      : null,
  }
}
