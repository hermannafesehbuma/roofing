import Image from 'next/image'

/**
 * The two-panel frame every unauthenticated screen shares: PEAK mark and form
 * on the left, hero photo and headline on the right.
 *
 * Extracted so Activate Account (Addendum Task 5) is the same shell as Log In
 * rather than a second copy of it that drifts.
 */
export function AuthShell({ banner, children }: { banner?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel — form */}
      <div className="w-full lg:w-[45%] flex flex-col justify-center px-8 sm:px-14 lg:px-16 bg-white">
        <div className="max-w-sm w-full mx-auto">
          {/* Logo row — any alert banner sits beside the logo */}
          <div className="mb-10 flex items-start gap-5 sm:gap-8">
            <div className="inline-flex shrink-0 items-center justify-center h-11 px-3.5 bg-[#0D1B2A] rounded-md">
              <span className="text-white font-semibold text-xs tracking-widest">PEAK</span>
            </div>
            {banner}
          </div>

          {children}
        </div>
      </div>

      {/* Right panel — hero */}
      <div className="hidden lg:flex lg:w-[55%] relative items-end p-14 overflow-hidden bg-[#0D1B2A]">
        <Image src="/login.jpg" alt="" fill priority sizes="55vw" className="object-cover" />

        {/* Scrim — the headline sits at the bottom, so the photo darkens into it. */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D1B2A] via-[#0D1B2A]/70 to-[#0D1B2A]/20" />

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
