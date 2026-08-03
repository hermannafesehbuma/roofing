'use client'

import { useState, useRef, useEffect, useMemo, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ChevronRight, Pencil, Mail, Search, Filter,
  MoreHorizontal, Eye, MessageSquare, X, FileText,
  ChevronDown, ChevronUp, Send, Smile, ChevronLeft,
  Calendar, CalendarRange, CalendarDays, CircleDot, Paperclip, Trash2, Check,
} from 'lucide-react'
import { updateEmployee, uploadAvatar, type EmployeeRow, type UpdateEmployeeInput } from '../actions'
import { EmployeeFormPanel, type FormValues } from '../EmployeeFormPanel'
import {
  buildWindow, placeBar, alignAnchor, shiftAnchor, windowMonthLabel, type TimelineView,
} from '@/lib/timeline'
import { readSession } from '@/lib/session'
import {
  assignRfi, closeRfi, addRfiComment, uploadRfiAttachment, deleteRfiAttachment, updateDocumentStatus,
  type EmployeeProject, type EmployeeTimeline, type EmployeeRfi, type EmployeeDocument,
  type EmployeeInspection, type RfiComment, type RfiAttachment,
} from './actions'

// ─── Shared ───────────────────────────────────────────────────────────────────
function Overlay({ onClick }: { onClick?: () => void }) {
  return <div className="fixed inset-0 bg-black/30 z-40 backdrop-blur-[1px] overlay-fade-in" onClick={onClick} />
}

function useOutsideClick(ref: React.RefObject<HTMLElement | null>, cb: () => void) {
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) cb() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [ref, cb])
}

const avatarColors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#6366F1', '#EC4899']

/** Quick-pick set for the RFI comment box — enough for acknowledgements without a picker dependency. */
const COMMENT_EMOJI = [
  '👍', '👌', '🙌', '✅', '❌', '⚠️',
  '🔧', '🔨', '🏠', '📋', '📸', '📅',
  '🙂', '🎉', '🔥', '⏰', '❓', '❗',
]

function avatarColor(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash)
  return avatarColors[Math.abs(hash) % avatarColors.length]
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "Jul 25, 2026" — reads the ISO string directly so SSR and the browser agree. */
function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—'
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return `${MONTHS[m - 1]} ${String(d).padStart(2, '0')}, ${y}`
}

// UTC-pinned so the server and the browser render the same string.
const DATE_TIME_FMT = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
})
function fmtDateTime(iso: string) { return DATE_TIME_FMT.format(new Date(iso)) }

const statusLabels: Record<string, string> = { active: 'Active', on_leave: 'On Leave', inactive: 'Inactive' }
const typeLabels: Record<string, string> = {
  full_time: 'Full-Time', part_time: 'Part-Time',
  contractor: 'Contractor', subcontractor: 'Subcontractor',
}

const rfiStatusCfg: Record<string, { text: string; dot: string; bg: string }> = {
  'In Review': { text: 'text-blue-600',  dot: 'bg-blue-500', bg: 'bg-blue-50'  },
  'Closed':    { text: 'text-gray-500',  dot: 'bg-gray-400', bg: 'bg-gray-100' },
}
const submStatusCfg: Record<string, { text: string; bg: string }> = {
  'Approved':  { text: 'text-emerald-600', bg: 'bg-emerald-50' },
  'In Review': { text: 'text-orange-600',  bg: 'bg-orange-50'  },
}

// ─── Basic Info Tab ───────────────────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-6 px-4 py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-500 shrink-0">{label}:</span>
      <span className="text-xs text-gray-900 text-right break-words">{value || '—'}</span>
    </div>
  )
}

