'use client'

import { useRevealOnScroll } from './useRevealOnScroll'

type Crew = { label: string; pct: number; color: string }

/**
 * Crew Utilization meters. Tracks stay empty until the card scrolls into view,
 * then each fill sweeps out to its percentage with a top-to-bottom stagger.
 */
export default function CrewUtilizationBars({ data }: { data: Crew[] }) {
  const { ref, revealed } = useRevealOnScroll<HTMLDivElement>()

  return (
    <div ref={ref} className="mt-5 pt-4 border-t border-gray-100 space-y-6">
      {data.map(({ label, pct, color }, i) => (
        <div key={label} className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
          <span className="w-24 shrink-0 text-[11px] text-gray-600">{label}</span>
          <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none"
              style={{
                width: revealed ? `${pct}%` : '0%',
                transitionDelay: `${i * 80}ms`,
                backgroundColor: color,
              }}
            />
          </div>
          <span className="w-8 shrink-0 text-right text-[11px] text-gray-400">{pct}%</span>
        </div>
      ))}
    </div>
  )
}
