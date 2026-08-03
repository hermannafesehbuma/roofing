'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import type { TaskRow } from '@/app/admin/(portal)/tasks/actions'
import { startOfDay, addDays, startOfWeek, startOfMonth, addMonths } from '@/lib/timeline'

/** Monday-first, matching `startOfWeek` in lib/timeline. */
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** Same palette as the board chips, so a task reads the same in either view. */
const PRIORITY_CHIP: Record<string, string> = {
  high: 'text-red-600 bg-red-50 hover:bg-red-100',
  medium: 'text-amber-600 bg-amber-50 hover:bg-amber-100',
  low: 'text-blue-600 bg-blue-50 hover:bg-blue-100',
}

const MAX_CHIPS_PER_DAY = 3

function isoKey(d: Date) {
  return d.toLocaleDateString('en-CA') // YYYY-MM-DD, local
}

export function TasksCalendarView({
  tasks,
  onTaskClick,
  onAddOnDate,
}: {
  tasks: TaskRow[]
  onTaskClick: (task: TaskRow) => void
  /** Opens the task form with this date prefilled as the due date. */
  onAddOnDate: (isoDate: string) => void
}) {
  const [monthAnchor, setMonthAnchor] = useState(() => startOfMonth(new Date()))
  const [expandedDay, setExpandedDay] = useState<string | null>(null)

  // Six weeks always — a fixed height stops the grid jumping between months.
  const gridStart = useMemo(() => startOfWeek(monthAnchor), [monthAnchor])
  const days = useMemo(
    () => Array.from({ length: 42 }, (_, i) => addDays(gridStart, i)),
    [gridStart]
  )

  const byDay = useMemo(() => {
    const map = new Map<string, TaskRow[]>()
    for (const task of tasks) {
      if (!task.due_date) continue
      const key = task.due_date.slice(0, 10)
      const list = map.get(key)
      if (list) list.push(task)
      else map.set(key, [task])
    }
    // Highest priority first so the visible chips are the ones that matter.
    const rank = { high: 0, medium: 1, low: 2 } as Record<string, number>
    for (const list of map.values()) {
      list.sort((a, b) => (rank[a.priority] ?? 3) - (rank[b.priority] ?? 3))
    }
    return map
  }, [tasks])

  const todayKey = isoKey(startOfDay(new Date()))
  const currentMonth = monthAnchor.getMonth()
  const undated = tasks.filter((t) => !t.due_date).length

  const monthLabel = monthAnchor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm h-full flex flex-col overflow-hidden">
      {/* Toolbar — mirrors the week navigator on the Time Tracking screen. */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{monthLabel}</h3>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {tasks.length - undated} scheduled
            {undated > 0 && ` · ${undated} with no due date`}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setMonthAnchor(startOfMonth(new Date()))}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => setMonthAnchor((m) => addMonths(m, -1))}
            aria-label="Previous month"
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={() => setMonthAnchor((m) => addMonths(m, 1))}
            aria-label="Next month"
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-gray-100 shrink-0">
        {WEEKDAYS.map((day) => (
          <div key={day} className="px-2 py-2 text-center text-[11px] font-medium text-gray-400">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 grid-rows-6 flex-1 min-h-0">
        {days.map((day) => {
          const key = isoKey(day)
          const dayTasks = byDay.get(key) ?? []
          const inMonth = day.getMonth() === currentMonth
          const isToday = key === todayKey
          const expanded = expandedDay === key
          const visible = expanded ? dayTasks : dayTasks.slice(0, MAX_CHIPS_PER_DAY)
          const hidden = dayTasks.length - visible.length

          return (
            <div
              key={key}
              className={`group relative border-r border-b border-gray-100 [&:nth-child(7n)]:border-r-0 p-1.5 overflow-hidden flex flex-col ${
                inMonth ? 'bg-white' : 'bg-gray-50/60'
              }`}
            >
              <div className="flex items-center justify-between mb-1 shrink-0">
                <span
                  className={`text-[11px] w-5 h-5 flex items-center justify-center rounded-full ${
                    isToday
                      ? 'bg-[#0D1B2A] text-white font-semibold'
                      : inMonth
                        ? 'text-gray-700'
                        : 'text-gray-300'
                  }`}
                >
                  {day.getDate()}
                </span>
                <button
                  onClick={() => onAddOnDate(key)}
                  aria-label={`Add task on ${key}`}
                  className="opacity-0 group-hover:opacity-100 focus:opacity-100 w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-opacity"
                >
                  <Plus size={12} />
                </button>
              </div>

              <div className="space-y-1 overflow-y-auto min-h-0">
                {visible.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => onTaskClick(task)}
                    title={task.title}
                    className={`w-full text-left px-1.5 py-1 rounded text-[10px] font-medium truncate transition-colors ${
                      task.status === 'completed'
                        ? 'text-gray-400 bg-gray-100 hover:bg-gray-200'
                        : PRIORITY_CHIP[task.priority] ?? 'text-gray-600 bg-gray-50'
                    }`}
                  >
                    {task.title}
                  </button>
                ))}

                {hidden > 0 && (
                  <button
                    onClick={() => setExpandedDay(key)}
                    className="w-full text-left px-1.5 text-[10px] font-medium text-gray-400 hover:text-gray-700"
                  >
                    +{hidden} more
                  </button>
                )}
                {expanded && dayTasks.length > MAX_CHIPS_PER_DAY && (
                  <button
                    onClick={() => setExpandedDay(null)}
                    className="w-full text-left px-1.5 text-[10px] font-medium text-gray-400 hover:text-gray-700"
                  >
                    Show less
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
