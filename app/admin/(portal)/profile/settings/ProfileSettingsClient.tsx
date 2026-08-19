'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import { Camera, KeyRound, Check } from 'lucide-react'
import { MobileHeader } from '@/app/components/ui/mobile/MobileHeader'
import { Skeleton } from '@/app/components/ui/Skeleton'
import { ROLE_TITLES } from '@/app/components/ui/ProfileMenu'
import { initialsOf } from '@/app/components/ui/useCurrentUser'
import { readSession, patchSession } from '@/lib/session'
import { formatShortDate } from '@/lib/format'
import {
  TECHNICIAN_NOTIFICATION_TYPES, defaultNotificationPreferences,
  type NotificationPreferences,
} from '@/lib/onboarding'
import {
  getOwnProfile, updateProfileSettings, uploadProfilePhoto, type OwnProfile,
} from '../actions'
import { changeOwnPassword } from './password/actions'

/**
 * Settings → My Profile (Addendum Task 8, Wireframe F).
 *
 * The one place a Technician can maintain their own record. Everything an Admin
 * controls — Employee ID, Department, Employee Type, Rate of Pay, Start Date,
 * Manager — is shown for context but rendered disabled, and is not part of the
 * save payload either (see `updateProfileSettings`).
 *
 * Lighter than the Admin/Manager employee modal on purpose: no edit-mode
 * toggle, one Save Changes for the whole page.
 */

/** Matches the Employee upload field's constraint. */
const MAX_PHOTO_BYTES = 5 * 1024 * 1024
const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/png']

