'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { TimeEntryRow } from '@/app/admin/(portal)/time-tracking/actions'
import { useCurrentUser } from '@/app/components/ui/useCurrentUser'
import { MobileHeader } from './MobileHeader'
import { MobileClockCard } from './MobileClockCard'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thr', 'Fri', 'Sat', 'Sun']

const STATUS_BADGE: Record<string, string> = {
  approved: 'bg-emerald-50 text-emerald-600',
  pending: 'bg-amber-50 text-amber-600',
  missed: 'bg-red-50 text-red-500',
}

/** Monday-start week, offset in whole weeks from the current one. */
function weekDays(offset: number) {
  const base = new Date()
  base.setHours(0, 0, 0, 0)
  base.setDate(base.getDate() - ((base.getDay() + 6) % 7) + offset * 7)
  return Array.from({ length: 7 }).map((_, i) => {
    const day = new Date(base)
    day.setDate(base.getDate() + i)
    return { iso: day.toLocaleDateString('en-CA'), label: DAY_LABELS[i], date: day }
  })
}

function hoursBetween(clockIn: string, clockOut: string | null) {
  if (!clockOut) return 0
  const [hi, mi] = clockIn.split(':').map(Number)
  const [ho, mo] = clockOut.split(':').map(Number)
  return Math.max(0, (ho * 60 + mo - (hi * 60 + mi)) / 60)
}

function formatTotal(hours: number) {
  const whole = Math.floor(hours)
  const minutes = Math.floor((hours - whole) * 60)
  const seconds = Math.round(((hours - whole) * 60 - minutes) * 60)
  return [whole, minutes, seconds].map((n) => String(n).padStart(2, '0')).join(':')
}

export function MobileClockScreen({
  entries,
  projects,
}: {
  entries: TimeEntryRow[]
  projects: { id: string; name: string }[]
}) {
  const router = useRouter()
  const profile = useCurrentUser()
  const userId = profile?.id ?? ''
  const [weekOffset, setWeekOffset] = useState(0)

  // Crews see their own timesheet; managers reviewing on a phone see everything.
  const isCrew = profile?.role === 'staff' || profile?.role === 'technician'
  const mine = entries.filter((e) => e.user_id === userId)
  const visible = isCrew || mine.length > 0 ? mine : entries

  const todayKey = new Date().toLocaleDateString('en-CA')
  const openEntry = mine.find((e) => e.date === todayKey && !e.clock_out) ?? null

  const days = weekDays(weekOffset)
  const weekTotal = days.reduce(
    (sum, day) =>
      sum + visible.filter((e) => e.date === day.iso).reduce((s, e) => s + hoursBetween(e.clock_in, e.clock_out), 0),
    0
  )

  const rangeLabel = `${days[0].date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${days[6].date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`

  return (
    <div className="md:hidden flex flex-col h-full overflow-hidden bg-[#F4F6F9]">
      <MobileHeader title="TIME CLOCKING" />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <MobileClockCard
          userId={userId}
          projects={projects}
          openEntry={openEntry}
          onChanged={() => router.refresh()}
        />

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">This Week</h2>
              <p className="text-[11px] text-gray-400 mt-0.5">{rangeLabel}</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setWeekOffset((o) => o - 1)}
                aria-label="Previous week"
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setWeekOffset((o) => o + 1)}
                aria-label="Next week"
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-gray-100 py-3 text-center">
            <p className="text-[11px] text-gray-400">This Week</p>
            <p className="text-2xl font-semibold text-gray-900 tabular-nums">{formatTotal(weekTotal)}</p>
          </div>

          <table className="w-full mt-4 text-left">
            <thead>
              <tr className="text-[11px] text-gray-400 border-b border-gray-100">
                <th className="pb-2 font-medium">Day</th>
                <th className="pb-2 font-medium">Time</th>
                <th className="pb-2 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {days.map((day) => {
                const dayEntries = visible.filter((e) => e.date === day.iso)
                const total = dayEntries.reduce((s, e) => s + hoursBetween(e.clock_in, e.clock_out), 0)
                const status = dayEntries[0]?.status
                return (
                  <tr key={day.iso} className="text-xs">
                    <td className="py-2.5 text-gray-600">{day.label}</td>
                    <td className="py-2.5 text-gray-900 font-medium">
                      {total > 0 ? `${total.toFixed(1)}h` : '-'}
                    </td>
                    <td className="py-2.5 text-right">
                      {status ? (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium capitalize ${STATUS_BADGE[status] ?? 'bg-gray-100 text-gray-500'}`}>
                          {status}
                        </span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
