'use client'

import { useState } from 'react'
import { X, CalendarDays } from 'lucide-react'
import type { TaskRow, ProjectOption, AssigneeOption, DbTaskStatus, DbTaskPriority } from './actions'

export interface TaskFormValues {
  projectId: string
  title: string
  description: string
  status: DbTaskStatus
  priority: DbTaskPriority
  assigneeId: string
  dueDate: string
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

const inputCls = (hasErr?: boolean) =>
  `w-full border rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0D1B2A]/10 focus:border-[#0D1B2A] transition-colors ${hasErr ? 'border-red-400 bg-red-50/30 focus:ring-red-200' : 'border-gray-200'}`

const selectCls = (hasErr?: boolean) =>
  `w-full border rounded-lg px-3 py-2.5 text-sm text-gray-800 bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-[#0D1B2A]/10 focus:border-[#0D1B2A] transition-colors ${hasErr ? 'border-red-400' : 'border-gray-200'}`

function ChevronDownIcon() {
  return (
    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

export function TaskFormPanel({
  task,
  projects,
  assignees,
  onSave,
  onCancel,
  loading,
  errorMsg,
}: {
  task: TaskRow | null
  projects: ProjectOption[]
  assignees: AssigneeOption[]
  onSave: (values: TaskFormValues) => void
  onCancel: () => void
  loading: boolean
  errorMsg: string | null
}) {
  const [values, setValues] = useState<TaskFormValues>({
    projectId:   task?.project_id ?? (projects[0]?.id ?? ''),
    title:       task?.title ?? '',
    description: task?.description ?? '',
    status:      task?.status ?? 'todo',
    priority:    task?.priority ?? 'medium',
    assigneeId:  task?.assignee_id ?? '',
    dueDate:     task?.due_date ?? '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof TaskFormValues, string>>>({})

  function set(field: keyof TaskFormValues) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setValues(v => ({ ...v, [field]: e.target.value }))
      if (errors[field]) setErrors(er => { const n = { ...er }; delete n[field]; return n })
    }
  }

  function handleSubmit() {
    const errs: typeof errors = {}
    if (!values.title.trim()) errs.title = 'Title is required'
    if (!values.projectId) errs.projectId = 'Project is required'
    if (Object.keys(errs).length) { setErrors(errs); return }
    onSave(values)
  }

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex">
      <div className="bg-white w-[480px] max-w-full h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-bold text-gray-900">
            {task ? 'Edit Task' : 'Add New Task'}
          </h2>
          <button onClick={onCancel} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-7 py-6 space-y-4">
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {errorMsg}
            </div>
          )}

          <Field label="Task Title">
            <input
              placeholder="e.g. Inspect roof deck framing"
              value={values.title}
              onChange={set('title')}
              className={inputCls(!!errors.title)}
            />
            {errors.title && <p className="text-red-500 text-[11px] mt-1">{errors.title}</p>}
          </Field>

          <Field label="Description">
            <textarea
              placeholder="Task details and notes..."
              value={values.description}
              onChange={set('description')}
              rows={3}
              className={`${inputCls()} resize-none`}
            />
          </Field>

          <Field label="Project">
            <div className="relative">
              <select value={values.projectId} onChange={set('projectId')} className={selectCls(!!errors.projectId)}>
                <option value="">Select Project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <ChevronDownIcon />
            </div>
            {errors.projectId && <p className="text-red-500 text-[11px] mt-1">{errors.projectId}</p>}
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Status">
              <div className="relative">
                <select value={values.status} onChange={set('status')} className={selectCls()}>
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="in_review">In Review</option>
                  <option value="completed">Completed</option>
                </select>
                <ChevronDownIcon />
              </div>
            </Field>
            <Field label="Priority">
              <div className="relative">
                <select value={values.priority} onChange={set('priority')} className={selectCls()}>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <ChevronDownIcon />
              </div>
            </Field>
          </div>

          <Field label="Assignee">
            <div className="relative">
              <select value={values.assigneeId} onChange={set('assigneeId')} className={selectCls()}>
                <option value="">Unassigned</option>
                {assignees.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <ChevronDownIcon />
            </div>
          </Field>

          <Field label="Due Date">
            <div className="relative">
              <input
                type="date"
                value={values.dueDate}
                onChange={set('dueDate')}
                className={`${inputCls()} pr-9`}
              />
              <CalendarDays size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
          </Field>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-7 py-5 border-t border-gray-100 shrink-0">
          <button
            onClick={onCancel}
            className="px-6 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2.5 rounded-lg bg-[#0D1B2A] text-sm font-medium text-white hover:bg-[#162437] transition-colors disabled:opacity-60"
          >
            {loading ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
