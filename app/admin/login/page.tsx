'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, CircleAlert } from 'lucide-react'
import { loginUser } from './actions'
import { saveSession } from '@/lib/session'
import { homeRouteForRole } from '@/lib/navigation'

type LoginError = { title: string; description: string }

/** Turns a raw auth error into the title + description shown in the banner. */
function toLoginError(raw?: string): LoginError {
  const msg = (raw || '').toLowerCase()

  if (msg.includes('invalid login credentials') || msg.includes('no user found')) {
    return {
      title: 'Login failed',
      description: 'The email or password you entered is incorrect. Please try again.',
    }
  }

  if (msg.includes('email not confirmed')) {
    return {
      title: 'Email not verified',
      description: 'Check your inbox for the verification link, then try logging in again.',
    }
  }

  if (msg.includes('too many') || msg.includes('rate limit')) {
    return {
      title: 'Too many attempts',
      description: 'Please wait a moment before trying to log in again.',
    }
  }

  return {
    title: 'Login failed',
    description: raw || 'Something went wrong while signing you in. Please try again.',
  }
}

export default function AdminLoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<LoginError | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const res = await loginUser(email, password)

      if (!res.success || !res.user) {
        setError(toLoginError(res.error))
        setIsLoading(false)
        return
      }

      saveSession({
        id: res.user.id,
        role: res.user.role,
        email: res.user.email || email,
        firstName: res.user.firstName,
        lastName: res.user.lastName,
        avatarUrl: res.user.avatarUrl,
      }, res.permissions)
      
      // Dispatch events to notify other components immediately
      window.dispatchEvent(new Event('auth-changed'))
      window.dispatchEvent(new Event('role-changed'))
      window.dispatchEvent(new Event('permissions-changed'))
      
      router.push(homeRouteForRole(res.user.role))
    } catch (err: any) {
      setError(toLoginError(err?.message))
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — form */}
      <div className="w-full lg:w-[45%] flex flex-col justify-center px-8 sm:px-14 lg:px-16 bg-white">
        <div className="max-w-sm w-full mx-auto">
          {/* Logo row — the error banner sits beside the logo */}
          <div className="mb-10 flex items-start gap-5 sm:gap-8">
            <div className="inline-flex shrink-0 items-center justify-center h-11 px-3.5 bg-[#0D1B2A] rounded-md">
              <span className="text-white font-semibold text-xs tracking-widest">PEAK</span>
            </div>

            {error && (
              <div
                role="alert"
                aria-live="assertive"
                className="flex-1 flex items-start gap-3 rounded-lg bg-[#FDECE7] px-4 py-3"
              >
                <CircleAlert size={16} className="mt-0.5 shrink-0 text-[#E5533D]" />
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold leading-tight text-[#0D1B2A]">
                    {error.title}
                  </p>
                  <p className="mt-1 text-xs leading-snug text-gray-600">
                    {error.description}
                  </p>
                </div>
              </div>
            )}
          </div>

          <h1 className="text-3xl font-semibold text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-500 text-sm mb-8">
            Access your dashboard and keep every project securely on track.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
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

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
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
              <div className="mt-2 text-right">
                <Link
                  href="/admin/forgot-password"
                  className="text-xs text-gray-500 hover:text-gray-800 transition-colors"
                >
                  Forgot Password
                </Link>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-[#0D1B2A] text-white py-3.5 rounded-lg text-sm font-medium hover:bg-[#162437] transition-colors mt-2"
            >
              Log In
            </button>
          </form>
        </div>
      </div>

      {/* Right panel — hero */}
      <div
        className="hidden lg:flex lg:w-[55%] relative items-end p-14 overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, #1a3a5c 0%, #0D1B2A 60%)',
        }}
      >
        {/* Decorative circles */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-120px] right-[-80px] w-[500px] h-[500px] rounded-full border border-white/5" />
          <div className="absolute top-[-60px] right-[-20px] w-[360px] h-[360px] rounded-full border border-white/5" />
          <div className="absolute bottom-[100px] left-[-100px] w-[300px] h-[300px] rounded-full bg-blue-500/5" />
        </div>

        {/* Illustration placeholder — replace with a real site image */}
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
