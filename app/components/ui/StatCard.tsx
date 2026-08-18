/**
 * The one stat tile used across the portal.
 *
 * Every list screen opens with a band of these, and they were previously
 * redefined per screen — which drifted: 112px tall on most, 116px on Inventory,
 * 104px with a 26px figure on Insurance. One definition here keeps the size,
 * type scale and internal spacing identical everywhere, which is what the
 * design calls for.
 *
 * Pair with `StatCardGrid`, which owns the column count, the gutter, and the
 * 48px band gap below.
 */
import { BAND_GAP } from './spacing'

export function StatCard({ label, value, sub, subColor, icon, iconBg }: {
  label: string
  value: number | string
  /** Optional caption beside the figure — a delta, a status, a count. */
  sub?: string
  /** Text colour class for `sub`. */
  subColor?: string
  icon: React.ReactNode
  /** Tile behind the icon, as a background class. The icon supplies its own colour. */
  iconBg: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 flex flex-col justify-between gap-4 min-h-[112px]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-gray-500">{label}</p>
        <span className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${iconBg}`}>
          {icon}
        </span>
      </div>
      <div className="flex items-end justify-between gap-3">
        <p className="text-[30px] font-semibold text-gray-900 leading-none">{value}</p>
        {sub && <p className={`text-xs font-medium leading-none pb-0.5 text-right ${subColor ?? 'text-gray-400'}`}>{sub}</p>}
      </div>
    </div>
  )
}

/**
 * The band the tiles sit in: four across on wide screens, folding to two then
 * one, with the 48px gap below that separates the summary from the controls.
 *
 * `className` is for the screen's own page padding only — the columns, gutter
 * and band gap are fixed so the rhythm matches everywhere.
 */
export function StatCardGrid({ className = '', children }: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 ${BAND_GAP} ${className}`.trim()}>
      {children}
    </div>
  )
}