/** Section label in its own left column, values in a bordered card beside it. */
function InfoSection({ title, rows }: { title: string; rows: { label: string; value: string }[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[190px_minmax(0,1fr)] gap-2 md:gap-4 mb-7">
      <p className="text-[10px] font-medium text-gray-400 tracking-wider uppercase md:pt-3">{title}</p>
      <div className="border border-gray-200 rounded-lg max-w-[620px]">
        {rows.map((r) => <InfoRow key={r.label} {...r} />)}
      </div>
    </div>
  )
}

function BasicInfoTab({ emp }: { emp: EmployeeRow }) {
  return (
    <>
      <InfoSection
        title="Contact Information"
        rows={[
          { label: 'Phone Number', value: emp.phone ?? '' },
          { label: 'Email', value: emp.email },
        ]}
      />
      <InfoSection
        title="Work Information"
        rows={[
          { label: 'Employee ID', value: emp.employee_id ?? '' },
          { label: 'Role', value: emp.role.charAt(0).toUpperCase() + emp.role.slice(1) },
          { label: 'Employee Type', value: typeLabels[emp.employee_type ?? ''] ?? '' },
          { label: 'Department', value: emp.department ?? '' },
          { label: 'Rate of Pay', value: emp.rate_of_pay ? `$${emp.rate_of_pay}/hr` : '' },
          { label: 'Start Date', value: emp.start_date ?? '' },
        ]}
      />
      <InfoSection
        title="Personal Information"
        rows={[
          { label: 'First Name', value: emp.first_name },
          { label: 'Last Name', value: emp.last_name },
          { label: 'Gender', value: emp.gender ?? '' },
          { label: 'Status', value: statusLabels[emp.status] ?? emp.status },
        ]}
      />
    </>
  )
}

// ─── Tab: Assigned Projects ───────────────────────────────────────────────────
const projectStatusLabels: Record<EmployeeProject['status'], string> = {
  in_progress: 'In Progress', completed: 'Completed', on_hold: 'On Hold',
}

const projectStatusText: Record<EmployeeProject['status'], string> = {
  in_progress: 'text-orange-500', completed: 'text-emerald-600', on_hold: 'text-gray-500',
}

// Cover art when a project has no image — picked from the id so it stays put.
const projectGradients = [
  'from-blue-400 to-blue-600',
  'from-amber-400 to-orange-500',
  'from-emerald-400 to-teal-500',
  'from-violet-400 to-purple-600',
  'from-rose-400 to-pink-600',
]

function ProjectCard({ p }: { p: EmployeeProject }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useOutsideClick(ref, () => setOpen(false))

  const progressColor = p.progress === 100 ? '#10B981' : '#0D1B2A'
  const gradient = projectGradients[Math.abs(p.id.charCodeAt(0) + p.id.charCodeAt(p.id.length - 1)) % projectGradients.length]
  const subtitle = [p.type === 'residential' ? 'Residential' : 'Commercial', p.location].filter(Boolean).join(' · ')

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-visible hover:shadow-md transition-shadow">
      <div className={`h-40 rounded-t-xl relative overflow-hidden ${p.imageUrl ? 'bg-gray-100' : `bg-gradient-to-br ${gradient}`}`}>
        {p.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
        )}
        <div ref={ref} className="absolute top-3 right-3">
          <button onClick={() => setOpen(!open)} className="w-7 h-7 flex items-center justify-center rounded-full bg-white/80 hover:bg-white text-gray-600 shadow-sm">
            <MoreHorizontal size={15} />
          </button>
          {open && (
            <div className="absolute right-0 top-9 z-20 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 w-36">
              <Link href={`/admin/projects/${p.id}`} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50">
                <Eye size={13} /> View Project
              </Link>
            </div>
          )}
        </div>
      </div>
      <div className="px-4 py-3.5">
        <h3 className="text-sm font-semibold text-gray-900 leading-tight mb-1">{p.name}</h3>
        <p className="text-[11px] text-gray-400 mb-3">{subtitle}</p>
        <div className="space-y-1.5 text-xs mb-3">
          <div className="flex justify-between">
            <span className="text-gray-400">Status</span>
            <span className={`font-medium ${projectStatusText[p.status]}`}>{projectStatusLabels[p.status]}</span>
          </div>
          <div className="flex justify-between"><span className="text-gray-400">Manager</span><span className="font-medium text-gray-700">{p.manager ?? '—'}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">Client</span><span className="font-medium text-gray-700">{p.client ?? '—'}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">Due Date</span><span className="font-medium text-gray-700">{fmtDate(p.dueDate)}</span></div>
        </div>
        <div>
          <div className="flex justify-between text-[11px] mb-1"><span className="text-gray-400">Progress</span><span className="font-medium text-gray-700">{p.progress}%</span></div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${p.progress}%`, backgroundColor: progressColor }} /></div>
        </div>
      </div>
    </div>
  )
}

function AssignedProjectsTab({ projects }: { projects: EmployeeProject[] }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<EmployeeProject['status'][]>([])
  const [filterOpen, setFilterOpen] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)
  useOutsideClick(filterRef, () => setFilterOpen(false))

  const q = search.toLowerCase()
  const visible = projects.filter((p) => (
    (p.name.toLowerCase().includes(q) || (p.client ?? '').toLowerCase().includes(q) || (p.location ?? '').toLowerCase().includes(q)) &&
    (statusFilter.length === 0 || statusFilter.includes(p.status))
  ))

  function toggleStatus(s: EmployeeProject['status']) {
    setStatusFilter((prev) => (prev.includes(s) ? prev.filter((v) => v !== s) : [...prev, s]))
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="w-full pl-8 pr-4 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D1B2A]/10 focus:border-[#0D1B2A]"
          />
        </div>
        <div className="flex-1" />
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs border rounded-lg transition-colors ${
              filterOpen || statusFilter.length > 0
                ? 'border-gray-300 bg-gray-50 text-gray-800'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Filter size={13} /> Filter
            {statusFilter.length > 0 && (
              <span className="ml-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#0D1B2A] text-white text-[10px] font-semibold flex items-center justify-center">
                {statusFilter.length}
              </span>
            )}
          </button>
          {filterOpen && (
            <div className="absolute right-0 top-10 z-30 w-52 bg-white rounded-xl shadow-xl border border-gray-100 p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Status</p>
                <button
                  onClick={() => setStatusFilter([])}
                  disabled={statusFilter.length === 0}
                  className="text-[11px] text-gray-500 hover:text-gray-800 disabled:opacity-40"
                >
                  Clear
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(['in_progress', 'completed', 'on_hold'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => toggleStatus(s)}
                    className={`px-2.5 py-1 text-[11px] rounded-full border transition-colors ${
                      statusFilter.includes(s)
                        ? 'bg-[#0D1B2A]/5 border-[#0D1B2A]/25 text-[#0D1B2A] font-medium'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {projectStatusLabels[s]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400">
          {projects.length === 0 ? 'This employee is not on any projects yet.' : 'No projects match your search.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visible.map((p) => <ProjectCard key={p.id} p={p} />)}
        </div>
      )}
    </div>
  )
}

// ─── Tab: Project Timeline ────────────────────────────────────────────────────

const asDate = (iso: string) => new Date(`${iso}T00:00:00`)

