'use client'

/** Horizontally scrollable segmented filter used on the mobile list screens. */
export function MobilePills<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 overflow-x-auto">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`flex-1 whitespace-nowrap px-3 py-1.5 rounded-md text-xs transition-colors ${
            value === option.value
              ? 'bg-[#0A1629] text-white font-semibold'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
