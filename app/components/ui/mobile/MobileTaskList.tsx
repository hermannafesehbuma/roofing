'use client'

import { useState } from 'react'
import { Calendar, Clock, Check } from 'lucide-react'
import type { TaskRow, DbTaskStatus } from '@/app/admin/(portal)/tasks/actions'
import { MobilePills } from './MobilePills'

type Filter = 'all' | 'todo' | 'in_progress' | 'completed'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
]

const STATUS_BADGE: Record<DbTaskStatus, { label: string; className: string }> = {
  todo: { label: 'To Do', className: 'bg-gray-100 text-gray-500' },
  in_progress: { label: 'In Progress', className: 'bg-orange-50 text-orange-500' },
  in_review: { label: 'In Review', className: 'bg-blue-50 text-blue-500' },
  completed: { label: 'Completed', className: 'bg-emerald-50 text-emerald-600' },
}

const PRIORITY_TEXT: Record<string, string> = {
  high: 'text-red-500',
  medium: 'text-amber-500',
  low: 'text-blue-500',
}

/** "Tomorrow" / "Today" read better than a date on a phone. */
function formatDue(due: string | null) {
  if (!due) return null
  const date = new Date(`${due}T00:00:00`)
  if (Number.isNaN(date.getTime())) return due
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days = Math.round((date.getTime() - today.getTime()) / 86_400_000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function MobileTaskList({
  tasks,
  onAdvance,
  busyId,
}: {
  tasks: TaskRow[]
  /** Moves a task to its next status — todo → in_progress → completed. */
  onAdvance: (task: TaskRow, next: DbTaskStatus) => void
  busyId?: string | null
}) {
  const [filter, setFilter] = useState<Filter>('all')

  const visible = tasks.filter((task) => {
    if (filter === 'all') return true
    if (filter === 'completed') return task.status === 'completed'
    if (filter === 'in_progress') return task.status === 'in_progress' || task.status === 'in_review'
    return task.status === 'todo'
  })

  return (
    <div className="space-y-3">
      <MobilePills options={FILTERS} value={filter} onChange={setFilter} />

      {visible.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400">No tasks here.</p>
      ) : (
        <div className="space-y-3">
          {visible.map((task) => {
            const badge = STATUS_BADGE[task.status]
            const due = formatDue(task.due_date)
            const busy = busyId === task.id
            return (
              <div key={task.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-medium text-gray-900 leading-snug">{task.title}</h3>
                  <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-medium ${badge.className}`}>
                    {badge.label}
                  </span>
                </div>

                {task.project_name && (
                  <p className="text-xs text-gray-500 mt-1.5">{task.project_name}</p>
                )}

                <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-400">
                  <span className={`font-medium capitalize ${PRIORITY_TEXT[task.priority] ?? 'text-gray-400'}`}>
                    {task.priority === 'medium' ? 'Medium' : task.priority}
                  </span>
                  {due && (
                    <span className="inline-flex items-center gap-1 text-amber-500">
                      <Calendar size={11} /> {due}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <Clock size={11} /> 3hr
                  </span>
                </div>

                {task.status !== 'completed' && (
                  <button
                    onClick={() => onAdvance(task, task.status === 'todo' ? 'in_progress' : 'completed')}
                    disabled={busy}
                    className="w-full mt-3 py-2.5 rounded-lg bg-[#0A1629] text-white text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60 transition-opacity"
                  >
                    {task.status === 'todo' ? 'Start Task' : (
                      <>Mark as Completed <Check size={13} /></>
                    )}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
