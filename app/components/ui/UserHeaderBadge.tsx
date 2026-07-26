'use client'

import { useCurrentUser, initialsOf } from './useCurrentUser'

const roleGradients: Record<string, string> = {
  admin: 'from-blue-400 to-blue-600',
  manager: 'from-amber-400 to-amber-600',
  staff: 'from-emerald-400 to-emerald-600',
  client: 'from-purple-400 to-purple-600',
}

const roleTitles: Record<string, string> = {
  admin: 'Admin',
  manager: 'Manager',
  staff: 'Crew',
  client: 'Client',
}

export default function UserHeaderBadge() {
  const profile = useCurrentUser()

  if (!profile) return null

  return (
    <div className="flex items-center gap-2.5 pl-3 border-l border-gray-200">
      {profile.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={profile.avatarUrl} alt={profile.name}
          className="w-8 h-8 rounded-full object-cover border border-gray-100" />
      ) : (
        <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${roleGradients[profile.role] || roleGradients.admin} flex items-center justify-center`}>
          <span className="text-white text-[11px] font-semibold">{initialsOf(profile.name)}</span>
        </div>
      )}
      <div className="leading-tight">
        <p className="text-xs font-semibold text-gray-800">{profile.name}</p>
        <p className="text-[10px] text-gray-400">{roleTitles[profile.role] || profile.role}</p>
      </div>
    </div>
  )
}
