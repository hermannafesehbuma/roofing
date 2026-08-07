'use client'

import { useState, useMemo, useTransition } from 'react'
import { KanbanSquare, List, Calendar, Search, Plus, ListChecks, LoaderCircle, Clock, CheckCircle2 } from 'lucide-react'
import {
  createTask, updateTask, deleteTask,
  type TaskRow, type ProjectOption, type AssigneeOption,
  type DbTaskStatus,
} from './actions'
import { TaskFormPanel, type TaskFormValues } from './TaskFormPanel'
import { TasksKanbanView } from '@/app/components/ui/tasks/TasksKanbanView'
import { TasksListView } from '@/app/components/ui/tasks/TasksListView'
import { TaskFilterPopover, EMPTY_TASK_FILTERS, type TaskFilters } from '@/app/components/ui/tasks/TaskFilterPopover'
import { TaskDetailModal } from '@/app/components/ui/tasks/TaskDetailModal'
import { TasksCalendarView } from '@/app/components/ui/tasks/TasksCalendarView'
import { TaskDeleteModal } from '@/app/components/ui/tasks/TaskDeleteModal'
import { Toast } from '@/app/components/ui/Toast'
import { MobileHeader } from '@/app/components/ui/mobile/MobileHeader'
import { MobileTaskList } from '@/app/components/ui/mobile/MobileTaskList'

/** Buckets used by the Due Date select in the filter panel. */
function matchesDue(due: string | null, filter: TaskFilters['dueDate']): boolean {
  if (!filter) return true
  if (filter === 'no_date') return due === null
  if (!due) return false

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const days = Math.floor((new Date(`${due}T00:00:00`).getTime() - today.getTime()) / 86_400_000)

  if (filter === 'today') return days === 0
  if (filter === 'tomorrow') return days === 1
  if (filter === 'overdue') return days < 0
  return days >= 0 && days <= 7 // this_week
}

