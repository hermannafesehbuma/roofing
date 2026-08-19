'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ProfileMenu } from '@/app/components/ui/ProfileMenu'

/**
 * Mobile screen header, in the two shapes the design uses.
 *
 * Top-level screens get a large left-aligned title with the signed-in user's
 * avatar opposite it. Detail screens get a back arrow with the title centred
 * between it and a spacer of equal width — centring by layout rather than by
 * `text-center`, so a long title stays optically centred instead of drifting.
 *
 * The desktop `AppHeader` is hidden below `md`, so this is the only header
 * phones see.
 */
export function MobileHeader({
  title,
  backHref,
  action,
  hideAvatar = false,
}: {
  title: string
  backHref?: string
  action?: React.ReactNode
  /** Drop the avatar menu — the profile screen is already where it leads. */
  hideAvatar?: boolean
}) {
  if (backHref) {
    return (
      <header className="md:hidden sticky top-0 z-30 bg-white border-b border-gray-100 px-4 pt-[calc(env(safe-area-inset-top)+28px)] pb-4 flex items-center gap-2">
        <Link
          href={backHref}
          aria-label="Back"
          className="w-9 h-9 -ml-1.5 shrink-0 flex items-center justify-center rounded-full text-gray-700 hover:bg-gray-100"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="flex-1 text-center text-base font-semibold text-gray-900 truncate">{title}</h1>
        {/* Balances the arrow so the title sits at the true centre. */}
        <span className="w-9 shrink-0 flex items-center justify-end">{action}</span>
      </header>
    )
  }

  return (
    <header className="md:hidden sticky top-0 z-30 bg-white border-b border-gray-100 px-4 pt-[calc(env(safe-area-inset-top)+32px)] pb-5 flex items-center justify-between gap-3">
      <h1 className="text-[26px] leading-tight font-semibold text-gray-900 truncate">{title}</h1>
      <div className="flex items-center gap-2 shrink-0">
        {action}
        {!hideAvatar && <ProfileMenu size={44} />}
      </div>
    </header>
  )
}
