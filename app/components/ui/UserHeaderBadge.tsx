'use client'

import { useState, useEffect } from 'react'

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
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [initials, setInitials] = useState('')

  useEffect(() => {
    const load = () => {
      const firstName = localStorage.getItem('user_first_name') || ''
      const lastName = localStorage.getItem('user_last_name') || ''
      const r = localStorage.getItem('user_role') || 'admin'
      const fullName = firstName && lastName ? `${firstName} ${lastName}` : r.charAt(0).toUpperCase() + r.slice(1)
      setName(fullName)
      setRole(r)
      setInitials(
        fullName
          .split(' ')
          .map(n => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2) || 'U'
      )
    }
    load()
    window.addEventListener('auth-changed', load)
    window.addEventListener('role-changed', load)
    return () => {
      window.removeEventListener('auth-changed', load)
      window.removeEventListener('role-changed', load)
    }
  }, [])

  return (
    <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
      <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${roleGradients[role] || roleGradients.admin} flex items-center justify-center`}>
        <span className="text-white text-[10px] font-semibold">{initials}</span>
      </div>
      <div>
        <p className="text-xs font-medium text-gray-800 leading-none">{name}</p>
        <p className="text-[10px] text-gray-400">{roleTitles[role] || role}</p>
      </div>
    </div>
  )
}