type GanttTask = { label: string; sub: string; from: Date; to: Date; color: string; avatars: string[] }
type GanttBand = { project: string; color: string; tint: string; from: Date; to: Date }
type GanttRow = { band?: GanttBand; tasks: GanttTask[] }

// One colour per project, cycled in the order the projects come back.
const TASK_PALETTE = [
  { bar: '#F4762B', tint: '#FDEFE5' },
  { bar: '#8B2FE0', tint: '#F3EBFE' },
  { bar: '#A21CF0', tint: '#F6EBFE' },
  { bar: '#2FBF9B', tint: '#E6F7F3' },
  { bar: '#4BA3F0', tint: '#E9F3FD' },
  { bar: '#F5B440', tint: '#FEF5E4' },
]

const taskStatusLabels: Record<string, string> = {
  todo: 'To do', in_progress: 'In progress', in_review: 'In review', completed: 'Completed',
}

/**
 * Lays the employee's tasks out as gantt rows: a tinted band per project
 * followed by one row per task so overlapping bars never collide.
 */
function buildGanttRows(timeline: EmployeeTimeline): GanttRow[] {
  const rows: GanttRow[] = []

  timeline.projects.forEach((project, i) => {
    const colour = TASK_PALETTE[i % TASK_PALETTE.length]
    rows.push({
      band: { project: project.name, color: colour.bar, tint: colour.tint, from: asDate(project.from), to: asDate(project.to) },
      tasks: [],
    })
    for (const task of timeline.tasks.filter((t) => t.projectId === project.id)) {
      rows.push({
        tasks: [{
          label: task.title,
          sub: taskStatusLabels[task.status] ?? task.status,
          from: asDate(task.from),
          to: asDate(task.to),
          color: colour.bar,
          avatars: [],
        }],
      })
    }
  })

  return rows
}

/** Opens on the earliest task so the employee's work is on screen. */
function timelineAnchor(timeline: EmployeeTimeline): Date {
  const earliest = timeline.tasks.reduce<string | null>(
    (min, t) => (min === null || t.from < min ? t.from : min),
    null,
  )
  return earliest ? asDate(earliest) : new Date()
}

