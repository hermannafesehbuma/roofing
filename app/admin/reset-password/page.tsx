'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2, Eye, EyeOff } from 'lucide-react'
import { resetPassword, verifyRecoveryToken, type RecoverySession } from './actions'
import { clearSession } from '@/lib/session'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [session, setSession] = useState<RecoverySession | null>(null)
  const [linkError, setLinkError] = useState('')
  const [checkingLink, setCheckingLink] = useState(true)

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [done, setDone] = useState(false)

  // Recovery links land here with the tokens in the URL hash (implicit flow) or,
  // on newer email templates, as a `token_hash` query param.
  useEffect(() => {
    let cancelled = false

    async function readLink() {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
      const query = new URLSearchParams(window.location.search)

      const hashError = hash.get('error_description') || query.get('error_description')
      if (hashError) {
        setLinkError(
          hash.get('error_code') === 'otp_expired' || query.get('error_code') === 'otp_expired'
            ? 'This reset link has expired. Please request a new one.'
            : hashError
        )
        setCheckingLink(false)
        return
      }

      const accessToken = hash.get('access_token')
      const refreshToken = hash.get('refresh_token')

      if (accessToken && refreshToken) {
        setSession({ accessToken, refreshToken })
        // Strip the tokens out of the address bar.
        window.history.replaceState(null, '', window.location.pathname)
        setCheckingLink(false)
        return
      }

      const tokenHash = query.get('token_hash')
      if (tokenHash) {
        const res = await verifyRecoveryToken(tokenHash)
        if (cancelled) return

        if (!res.success) {
          setLinkError(res.error)
        } else {
          setSession(res.session)
          window.history.replaceState(null, '', window.location.pathname)
        }
        setCheckingLink(false)
        return
      }

      setLinkError('This page can only be opened from a password reset email.')
      setCheckingLink(false)
    }

    readLink()
    return () => {
      cancelled = true
    }
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
      const res = await resetPassword(session, password)

      if (!res.success) {
        setErrorMsg(res.error)
        return
      }

      // Clear any stale portal state from a previous session.
      clearSession()

      setDone(true)
      setTimeout(() => router.push('/admin/login'), 2500)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'An unexpected error occurred.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — form */}
      <div className="w-full lg:w-[45%] flex flex-col justify-center px-8 sm:px-14 lg:px-16 bg-white">
        <div className="max-w-sm w-full mx-auto">
          <div className="mb-10">
            <div className="inline-flex items-center justify-center h-11 px-3.5 bg-[#0D1B2A] rounded-md">
              <span className="text-white font-semibold text-xs tracking-widest">PEAK</span>
            </div>
          </div>

          {checkingLink ? (
            <p className="text-sm text-gray-500">Verifying your reset link…</p>
          ) : done ? (
            <>
              <div className="w-11 h-11 rounded-full bg-green-50 flex items-center justify-center mb-5">
                <CheckCircle2 size={20} className="text-green-600" />
              </div>
              <h1 className="text-3xl font-semibold text-gray-900 mb-2">Password Updated</h1>
              <p className="text-gray-500 text-sm mb-8">
                You can now log in with your new password. Taking you to the login page…
              </p>
              <Link
                href="/admin/login"
                className="inline-block w-full text-center bg-[#0D1B2A] text-white py-3.5 rounded-lg text-sm font-medium hover:bg-[#162437] transition-colors"
              >
                Go to Log In
              </Link>
            </>
          ) : linkError ? (
            <>
              <h1 className="text-3xl font-semibold text-gray-900 mb-2">Link Not Valid</h1>
              <p className="text-gray-500 text-sm mb-8">{linkError}</p>
              <Link
                href="/admin/forgot-password"
                className="inline-block w-full text-center bg-[#0D1B2A] text-white py-3.5 rounded-lg text-sm font-medium hover:bg-[#162437] transition-colors"
              >
                Request a New Link
              </Link>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-semibold text-gray-900 mb-2">Set New Password</h1>
              <p className="text-gray-500 text-sm mb-8">
                Choose a new password for your account — at least 8 characters.
              </p>

              {errorMsg && (
                <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-600">
                  {errorMsg}
                </div>
              )}

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
                      className="w-full border border-gray-200 rounded-lg px-4 py-3 pr-12 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0D1B2A]/20 focus:border-[#0D1B2A]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0D1B2A]/20 focus:border-[#0D1B2A]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#0D1B2A] text-white py-3.5 rounded-lg text-sm font-medium hover:bg-[#162437] transition-colors mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Updating…' : 'Update Password'}
                </button>
              </form>
            </>
          )}

          {!done && (
            <Link
              href="/admin/login"
              className="mt-8 inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft size={14} />
              Back to log in
            </Link>
          )}
        </div>
      </div>

      {/* Right panel — hero */}
      <div
        className="hidden lg:flex lg:w-[55%] relative items-end p-14 overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, #1a3a5c 0%, #0D1B2A 60%)',
        }}
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-120px] right-[-80px] w-[500px] h-[500px] rounded-full border border-white/5" />
          <div className="absolute top-[-60px] right-[-20px] w-[360px] h-[360px] rounded-full border border-white/5" />
          <div className="absolute bottom-[100px] left-[-100px] w-[300px] h-[300px] rounded-full bg-blue-500/5" />
        </div>

        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0D1B2A]/80" />

        <div className="relative z-10 max-w-lg">
          <h2 className="text-5xl font-semibold text-white leading-tight mb-5">
            Powering Every<br />Roof You Build
          </h2>
          <p className="text-white/60 text-base leading-relaxed">
            Plan, manage, and deliver roofing projects with ease — keep your crew
            aligned, your timelines tight, and your business moving forward.
          </p>
        </div>
      </div>
    </div>
  )
}
