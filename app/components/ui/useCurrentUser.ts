'use client'

import { useEffect, useState } from 'react'
import { readSession, patchSession } from '@/lib/session'
import { getCurrentUser } from './currentUserActions'

export type CurrentProfile = {
  id: string
  name: string
  email: string
  role: string
  avatarUrl: string | null
}

/**
 * The signed-in user, for anything that displays them (header badge, sidebar).
 *
 * Paints the cached session immediately so there is no flash, then reconciles
 * against the database — a renamed employee or a new photo shows up without a
 * re-login. Re-reads on `auth-changed` / `role-changed`.
 */
export function useCurrentUser(): CurrentProfile | null {
  const [profile, setProfile] = useState<CurrentProfile | null>(null)

  useEffect(() => {
    const load = () => {
      const session = readSession()
      if (!session) { setProfile(null); return }

      const cachedName = [session.firstName, session.lastName].filter(Boolean).join(' ')
      setProfile({
        id: session.id,
        name: cachedName || session.role.charAt(0).toUpperCase() + session.role.slice(1),
        email: session.email,
        role: session.role,
        avatarUrl: session.avatarUrl,
      })

      // Sessions created before the user id was stored still resolve by email.
      if (!session.id && !session.email) return
      getCurrentUser({ supabaseId: session.id || undefined, email: session.email || undefined })
        .then((user) => {
          if (!user) return
          const name = [user.firstName, user.lastName].filter(Boolean).join(' ')
          setProfile({
            id: user.id,
            name: name || user.email,
            email: user.email,
            role: user.role,
            avatarUrl: user.avatarUrl,
          })
          patchSession({
            id: user.id || session.id,
            firstName: user.firstName, lastName: user.lastName,
            role: user.role, avatarUrl: user.avatarUrl, email: user.email,
          })
        })
    }

    load()
    window.addEventListener('auth-changed', load)
    window.addEventListener('role-changed', load)
    return () => {
      window.removeEventListener('auth-changed', load)
      window.removeEventListener('role-changed', load)
    }
  }, [])

  return profile
}

export function initialsOf(name: string) {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U'
  )
}
