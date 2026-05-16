'use client'

import Image from 'next/image'
import { ActionsDropdown } from '@/app/components/ui/ActionsDropdown'
import type { TaskRow, DbTaskStatus } from '@/app/admin/(portal)/tasks/actions'

interface TasksKanbanViewProps {
  tasks: TaskRow[]
  onDeleteClick: (task: TaskRow) => void
  onEditClick: (task: TaskRow) => void
  onStatusChange: (taskId: string, status: DbTaskStatus) => void
}

const COLUMNS: { key: DbTaskStatus; label: string; dot: string }[] = [
  { key: 'todo',        label: 'To Do',       dot: 'bg-gray-400'    },
  { key: 'in_progress', label: 'In Progress',  dot: 'bg-blue-500'    },
  { key: 'in_review',   label: 'In Review',    dot: 'bg-amber-500'   },
  { key: 'completed',   label: 'Completed',    dot: 'bg-emerald-500' },
]

function dueDateLabel(d: string | null): string {
  if (!d) return ''
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

function dueColor(d: string | null, status: DbTaskStatus): string {
  if (!d || status === 'completed') return 'text-gray-400'
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const diff = Math.floor((new Date(d + 'T00:00:00').getTime() - today.getTime()) / 86400000)
  if (diff < 0) return 'text-red-500'
  if (diff <= 1) return 'text-amber-500'
  return 'text-gray-400'
}

export function TasksKanbanView({ tasks, onDeleteClick, onEditClick, onStatusChange }: TasksKanbanViewProps) {
  return (
    <div className="flex gap-6 overflow-x-auto pb-4 h-full">
      {COLUMNS.map(col => {
        const colTasks = tasks.filter(t => t.status === col.key)
        return (
          <div key={col.key} className="min-w-[280px] w-full flex flex-col flex-1">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-dashed border-gray-200">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${col.dot}`} />
                <h3 className="font-semibold text-sm text-gray-900">{col.label}</h3>
              </div>
              <span className="text-[10px] font-bold w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 text-gray-500">
                {colTasks.length}
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {colTasks.length === 0 ? (
                <div className="text-center py-8 text-xs text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  No tasks
                </div>
              ) : (
                colTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onDelete={() => onDeleteClick(task)}
                    onEdit={() => onEditClick(task)}
                    onStatusChange={onStatusChange}
                  />
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function TaskCard({ task, onDelete, onEdit, onStatusChange }: {
  task: TaskRow
  onDelete: () => void
  onEdit: () => void
  onStatusChange: (taskId: string, status: DbTaskStatus) => void
}) {
  const done = task.status === 'completed'
  const label = dueDateLabel(task.due_date)

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-2">
        <label className="flex items-start gap-2.5 cursor-pointer group flex-1 min-w-0">
          <input
            type="checkbox"
            checked={done}
            onChange={e => onStatusChange(task.id, e.target.checked ? 'completed' : 'in_progress')}
            className="mt-0.5 shrink-0 rounded border-gray-300 text-[#0D1B2A] focus:ring-[#0D1B2A]"
          />
          <span className={`text-xs font-semibold text-gray-900 group-hover:text-blue-600 transition-colors leading-snug ${done ? 'line-through text-gray-400' : ''}`}>
            {task.title}
          </span>
        </label>
        <ActionsDropdown onEdit={onEdit} onDelete={onDelete} />
      </div>

      {task.description && (
        <p className="text-[11px] text-gray-400 mb-3 ml-7 line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center justify-between ml-7 mt-2">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
            task.priority === 'high'   ? 'text-red-600 bg-red-50 border-red-200' :
            task.priority === 'medium' ? 'text-amber-600 bg-amber-50 border-amber-200' :
                                         'text-blue-600 bg-blue-50 border-blue-200'
          }`}>
            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
          </span>
          {label && (
            <span className={`text-[10px] font-medium ${dueColor(task.due_date, task.status)}`}>
              📅 {label}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {task.project_name && (
            <span className="text-[10px] text-gray-400 truncate max-w-[80px]">{task.project_name}</span>
          )}
          <div className="w-6 h-6 rounded-full overflow-hidden relative bg-gray-200 border border-white shrink-0">
            {task.assignee_avatar ? (
              <Image src={task.assignee_avatar} alt={task.assignee_name ?? ''} fill sizes="24px" className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-indigo-200 text-indigo-700 text-[9px] font-bold">
                {task.assignee_name ? task.assignee_name.charAt(0).toUpperCase() : '?'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
