'use client'

import Image from 'next/image'
import { ActionsDropdown } from '@/app/components/ui/ActionsDropdown'
import type { TaskRow } from '@/app/admin/(portal)/tasks/actions'

interface TasksListViewProps {
  tasks: TaskRow[]
  onDeleteClick: (task: TaskRow) => void
  onEditClick: (task: TaskRow) => void
}

const STATUS_LABEL: Record<string, string> = {
  todo:        'To Do',
  in_progress: 'In Progress',
  in_review:   'In Review',
  completed:   'Completed',
}

const STATUS_COLOR: Record<string, string> = {
  todo:        'text-gray-700 bg-gray-50 border-gray-200',
  in_progress: 'text-blue-700 bg-blue-50 border-blue-200',
  in_review:   'text-amber-700 bg-amber-50 border-amber-200',
  completed:   'text-emerald-700 bg-emerald-50 border-emerald-200',
}

const PRIORITY_COLOR: Record<string, string> = {
  high:   'text-red-600 bg-red-50 border-red-200',
  medium: 'text-amber-600 bg-amber-50 border-amber-200',
  low:    'text-blue-600 bg-blue-50 border-blue-200',
}

function dueDateLabel(d: string | null): string {
  if (!d) return '—'
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const due = new Date(d + 'T00:00:00')
  const diff = Math.floor((due.getTime() - today.getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  const opts: Intl.DateTimeFormatOptions =
    due.getFullYear() === today.getFullYear()
      ? { month: 'short', day: 'numeric' }
      : { month: 'short', day: 'numeric', year: 'numeric' }
  return due.toLocaleDateString('en-US', opts)
}

function dueColor(d: string | null, status: string): string {
  if (!d || status === 'completed') return 'text-gray-500'
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const diff = Math.floor((new Date(d + 'T00:00:00').getTime() - today.getTime()) / 86400000)
  if (diff < 0) return 'text-red-500 font-semibold'
  if (diff <= 1) return 'text-amber-500'
  return 'text-gray-500'
}

export function TasksListView({ tasks, onDeleteClick, onEditClick }: TasksListViewProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr className="border-b border-gray-100 text-xs font-semibold text-gray-500 bg-gray-50/50">
              <th className="p-4 w-10" />
              <th className="p-4 w-[28%]">Task</th>
              <th className="p-4">Project</th>
              <th className="p-4">Assignee</th>
              <th className="p-4">Priority</th>
              <th className="p-4">Due Date</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-sm text-gray-400">No tasks found.</td>
              </tr>
            ) : (
              tasks.map(t => (
                <tr key={t.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="p-4">
                    <input type="checkbox" readOnly checked={t.status === 'completed'} className="rounded border-gray-300" />
                  </td>
                  <td className="p-4">
                    <div className={`font-medium text-sm text-gray-900 group-hover:text-[#0D1B2A] transition-colors ${t.status === 'completed' ? 'line-through text-gray-400' : ''}`}>
                      {t.title}
                    </div>
                    {t.description && (
                      <div className="text-xs text-gray-400 truncate max-w-[260px] mt-0.5">{t.description}</div>
                    )}
                  </td>
                  <td className="p-4 text-sm text-gray-500">{t.project_name ?? '—'}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full overflow-hidden relative bg-gray-200 shrink-0">
                        {t.assignee_avatar ? (
                          <Image src={t.assignee_avatar} alt={t.assignee_name ?? ''} fill sizes="24px" className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-indigo-200 text-indigo-700 text-[9px] font-bold">
                            {t.assignee_name ? t.assignee_name.charAt(0).toUpperCase() : '?'}
                          </div>
                        )}
                      </div>
                      <span className="text-sm text-gray-700">{t.assignee_name ?? 'Unassigned'}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${PRIORITY_COLOR[t.priority]}`}>
                      {t.priority.charAt(0).toUpperCase() + t.priority.slice(1)}
                    </span>
                  </td>
                  <td className={`p-4 text-sm ${dueColor(t.due_date, t.status)}`}>
                    {dueDateLabel(t.due_date)}
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold border ${STATUS_COLOR[t.status]}`}>
                      {STATUS_LABEL[t.status]}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <ActionsDropdown onEdit={() => onEditClick(t)} onDelete={() => onDeleteClick(t)} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
