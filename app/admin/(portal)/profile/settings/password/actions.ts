'use server'

import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Change the signed-in user's own password.
 *
 * The current password is verified with a real sign-in rather than trusted from
 * the client — otherwise anyone holding a session id could set a new password
 * without knowing the old one. Only once that succeeds does the admin client
 * write the new one.
 */
export async function changeOwnPassword(input: {
  userId: string
  currentPassword: string
  newPassword: string
}) {
  const { userId, currentPassword, newPassword } = input

  if (!userId) {
    return { success: false as const, error: 'You are not signed in.' }
  }
  if (newPassword.length <= 8) {
    return { success: false as const, error: 'Your new password must be more than 8 characters.' }
  }
  if (newPassword === currentPassword) {
    return { success: false as const, error: 'Your new password must differ from the current one.' }
  }

  const admin = createAdminClient()

  const { data: user, error: lookupError } = await admin
    .from('users')
    .select('email')
    .eq('id', userId)
    .maybeSingle()

  if (lookupError || !user?.email) {
    return { success: false as const, error: 'We could not find your account.' }
  }

  const { error: signInError } = await admin.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  })

  if (signInError) {
    return { success: false as const, error: 'Your current password is not correct.' }
  }

  const { data: authUser, error: authLookupError } = await admin.auth.admin.listUsers()
  if (authLookupError) {
    return { success: false as const, error: authLookupError.message }
  }

  const match = authUser.users.find((u) => u.email?.toLowerCase() === user.email.toLowerCase())
  if (!match) {
    return { success: false as const, error: 'We could not find your account.' }
  }

  const { error } = await admin.auth.admin.updateUserById(match.id, { password: newPassword })
  if (error) {
    return { success: false as const, error: error.message }
  }

  return { success: true as const }
}
