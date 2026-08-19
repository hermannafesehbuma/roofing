'use client'

import { useEffect, useState } from 'react'
import { ProfileSettingsClient } from '../profile/settings/ProfileSettingsClient'

/**
 * /settings is one route with a different page behind it per role
 * (Addendum Tasks 3 and 8).
 *
 * Technicians get Profile Settings — their own record and nothing else — while
 * Admin and Manager get the tabbed suite. The role only exists in the browser
 * session, so the split happens here rather than on the server.
 *
 * Manager currently falls through to the Admin suite, whose own tab list is
 * already permission-filtered. "Team preferences" is a separate page and is
 * flagged as a follow-up, not folded in here.
 */
const PROFILE_ONLY_ROLES = ['staff', 'technician']

export function SettingsRoleRouter({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    const read = () => setRole(localStorage.getItem('user_role') ?? '')
    read()
    window.addEventListener('role-changed', read)
    return () => window.removeEventListener('role-changed', read)
  }, [])

  // Held blank for one tick rather than flashing the Admin suite at a
  // Technician before swapping it out.
  if (role === null) return <div className="flex-1 bg-white" />

  if (PROFILE_ONLY_ROLES.includes(role)) return <ProfileSettingsClient />

  return <>{children}</>
}
