'use client'

import { useRevealOnScroll } from './useRevealOnScroll'

type Bar = { period: string; val: number }

/**
 * Monthly Revenue bars. They sit at zero height until the chart scrolls into
 * view, then grow to their value with a left-to-right stagger.
 */
export default function RevenueBars({ data, highlight }: { data: Bar[]; highlight: string }) {
  const { ref, revealed } = useRevealOnScroll<HTMLDivElement>()

  return (
    <div ref={ref} className="mt-5 pt-4 border-t border-gray-100">
      <div className="flex items-end gap-2 h-[150px]">
        {data.map(({ period, val }, i) => (
          <div
            key={period}
            className="flex-1 rounded-t-md transition-[height] duration-700 ease-out motion-reduce:transition-none"
            style={{
              height: revealed ? `${val}%` : '0%',
              transitionDelay: `${i * 80}ms`,
              backgroundColor: period === highlight ? '#0D1B2A' : '#EDEFF2',
            }}
          />
        ))}
      </div>
      <div className="flex gap-2 mt-2">
        {data.map(({ period }) => (
          <span key={period} className="flex-1 text-center text-[10px] text-gray-400">{period}</span>
        ))}
      </div>
    </div>
  )
}
