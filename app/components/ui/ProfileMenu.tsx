'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { User, LogOut } from 'lucide-react'
import { useCurrentUser, initialsOf } from './useCurrentUser'
import { useDismiss } from './useDismiss'
import { clearSession } from '@/lib/session'

/**
 * The account menu behind the header avatar.
 *
 * Clients and technicians never see the desktop sidebar's account button —
 * clients have no sidebar footer on phones at all — so this is their only way
 * to reach their profile or sign out. It mirrors the sidebar menu's contents
 * so the two never drift.
 */

export const ROLE_TITLES: Record<string, string> = {
  admin: 'Admin',
  manager: 'Manager',
  staff: 'Technician',
  technician: 'Technician',
  client: 'Client',
}

export function ProfileMenu({ size = 36 }: { size?: number }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const profile = useCurrentUser()
  const ref = useDismiss<HTMLDivElement>(open, () => setOpen(false))

  function handleSignOut() {
    clearSession()
    // The sidebar, header and access guard all re-read the session on these.
    window.dispatchEvent(new Event('auth-changed'))
    window.dispatchEvent(new Event('role-changed'))
    setOpen(false)
    router.push('/admin/login')
  }

  const name = profile?.name ?? ''

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        style={{ width: size, height: size }}
        className="rounded-full overflow-hidden relative shrink-0 bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center"
      >
        {profile?.avatarUrl ? (
          <Image src={profile.avatarUrl} alt={name} fill sizes={`${size}px`} className="object-cover" />
        ) : (
          <span className="text-white text-xs font-semibold">{initialsOf(name)}</span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] w-56 bg-white rounded-xl border border-gray-100 shadow-xl py-1.5 z-50"
        >
          <div className="px-3 py-2 border-b border-gray-50">
            <p className="text-xs font-semibold text-gray-800 truncate">{name || 'Signed in'}</p>
            <p className="text-[11px] text-gray-400 truncate">{profile?.email}</p>
            {profile?.role && (
              <p className="text-[10px] text-gray-400 mt-0.5">
                {ROLE_TITLES[profile.role] ?? profile.role}
              </p>
            )}
          </div>

          <Link
            href="/admin/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <User size={14} className="text-gray-400" /> My Profile
          </Link>

          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors border-t border-gray-50"
          >
            <LogOut size={14} /> Log Out
          </button>
        </div>
      )}
    </div>
  )
}
