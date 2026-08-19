'use client'

import { useEffect, useState } from 'react'

/**
 * Technicians work the app on a phone, so the portal refuses to render for them
 * at desktop widths — they get a blank screen and a single instruction until
 * the window narrows.
 *
 * This cannot live in middleware: the server never learns the viewport size, so
 * the check has to run in the browser and re-run on every resize.
 *
 * Wraps the whole layout rather than sitting inside `PageAccessGuard`, because
 * the sidebar renders outside that guard and would otherwise stay on screen.
 */

/** Tailwind's `md` breakpoint — the same line every mobile layout switches on. */
const MOBILE_QUERY = '(max-width: 767px)'

const TECHNICIAN_ROLES = ['staff', 'technician']

export function MobileOnlyGate({ children }: { children: React.ReactNode }) {
  // Both start unknown: the role lives in localStorage and the width in
  // matchMedia, neither of which exists during the server render.
  const [role, setRole] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState<boolean | null>(null)

  useEffect(() => {
    const readRole = () => setRole(localStorage.getItem('user_role') ?? '')
    readRole()
    window.addEventListener('role-changed', readRole)
    window.addEventListener('auth-changed', readRole)

    const query = window.matchMedia(MOBILE_QUERY)
    const syncWidth = () => setIsMobile(query.matches)
    syncWidth()
    query.addEventListener('change', syncWidth)

    return () => {
      window.removeEventListener('role-changed', readRole)
      window.removeEventListener('auth-changed', readRole)
      query.removeEventListener('change', syncWidth)
    }
  }, [])

  // Hold on white until both are known, so a technician who lands on a desktop
  // window never sees a frame of the app before it is taken away.
  if (role === null || isMobile === null) return <div className="h-screen bg-white" />

  if (TECHNICIAN_ROLES.includes(role) && !isMobile) return <MobileOnlyNotice />

  return <>{children}</>
}

function MobileOnlyNotice() {
  return (
    <div className="h-screen bg-white flex items-center justify-center px-8">
      <div className="text-center">
        <p className="text-xl font-bold text-gray-900">
          This content is only accessible in mobile view.
        </p>
        <p className="mt-2 text-sm text-gray-400">
          Open the app on your phone, or narrow this window, to continue.
        </p>
      </div>
    </div>
  )
}
