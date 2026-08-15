'use client'

/**
 * The dropdown that hangs off a `FilterButton`: a "Filter" caption, one chip
 * group per facet, and a Clear All / Apply pair sharing the footer.
 *
 * Anchor it inside a `relative` wrapper alongside the button:
 *
 *   <div className="relative" ref={ref}>
 *     <FilterButton … />
 *     {open && (
 *       <FilterPanel onClear={…} onApply={() => setOpen(false)}>
 *         <FilterChipGroup label="Status" options={…} selected={…} onToggle={…} />
 *       </FilterPanel>
 *     )}
 *   </div>
 */
export function FilterPanel({ children, onClear, onApply, className = '' }: {
  children: React.ReactNode
  onClear: () => void
  onApply: () => void
  className?: string
}) {
  return (
    <div className={`absolute right-0 top-11 w-80 bg-white border border-gray-100 rounded-xl shadow-xl z-40 p-5 ${className}`}>
      <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-4">Filter</h4>
      <div className="space-y-4">{children}</div>
      <div className="flex gap-3 border-t border-gray-100 mt-5 pt-4">
        <button
          onClick={onClear}
          className="flex-1 py-2.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Clear All
        </button>
        <button
          onClick={onApply}
          className="flex-1 py-2.5 bg-[#0D1B2A] text-white text-xs font-semibold rounded-lg shadow-sm hover:bg-[#162437] transition-colors"
        >
          Apply
        </button>
      </div>
    </div>
  )
}

/**
 * One labelled row of toggle chips. Renders nothing when it has no options, so
 * a facet with no values simply drops out of the panel.
 */
export function FilterChipGroup<T extends string>({ label, options, selected, onToggle }: {
  label:    string
  options:  { value: T; label: string }[]
  /** Multi-select passes the array; single-select passes `[value]` or `[]`. */
  selected: T[]
  onToggle: (value: T) => void
}) {
  if (options.length === 0) return null
  return (
    <div>
      <label className="text-xs font-semibold text-gray-700 block mb-2">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map(o => {
          const active = selected.includes(o.value)
          return (
            <button
              key={o.value}
              onClick={() => onToggle(o.value)}
              className={`px-3 py-1.5 text-[11px] font-medium rounded-full border transition-colors ${
                active
                  ? 'bg-[#0D1B2A] text-white border-[#0D1B2A]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
