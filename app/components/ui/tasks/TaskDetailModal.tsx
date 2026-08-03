'use client'

import Image from 'next/image'
import { X, CalendarDays, Clock, Pencil } from 'lucide-react'
import type { TaskRow } from '@/app/admin/(portal)/tasks/actions'

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  todo: { label: 'To Do', className: 'text-gray-600 bg-gray-100' },
  in_progress: { label: 'In Progress', className: 'text-blue-600 bg-blue-50' },
  in_review: { label: 'In Review', className: 'text-amber-600 bg-amber-50' },
  completed: { label: 'Completed', className: 'text-emerald-600 bg-emerald-50' },
}

const PRIORITY_LABEL: Record<string, string> = {
  high: 'text-red-600 bg-red-50',
  medium: 'text-amber-600 bg-amber-50',
  low: 'text-blue-600 bg-blue-50',
}

function formatDate(value: string | null) {
  if (!value) return '—'
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500 shrink-0">{label}</span>
      <span className="text-xs font-medium text-gray-900 text-right">{children}</span>
    </div>
  )
}

/** Read-only view of a task, opened from the card's "View Detail" action. */
export function TaskDetailModal({
  task,
  onClose,
  onEdit,
}: {
  task: TaskRow
  onClose: () => void
  onEdit: () => void
}) {
  const status = STATUS_LABEL[task.status] ?? STATUS_LABEL.todo

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[90] backdrop-blur-[1px]" onClick={onClose} />
      <div className="fixed inset-0 z-[91] flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md pointer-events-auto overflow-hidden">
          <div className="flex items-start justify-between gap-3 px-6 py-5 border-b border-gray-100">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-gray-900 leading-snug">{task.title}</h2>
              <div className="flex items-center gap-1.5 mt-2">
                <span className={`text-[10px] font-medium px-2 py-1 rounded-md ${status.className}`}>
                  {status.label}
                </span>
                <span className={`text-[10px] font-medium px-2 py-1 rounded-md capitalize ${PRIORITY_LABEL[task.priority]}`}>
                  {task.priority}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 shrink-0"
            >
              <X size={16} />
            </button>
          </div>

          <div className="px-6 py-4">
            {task.description && (
              <p className="text-xs text-gray-500 leading-relaxed mb-4">{task.description}</p>
            )}

            <Row label="Project">{task.project_name ?? '—'}</Row>
            <Row label="Assignee">
              <span className="inline-flex items-center gap-2">
                {task.assignee_avatar && (
                  <span className="w-5 h-5 rounded-full overflow-hidden relative bg-gray-200 inline-block">
                    <Image src={task.assignee_avatar} alt={task.assignee_name ?? ''} fill sizes="20px" className="object-cover" />
                  </span>
                )}
                {task.assignee_name ?? 'Unassigned'}
              </span>
            </Row>
            <Row label="Due Date">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays size={12} className="text-gray-400" /> {formatDate(task.due_date)}
              </span>
            </Row>
            <Row label="Estimated">
              <span className="inline-flex items-center gap-1.5">
                <Clock size={12} className="text-gray-400" />
                {task.estimated_hours !== null ? `${task.estimated_hours}hr` : '—'}
              </span>
            </Row>
          </div>

          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0D1B2A] text-xs font-medium text-white hover:bg-[#162437] transition-colors"
            >
              <Pencil size={12} /> Edit Task
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
