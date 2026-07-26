'use client'

/**
 * Client-side session storage.
 *
 * Auth in this app is a localStorage "session" written at login — there is no
 * Supabase cookie, so every component that needs the signed-in user reads it
 * from here. Keep all key names in this file so login / logout / password reset
 * can never drift apart.
 */

export type StoredSession = {
  id: string
  email: string
  role: string
  firstName: string
  lastName: string
  avatarUrl: string | null
}

const KEYS = {
  authenticated: 'is_authenticated',
  id: 'user_id',
  role: 'user_role',
  email: 'user_email',
  firstName: 'user_first_name',
  lastName: 'user_last_name',
  avatarUrl: 'user_avatar_url',
  permissions: 'peak_permissions',
} as const

export function saveSession(user: StoredSession, permissions?: unknown) {
  localStorage.setItem(KEYS.authenticated, 'true')
  localStorage.setItem(KEYS.id, user.id)
  localStorage.setItem(KEYS.role, user.role)
  localStorage.setItem(KEYS.email, user.email)
  localStorage.setItem(KEYS.firstName, user.firstName)
  localStorage.setItem(KEYS.lastName, user.lastName)
  if (user.avatarUrl) localStorage.setItem(KEYS.avatarUrl, user.avatarUrl)
  else localStorage.removeItem(KEYS.avatarUrl)
  if (permissions) localStorage.setItem(KEYS.permissions, JSON.stringify(permissions))
}

export function clearSession() {
  for (const key of Object.values(KEYS)) localStorage.removeItem(key)
}

export function readSession(): StoredSession | null {
  if (typeof window === 'undefined') return null
  const id = localStorage.getItem(KEYS.id) ?? ''
  const firstName = localStorage.getItem(KEYS.firstName) ?? ''
  const lastName = localStorage.getItem(KEYS.lastName) ?? ''
  const role = localStorage.getItem(KEYS.role) ?? ''
  if (!firstName && !lastName && !role) return null
  return {
    id,
    email: localStorage.getItem(KEYS.email) ?? '',
    role,
    firstName,
    lastName,
    avatarUrl: localStorage.getItem(KEYS.avatarUrl),
  }
}

/**
 * Refresh the cached name / role / avatar after a profile change.
 * No-ops when nothing actually changed — listeners re-read the session on
 * `auth-changed`, so an unconditional dispatch would loop.
 */
export function patchSession(patch: Partial<StoredSession>) {
  const current = readSession()
  if (!current) return

  const next = { ...current, ...patch }
  const changed = (Object.keys(next) as (keyof StoredSession)[]).some((k) => next[k] !== current[k])
  if (!changed) return

  saveSession(next)
  window.dispatchEvent(new Event('auth-changed'))
}
