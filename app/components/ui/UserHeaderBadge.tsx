'use client'

import { useCurrentUser } from './useCurrentUser'
import { ProfileMenu, ROLE_TITLES } from './ProfileMenu'

export default function UserHeaderBadge() {
  const profile = useCurrentUser()

  if (!profile) return null

  return (
    <div className="flex items-center gap-2.5 pl-3 border-l border-gray-200">
      <ProfileMenu size={32} />
      <div className="leading-tight">
        <p className="text-xs font-semibold text-gray-800">{profile.name}</p>
        <p className="text-[10px] text-gray-400">{ROLE_TITLES[profile.role] || profile.role}</p>
      </div>
    </div>
  )
}
