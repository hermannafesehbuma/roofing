'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, Briefcase, ClipboardList, Calendar, Clock } from 'lucide-react'
import type { Project } from '@/app/admin/(portal)/projects/data'
import type { TaskRow } from '@/app/admin/(portal)/tasks/actions'
import {
  getAssignedProjects,
  getOpenEntry,
  type TimeEntryRow,
} from '@/app/admin/(portal)/time-tracking/actions'
import { useCurrentUser } from '@/app/components/ui/useCurrentUser'
import { ProfileMenu } from '@/app/components/ui/ProfileMenu'
import { MobileClockCard } from './MobileClockCard'

function greeting(hour: number) {
  if (hour < 12) return 'Good morning,'
  if (hour < 18) return 'Good afternoon,'
  return 'Good evening,'
}

/** "Marcus D." — first name plus last initial, as in the design. */
function shortName(name: string) {
  const [first, ...rest] = name.split(' ').filter(Boolean)
  if (!first) return 'there'
  const last = rest[rest.length - 1]
  return last ? `${first} ${last[0].toUpperCase()}.` : first
}

const PRIORITY_TEXT: Record<string, string> = {
  high: 'text-red-500',
  medium: 'text-amber-500',
  low: 'text-blue-500',
}

export function MobileHome({
  projects,
  tasks,
  timeEntries,
  greetingHour,
  todayKey,
}: {
  projects: Project[]
  tasks: TaskRow[]
  timeEntries: TimeEntryRow[]
  /** Resolved on the server so the greeting and "today" agree across render. */
  greetingHour: number
  todayKey: string
}) {
  const router = useRouter()
  const profile = useCurrentUser()
  const userId = profile?.id ?? ''

  const isCrew = profile?.role === 'staff' || profile?.role === 'technician'
  const myTasks = userId ? tasks.filter((t) => t.assignee_id === userId) : []
  // Admins and managers have no personal queue, so they see the whole board.
  const visibleTasks = isCrew || myTasks.length > 0 ? myTasks : tasks

  const todaysTasks = visibleTasks.filter(
    (t) => t.status !== 'completed' && (!t.due_date || t.due_date <= todayKey)
  )
  const activeProjects = projects.filter((p) => p.status === 'in_progress').length

  // The server render has no session, so the punch state and the technician's
  // assignments are pulled once the profile resolves.
  const [openEntry, setOpenEntry] = useState<TimeEntryRow | null>(
    timeEntries.find((e) => e.user_id === userId && !e.clock_out) ?? null
  )
  const [myProjects, setMyProjects] = useState<{ id: string; name: string }[] | null>(null)

  const [reloads, setReloads] = useState(0)

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    void (async () => {
      const [entry, assigned] = await Promise.all([getOpenEntry(userId), getAssignedProjects(userId)])
      if (cancelled) return
      setOpenEntry(entry)
      setMyProjects(assigned)
    })()
    return () => { cancelled = true }
  }, [userId, reloads])

  const allProjects = projects.map((p) => ({ id: p.id, name: p.name }))
  const clockProjects = isCrew ? myProjects ?? [] : myProjects?.length ? myProjects : allProjects

  return (
    <div className="md:hidden flex flex-col h-full overflow-hidden bg-[#F4F6F9]">
      {/* Same rhythm as `MobileHeader`: the greeting block stands in for the
          page title, so it carries the same padding and control sizes. */}
      <header className="bg-white px-4 pt-[calc(env(safe-area-inset-top)+32px)] pb-5 flex items-center justify-between gap-3 border-b border-gray-100">
        <div className="min-w-0">
          <p className="text-xs text-gray-400">{greeting(greetingHour)}</p>
          <p className="text-2xl font-semibold text-gray-900 leading-tight truncate">
            {shortName(profile?.name ?? '')}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 text-gray-600">
            <Bell size={18} />
            <span className="absolute top-2 right-2.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
          </button>
          <ProfileMenu size={44} />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <MobileClockCard
          compact
          userId={userId}
          projects={clockProjects}
          openEntry={openEntry}
          onChanged={() => { setReloads((n) => n + 1); router.refresh() }}
        />

        <div className="grid grid-cols-2 gap-3">
          <Link href="/admin/projects" className="bg-white rounded-xl border border-gray-100 shadow-sm p-3.5">
            <p className="text-[11px] text-gray-500">Active Projects</p>
            <div className="flex items-end justify-between mt-2">
              <p className="text-2xl font-semibold text-gray-900 leading-none">{activeProjects}</p>
              <span className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center">
                <Briefcase size={14} className="text-white" />
              </span>
            </div>
          </Link>
          <Link href="/admin/tasks" className="bg-white rounded-xl border border-gray-100 shadow-sm p-3.5">
            <p className="text-[11px] text-gray-500">Tasks Today</p>
            <div className="flex items-end justify-between mt-2">
              <p className="text-2xl font-semibold text-gray-900 leading-none">{todaysTasks.length}</p>
              <span className="w-7 h-7 rounded-lg bg-amber-400 flex items-center justify-center">
                <ClipboardList size={14} className="text-white" />
              </span>
            </div>
          </Link>
        </div>

        <div>
          <h2 className="text-[11px] font-semibold text-gray-500 tracking-wide mb-2">TODAY&apos;S TASKS</h2>
          {todaysTasks.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-center text-sm text-gray-400">
              Nothing due today.
            </div>
          ) : (
            <div className="space-y-3">
              {todaysTasks.slice(0, 6).map((task) => (
                <Link
                  key={task.id}
                  href="/admin/tasks"
                  className="block bg-white rounded-xl border border-gray-100 shadow-sm p-3.5"
                >
                  <h3 className="text-sm font-medium text-gray-900">{task.title}</h3>
                  {task.project_name && (
                    <p className="text-xs text-gray-500 mt-1">{task.project_name}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-400">
                    <span className={`font-medium capitalize ${PRIORITY_TEXT[task.priority] ?? 'text-gray-400'}`}>
                      {task.priority === 'medium' ? 'Medium' : task.priority}
                    </span>
                    {task.due_date && (
                      <span className="inline-flex items-center gap-1 text-amber-500">
                        <Calendar size={11} />
                        {new Date(`${task.due_date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                    {task.estimated_hours !== null && (
                      <span className="inline-flex items-center gap-1">
                        <Clock size={11} /> {task.estimated_hours}hr
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