export function ProfileSettingsClient() {
  const [profile, setProfile] = useState<OwnProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const [phone, setPhone] = useState('')
  const [emergencyName, setEmergencyName] = useState('')
  const [emergencyPhone, setEmergencyPhone] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [prefs, setPrefs] = useState<NotificationPreferences>(defaultNotificationPreferences())

  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()
  const fileInput = useRef<HTMLInputElement>(null)

  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    const session = readSession()
    getOwnProfile(session?.id ?? '').then((data) => {
      if (data) {
        setProfile(data)
        setPhone(data.phone ?? '')
        setEmergencyName(data.emergencyContactName ?? '')
        setEmergencyPhone(data.emergencyContactPhone ?? '')
        setAvatarUrl(data.avatarUrl)
        setPrefs(data.notificationPreferences)
      }
      setLoading(false)
    })
  }, [])

  function handlePhoto(file: File) {
    setError(null)
    setSaved(false)

    if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
      setError('Profile photos must be a JPG or PNG.')
      return
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setError('That photo is larger than 5MB.')
      return
    }

    startTransition(async () => {
      const fd = new FormData()
      fd.append('file', file)
      const result = await uploadProfilePhoto(fd)
      if ('error' in result) { setError(result.error); return }
      setAvatarUrl(result.url)
    })
  }

  function toggle(type: string, channel: 'in_app' | 'email') {
    setSaved(false)
    setPrefs((current) => ({
      ...current,
      [type]: { ...current[type], [channel]: !current[type]?.[channel] },
    }))
  }

  function handleSave() {
    if (!profile) return
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const result = await updateProfileSettings({
        id: profile.id,
        phone,
        emergencyContactName: emergencyName,
        emergencyContactPhone: emergencyPhone,
        notificationPreferences: prefs,
        avatarUrl,
      })
      if ('error' in result) { setError(result.error); return }
      // The header avatar reads the cached session, so keep it in step.
      patchSession({ avatarUrl })
      setSaved(true)
    })
  }

  const name = profile ? `${profile.firstName} ${profile.lastName}`.trim() : ''

  if (loading) {
    return (
      <>
        <MobileHeader title="Settings" />
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-3xl mx-auto space-y-4">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        </div>
      </>
    )
  }

  if (!profile) {
    return (
      <>
        <MobileHeader title="Settings" />
        <p className="flex-1 p-8 text-center text-sm text-gray-400">We could not load your profile.</p>
      </>
    )
  }

  return (
    <>
      <MobileHeader title="Settings" />

      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-3xl mx-auto space-y-4">
          <h1 className="hidden md:block text-lg font-semibold text-gray-900">Settings — My Profile</h1>

          {error && (
            <p className="rounded-lg border border-[#FDA29B] bg-[#FEF3F2] px-4 py-3 text-[13px] text-[#B42318]">
              {error}
            </p>
          )}
          {saved && (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-700">
              Changes saved.
            </p>
          )}

          {/* Identity */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center gap-5">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={isPending}
              aria-label="Change photo"
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
              accept="image/jpeg,image/png"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handlePhoto(file)
                e.target.value = ''
              }}
            />
            <div className="min-w-0">
              <p className="text-lg font-semibold text-gray-900 truncate">{name}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {ROLE_TITLES[profile.role] ?? profile.role}
                {profile.department ? ` · ${profile.department}` : ''}
              </p>
              <p className="text-[11px] text-gray-400 mt-1">
                Employee ID: {profile.employeeId ?? '—'} (read-only)
              </p>
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="mt-2 text-[11px] font-medium text-[#0D1B2A] hover:underline"
              >
                Change Photo
              </button>
            </div>
          </section>

          {/* Editable / read-only pair */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
              <div className="space-y-5">
                <GroupLabel>Editable</GroupLabel>
                <Field label="Phone">
                  <input value={phone} onChange={(e) => { setPhone(e.target.value); setSaved(false) }} className={INPUT} placeholder="(555) 000-0000" />
                </Field>
                <Field label="Emergency contact">
                  <input value={emergencyName} onChange={(e) => { setEmergencyName(e.target.value); setSaved(false) }} className={INPUT} placeholder="Name" />
                </Field>
                <Field label="Emergency contact phone">
                  <input value={emergencyPhone} onChange={(e) => { setEmergencyPhone(e.target.value); setSaved(false) }} className={INPUT} placeholder="(555) 000-0000" />
                </Field>
                <Field label="Password">
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="w-full h-11 rounded-lg border border-[#E4E7EC] px-3.5 text-[14px] text-gray-700 bg-white flex items-center gap-2 hover:bg-gray-50 transition-colors"
                  >
                    <KeyRound size={15} className="text-gray-400" /> Change…
                  </button>
                </Field>
              </div>

              <div className="space-y-5">
                <GroupLabel>Read-only (set by Admin)</GroupLabel>
                <ReadOnlyField label="Department" value={profile.department ?? '—'} />
                <ReadOnlyField label="Employee Type" value={labelForType(profile.employeeType)} />
                <ReadOnlyField label="Rate of Pay" value={profile.rateOfPay != null ? `$${profile.rateOfPay}/hr` : '—'} />
                <ReadOnlyField label="Start Date" value={formatShortDate(profile.startDate)} />
                <ReadOnlyField label="Manager" value={profile.managerName ?? '—'} />
              </div>
            </div>

            {showPassword && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <ChangePasswordForm userId={profile.id} onDone={() => setShowPassword(false)} />
              </div>
            )}
          </section>

          {/* Notification preferences */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-end justify-between mb-4">
              <GroupLabel>Notification preferences</GroupLabel>
              <div className="flex items-center gap-6 text-[11px] text-gray-400 font-medium pr-1">
                <span className="w-10 text-center">in-app</span>
                <span className="w-10 text-center">email</span>
              </div>
            </div>

            <ul className="divide-y divide-gray-50">
              {TECHNICIAN_NOTIFICATION_TYPES.map((type) => (
                <li key={type.key} className="flex items-center justify-between py-3">
                  <span className="text-sm text-gray-700">{type.label}</span>
                  <div className="flex items-center gap-6 pr-1">
                    <Checkbox
                      checked={!!prefs[type.key]?.in_app}
                      onChange={() => toggle(type.key, 'in_app')}
                      label={`${type.label} in-app`}
                    />
                    <Checkbox
                      checked={!!prefs[type.key]?.email}
                      onChange={() => toggle(type.key, 'email')}
                      label={`${type.label} email`}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <button
            onClick={handleSave}
            disabled={isPending}
            className="h-11 px-8 rounded-lg bg-[#0A1629] text-white text-sm font-medium hover:bg-[#152844] transition-colors disabled:opacity-50"
          >
            {isPending ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </>
  )
}

const INPUT =
  'w-full h-11 rounded-lg border border-[#E4E7EC] px-3.5 text-[14px] text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#0D1B2A]/10 focus:border-[#0D1B2A]'

function GroupLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{children}</p>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[13px] font-medium text-[#344054] mb-2">{label}</span>
      {children}
    </label>
  )
}

/** Rendered as a real disabled input so it reads as "locked", not "missing". */
function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block text-[13px] font-medium text-[#344054] mb-2">{label}</span>
      <input value={value} disabled readOnly className={`${INPUT} bg-gray-50 text-gray-500 cursor-not-allowed`} />
    </div>
  )
}

function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className="w-10 flex items-center justify-center"
    >
      <span
        className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
          checked ? 'bg-[#0D1B2A] border-[#0D1B2A]' : 'border-gray-300 bg-white'
        }`}
      >
        {checked && <Check size={13} className="text-white" strokeWidth={3} />}
      </span>
    </button>
  )
}

function labelForType(value: string | null) {
  if (!value) return '—'
  return value.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function ChangePasswordForm({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const [isPending, startTransition] = useTransition()

  function submit() {
    setMessage(null)
    if (next !== confirm) {
      setMessage({ text: 'New passwords do not match.', ok: false })
      return
    }
    startTransition(async () => {
      const result = await changeOwnPassword({ userId, currentPassword: current, newPassword: next })
      if (!result.success) { setMessage({ text: result.error, ok: false }); return }
      setMessage({ text: 'Password updated.', ok: true })
      setCurrent(''); setNext(''); setConfirm('')
      onDone()
    })
  }

  return (
    <div className="space-y-4 max-w-sm">
      <GroupLabel>Change password</GroupLabel>
      <Field label="Current password">
        <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} className={INPUT} autoComplete="current-password" />
      </Field>
      <Field label="New password">
        <input type="password" value={next} onChange={(e) => setNext(e.target.value)} className={INPUT} autoComplete="new-password" />
      </Field>
      <Field label="Confirm new password">
        <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={INPUT} autoComplete="new-password" />
      </Field>
      {message && (
        <p className={`text-[13px] ${message.ok ? 'text-emerald-700' : 'text-[#B42318]'}`}>{message.text}</p>
      )}
      <button
        onClick={submit}
        disabled={isPending || !current || !next}
        className="h-10 px-6 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        {isPending ? 'Updating…' : 'Update password'}
      </button>
    </div>
  )
}
