'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, MoreVertical } from 'lucide-react'
import { useCurrentUser, initialsOf } from '@/app/components/ui/useCurrentUser'

/**
 * Mobile screen header. Either a page title with the signed-in user's avatar,
 * or a back arrow with a centred title on detail screens. The desktop
 * `AppHeader` is hidden below `md`, so this is the only header phones see.
 */
export function MobileHeader({
  title,
  backHref,
  action,
}: {
  title: string
  backHref?: string
  action?: React.ReactNode
}) {
  const profile = useCurrentUser()

  if (backHref) {
    return (
      <header className="md:hidden sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <Link href={backHref} className="w-8 h-8 -ml-1 flex items-center justify-center rounded-full text-gray-600 hover:bg-gray-100">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="flex-1 text-sm font-semibold text-gray-900 truncate">{title}</h1>
        {action ?? <span className="w-8 h-8 flex items-center justify-center text-gray-400"><MoreVertical size={18} /></span>}
      </header>
    )
  }

  return (
    <header className="md:hidden sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
      <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
      <div className="flex items-center gap-2">
        {action}
        <MobileAvatar name={profile?.name ?? ''} avatarUrl={profile?.avatarUrl ?? null} />
      </div>
    </header>
  )
}

export function MobileAvatar({
  name,
  avatarUrl,
  size = 36,
}: {
  name: string
  avatarUrl: string | null
  size?: number
}) {
  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-full overflow-hidden relative shrink-0 bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center"
    >
      {avatarUrl ? (
        <Image src={avatarUrl} alt={name} fill sizes={`${size}px`} className="object-cover" />
      ) : (
        <span className="text-white text-xs font-semibold">{initialsOf(name)}</span>
      )}
    </div>
  )
}
