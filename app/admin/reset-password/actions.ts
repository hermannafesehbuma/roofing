'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export type RecoverySession = {
  accessToken: string
  refreshToken: string
}

/**
 * Fallback for recovery links that arrive as `?token_hash=…&type=recovery`
 * (Supabase's newer email template). Exchanges the hashed token for a
 * short-lived session.
 */
export async function verifyRecoveryToken(tokenHash: string) {
  const supabase = createAdminClient()

  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: 'recovery',
  })

  if (error || !data.session) {
    return { success: false as const, error: error?.message ?? 'This reset link is invalid or has expired.' }
  }

  return {
    success: true as const,
    session: {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    },
  }
}

export async function resetPassword(session: RecoverySession, newPassword: string) {
  if (newPassword.length < 8) {
    return { success: false as const, error: 'Password must be at least 8 characters.' }
  }

  const supabase = createAdminClient()

  // Resolve — and validate — the recovery token against Supabase. A tampered or
  // expired token has no user behind it.
  const { data: userData, error: userError } = await supabase.auth.getUser(session.accessToken)

  if (userError || !userData.user) {
    return { success: false as const, error: 'This reset link is invalid or has expired. Please request a new one.' }
  }

  const { error } = await supabase.auth.admin.updateUserById(userData.user.id, {
    password: newPassword,
  })

  if (error) {
    return { success: false as const, error: error.message }
  }

  return { success: true as const }
}
