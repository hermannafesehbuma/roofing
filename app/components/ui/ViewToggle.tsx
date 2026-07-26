'use client'

import type { LucideIcon } from 'lucide-react'

export type ViewOption<T extends string> = { value: T; label: string; icon: LucideIcon }

/**
 * Kanban / List selector — underlined tabs rather than a pill group, shared by
 * the Projects and Employees toolbars so both read identically.
 */
export function ViewToggle<T extends string>({ value, options, onChange }: {
  value: T
  options: ViewOption<T>[]
  onChange: (next: T) => void
}) {
  return (
    <div className="flex items-center gap-5">
      {options.map(({ value: option, label, icon: Icon }) => {
        const active = option === value
        return (
          <button
            key={option}
            onClick={() => onChange(option)}
            className={`flex items-center gap-2 pb-1.5 border-b-2 text-sm transition-colors ${
              active
                ? 'border-[#0D1B2A] text-gray-900 font-medium'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            <Icon size={16} strokeWidth={active ? 2 : 1.75} />
            {label}
          </button>
        )
      })}
    </div>
  )
}