export function TasksClient({
  initialTasks,
  projects,
  assignees,
}: {
  initialTasks: TaskRow[]
  projects: ProjectOption[]
  assignees: AssigneeOption[]
}) {
  const [isPending, startTransition] = useTransition()
  const [tasks, setTasks] = useState<TaskRow[]>(initialTasks)
  const [viewMode, setViewMode] = useState<'kanban' | 'list' | 'calendar'>('kanban')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editTask, setEditTask] = useState<TaskRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TaskRow | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [activeFilters, setActiveFilters] = useState<TaskFilters>(EMPTY_TASK_FILTERS)
  const [viewTask, setViewTask] = useState<TaskRow | null>(null)
  /** Due date to prefill when adding from a calendar cell. */
  const [presetDueDate, setPresetDueDate] = useState<string | null>(null)

  // Stats computed from all tasks
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const totalCount = tasks.length
  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length
  const completedCount = tasks.filter(t => t.status === 'completed').length
  const overdueCount = tasks.filter(t =>
    t.due_date &&
    new Date(t.due_date + 'T00:00:00') < today &&
    t.status !== 'completed'
  ).length

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return tasks.filter(t => {
      const matchSearch = !q ||
        t.title.toLowerCase().includes(q) ||
        (t.project_name ?? '').toLowerCase().includes(q)
      const matchStatus = activeFilters.status.length === 0 || activeFilters.status.includes(t.status)
      const matchPriority = activeFilters.priority.length === 0 || activeFilters.priority.includes(t.priority)
      const matchAssignee = activeFilters.assignees.length === 0 ||
        (t.assignee_id !== null && activeFilters.assignees.includes(t.assignee_id))
      return matchSearch && matchStatus && matchPriority && matchAssignee && matchesDue(t.due_date, activeFilters.dueDate)
    })
  }, [tasks, search, activeFilters])

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ message: msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  function openAdd(dueDate?: string) {
    setEditTask(null)
    setPresetDueDate(dueDate ?? null)
    setFormError(null)
    setShowForm(true)
  }

  function openEdit(task: TaskRow) {
    setEditTask(task)
    setPresetDueDate(null)
    setFormError(null)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditTask(null)
    setPresetDueDate(null)
    setFormError(null)
  }

  function handleSave(values: TaskFormValues) {
    setFormError(null)
    const project = projects.find(p => p.id === values.projectId)
    const assignee = assignees.find(a => a.id === values.assigneeId)

    startTransition(async () => {
      if (editTask) {
        const res = await updateTask({
          id: editTask.id,
          projectId: values.projectId,
          title: values.title,
          description: values.description,
          status: values.status,
          priority: values.priority,
          assigneeId: values.assigneeId || null,
          dueDate: values.dueDate || null,
          estimatedHours: values.estimatedHours ? parseFloat(values.estimatedHours) : null,
        })
        if ('error' in res) { setFormError(res.error ?? null); return }
        setTasks(prev => prev.map(t => t.id === editTask.id ? {
          ...t,
          project_id: values.projectId,
          project_name: project?.name ?? null,
          title: values.title,
          description: values.description || null,
          status: values.status,
          priority: values.priority,
          assignee_id: values.assigneeId || null,
          assignee_name: assignee?.name ?? null,
          assignee_avatar: assignee?.avatar_url ?? null,
          due_date: values.dueDate || null,
          estimated_hours: values.estimatedHours ? parseFloat(values.estimatedHours) : null,
        } : t))
        closeForm()
        showToast('Task updated successfully')
      } else {
        const res = await createTask({
          projectId: values.projectId,
          title: values.title,
          description: values.description,
          status: values.status,
          priority: values.priority,
          assigneeId: values.assigneeId || null,
          dueDate: values.dueDate || null,
          estimatedHours: values.estimatedHours ? parseFloat(values.estimatedHours) : null,
        })
        if ('error' in res) { setFormError(res.error ?? null); return }
        setTasks(prev => [{
          id: res.id,
          project_id: values.projectId,
          project_name: project?.name ?? null,
          title: values.title,
          description: values.description || null,
          status: values.status,
          priority: values.priority,
          assignee_id: values.assigneeId || null,
          assignee_name: assignee?.name ?? null,
          assignee_avatar: assignee?.avatar_url ?? null,
          due_date: values.dueDate || null,
          estimated_hours: values.estimatedHours ? parseFloat(values.estimatedHours) : null,
          created_at: new Date().toISOString(),
        }, ...prev])
        closeForm()
        showToast('Task added successfully')
      }
    })
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return
    const title = deleteTarget.title
    startTransition(async () => {
      const res = await deleteTask(deleteTarget.id)
      if ('error' in res) { showToast('Failed to delete task', 'error'); return }
      setTasks(prev => prev.filter(t => t.id !== deleteTarget.id))
      setDeleteTarget(null)
      showToast(`Task(${title}) deleted successfully`)
    })
  }

  function handleStatusChange(taskId: string, newStatus: DbTaskStatus) {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
    startTransition(async () => {
      await updateTask({ id: taskId, status: newStatus })
    })
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#F4F6F9]">
      {/* Phones get the field view: a filtered card list with inline actions. */}
      <div className="md:hidden flex flex-col h-full overflow-hidden">
        <MobileHeader title="Task" />
        <div className="flex-1 overflow-y-auto p-4">
          <MobileTaskList
            tasks={filtered}
            busyId={isPending ? undefined : null}
            onAdvance={(task, next) => handleStatusChange(task.id, next)}
          />
        </div>
      </div>

      {/* Stat cards */}
      <div className="hidden md:block flex-none px-8 py-5 bg-white border-b border-gray-100">
        <div className="grid grid-cols-4 gap-4">
          <StatCard
            label="Total Tasks"
            value={totalCount}
            sub={`${totalCount} total`}
            subColor="text-blue-500"
            iconBg="bg-blue-50"
            icon={<ListChecks size={16} className="text-blue-500" strokeWidth={1.9} />}
          />
          <StatCard
            label="In Progress"
            value={inProgressCount}
            sub="active now"
            subColor="text-amber-500"
            iconBg="bg-orange-50"
            icon={<LoaderCircle size={16} className="text-orange-500" strokeWidth={1.9} />}
          />
          <StatCard
            label="Overdue"
            value={overdueCount}
            sub={overdueCount > 0 ? 'needs attention' : 'all on track'}
            subColor={overdueCount > 0 ? 'text-red-500' : 'text-emerald-500'}
            iconBg="bg-red-50"
            icon={<Clock size={16} className="text-red-500" strokeWidth={1.9} />}
          />
          <StatCard
            label="Completed"
            value={completedCount}
            sub="tasks done"
            subColor="text-emerald-600"
            iconBg="bg-emerald-50"
            icon={<CheckCircle2 size={16} className="text-emerald-500" strokeWidth={1.9} />}
          />
        </div>
      </div>

      {/* Toolbar */}
      <div className="hidden md:flex flex-none px-8 py-4 bg-white border-b border-gray-100 items-center gap-3">
        <div className="flex items-center bg-gray-100 rounded-lg p-0.5 gap-0.5">
          {(['kanban', 'list', 'calendar'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === mode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {mode === 'kanban' && <KanbanSquare size={13} />}
              {mode === 'list' && <List size={13} />}
              {mode === 'calendar' && <Calendar size={13} />}
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tasks or projects"
            className="pl-8 pr-4 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D1B2A]/10 focus:border-[#0D1B2A] w-56"
          />
        </div>

        <div className="flex-1" />

        <TaskFilterPopover
          assignees={assignees}
          filters={activeFilters}
          onFilterChange={setActiveFilters}
        />

        <button
          onClick={() => openAdd()}
          className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium text-white bg-[#0D1B2A] rounded-lg hover:bg-[#162437] transition-colors"
        >
          <Plus size={13} /> Add Task
        </button>
      </div>

      {/* Content */}
      <div className="hidden md:block flex-1 overflow-hidden p-8 relative">
        {toast && <Toast message={toast.message} variant={toast.type} />}

        {viewMode === 'kanban' && (
          <TasksKanbanView
            tasks={filtered}
            onDeleteClick={setDeleteTarget}
            onEditClick={openEdit}
            onViewClick={setViewTask}
            onStatusChange={handleStatusChange}
          />
        )}
        {viewMode === 'list' && (
          <TasksListView
            tasks={filtered}
            onDeleteClick={setDeleteTarget}
            onEditClick={openEdit}
          />
        )}
        {viewMode === 'calendar' && (
          <TasksCalendarView
            tasks={filtered}
            onTaskClick={setViewTask}
            onAddOnDate={(date) => openAdd(date)}
          />
        )}
      </div>

      {/* Form Panel */}
      {showForm && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={closeForm} />
          <TaskFormPanel
            task={editTask}
            defaultDueDate={presetDueDate}
            projects={projects}
            assignees={assignees}
            onSave={handleSave}
            onCancel={closeForm}
            loading={isPending}
            errorMsg={formError}
          />
        </>
      )}

      {viewTask && (
        <TaskDetailModal
          task={viewTask}
          onClose={() => setViewTask(null)}
          onEdit={() => { const t = viewTask; setViewTask(null); openEdit(t) }}
        />
      )}

      {/* Delete Modal */}
      <TaskDeleteModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        taskName={deleteTarget?.title ?? ''}
      />
    </div>
  )
}

function StatCard({ label, value, sub, subColor, icon, iconBg }: {
  label: string; value: number; sub: string; subColor: string
  icon: React.ReactNode
  /** Tinted tile behind the icon — the icon supplies its own colour. */
  iconBg: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 flex flex-col justify-between gap-4 min-h-[112px]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-gray-500">{label}</p>
        <span className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${iconBg}`}>{icon}</span>
      </div>
      <div className="flex items-end justify-between gap-3">
        <p className="text-[30px] font-semibold text-gray-900 leading-none">{value}</p>
        {sub && <p className={`text-xs font-medium leading-none pb-0.5 text-right ${subColor}`}>{sub}</p>}
      </div>
    </div>
  )
}
