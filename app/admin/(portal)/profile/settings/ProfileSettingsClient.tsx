'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { MobileHeader } from '@/app/components/ui/mobile/MobileHeader'

/** Push notifications are a device preference, so they live in localStorage. */
const NOTIFY_KEY = 'peak_push_notifications'

/**
 * Account settings reached from the gear on the profile screen: the way in to
 * a password change, plus the notification switch.
 */
export function ProfileSettingsClient() {
  // Read lazily rather than in an effect: localStorage is available on the
  // first client render, and setting state in an effect would render the
  // switch in the wrong position for a frame.
  const [notify, setNotify] = useState(() =>
    typeof window === 'undefined' ? true : localStorage.getItem(NOTIFY_KEY) !== 'off'
  )

  function toggleNotify() {
    setNotify((on) => {
      const next = !on
      localStorage.setItem(NOTIFY_KEY, next ? 'on' : 'off')
      return next
    })
  }

  return (
    <>
      <MobileHeader title="Settings" backHref="/admin/profile" />

      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="mx-auto w-full max-w-2xl space-y-4">
          <h1 className="hidden md:block text-xl font-semibold text-gray-900">Settings</h1>

          <Link
            href="/admin/profile/settings/password"
            className="flex items-center justify-between gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 hover:bg-gray-50 transition-colors"
          >
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-gray-900">Security</span>
              <span className="block text-xs text-gray-400 mt-0.5">
                Update your login details and security preferences
              </span>
            </span>
            <ChevronRight size={18} className="text-gray-400 shrink-0" />
          </Link>

          <div className="flex items-center justify-between gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-gray-900">Notifications</span>
              <span className="block text-xs text-gray-400 mt-0.5">Enable push notifications</span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={notify}
              aria-label="Enable push notifications"
              onClick={toggleNotify}
              className={`relative w-11 h-6 rounded-full shrink-0 transition-colors ${notify ? 'bg-[#0A1629]' : 'bg-gray-200'}`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${notify ? 'translate-x-[22px]' : 'translate-x-0.5'}`}
              />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
