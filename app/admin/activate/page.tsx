'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CircleAlert, Eye, EyeOff } from 'lucide-react'
import { AuthShell } from '../AuthShell'
import { saveSession } from '@/lib/session'
import { homeRouteForRole } from '@/lib/navigation'
import {
  verifyActivationToken, getInvitee, activateAccount,
  type ActivationSession, type Invitee,
} from './actions'

/**
 * Set Your Password / Activate Account (Addendum Task 5).
 *
 * The first-time counterpart to Log In: the invitee arrives from the emailed
 * link with a one-time token, chooses their own password, and lands directly in
 * their role's home screen — no second sign-in, and no password ever set for
 * them by anyone else.
 */
export default function ActivatePage() {
  const router = useRouter()
  const [session, setSession] = useState<ActivationSession | null>(null)
  const [invitee, setInvitee] = useState<Invitee | null>(null)
  const [linkError, setLinkError] = useState('')
  const [checkingLink, setCheckingLink] = useState(true)

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Invite links land here with tokens in the URL hash (implicit flow) or as a
  // `token_hash` query param, exactly like the recovery links they are built on.
  useEffect(() => {
    let cancelled = false

    async function readLink() {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
      const query = new URLSearchParams(window.location.search)

      const linkProblem = hash.get('error_description') || query.get('error_description')
      if (linkProblem) {
        const expired = hash.get('error_code') === 'otp_expired' || query.get('error_code') === 'otp_expired'
        setLinkError(
          expired
            ? 'This activation link has expired. Ask an administrator to resend your invite.'
            : linkProblem
        )
        setCheckingLink(false)
        return
      }

      let resolved: ActivationSession | null = null

      const accessToken = hash.get('access_token')
      const refreshToken = hash.get('refresh_token')
      if (accessToken && refreshToken) {
        resolved = { accessToken, refreshToken }
      } else {
        const tokenHash = query.get('token_hash')
        if (!tokenHash) {
          setLinkError('This page can only be opened from an invite email.')
          setCheckingLink(false)
          return
        }
        const res = await verifyActivationToken(tokenHash)
        if (cancelled) return
        if (!res.success) {
          setLinkError(res.error)
          setCheckingLink(false)
          return
        }
        resolved = res.session
      }

      // Strip the token out of the address bar before anything else renders.
      window.history.replaceState(null, '', window.location.pathname)
      setSession(resolved)
      setInvitee(await getInvitee(resolved))
      if (!cancelled) setCheckingLink(false)
    }

    readLink()
    return () => { cancelled = true }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!session) return

    setErrorMsg('')
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.')
      return
    }

    setIsLoading(true)
    try {
      const res = await activateAccount(session, password)
      if (!res.success) { setErrorMsg(res.error); return }

      if (res.user) {
        saveSession({
          id: res.user.id,
          email: res.user.email,
          role: res.user.role,
          firstName: res.user.firstName,
          lastName: res.user.lastName,
          avatarUrl: res.user.avatarUrl,
        })
        window.dispatchEvent(new Event('auth-changed'))
        window.dispatchEvent(new Event('role-changed'))
        router.push(homeRouteForRole(res.user.role))
        return
      }

      // Password is set but no employee record resolved — log in normally.
      router.push('/admin/login')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'An unexpected error occurred.')
    } finally {
      setIsLoading(false)
    }
  }

  if (checkingLink) {
    return (
      <AuthShell>
        <p className="text-sm text-gray-400">Checking your invite…</p>
      </AuthShell>
    )
  }

  if (linkError) {
    return (
      <AuthShell
        banner={
          <div role="alert" className="flex-1 flex items-start gap-3 rounded-lg bg-[#FDECE7] px-4 py-3">
            <CircleAlert size={16} className="mt-0.5 shrink-0 text-[#E5533D]" />
            <div className="min-w-0">
              <p className="text-[13px] font-semibold leading-tight text-[#0D1B2A]">Link not usable</p>
              <p className="mt-1 text-xs leading-snug text-gray-600">{linkError}</p>
            </div>
          </div>
        }
      >
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">Set Your Password</h1>
        <p className="text-gray-500 text-sm mb-8">
          Invites stay valid for a limited time. An administrator can send you a fresh one.
        </p>
        <Link
          href="/admin/login"
          className="inline-flex w-full items-center justify-center bg-[#0D1B2A] text-white py-3.5 rounded-lg text-sm font-medium hover:bg-[#162437] transition-colors"
        >
          Back to Log In
        </Link>
      </AuthShell>
    )
  }

  const greeting = invitee?.firstName ? `Welcome, ${invitee.firstName} — ` : 'Welcome — '

  return (
    <AuthShell
      banner={
        errorMsg ? (
          <div role="alert" aria-live="assertive" className="flex-1 flex items-start gap-3 rounded-lg bg-[#FDECE7] px-4 py-3">
            <CircleAlert size={16} className="mt-0.5 shrink-0 text-[#E5533D]" />
            <div className="min-w-0">
              <p className="text-[13px] font-semibold leading-tight text-[#0D1B2A]">Could not activate</p>
              <p className="mt-1 text-xs leading-snug text-gray-600">{errorMsg}</p>
            </div>
          </div>
        ) : undefined
      }
    >
      <h1 className="text-3xl font-semibold text-gray-900 mb-2">Set Your Password</h1>
      <p className="text-gray-500 text-sm mb-8">
        {greeting}create a password to activate your account.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full border border-gray-200 rounded-lg px-4 py-3 pr-12 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0D1B2A]/20 focus:border-[#0D1B2A]"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-400">At least 8 characters.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
          <input
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0D1B2A]/20 focus:border-[#0D1B2A]"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-[#0D1B2A] text-white py-3.5 rounded-lg text-sm font-medium hover:bg-[#162437] transition-colors mt-2 disabled:opacity-60"
        >
          {isLoading ? 'Activating…' : 'Activate Account'}
        </button>
      </form>
    </AuthShell>
  )
}
