'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { MobileHeader } from '@/app/components/ui/mobile/MobileHeader'
import { readSession } from '@/lib/session'
import { changeOwnPassword } from './actions'

export function ChangePasswordClient() {
  const router = useRouter()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (next !== confirm) {
      setError('The two new passwords do not match.')
      return
    }

    const session = readSession()
    startTransition(async () => {
      const result = await changeOwnPassword({
        userId: session?.id ?? '',
        currentPassword: current,
        newPassword: next,
      })
      if (!result.success) { setError(result.error); return }
      setDone(true)
      setCurrent(''); setNext(''); setConfirm('')
    })
  }

  return (
    <>
      <MobileHeader title="Change Password" backHref="/admin/profile/settings" />

      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <form onSubmit={handleSubmit} className="mx-auto w-full max-w-2xl">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
            <div>
              <h1 className="text-base font-semibold text-gray-900">Password</h1>
              <p className="text-xs text-gray-400 mt-1">
                Please enter your current password to change your password.
              </p>
            </div>

            {error && (
              <p className="rounded-lg border border-[#FDA29B] bg-[#FEF3F2] px-4 py-3 text-[13px] text-[#B42318]">
                {error}
              </p>
            )}
            {done && (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-700">
                Password updated.
              </p>
            )}

            <Field label="Current password" required>
              <input
                type="password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                required
                autoComplete="current-password"
                className={INPUT}
              />
            </Field>

            <Field
              label="New password"
              required
              hint="Your new password must be more than 8 characters."
            >
              <input
                type="password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                required
                autoComplete="new-password"
                className={INPUT}
              />
            </Field>

            <Field label="Confirm new password" required>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
                className={INPUT}
              />
            </Field>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => router.push('/admin/profile/settings')}
                className="flex-1 h-11 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 h-11 rounded-lg bg-[#0A1629] text-white text-sm font-semibold hover:bg-[#152844] transition-colors disabled:opacity-50"
              >
                {isPending ? 'Updating…' : 'Update Password'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  )
}

const INPUT =
  'w-full h-11 rounded-lg border border-[#E4E7EC] px-3.5 text-[14px] text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#0D1B2A]/10 focus:border-[#0D1B2A]'

function Field({ label, required, hint, children }: {
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="block text-[13px] font-medium text-[#344054] mb-2">
        {label}{required && <span className="text-red-500"> *</span>}
      </span>
      {children}
      {hint && <span className="block text-[11px] text-gray-400 mt-1.5">{hint}</span>}
    </label>
  )
}
