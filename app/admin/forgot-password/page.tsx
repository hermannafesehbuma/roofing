'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, MailCheck } from 'lucide-react'
import { requestPasswordReset } from './actions'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [sent, setSent] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg('')
    setIsLoading(true)

    try {
      const res = await requestPasswordReset(email)

      if (!res.success) {
        setErrorMsg(res.error)
        return
      }

      setSent(true)
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

          {sent ? (
            <>
              <div className="w-11 h-11 rounded-full bg-green-50 flex items-center justify-center mb-5">
                <MailCheck size={20} className="text-green-600" />
              </div>
              <h1 className="text-3xl font-semibold text-gray-900 mb-2">Check Your Email</h1>
              <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                If an account exists for <span className="font-medium text-gray-700">{email}</span>, we&apos;ve
                sent a link to reset your password. The link expires in one hour.
              </p>

              <button
                type="button"
                onClick={() => setSent(false)}
                className="w-full border border-gray-200 text-gray-700 py-3.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Send it again
              </button>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-semibold text-gray-900 mb-2">Forgot Password</h1>
              <p className="text-gray-500 text-sm mb-8">
                Enter the email tied to your account and we&apos;ll send you a link to set a new password.
              </p>

              {errorMsg && (
                <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-600">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0D1B2A]/20 focus:border-[#0D1B2A]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#0D1B2A] text-white py-3.5 rounded-lg text-sm font-medium hover:bg-[#162437] transition-colors mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Sending…' : 'Send Reset Link'}
                </button>
              </form>
            </>
          )}

          <Link
            href="/admin/login"
            className="mt-8 inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft size={14} />
            Back to log in
          </Link>
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
