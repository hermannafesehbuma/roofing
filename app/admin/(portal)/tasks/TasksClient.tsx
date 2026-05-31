'use client'

import { useState, useMemo, useTransition } from 'react'
import { KanbanSquare, List, Calendar, Search, Plus, Check } from 'lucide-react'
import UserHeaderBadge from '@/app/components/ui/UserHeaderBadge'
import {
  createTask, updateTask, deleteTask,
  type TaskRow, type ProjectOption, type AssigneeOption,
  type DbTaskStatus, type DbTaskPriority,
} from './actions'
import { TaskFormPanel, type TaskFormValues } from './TaskFormPanel'
import { TasksKanbanView } from '@/app/components/ui/tasks/TasksKanbanView'
import { TasksListView } from '@/app/components/ui/tasks/TasksListView'
import { TaskFilterPopover } from '@/app/components/ui/tasks/TaskFilterPopover'
import { TaskDeleteModal } from '@/app/components/ui/tasks/TaskDeleteModal'

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
  const [toast, setToast] = useState<string | null>(null)
  const [activeFilters, setActiveFilters] = useState<{
    status: DbTaskStatus[]
    priority: DbTaskPriority[]
    assignee: string
  }>({ status: [], priority: [], assignee: '' })

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
      const matchAssignee = !activeFilters.assignee ||
        (t.assignee_name ?? '').toLowerCase().includes(activeFilters.assignee.toLowerCase())
      return matchSearch && matchStatus && matchPriority && matchAssignee
    })
  }, [tasks, search, activeFilters])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  function openAdd() {
    setEditTask(null)
    setFormError(null)
    setShowForm(true)
  }

  function openEdit(task: TaskRow) {
    setEditTask(task)
    setFormError(null)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditTask(null)
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
      if ('error' in res) { showToast('Failed to delete task'); return }
      setTasks(prev => prev.filter(t => t.id !== deleteTarget.id))
      setDeleteTarget(null)
      showToast(`"${title}" deleted`)
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
      {/* Page Header */}
      <div className="flex-none px-8 pt-6 pb-5 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Tasks</h1>
            <p className="text-gray-500 text-xs mt-0.5">Track, assign, and manage all project tasks across your team.</p>
          </div>
          <div className="flex items-center gap-3">
            <UserHeaderBadge />
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard
            label="Total Tasks"
            value={totalCount}
            sub={`${totalCount} total`}
            subColor="text-blue-500"
            bg="bg-blue-50"
            dot="bg-blue-500"
          />
          <StatCard
            label="In Progress"
            value={inProgressCount}
            sub="active now"
            subColor="text-amber-500"
            bg="bg-amber-50"
            dot="bg-amber-400"
          />
          <StatCard
            label="Overdue"
            value={overdueCount}
            sub={overdueCount > 0 ? 'needs attention' : 'all on track'}
            subColor={overdueCount > 0 ? 'text-red-500' : 'text-emerald-500'}
            bg="bg-red-50"
            dot="bg-red-400"
          />
          <StatCard
            label="Completed"
            value={completedCount}
            sub="tasks done"
            subColor="text-emerald-600"
            bg="bg-emerald-50"
            dot="bg-emerald-500"
          />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex-none px-8 py-4 bg-white border-b border-gray-100 flex items-center gap-3">
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
          onFilterChange={f => setActiveFilters(f)}
        />

        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#0D1B2A] rounded-lg hover:bg-[#162437] transition-colors"
        >
          <Plus size={13} /> Add Task
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden p-8 relative">
        {toast && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 mt-0 flex items-center gap-2 bg-emerald-500 text-white text-xs font-medium px-4 py-2.5 rounded-xl shadow-lg z-30">
            <Check size={13} strokeWidth={2.5} /> {toast}
          </div>
        )}

        {viewMode === 'kanban' && (
          <TasksKanbanView
            tasks={filtered}
            onDeleteClick={setDeleteTarget}
            onEditClick={openEdit}
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
          <div className="flex items-center justify-center h-full text-gray-500 bg-white rounded-2xl border border-dashed border-gray-200 shadow-sm">
            <div className="text-center">
              <Calendar size={40} className="text-gray-300 mx-auto mb-4" />
              <h3 className="text-base font-bold text-gray-900 mb-1">Calendar View</h3>
              <p className="text-sm text-gray-400">Coming soon.</p>
            </div>
          </div>
        )}
      </div>

      {/* Form Panel */}
      {showForm && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={closeForm} />
          <TaskFormPanel
            task={editTask}
            projects={projects}
            assignees={assignees}
            onSave={handleSave}
            onCancel={closeForm}
            loading={isPending}
            errorMsg={formError}
          />
        </>
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

function StatCard({ label, value, sub, subColor, bg, dot }: {
  label: string; value: number; sub: string; subColor: string; bg: string; dot: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
        <span className={`w-3 h-3 rounded-full ${dot}`} />
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
        <p className={`text-[11px] font-medium ${subColor}`}>{sub}</p>
      </div>
    </div>
  )
}
