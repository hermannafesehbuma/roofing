'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { loginUser } from './actions'

export default function AdminLoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg('')
    setIsLoading(true)

    try {
      const res = await loginUser(email, password)

      if (!res.success || !res.user) {
        setErrorMsg(res.error || 'Authentication failed.')
        setIsLoading(false)
        return
      }

      localStorage.setItem('is_authenticated', 'true')
      localStorage.setItem('user_role', res.user.role)
      localStorage.setItem('user_email', res.user.email || email)
      localStorage.setItem('user_first_name', res.user.firstName)
      localStorage.setItem('user_last_name', res.user.lastName)

      // Store permissions from database
      if (res.permissions) {
        localStorage.setItem('peak_permissions', JSON.stringify(res.permissions))
      }
      
      // Dispatch events to notify other components immediately
      window.dispatchEvent(new Event('auth-changed'))
      window.dispatchEvent(new Event('role-changed'))
      window.dispatchEvent(new Event('permissions-changed'))
      
      router.push('/admin/dashboard')
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.')
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
              <span className="text-white font-bold text-xs tracking-widest">PEAK</span>
            </div>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-500 text-sm mb-8">
            Access your dashboard and keep every project securely on track.
          </p>

          {errorMsg && (
            <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-600">
              {errorMsg}
            </div>
          )}

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
                <a href="#" className="text-xs text-gray-500 hover:text-gray-800 transition-colors">
                  Forgot Password
                </a>
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
          <h2 className="text-5xl font-bold text-white leading-tight mb-5">
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
