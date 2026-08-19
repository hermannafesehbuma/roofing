'use client'

/**
 * Pill tab switcher: a light track holding one filled segment.
 *
 * The design uses this wherever a screen switches between whole datasets —
 * Insurance's COI / Certifications, Inventory's Items / POs / Usage. It is
 * distinct from the underlined tab bar (Invoices, Time Tracking, CRM), which
 * marks sections of one dataset.
 *
 * Counts render inside the label rather than as a badge, matching the design.
 * Pass `count: null` for a tab that has nothing to count.
 */
export function SegmentedTabs<T extends string>({ value, onChange, options, className = '' }: {
  value: T
  onChange: (value: T) => void
  options: readonly { readonly value: T; readonly label: string; readonly count?: number | null }[]
  /** Layout only — the track, padding and segment styling are fixed. */
  className?: string
}) {
  return (
    <div className={`flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit ${className}`.trim()}>
      {options.map(option => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
            value === option.value
              ? 'bg-[#0D1B2A] text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          {option.label}{option.count != null && ` (${option.count})`}
        </button>
      ))}
    </div>
  )
}
