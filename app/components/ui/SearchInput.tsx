'use client'

import { Search } from 'lucide-react'

/**
 * The toolbar search field, shared by every portal list screen.
 *
 * Callers vary only the two things that legitimately differ per screen — what
 * the field is called and how wide it sits in its toolbar. Everything else
 * (icon, radius, padding, focus ring) is fixed here so the field cannot drift
 * screen by screen the way nine hand-rolled copies did.
 *
 *   <SearchInput value={search} onChange={setSearch} placeholder="Search logs" className="w-60" />
 */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Search',
  className = 'w-64',
  autoFocus,
}: {
  value: string
  /** Receives the new text, not the event — callers rarely want the event. */
  onChange: (value: string) => void
  placeholder?: string
  /** Width and flex behaviour only: `w-64`, `flex-1 max-w-xs`, … */
  className?: string
  autoFocus?: boolean
}) {
  return (
    <div className={`relative ${className}`}>
      <Search
        size={14}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
      />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full pl-9 pr-4 py-2 text-xs text-gray-800 bg-white border border-gray-200 rounded-xl placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0D1B2A]/10 focus:border-[#0D1B2A] transition-colors"
      />
    </div>
  )
}
