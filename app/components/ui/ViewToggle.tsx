'use client'

import type { LucideIcon } from 'lucide-react'

export type ViewOption<T extends string> = { value: T; label: string; icon: LucideIcon }

/**
 * Kanban / List / Calendar selector — underlined tabs with no track, pill or
 * enclosing rule, marked only by the bar under the active view. Every portal
 * toolbar uses this one component so the switch reads identically throughout.
 */
export function ViewToggle<T extends string>({ value, options, onChange, className = '' }: {
  value: T
  options: ViewOption<T>[]
  onChange: (next: T) => void
  /** Spacing hook for the toolbar it sits in — never for restyling the tabs. */
  className?: string
}) {
  return (
    <div className={`flex items-center gap-6 ${className}`}>
      {options.map(({ value: option, label, icon: Icon }) => {
        const active = option === value
        return (
          <button
            key={option}
            onClick={() => onChange(option)}
            className={`flex items-center gap-2 pb-2 border-b-2 text-sm transition-colors ${
              active
                ? 'border-[#0D1B2A] text-gray-900 font-semibold'
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