function GanttTaskCard({ label, sub, color, avatars, place }: GanttTask & { place: { leftPct: number; widthPct: number } }) {
  return (
    <div
      className="absolute top-2 bottom-2 z-20 rounded-lg px-2.5 py-2 flex flex-col justify-center gap-1.5 overflow-hidden"
      style={{ left: `${place.leftPct}%`, width: `${place.widthPct}%`, backgroundColor: color }}
    >
      <p className="text-[11px] font-semibold text-white leading-none truncate">{label}</p>
      <p className="text-[10px] text-white/85 leading-none truncate border-l-2 border-white/70 pl-1.5">{sub}</p>
      {avatars.length > 0 && (
        <div className="flex -space-x-1.5">
          {avatars.map((a, i) => (
            <span key={i} className="w-4 h-4 rounded-full bg-white/25 ring-1 ring-white/70 flex items-center justify-center shrink-0">
              <span className="text-[7px] font-semibold text-white leading-none">{a[0]}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function ProjectTimelineTab({ timeline }: { timeline: EmployeeTimeline }) {
  const ganttRows = useMemo(() => buildGanttRows(timeline), [timeline])
  const [view, setView] = useState<TimelineView>('Day')
  const [anchor, setAnchor] = useState<Date>(() => timelineAnchor(timeline))

  const win = buildWindow(view, anchor)
  const today = placeBar(win, new Date(), new Date())

  function pickView(next: TimelineView) {
    setView(next)
    // Re-align to the same instant so switching granularity keeps the projects in frame.
    setAnchor(alignAnchor(next, anchor))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-800">Projects Timeline</h3>
        <div className="flex items-center gap-1 text-[11px]">
          {([{ label: 'Day', icon: Calendar }, { label: 'Week', icon: CalendarRange }, { label: 'Month', icon: CalendarDays }] as const).map(({ label, icon: Icon }) => (
            <button
              key={label}
              onClick={() => pickView(label)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border transition-colors ${
                view === label
                  ? 'border-gray-200 bg-white text-gray-900 font-medium shadow-sm'
                  : 'border-transparent text-gray-500 hover:bg-gray-50'
              }`}
            >
              <Icon size={12} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="border border-gray-100 rounded-xl overflow-hidden">
        <div className="px-3 py-2.5 border-b border-gray-100 flex items-center gap-2">
          <button
            onClick={() => setAnchor(shiftAnchor(view, anchor, -1))}
            aria-label="Previous range"
            className="w-6 h-6 flex items-center justify-center border border-gray-200 rounded-md text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft size={12} />
          </button>
          <button
            onClick={() => setAnchor(shiftAnchor(view, anchor, 1))}
            aria-label="Next range"
            className="w-6 h-6 flex items-center justify-center border border-gray-200 rounded-md text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <ChevronRight size={12} />
          </button>
          <span className="px-3 py-1.5 border border-gray-200 rounded-lg text-[11px] text-gray-700">
            {view === 'Day' ? windowMonthLabel(win) : win.rangeLabel}
          </span>
          <button
            onClick={() => setAnchor(alignAnchor(view, new Date()))}
            className="ml-auto px-2.5 py-1.5 text-[11px] text-gray-500 hover:text-gray-800 transition-colors"
          >
            Today
          </button>
        </div>

        <div className="flex border-b border-gray-100">
          {win.columns.map((c) => (
            <div key={c.key} className="flex-1 text-center text-[10px] text-gray-400 py-2 border-r border-gray-100 last:border-0">{c.label}</div>
          ))}
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex pointer-events-none">
            {win.columns.map((c) => <div key={c.key} className="flex-1 border-r border-gray-100 last:border-0" />)}
          </div>
          {today && (
            <span className="absolute top-0 bottom-0 z-10 w-px bg-[#2B3A67] pointer-events-none" style={{ left: `${today.leftPct}%` }} />
          )}

          {ganttRows.map((row, ri) => {
            const band = row.band ? placeBar(win, row.band.from, row.band.to) : null
            return (
              <div key={ri} className={`relative border-b border-gray-100 last:border-0 ${row.band ? 'h-8' : 'h-[68px]'}`}>
                {row.band && band && (
                  <div
                    className="absolute top-1.5 bottom-1.5 z-20 rounded-md flex items-center gap-1.5 px-2.5 overflow-hidden"
                    style={{ left: `${band.leftPct}%`, width: `${band.widthPct}%`, backgroundColor: row.band.tint }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: row.band.color }} />
                    <span className="text-[10px] font-medium truncate" style={{ color: row.band.color }}>{row.band.project}</span>
                  </div>
                )}
                {row.tasks.map((task, ti) => {
                  const place = placeBar(win, task.from, task.to)
                  return place ? <GanttTaskCard key={ti} {...task} place={place} /> : null
                })}
              </div>
            )
          })}

          {ganttRows.length === 0 && (
            <div className="py-16 text-center text-sm text-gray-400">No tasks are assigned to this employee yet.</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Tab: RFIs Filed ──────────────────────────────────────────────────────────
type RfiEvent = { label: string; by: string; date: string }

/** Status pill wording — the DB has open / in_review / closed. */
function rfiStatusLabel(status: EmployeeRfi['status']) {
  return status === 'closed' ? 'Closed' : status === 'in_review' ? 'In Review' : 'Open'
}

/**
 * The status timeline is derived rather than stored: creation, assignment,
 * every comment, and closure, in the order they happened.
 */
function buildRfiTimeline(rfi: EmployeeRfi): RfiEvent[] {
  const events: { at: string; event: RfiEvent }[] = [
    { at: rfi.createdAt, event: { label: 'RFI created', by: rfi.createdBy ?? 'Unknown', date: fmtDateTime(rfi.createdAt) } },
  ]

  if (rfi.assignee && rfi.assignedAt) {
    events.push({ at: rfi.assignedAt, event: { label: `Assigned to ${rfi.assignee}`, by: 'Admin', date: fmtDateTime(rfi.assignedAt) } })
  }
  for (const c of rfi.comments) {
    events.push({ at: c.createdAt, event: { label: 'Comment added', by: c.author, date: fmtDateTime(c.createdAt) } })
  }
  if (rfi.resolvedAt) {
    events.push({ at: rfi.resolvedAt, event: { label: 'RFI closed', by: 'Admin', date: fmtDateTime(rfi.resolvedAt) } })
  }

  return events.sort((a, b) => a.at.localeCompare(b.at)).map((e) => e.event)
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-semibold text-gray-400 tracking-widest uppercase mb-2">{children}</p>
}

function InitialsAvatar({ name, size = 24 }: { name: string; size?: number }) {
  const label = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
  return (
    <span
      className="rounded-full flex items-center justify-center shrink-0 text-white font-semibold"
      style={{ width: size, height: size, backgroundColor: avatarColor(name), fontSize: size * 0.38 }}
    >
      {label}
    </span>
  )
}

/** Assigned-manager picker — the admin's "assign a manager to respond" action. */
function ManagerSelect({ value, managers, disabled, onChange }: {
  value: string | null
  managers: { id: string; name: string }[]
  disabled: boolean
  onChange: (managerId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useOutsideClick(ref, () => setOpen(false))

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        disabled={disabled}
        className="w-full flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2.5 hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:hover:bg-transparent"
      >
        {value ? <InitialsAvatar name={value} /> : null}
        <span className={`text-xs ${value ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>{value ?? 'Select Manager'}</span>
        <ChevronDown size={14} className="ml-auto text-gray-400 shrink-0" />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-10 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 max-h-52 overflow-y-auto">
          {managers.length === 0 && <p className="px-3 py-2 text-xs text-gray-400">No managers available.</p>}
          {managers.map((m) => (
            <button
              key={m.id}
              onClick={() => { onChange(m.id); setOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <InitialsAvatar name={m.name} size={22} />
              {m.name}
              {value === m.name && <Check size={13} className="ml-auto text-[#0D1B2A]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function AttachmentSection({ attachments, busy, onAdd, onRemove }: {
  attachments: RfiAttachment[]
  busy: boolean
  onAdd: (files: FileList) => void
  onRemove: (id: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div>
      <SectionLabel>Attachment</SectionLabel>
      <div className="border border-gray-100 rounded-xl p-3 grid grid-cols-3 gap-3">
        {attachments.map((a) => (
          <div key={a.id} className="relative group">
            <a
              href={a.url}
              target="_blank"
              rel="noreferrer"
              className="flex flex-col items-center justify-center gap-2 h-24 rounded-lg bg-[#FEF6F3] hover:bg-[#FDEDE7] transition-colors px-2"
            >
              <span className="w-8 h-9 bg-white border border-red-100 rounded flex flex-col items-center justify-center shrink-0">
                <FileText size={12} className="text-red-400" />
                <span className="text-[7px] text-red-400 font-bold">PDF</span>
              </span>
              <span className="text-[10px] text-gray-500 text-center truncate w-full">{a.name}</span>
            </a>
            <button
              onClick={() => onRemove(a.id)}
              title={`Remove ${a.name}`}
              className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-white/90 border border-gray-100 flex items-center justify-center text-gray-400 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity"
            >
              <Trash2 size={11} />
            </button>
          </div>
        ))}

        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex flex-col items-center justify-center gap-1.5 h-24 rounded-lg border border-dashed border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-500 transition-colors disabled:opacity-50"
        >
          <Paperclip size={15} />
          <span className="text-[10px]">{busy ? 'Uploading…' : 'Add attachment'}</span>
        </button>

        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => { if (e.target.files?.length) onAdd(e.target.files); e.target.value = '' }}
        />
      </div>
    </div>
  )
}

/** Right-hand detail drawer for a single RFI. */
function RFIDetailsPanel({ rfi, managers, composing, busy, onClose, onAssign, onAddComment, onAddFiles, onRemoveFile, onStartComment, onCancelComment }: {
  rfi: EmployeeRfi
  managers: { id: string; name: string }[]
  composing: boolean
  busy: boolean
  onClose: () => void
  onAssign: (managerId: string) => void
  onAddComment: (text: string) => void
  onAddFiles: (files: FileList) => void
  onRemoveFile: (id: string) => void
  onStartComment: () => void
  onCancelComment: () => void
}) {
  const [msg, setMsg] = useState('')
  const [emojiOpen, setEmojiOpen] = useState(false)
  const emojiRef = useRef<HTMLDivElement>(null)
  const label = rfiStatusLabel(rfi.status)
  const st = rfiStatusCfg[label] ?? rfiStatusCfg['Closed']
  const timeline = buildRfiTimeline(rfi)

  useOutsideClick(emojiRef, () => setEmojiOpen(false))

  function send() {
    const text = msg.trim()
    if (!text) return
    onAddComment(text)
    setMsg('')
  }

  return (
    <>
      <Overlay onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-50 bg-white w-[640px] max-w-full h-full flex flex-col shadow-2xl panel-slide-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h3 className="text-sm font-bold text-gray-900">RFI Details</h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-gray-900 leading-snug">{rfi.title}</h2>
              <p className="text-xs text-gray-400 mt-0.5">{rfi.id.slice(0, 8).toUpperCase()}</p>
            </div>
            <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-md shrink-0 ${st.bg} ${st.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} /> {label}
            </span>
          </div>

          <div>
            <SectionLabel>RFI Information</SectionLabel>
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              {([
                ['Project', rfi.project],
                ['Date submitted', fmtDate(rfi.createdAt)],
                ...(rfi.assignee ? [['Assigned Manager', rfi.assignee]] : []),
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-gray-50 last:border-0">
                  <span className="text-xs text-gray-500">{k}</span>
                  <span className="text-xs font-medium text-gray-800 text-right">{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-700 mb-2">Notes</p>
            <div className="border border-gray-200 rounded-xl px-4 py-3 text-xs text-gray-600 leading-relaxed bg-gray-50/30">
              {rfi.description || 'No notes were submitted with this RFI.'}
            </div>
          </div>

          <AttachmentSection attachments={rfi.attachments} busy={busy} onAdd={onAddFiles} onRemove={onRemoveFile} />

          <div>
            <p className="text-xs font-medium text-gray-700 mb-2">Assigned Manager</p>
            <ManagerSelect value={rfi.assignee} managers={managers} disabled={busy} onChange={onAssign} />
          </div>

          <div>
            <SectionLabel>Comments</SectionLabel>
            {rfi.comments.length === 0 && <p className="text-xs text-gray-400">No comments yet.</p>}
            <div className="space-y-4">
              {rfi.comments.map((c) => (
                <div key={c.id} className="flex gap-3">
                  <InitialsAvatar name={c.author} size={32} />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-gray-900">{c.author}</span>
                      <span className="text-[10px] text-gray-400">{fmtDateTime(c.createdAt)}</span>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <SectionLabel>Status Timeline</SectionLabel>
            {timeline.map((t, i) => {
              const isLast = i === timeline.length - 1
              return (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className={`w-3 h-3 rounded-full shrink-0 mt-0.5 ${isLast ? 'bg-emerald-500' : 'border-2 border-gray-200 bg-white'}`} />
                    {!isLast && <span className="w-px flex-1 bg-gray-200 my-1" style={{ minHeight: 24 }} />}
                  </div>
                  <div className="pb-4">
                    <p className="text-xs font-medium text-gray-800">{t.label}</p>
                    <p className="text-[11px] text-gray-400">by {t.by} · {t.date}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 shrink-0">
          {composing ? (
            <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5">
              <input
                autoFocus
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') send(); if (e.key === 'Escape') onCancelComment() }}
                placeholder="Type your message here..."
                className="flex-1 text-xs text-gray-700 placeholder-gray-400 focus:outline-none bg-transparent"
              />
              <div ref={emojiRef} className="relative">
                <button
                  onClick={() => setEmojiOpen((o) => !o)}
                  className={`transition-colors ${emojiOpen ? 'text-gray-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <Smile size={16} />
                </button>
                {emojiOpen && (
                  <div className="absolute bottom-8 right-0 z-30 bg-white rounded-xl shadow-xl border border-gray-100 p-2 grid grid-cols-6 gap-0.5 w-56">
                    {COMMENT_EMOJI.map((e) => (
                      <button
                        key={e}
                        onClick={() => { setMsg((m) => m + e); setEmojiOpen(false) }}
                        className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 text-base leading-none"
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={send}
                disabled={!msg.trim() || busy}
                className="w-7 h-7 bg-[#0D1B2A] rounded-full flex items-center justify-center hover:bg-[#162437] disabled:opacity-40 transition-colors"
              >
                <Send size={12} className="text-white" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-end gap-3">
              <button onClick={onClose} className="px-5 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                Close
              </button>
              <button onClick={onStartComment} className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#0D1B2A] text-sm font-medium text-white hover:bg-[#162437] transition-colors">
                Comment <MessageSquare size={13} />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}

function RFIsFiledTab({ initialRfis, managers }: {
  initialRfis: EmployeeRfi[]
  managers: { id: string; name: string }[]
}) {
  const [rfis, setRfis] = useState<EmployeeRfi[]>(initialRfis)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [composing, setComposing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  useOutsideClick(menuRef, () => setOpenMenuId(null))

  const active = rfis.find((r) => r.id === activeId) ?? null

  function patch(id: string, changes: Partial<EmployeeRfi>) {
    setRfis((prev) => prev.map((r) => (r.id === id ? { ...r, ...changes } : r)))
  }

  async function run<T>(work: () => Promise<T | { error: string }>, apply: (result: T) => void) {
    setBusy(true)
    setError(null)
    const result = await work()
    setBusy(false)
    if (result && typeof result === 'object' && 'error' in result) {
      setError((result as { error: string }).error)
      return
    }
    apply(result as T)
  }

  function handleAssign(id: string, managerId: string) {
    const manager = managers.find((m) => m.id === managerId)
    run(
      () => assignRfi(id, managerId),
      () => patch(id, {
        assignee: manager?.name ?? null,
        assigneeId: managerId,
        assignedAt: new Date().toISOString(),
        status: 'in_review',
      }),
    )
  }

  function handleClose(id: string) {
    setOpenMenuId(null)
    run(
      () => closeRfi(id),
      () => patch(id, { status: 'closed', resolvedAt: new Date().toISOString() }),
    )
  }

  function handleComment(id: string, text: string) {
    const session = readSession()
    if (!session?.id) { setError('You need to be signed in to comment'); return }
    run(
      () => addRfiComment(id, session.id, text),
      (result: { comment: RfiComment }) => {
        const rfi = rfis.find((r) => r.id === id)
        if (rfi) patch(id, { comments: [...rfi.comments, result.comment] })
        setComposing(false)
      },
    )
  }

  function handleAddFiles(rfi: EmployeeRfi, files: FileList) {
    const session = readSession()
    if (!session?.id) { setError('You need to be signed in to attach files'); return }

    setBusy(true)
    setError(null)
    void (async () => {
      const added: RfiAttachment[] = []
      for (const file of Array.from(files)) {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('rfiId', rfi.id)
        fd.append('projectId', rfi.projectId)
        fd.append('authSupabaseId', session.id)
        const result = await uploadRfiAttachment(fd)
        if ('error' in result) { setError(result.error); break }
        added.push(result.attachment)
      }
      if (added.length) {
        setRfis((prev) => prev.map((r) => (r.id === rfi.id ? { ...r, attachments: [...r.attachments, ...added] } : r)))
      }
      setBusy(false)
    })()
  }

  function handleRemoveFile(id: string, documentId: string) {
    const rfi = rfis.find((r) => r.id === id)
    run(
      () => deleteRfiAttachment(documentId),
      () => { if (rfi) patch(id, { attachments: rfi.attachments.filter((a) => a.id !== documentId) }) },
    )
  }

  function openRfi(id: string, withComposer = false) {
    setActiveId(id)
    setComposing(withComposer)
    setOpenMenuId(null)
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-800 mb-4">RFIs Filed</h3>

      {error && (
        <div className="mb-4 px-4 py-2.5 rounded-lg bg-red-50 border border-red-100 text-xs text-red-600">{error}</div>
      )}

      {active && (
        <RFIDetailsPanel
          rfi={active}
          managers={managers}
          composing={composing}
          busy={busy}
          onClose={() => { setActiveId(null); setComposing(false) }}
          onAssign={(managerId) => handleAssign(active.id, managerId)}
          onAddComment={(text) => handleComment(active.id, text)}
          onAddFiles={(files) => handleAddFiles(active, files)}
          onRemoveFile={(documentId) => handleRemoveFile(active.id, documentId)}
          onStartComment={() => setComposing(true)}
          onCancelComment={() => setComposing(false)}
        />
      )}

      <div className="border border-gray-100 rounded-xl overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50/60 border-b border-gray-100">
              {['RFI ID', 'Subject', 'Project', 'Status', 'Date', 'Actions'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rfis.map((r) => {
              const label = rfiStatusLabel(r.status)
              const st = rfiStatusCfg[label] ?? rfiStatusCfg['Closed']
              return (
                <tr key={r.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/40 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800">{r.id.slice(0, 8).toUpperCase()}</td>
                  <td className="px-4 py-3 text-gray-600">{r.title}</td>
                  <td className="px-4 py-3 text-gray-600">{r.project}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-md ${st.bg} ${st.text}`}>{label}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{fmtDate(r.createdAt)}</td>
                  <td className="px-4 py-3 relative">
                    <button
                      onClick={() => setOpenMenuId(openMenuId === r.id ? null : r.id)}
                      className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"
                    >
                      <MoreHorizontal size={14} />
                    </button>
                    {openMenuId === r.id && (
                      <div ref={menuRef} className="absolute right-5 top-8 z-30 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 w-40">
                        <button onClick={() => openRfi(r.id)} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
                          <CircleDot size={14} className="text-gray-500" /> View RFI
                        </button>
                        <button onClick={() => openRfi(r.id, true)} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
                          <MessageSquare size={14} className="text-gray-500" /> Comment
                        </button>
                        {r.status !== 'closed' && (
                          <>
                            <div className="h-px bg-gray-100 my-1" />
                            <button onClick={() => handleClose(r.id)} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-500 hover:bg-red-50 transition-colors">
                              <X size={14} /> Close RFI
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
            {rfis.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">No RFIs filed by this employee.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Tab: Submittals & Drawings ───────────────────────────────────────────────
/** The DB has pending / in_review / approved; the UI shows two states. */
const docStatusLabel = (s: EmployeeDocument['status']) => (s === 'approved' ? 'Approved' : 'In Review')

function SubmittalsDrawingsTab({ initialDocuments }: { initialDocuments: EmployeeDocument[] }) {
  const [documents, setDocuments] = useState<EmployeeDocument[]>(initialDocuments)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  useOutsideClick(menuRef, () => { setOpenMenuId(null); setShowStatusMenu(false) })

  async function changeStatus(id: string, next: 'approved' | 'in_review') {
    setOpenMenuId(null)
    setShowStatusMenu(false)
    setError(null)
    const previous = documents
    // Optimistic — the menu closes immediately, so roll back if the write fails.
    setDocuments((prev) => prev.map((d) => (d.id === id ? { ...d, status: next } : d)))
    const result = await updateDocumentStatus(id, next)
    if ('error' in result) {
      setDocuments(previous)
      setError(result.error)
    }
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-800 mb-4">Submittals &amp; Drawings</h3>

      {error && (
        <div className="mb-4 px-4 py-2.5 rounded-lg bg-red-50 border border-red-100 text-xs text-red-600">{error}</div>
      )}

      <div className="border border-gray-100 rounded-xl overflow-visible">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50/60 border-b border-gray-100">
              {['File', 'Name', 'Project', 'Date Submitted', 'Status', 'Actions'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {documents.map((s) => {
              const label = docStatusLabel(s.status)
              const st = submStatusCfg[label]
              return (
                <tr key={s.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/40 transition-colors">
                  <td className="px-4 py-3">
                    <div className="w-7 h-8 bg-red-50 border border-red-100 rounded flex flex-col items-center justify-center">
                      <FileText size={11} className="text-red-400" />
                      <span className="text-[8px] text-red-400 font-bold">PDF</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700 font-medium">{s.name}</td>
                  <td className="px-4 py-3 text-gray-500">{s.project}</td>
                  <td className="px-4 py-3 text-gray-500">{fmtDate(s.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}>{label}</span>
                  </td>
                  <td className="px-4 py-3 relative">
                    <button
                      onClick={() => { setOpenMenuId(openMenuId === s.id ? null : s.id); setShowStatusMenu(false) }}
                      className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"
                    >
                      <MoreHorizontal size={14} />
                    </button>
                    {openMenuId === s.id && (
                      <div ref={menuRef} className="absolute right-5 top-8 z-20 bg-white rounded-2xl shadow-[0_8px_30px_rgba(16,24,40,0.14)] border border-gray-100 p-1.5 w-52">
                        <button
                          onClick={() => { if (s.url) window.open(s.url, '_blank', 'noreferrer'); setOpenMenuId(null) }}
                          disabled={!s.url}
                          title={s.url ? undefined : 'No file uploaded for this submittal yet'}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs text-gray-800 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
                        >
                          <CircleDot size={16} className="text-gray-700 shrink-0" strokeWidth={1.8} /> View PDF
                        </button>

                        <button
                          onClick={() => setShowStatusMenu(!showStatusMenu)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-gray-900 hover:bg-gray-50 transition-colors"
                        >
                          <span className={`w-2 h-2 rounded-full shrink-0 ${s.status === 'approved' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                          Change Status
                          {showStatusMenu
                            ? <ChevronUp size={14} className="ml-auto text-gray-400" />
                            : <ChevronDown size={14} className="ml-auto text-gray-400" />}
                        </button>

                        {showStatusMenu && (
                          <div className="border-t border-gray-100 mt-1 pt-1">
                            {([['approved', 'Approved'], ['in_review', 'In Review']] as const).map(([value, text]) => {
                              const selected = s.status === value
                              return (
                                <button
                                  key={value}
                                  onClick={() => changeStatus(s.id, value)}
                                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs text-gray-500 hover:bg-gray-50 transition-colors"
                                >
                                  <span className={`w-2 h-2 rounded-full shrink-0 ${value === 'approved' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                  {text}
                                  <span className={`ml-auto w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${selected ? 'border-[#0D1B2A]' : 'border-gray-300'}`}>
                                    {selected && <span className="w-2 h-2 rounded-full bg-[#0D1B2A]" />}
                                  </span>
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
            {documents.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">No submittals or drawings uploaded by this employee.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Tab: Inspection Log ──────────────────────────────────────────────────────
function InspectionLogTab({ inspections }: { inspections: EmployeeInspection[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-800 mb-4">Inspection Log</h3>
      <div className="border border-gray-100 rounded-xl overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50/60 border-b border-gray-100">
              {['Date', 'Name', 'Project', 'Notes', 'Result'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {inspections.map((r) => (
              <tr key={r.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/40 transition-colors">
                <td className="px-4 py-3 text-gray-500">{fmtDate(r.inspectedAt)}</td>
                <td className="px-4 py-3 text-gray-700 font-medium">{r.title}</td>
                <td className="px-4 py-3 text-gray-500">{r.project}</td>
                <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{r.notes ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={r.result === 'pass' ? 'text-emerald-600 font-medium' : 'text-red-500 font-medium'}>
                    {r.result === 'pass' ? 'Pass' : 'Failed'}
                  </span>
                </td>
              </tr>
            ))}
            {inspections.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">No inspections logged by this employee.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Main Export ──────────────────────────────────────────────────────────────
const tabs = ['Basic Info', 'Assigned Projects', 'Project Timeline', 'RFIs Filed', 'Submittals & Drawings', 'Inspection Log']

export function EmployeeDetailClient({
  employee: initialEmployee, projects, timeline, rfis, documents, inspections, managers,
}: {
  employee: EmployeeRow
  projects: EmployeeProject[]
  timeline: EmployeeTimeline
  rfis: EmployeeRfi[]
  documents: EmployeeDocument[]
  inspections: EmployeeInspection[]
  managers: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [emp, setEmp] = useState(initialEmployee)
  const [activeTab, setActiveTab] = useState('Basic Info')
  const [showEdit, setShowEdit] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const color = avatarColor(emp.id)

  function handleSave(values: FormValues, avatarFile: File | null, currentAvatarUrl: string | null) {
    setEditError(null)
    const rateOfPay = values.rateOfPay ? parseFloat(values.rateOfPay) : null
    startTransition(async () => {
      let avatarUrl = currentAvatarUrl
      if (avatarFile) {
        const fd = new FormData()
        fd.append('file', avatarFile)
        const up = await uploadAvatar(fd)
        if ('error' in up) { setEditError(up.error); return }
        avatarUrl = up.url
      }
      const input: UpdateEmployeeInput = {
        id: emp.id,
        firstName: values.firstName, lastName: values.lastName,
        email: values.email, employeeId: values.employeeId, role: values.role,
        employeeType: values.employeeType, status: values.status,
        department: values.department, gender: values.gender,
        rateOfPay, startDate: values.startDate || null,
        avatarUrl, phone: values.phone,
      }
      const result = await updateEmployee(input)
      if (result.error) { setEditError(result.error); return }
      setEmp((prev) => ({
        ...prev,
        first_name: values.firstName, last_name: values.lastName,
        role: values.role, status: values.status,
        department: values.department, phone: values.phone || null,
        employee_type: values.employeeType, gender: values.gender || null,
        rate_of_pay: rateOfPay, start_date: values.startDate || null,
        avatar_url: avatarUrl,
      }))
      setShowEdit(false)
    })
  }

  return (
    <>
      {showEdit && (
        <>
          <Overlay onClick={() => setShowEdit(false)} />
          <EmployeeFormPanel
            employee={emp}
            onSave={handleSave}
            onCancel={() => setShowEdit(false)}
            loading={isPending}
            errorMsg={editError}
          />
        </>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-5">
            <Link href="/admin/employees" className="hover:text-gray-700 transition-colors">Employees</Link>
            <ChevronRight size={12} />
            <span className="text-gray-700 font-medium">{emp.first_name} {emp.last_name}</span>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            {/* Employee header */}
            <div className="px-7 py-5 flex items-center justify-between border-b border-gray-100">
              <div className="flex items-center gap-3">
                {emp.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={emp.avatar_url} alt={emp.first_name} className="w-11 h-11 rounded-full object-cover shadow-sm" />
                ) : (
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-sm"
                    style={{ backgroundColor: color }}>
                    {`${emp.first_name[0] ?? ''}${emp.last_name[0] ?? ''}`.toUpperCase()}
                  </div>
                )}
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">{emp.first_name} {emp.last_name}</h2>
                  <p className="text-xs text-gray-500 mt-0.5 capitalize">{emp.role}{emp.department ? ` · ${emp.department}` : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setEditError(null); setShowEdit(true) }}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Pencil size={12} /> Edit Info
                </button>
                <a
                  href={`mailto:${emp.email}`}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#0D1B2A] rounded-lg hover:bg-[#162437] transition-colors"
                >
                  <Mail size={12} /> Message
                </a>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100 px-7 overflow-x-auto">
              {tabs.map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`shrink-0 px-1 py-3.5 mr-6 text-xs font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-[#0D1B2A] text-[#0D1B2A]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="px-7 py-7">
              {activeTab === 'Basic Info' && <BasicInfoTab emp={emp} />}
              {activeTab === 'Assigned Projects' && <AssignedProjectsTab projects={projects} />}
              {activeTab === 'Project Timeline' && <ProjectTimelineTab timeline={timeline} />}
              {activeTab === 'RFIs Filed' && <RFIsFiledTab initialRfis={rfis} managers={managers} />}
              {activeTab === 'Submittals & Drawings' && <SubmittalsDrawingsTab initialDocuments={documents} />}
              {activeTab === 'Inspection Log' && <InspectionLogTab inspections={inspections} />}
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
