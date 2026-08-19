'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Camera, LogOut, KeyRound } from 'lucide-react'
import { MobileHeader } from '@/app/components/ui/mobile/MobileHeader'
import { Skeleton } from '@/app/components/ui/Skeleton'
import { ROLE_TITLES } from '@/app/components/ui/ProfileMenu'
import { initialsOf } from '@/app/components/ui/useCurrentUser'
import { readSession, patchSession, clearSession } from '@/lib/session'
import { formatShortDate } from '@/lib/format'
import { getOwnProfile, updateOwnProfile, uploadProfilePhoto, type OwnProfile } from './actions'

/**
 * "My Profile" — the account screen behind the header avatar menu.
 *
 * Reachable by every role, including clients, who have no other settings
 * surface. Editing is limited to the fields `updateOwnProfile` accepts; role,
 * status and pay are shown read-only and changed from Employees.
 */
export function ProfileClient() {
  const router = useRouter()
  const [profile, setProfile] = useState<OwnProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const session = readSession()
    getOwnProfile(session?.id ?? '').then((data) => {
      if (data) {
        setProfile(data)
        setFirstName(data.firstName)
        setLastName(data.lastName)
        setPhone(data.phone ?? '')
        setAvatarUrl(data.avatarUrl)
      }
      setLoading(false)
    })
  }, [])

  function handlePhoto(file: File) {
    setError(null)
    startTransition(async () => {
      const fd = new FormData()
      fd.append('file', file)
      const result = await uploadProfilePhoto(fd)
      if ('error' in result) { setError(result.error); return }
      setAvatarUrl(result.url)
    })
  }

  function handleSave() {
    if (!profile) return
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const result = await updateOwnProfile({ id: profile.id, firstName, lastName, phone, avatarUrl })
      if ('error' in result) { setError(result.error); return }
      // Header avatar and name come from the cached session, so update it here
      // rather than waiting for the next sign-in.
      patchSession({ firstName, lastName, avatarUrl })
      setSaved(true)
    })
  }

  function handleSignOut() {
    clearSession()
    window.dispatchEvent(new Event('auth-changed'))
    window.dispatchEvent(new Event('role-changed'))
    router.push('/admin/login')
  }

  const name = [firstName, lastName].filter(Boolean).join(' ')
  const dirty =
    !!profile &&
    (firstName !== profile.firstName ||
      lastName !== (profile.lastName ?? '') ||
      phone !== (profile.phone ?? '') ||
      avatarUrl !== profile.avatarUrl)

  return (
    <>
      <MobileHeader title="Profile" />

      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-2xl mx-auto space-y-4">
          {error && (
            <p className="rounded-lg border border-[#FDA29B] bg-[#FEF3F2] px-4 py-3 text-[13px] text-[#B42318]">
              {error}
            </p>
          )}
          {saved && !dirty && (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-700">
              Profile updated.
            </p>
          )}

          {loading ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-4">
                <Skeleton className="w-20 h-20 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
            </div>
          ) : !profile ? (
            <p className="py-16 text-center text-sm text-gray-400">We could not load your profile.</p>
          ) : (
            <>
              {/* Identity */}
              <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => fileInput.current?.click()}
                    disabled={isPending}
                    aria-label="Change profile photo"
                    className="group relative w-20 h-20 rounded-full overflow-hidden shrink-0 bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center"
                  >
                    {avatarUrl ? (
                      <Image src={avatarUrl} alt={name} fill sizes="80px" className="object-cover" />
                    ) : (
                      <span className="text-white text-xl font-semibold">{initialsOf(name)}</span>
                    )}
                    <span className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera size={18} className="text-white" />
                    </span>
                  </button>
                  <input
                    ref={fileInput}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handlePhoto(file)
                      e.target.value = ''
                    }}
                  />
                  <div className="min-w-0">
                    <p className="text-lg font-semibold text-gray-900 truncate">{name || '—'}</p>
                    <p className="text-xs text-gray-400 truncate">{profile.email}</p>
                    <span className="inline-flex mt-2 px-2.5 py-1 rounded-full bg-[#F4F3FF] text-[#5B4BC4] text-[11px] font-semibold">
                      {ROLE_TITLES[profile.role] ?? profile.role}
                    </span>
                  </div>
                </div>
              </section>

              {/* Editable details */}
              <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                <h2 className="text-sm font-semibold text-gray-900">Your details</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="First name">
                    <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={INPUT} />
                  </Field>
                  <Field label="Last name">
                    <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={INPUT} />
                  </Field>
                  <Field label="Phone">
                    <input value={phone} onChange={(e) => setPhone(e.target.value)} className={INPUT} placeholder="(555) 000-0000" />
                  </Field>
                  <Field label="Email">
                    <input value={profile.email} disabled className={`${INPUT} bg-gray-50 text-gray-500`} />
                  </Field>
                </div>

                <button
                  onClick={handleSave}
                  disabled={!dirty || isPending}
                  className="h-10 px-6 rounded-lg bg-[#0A1629] text-white text-sm font-medium hover:bg-[#152844] transition-colors disabled:opacity-50"
                >
                  {isPending ? 'Saving…' : 'Save changes'}
                </button>
              </section>

              {/* Read-only, set by an admin */}
              {(profile.employeeId || profile.department || profile.startDate) && (
                <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h2 className="text-sm font-semibold text-gray-900 mb-4">Employment</h2>
                  <dl className="space-y-3 text-sm">
                    {profile.employeeId && <ReadOnlyRow label="Employee ID" value={profile.employeeId} />}
                    {profile.department && <ReadOnlyRow label="Department" value={profile.department} />}
                    {profile.startDate && <ReadOnlyRow label="Start date" value={formatShortDate(profile.startDate)} />}
                  </dl>
                </section>
              )}

              {/* Account actions */}
              <section className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
                <a
                  href="/admin/forgot-password"
                  className="flex items-center gap-3 px-6 py-4 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <KeyRound size={16} className="text-gray-400" /> Change password
                </a>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-6 py-4 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={16} /> Log Out
                </button>
              </section>
            </>
          )}
        </div>
      </div>
    </>
  )
}

const INPUT =
  'w-full h-11 rounded-lg border border-[#E4E7EC] px-3.5 text-[14px] text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#0D1B2A]/10 focus:border-[#0D1B2A]'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[13px] font-medium text-[#344054] mb-2">{label}</span>
      {children}
    </label>
  )
}

function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-medium text-gray-900 text-right">{value}</dd>
    </div>
  )
}
