'use client'

import { useEntry } from '@/app/components/ui/animations'
import { useState, useTransition, useMemo } from 'react'
import {
  Plus, X, Check, ChevronLeft, ChevronRight,
  Clock, MapPin,
  UserCheck, AlertCircle, CalendarCheck
} from 'lucide-react'
import type { TimeEntryRow, DbTimeStatus, CreateTimeEntryInput, TimeFormOptions } from './actions'
import { MobileClockScreen } from '@/app/components/ui/mobile/MobileClockScreen'
import { SuccessModal } from '@/app/components/ui/SuccessModal'
import { ConfirmDeleteModal as SharedConfirmDeleteModal } from '@/app/components/ui/ConfirmDeleteModal'
import {
  createTimeEntry, updateTimeEntry, deleteTimeEntry,
  approveTimeEntry, rejectTimeEntry,
} from './actions'
import { ActionsDropdown } from '@/app/components/ui/ActionsDropdown'
import { PersonSelect } from '@/app/components/ui/PersonSelect'
import { DateField } from '@/app/components/ui/DateField'
import { TimeField } from '@/app/components/ui/TimeField'
import { useDismiss } from '@/app/components/ui/useDismiss'
import { useSlideOver } from '@/app/components/ui/useSlideOver'
import { useCurrentUser } from '@/app/components/ui/useCurrentUser'
import { FilterButton, ImportExportButton, filterChipCls } from '@/app/components/ui/ToolbarButtons'
import { BAND_GAP, CONTENT_GAP } from '@/app/components/ui/spacing'
import { SearchInput } from '@/app/components/ui/SearchInput'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const COLORS = ['#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6', '#F97316']
function avatarColor(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffffffff
  return COLORS[Math.abs(h) % COLORS.length]
}

function fmtDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtTime(t: string | null): string {
  if (!t) return '–'
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
}

/** Shift length in hours; a clock-out before the clock-in crossed midnight. */
function computeHoursNum(clockIn: string, clockOut: string | null): number {
  if (!clockOut) return 0
  const [hi, mi] = clockIn.split(':').map(Number)
  const [ho, mo] = clockOut.split(':').map(Number)
  const mins = ho * 60 + mo - (hi * 60 + mi)
  return (mins < 0 ? mins + 24 * 60 : mins) / 60
}

function computeHours(clockIn: string, clockOut: string | null): string {
  if (!clockOut) return '–'
  return `${computeHoursNum(clockIn, clockOut).toFixed(1)}h`
}

function getWeekDays(offsetWeeks = 0): { key: string; iso: string; label: string }[] {
  const today = new Date()
  const day = today.getDay()
  const diff = (day === 0 ? -6 : 1 - day) + offsetWeeks * 7
  const monday = new Date(today)
  monday.setDate(today.getDate() + diff)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' })
    const dayNum = String(d.getDate())
    // Local, not toISOString(): entries carry the date the crew worked, so a
    // UTC shift would file Monday's hours under Sunday west of Greenwich.
    const iso = d.toLocaleDateString('en-CA')
    return { key: `${dayName} (${dayNum})`, iso, label: dayName }
  })
}

interface WeekRow {
  userId: string
  name: string
  role: string
  days: Record<string, { h: string; s: 'approved' | 'pending' | 'missed' | 'none' }>
  total: string
}

function buildWeekData(
  entries: TimeEntryRow[],
  weekDays: { key: string; iso: string }[],
  todayIso: string,
): WeekRow[] {
  const weekIsos = new Set(weekDays.map(d => d.iso))
  const weekEntries = entries.filter(e => weekIsos.has(e.date))

  const byUser = new Map<string, TimeEntryRow[]>()
  for (const e of weekEntries) {
    if (!byUser.has(e.user_id)) byUser.set(e.user_id, [])
    byUser.get(e.user_id)!.push(e)
  }

  return Array.from(byUser.entries()).map(([userId, userEntries]) => {
    const first = userEntries[0]
    const days: WeekRow['days'] = {}
    let total = 0
    for (const wd of weekDays) {
      const entry = userEntries.find(e => e.date === wd.iso)
      // A day still running, or yet to come, can't be missed yet — only a day
      // that has fully passed with nothing recorded counts against someone.
      const hasPassed = wd.iso < todayIso

      if (!entry) {
        days[wd.key] = { h: '-', s: hasPassed ? 'missed' : 'none' }
      } else {
        const h = computeHoursNum(entry.clock_in, entry.clock_out)
        total += h
        // Clocked in on a day that has since passed but never clocked out —
        // the shift is unaccountable, so it reads as missed rather than 0h.
        const missedPunchOut = hasPassed && !entry.clock_out
        days[wd.key] = {
          h: h > 0 ? `${h.toFixed(1)}h` : missedPunchOut ? 'Missed' : '-',
          s: missedPunchOut ? 'missed' : (entry.status as 'approved' | 'pending' | 'missed'),
        }
      }
    }
    return { userId, name: first.employee_name, role: first.employee_role, days, total: `${total.toFixed(1)}h` }
  })
}

/** Time Log filters. `date` is a preset key rather than a range the user types. */
type TimeDatePreset = '' | 'today' | 'last7' | 'last30'

interface TimeFilters {
  status:   DbTimeStatus[]
  projects: string[]
  date:     TimeDatePreset
  employee: string
}

const EMPTY_TIME_FILTERS: TimeFilters = { status: [], projects: [], date: '', employee: '' }

const DATE_PRESETS: { key: Exclude<TimeDatePreset, ''>; label: string; days: number }[] = [
  { key: 'today',  label: 'Today',        days: 0  },
  { key: 'last7',  label: 'Last 7 days',  days: 7  },
  { key: 'last30', label: 'Last 30 days', days: 30 },
]

/** Earliest date a preset admits, as a local YYYY-MM-DD to match entry dates. */
function presetStart(preset: TimeDatePreset): string | null {
  const found = DATE_PRESETS.find(p => p.key === preset)
  if (!found) return null
  const d = new Date()
  d.setDate(d.getDate() - found.days)
  return d.toLocaleDateString('en-CA')
}

function activeTimeFilterCount(f: TimeFilters) {
  return f.status.length + f.projects.length + (f.date ? 1 : 0) + (f.employee ? 1 : 0)
}

// ─── Types ────────────────────────────────────────────────────────────────────
type ModalState =
  | { type: 'none' }
  | { type: 'newEntry'; entry?: TimeEntryRow }
  | { type: 'viewEntry'; entry: TimeEntryRow }
  | { type: 'deleteConfirm'; entry: TimeEntryRow }
  | { type: 'success'; title: string }

const STATUS_CONFIG: Record<DbTimeStatus, { bg: string; text: string; dot: string }> = {
  approved: { bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-500' },
  pending:  { bg: 'bg-amber-50',   text: 'text-amber-600',   dot: 'bg-amber-500' },
  missed:   { bg: 'bg-red-50',     text: 'text-red-600',     dot: 'bg-red-500' },
}

const STATUS_LABEL: Record<DbTimeStatus, string> = {
  approved: 'Approved', pending: 'Pending', missed: 'Missed',
}

const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all'
const selectCls = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all'

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatCard({ label, value, sub, subColor, icon, iconBg }: {
  label: string; value: string; sub?: string; subColor?: string
  icon: React.ReactNode
  /** Tinted tile behind the icon — the icon supplies its own colour. */
  iconBg: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 flex flex-col justify-between gap-4 min-h-[112px]">
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm text-gray-500">{label}</span>
        <span className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${iconBg}`}>{icon}</span>
      </div>
      <div className="flex items-end justify-between gap-3">
        <p className="text-[30px] font-semibold text-gray-900 leading-none">{value}</p>
        {sub && <p className={`text-xs font-medium leading-none pb-0.5 text-right ${subColor}`}>{sub}</p>}
      </div>
    </div>
  )
}

function ActionMenu({ onView, onEdit, onDelete }: { onView: () => void; onEdit: () => void; onDelete: () => void }) {
  // Shared dropdown so the menu matches every other table and, being portalled,
  // is not clipped by the log table's own scroll container.
  return (
    <div className="flex justify-center">
      <ActionsDropdown onView={onView} onEdit={onEdit} onDelete={onDelete} />
    </div>
  )
}

function LogManualEntrySidebar({
  entry, onClose, onSave, employees, projects,
}: {
  entry?: TimeEntryRow
  onClose: () => void
  onSave: (data: CreateTimeEntryInput) => void
  employees: TimeFormOptions['employees']
  projects:  TimeFormOptions['projects']
}) {
  const { close, backdropCls, panelCls } = useSlideOver(onClose)

  /** Distinct project locations, offered as Site / Location suggestions. */
  const knownLocations = useMemo(
    () => [...new Set(projects.map(p => p.location).filter((l): l is string => !!l))].sort(),
    [projects]
  )

  /**
   * Picking a project fills the site from that project's address unless the
   * user has already typed one of their own.
   */
  function selectProject(id: string) {
    setProjectId(id)
    const project = projects.find(p => p.id === id)
    const previous = projects.find(p => p.id === projectId)?.location ?? ''
    if (project?.location && (!loc || loc === previous)) setLoc(project.location)
  }

  const [userId,   setUserId]   = useState(entry?.user_id    || '')
  const [date,     setDate]     = useState(entry?.date        || '')
  const [projectId, setProjectId] = useState(entry?.project_id || '')
  const [loc,      setLoc]      = useState(entry?.location    || '')
  const [clockIn,  setClockIn]  = useState(entry?.clock_in?.slice(0, 5) || '')
  const [clockOut, setClockOut] = useState(entry?.clock_out?.slice(0, 5) || '')
  const [note,     setNote]     = useState(entry?.note        || '')
  const [saving,   setSaving]   = useState(false)

  async function submit() {
    if (!userId || !date || !clockIn) return
    setSaving(true)
    await onSave({
      user_id:    userId,
      project_id: projectId || null,
      date,
      clock_in:   clockIn,
      clock_out:  clockOut || null,
      status:     'pending',
      note:       note || null,
      location:   loc || null,
    })
    setSaving(false)
  }

  return (
    <>
      <div className={`fixed inset-0 bg-black/40 z-[100] backdrop-blur-[1px] ${backdropCls}`} onClick={close} />
      <div className="fixed inset-y-0 right-0 z-[101] flex">
        <div className={`bg-white w-[640px] max-w-full h-full flex flex-col shadow-2xl ${panelCls}`}>
          <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100 shrink-0">
            <h2 className="text-lg font-semibold text-gray-900">{entry ? 'Edit Entry' : 'Log Manual Entry'}</h2>
            <button onClick={close} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"><X size={18} /></button>
          </div>

          <div className="overflow-y-auto flex-1 px-8 py-8 bg-[#FCFCFD] space-y-6">
            <div>
              <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Entry Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Employee</label>
                  <PersonSelect
                    people={employees.map(emp => ({ id: emp.id, name: emp.name, title: emp.role, avatarUrl: emp.avatar_url }))}
                    value={userId}
                    onChange={setUserId}
                    emptyHint="No employees found — add a team member first."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Date</label>
                  <DateField value={date} onChange={setDate} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Project</label>
                  <select value={projectId} onChange={e => selectProject(e.target.value)} className={selectCls}>
                    <option value="">Select Project</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  {projects.length === 0 && (
                    <p className="text-[11px] text-amber-600 mt-1.5">No projects found — create a project first.</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Site / Location</label>
                  <input
                    list="tt-site-locations"
                    value={loc}
                    onChange={e => setLoc(e.target.value)}
                    placeholder="Enter site location"
                    className={inputCls}
                  />
                  {/* Suggestions are the locations already recorded on projects. */}
                  <datalist id="tt-site-locations">
                    {knownLocations.map(l => <option key={l} value={l} />)}
                  </datalist>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Time</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Clock In</label>
                  <TimeField value={clockIn} onChange={setClockIn} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Clock Out</label>
                  <TimeField value={clockOut} onChange={setClockOut} />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Note</label>
              <textarea rows={4} value={note} onChange={e => setNote(e.target.value)} placeholder="Enter reason or details..." className={`${inputCls} resize-none py-3`} />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-7 py-5 border-t border-gray-100 bg-white">
            <button onClick={close} className="px-6 py-2.5 text-sm font-medium text-gray-500 hover:bg-gray-50 rounded-xl">Close</button>
            <button
              onClick={submit}
              disabled={saving || !userId || !date || !clockIn}
              className="px-7 py-2.5 text-sm font-semibold text-white bg-[#0D1B2A] hover:bg-[#162437] rounded-xl shadow-sm disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Entry'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

/** "36.1699° N, 115.1398° W" — the punch coordinates, as the design labels them. */
function fmtCoords(lat: number | null, lng: number | null): string | null {
  if (lat === null || lng === null) return null
  return `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? 'E' : 'W'}`
}

function DetailRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between items-center px-5 py-3.5">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-sm text-gray-900 ${strong ? 'font-semibold' : 'font-medium'}`}>{value}</span>
    </div>
  )
}

function TimeEntryDetailSidebar({
  entry, onClose, onApprove, onReject,
}: {
  entry: TimeEntryRow
  onClose: () => void
  onApprove: () => void
  onReject: () => void
}) {
  const { close, backdropCls, panelCls } = useSlideOver(onClose)

  const cfg = STATUS_CONFIG[entry.status]
  const coords = fmtCoords(entry.gps_lat, entry.gps_lng)
  const hours = computeHours(entry.clock_in, entry.clock_out)

  return (
    <>
      <div className={`fixed inset-0 bg-black/40 z-[100] backdrop-blur-[1px] ${backdropCls}`} onClick={close} />
      <div className="fixed inset-y-0 right-0 z-[101] flex">
        <div className={`bg-white w-[640px] max-w-full h-full flex flex-col shadow-2xl ${panelCls}`}>
          <div className="flex items-center justify-between px-8 py-5 shrink-0">
            <h2 className="text-xl font-semibold text-gray-900">Time Entry Detail</h2>
            <button onClick={close} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"><X size={18} /></button>
          </div>

          <div className="overflow-y-auto flex-1 px-8 pb-8 space-y-7">
            {/* Who, and what they were on */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-base shrink-0" style={{ backgroundColor: avatarColor(entry.user_id) }}>
                  {entry.employee_name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">{entry.employee_name}</h3>
                  <p className="text-sm text-gray-400">{entry.project_name ?? entry.employee_role}</p>
                </div>
              </div>
              <span className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} /> {STATUS_LABEL[entry.status]}
              </span>
            </div>

            {/* Time details */}
            <div>
              <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2.5">Time Details</h4>
              <div className="border border-gray-100 rounded-xl divide-y divide-gray-50 bg-white">
                <DetailRow label="Date"       value={fmtDate(entry.date)} />
                <DetailRow label="Clock In"   value={fmtTime(entry.clock_in)} />
                <DetailRow label="Clock Out"  value={fmtTime(entry.clock_out)} />
                <DetailRow label="Total Hours" value={hours} strong />
              </div>
            </div>

            {/* Notes */}
            {entry.note && (
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Notes</h4>
                <div className="bg-[#F7F8FA] border border-gray-100 rounded-xl px-5 py-4">
                  <p className="text-sm text-gray-600 leading-relaxed">{entry.note}</p>
                </div>
              </div>
            )}

            {/* Location & project */}
            <div>
              <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2.5">Location &amp; Project</h4>
              <div className="border border-gray-100 rounded-xl divide-y divide-gray-50 bg-white">
                <DetailRow label="Project" value={entry.project_name ?? '–'} />
                <DetailRow label="Site"    value={entry.location ?? '–'} />
              </div>

              <div className="mt-3 border border-gray-100 rounded-xl overflow-hidden">
                <div className="relative h-36 bg-[#EEF1F6]">
                  <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#C7CEDB_1px,transparent_1px)] [background-size:12px_12px]" />
                  {/* Street-grid suggestion — the real tiles need a map provider key. */}
                  <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(#FFFFFF_2px,transparent_2px),linear-gradient(90deg,#FFFFFF_2px,transparent_2px)] [background-size:44px_44px]" />
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    <span className="absolute -inset-5 rounded-full bg-blue-500/10 animate-pulse" />
                    <span className="relative w-9 h-9 bg-white shadow-lg rounded-full flex items-center justify-center text-blue-600">
                      <MapPin size={18} fill="currentColor" fillOpacity={0.25} />
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-3 bg-white border-t border-gray-100">
                  <MapPin size={13} className="text-gray-400 shrink-0" />
                  <p className="text-xs text-gray-600 truncate">
                    {coords
                      ? `${coords}${entry.location ? ` — ${entry.location}` : ''}`
                      : 'No GPS captured for this punch'}
                  </p>
                </div>
              </div>
            </div>

            {/* Entry log */}
            <div>
              <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Entry Log</h4>
              <div className="space-y-5">
                {entry.clock_out ? (
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className="w-6 h-6 rounded-full bg-red-50 text-red-500 flex items-center justify-center shrink-0"><X size={12} strokeWidth={3} /></span>
                      <span className="flex-1 w-px bg-gray-200 mt-1" />
                    </div>
                    <div className="pb-1">
                      <p className="text-sm font-medium text-gray-900">Clocked out</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {fmtDate(entry.date)} at {fmtTime(entry.clock_out)} · {hours} total
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className="w-6 h-6 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center shrink-0"><Clock size={12} strokeWidth={3} /></span>
                      <span className="flex-1 w-px bg-gray-200 mt-1" />
                    </div>
                    <div className="pb-1">
                      <p className="text-sm font-medium text-gray-900">Still on the clock</p>
                      <p className="text-xs text-gray-400 mt-0.5">No clock-out recorded yet</p>
                    </div>
                  </div>
                )}
                <div className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0"><Check size={12} strokeWidth={3} /></span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Clocked in</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {fmtDate(entry.date)} at {fmtTime(entry.clock_in)}
                      {coords ? ' · GPS verified' : ''}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="px-8 py-5 bg-white border-t border-gray-100 flex justify-end gap-3">
            {entry.status === 'pending' && (
              <>
                <button onClick={onReject} className="px-5 py-2.5 text-sm font-semibold text-red-600 border border-red-100 hover:bg-red-50 rounded-xl">Reject</button>
                <button onClick={onApprove} className="px-6 py-2.5 text-sm font-semibold text-white bg-[#0D1B2A] hover:bg-[#162437] rounded-xl shadow-sm flex items-center gap-2">
                  <Check size={16} /> Approve Entry
                </button>
              </>
            )}
            <button onClick={close} className="px-7 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 border border-gray-200 rounded-xl">Close</button>
          </div>
        </div>
      </div>
    </>
  )
}

function ConfirmDeleteModal({ entry, onClose, onConfirm }: { entry: TimeEntryRow; onClose: () => void; onConfirm: () => void }) {
  return (
    <SharedConfirmDeleteModal
      title="Delete Entry"
      message={`Deleting this time entry (${entry.employee_name}) will remove all associated data permanently.`}
      onCancel={onClose}
      onConfirm={onConfirm}
    />
  )
}

// ─── Main Client Component ─────────────────────────────────────────────────────
interface Props {
  initialEntries: TimeEntryRow[]
  employees: TimeFormOptions['employees']
  projects:  TimeFormOptions['projects']
}

export function TimeTrackingClient({ initialEntries, employees, projects }: Props) {
  const enter = useEntry()
  const [entries,      setEntries]      = useState(initialEntries)
  const [tab,          setTab]          = useState<'weekly' | 'log' | 'approvals'>('weekly')
  const [search,       setSearch]       = useState('')
  const [modal,        setModal]        = useState<ModalState>({ type: 'none' })
  const [weekOffset,   setWeekOffset]   = useState(0)
  const [showFilter,   setShowFilter]   = useState(false)
  const filterRef = useDismiss<HTMLDivElement>(showFilter, () => setShowFilter(false))
  const [filters,      setFilters]      = useState<TimeFilters>(EMPTY_TIME_FILTERS)
  const [draft,        setDraft]        = useState<TimeFilters>(EMPTY_TIME_FILTERS)
  const [isPending,    startTransition] = useTransition()
  // Approve / reject / delete used to swallow their errors, so a failed write
  // looked identical to a successful one. Surface it instead.
  const [actionError, setActionError] = useState<string | null>(null)
  const profile = useCurrentUser()

  // A punch from the phone re-renders the server page; pick the fresh rows up
  // rather than sitting on the snapshot this component mounted with.
  const [seededFrom, setSeededFrom] = useState(initialEntries)
  if (seededFrom !== initialEntries) {
    setSeededFrom(initialEntries)
    setEntries(initialEntries)
  }

  // user_id -> photo, so the timesheet can show faces like the rest of the app.
  const avatarByUser = useMemo(
    () => new Map(employees.map(e => [e.id, e.avatar_url])),
    [employees]
  )

  const today    = new Date().toLocaleDateString('en-CA')
  const weekDays = useMemo(() => getWeekDays(weekOffset), [weekOffset])
  const weekData = useMemo(() => buildWeekData(entries, weekDays, today), [entries, weekDays, today])

  // Stats
  const todayIn  = entries.filter(e => e.date === today && e.clock_out === null).length
  const weekIsos = new Set(weekDays.map(d => d.iso))
  const weekHrs  = entries
    .filter(e => weekIsos.has(e.date))
    .reduce((s, e) => s + computeHoursNum(e.clock_in, e.clock_out), 0)
  const missedPunchout = entries.filter(e => e.clock_out === null && e.date < today).length
  const pendingCount   = entries.filter(e => e.status === 'pending').length

  // Daily totals for weekly view footer
  const dailyTotals = useMemo(() =>
    weekDays.map(wd => {
      const dayEntries = entries.filter(e => e.date === wd.iso)
      const total = dayEntries.reduce((s, e) => s + computeHoursNum(e.clock_in, e.clock_out), 0)
      return total > 0 ? `${total.toFixed(1)}h` : '-'
    }), [entries, weekDays])

  // Week label
  const weekLabel = `${weekDays[0] ? new Date(weekDays[0].iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''} – ${weekDays[6] ? new Date(weekDays[6].iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}`

  const filteredEntries = entries.filter(e => {
    const q = search.toLowerCase()
    const matchesSearch = !search ||
      e.employee_name.toLowerCase().includes(q) ||
      (e.project_name ?? '').toLowerCase().includes(q)
    // The popover's chips used to be decorative; they now narrow the log.
    const matchesStatus = filters.status.length === 0 || filters.status.includes(e.status)
    const matchesProject = filters.projects.length === 0 ||
      (e.project_id !== null && filters.projects.includes(e.project_id))
    const matchesEmployee = !filters.employee || e.user_id === filters.employee
    const from = presetStart(filters.date)
    const matchesDate = !from || e.date >= from
    return matchesSearch && matchesStatus && matchesProject && matchesEmployee && matchesDate
  })
  const pendingEntries = filteredEntries.filter(e => e.status === 'pending' || e.status === 'missed')

  /** Exports the visible week as CSV — the Export control did nothing before. */
  function exportWeekCsv() {
    const header = ['Employee', 'Role', ...weekDays.map(d => d.key), 'Total']
    const rows = weekData.map(r => [
      r.name,
      r.role,
      ...weekDays.map(d => r.days[d.key]?.h ?? '-'),
      r.total,
    ])
    const escape = (v: string) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
    const csv = [header, ...rows].map(r => r.map(c => escape(String(c))).join(',')).join('\r\n')

    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `timesheet-${weekDays[0]?.iso ?? 'week'}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  async function handleSaveEntry(data: CreateTimeEntryInput) {
    const editing = modal.type === 'newEntry' ? modal.entry : undefined
    if (editing) {
      startTransition(async () => {
        const res = await updateTimeEntry(editing.id, data)
        if (!('error' in res)) {
          setEntries(prev => prev.map(e => e.id === editing.id
            ? { ...e, ...data, employee_name: employees.find(em => em.id === data.user_id)?.name ?? e.employee_name, project_name: projects.find(p => p.id === data.project_id)?.name ?? null }
            : e))
          setModal({ type: 'success', title: 'Entry Updated' })
        }
      })
    } else {
      startTransition(async () => {
        const res = await createTimeEntry(data)
        if ('id' in res) {
          const emp = employees.find(em => em.id === data.user_id)
          const proj = projects.find(p => p.id === data.project_id)
          const newEntry: TimeEntryRow = {
            ...data,
            // The create input leaves GPS optional; the row type does not.
            gps_lat: data.gps_lat ?? null,
            gps_lng: data.gps_lng ?? null,
            id: res.id,
            code: res.code ?? '',
            employee_name: emp?.name ?? '',
            employee_role: emp?.role ?? '',
            project_name: proj?.name ?? null,
            total_hours: computeHoursNum(data.clock_in, data.clock_out) || null,
            approved_at: null,
            created_at: new Date().toISOString(),
          }
          setEntries(prev => [newEntry, ...prev])
          setModal({ type: 'success', title: 'Entry Logged Successfully' })
        }
      })
    }
  }

  function handleDelete() {
    if (modal.type !== 'deleteConfirm') return
    const { entry } = modal
    startTransition(async () => {
      const res = await deleteTimeEntry(entry.id)
      if ('error' in res) { setActionError(res.error ?? 'That action could not be saved.'); return }
      setEntries(prev => prev.filter(e => e.id !== entry.id))
    })
    setModal({ type: 'none' })
  }

  function handleApprove(entry: TimeEntryRow) {
    startTransition(async () => {
      const res = await approveTimeEntry(entry.id, profile?.id)
      if ('error' in res) { setActionError(res.error ?? 'That action could not be saved.'); return }
      setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, status: 'approved', approved_at: new Date().toISOString() } : e))
    })
    if (modal.type === 'viewEntry') setModal({ type: 'none' })
  }

  function handleReject(entry: TimeEntryRow) {
    startTransition(async () => {
      const res = await rejectTimeEntry(entry.id)
      if ('error' in res) { setActionError(res.error ?? 'That action could not be saved.'); return }
      setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, status: 'missed', approved_at: null } : e))
    })
    if (modal.type === 'viewEntry') setModal({ type: 'none' })
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      {/* Phones get the on-site clock: punch in/out plus this week's summary. */}
      <MobileClockScreen entries={entries} projects={projects} />

      {/* Header */}
      <div className="hidden md:block flex-none bg-white border-b border-gray-100 px-8 py-3">
        <div className="flex items-center justify-end gap-3">
          <Clock size={18} className="text-gray-400" />
          <span className="text-sm font-medium text-gray-600">{entries.length} entries</span>
        </div>
      </div>

      <div className="hidden md:block flex-1 overflow-y-auto pb-10">
        {actionError && (
          <div className="mx-8 mt-6 flex items-start justify-between gap-4 rounded-xl border border-red-100 bg-red-50 px-5 py-3">
            <p className="text-xs text-red-600">{actionError}</p>
            <button onClick={() => setActionError(null)} className="text-red-400 hover:text-red-600 shrink-0"><X size={14} /></button>
          </div>
        )}
        {/* Stats */}
        <div className={`grid grid-cols-4 gap-5 px-8 pt-6 ${BAND_GAP}`}>
          {/* Each tile carries its own hue — green for who is on site, blue for
              hours, amber for misses, purple for approvals. */}
          <StatCard label="Clocked In Now" value={String(todayIn)} sub="Live on site" subColor="text-emerald-600"
            iconBg="bg-emerald-50" icon={<UserCheck size={16} className="text-emerald-500" strokeWidth={1.9} />} />
          <StatCard label="Hours This Week" value={`${weekHrs.toFixed(0)}h`} sub="Team total" subColor="text-blue-600"
            iconBg="bg-blue-50" icon={<Clock size={16} className="text-blue-500" strokeWidth={1.9} />} />
          <StatCard label="Missed Punch-outs" value={String(missedPunchout)}
            subColor="text-orange-600" iconBg="bg-orange-50" icon={<AlertCircle size={16} className="text-orange-500" strokeWidth={1.9} />} />
          <StatCard label="Pending Approvals" value={String(pendingCount)}
            iconBg="bg-purple-50" icon={<CalendarCheck size={16} className="text-purple-500" strokeWidth={1.9} />} />
        </div>

        <div className="px-8">
          {/* Tabs */}
          <div className={`flex border-b border-gray-200 gap-6 ${BAND_GAP}`}>
            <button onClick={() => setTab('weekly')} className={`pb-3 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === 'weekly' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>Weekly Timesheet</button>
            {/* Counts read inline in brackets, not as badges. */}
            <button onClick={() => setTab('log')} className={`pb-3 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === 'log' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
              Time Log ({entries.length})
            </button>
            <button onClick={() => setTab('approvals')} className={`pb-3 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === 'approvals' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
              Approvals Log ({pendingCount})
            </button>
          </div>

          {/* Toolbar */}
          {tab === 'weekly' && (
            <div className={`flex items-center justify-between ${CONTENT_GAP}`}>
              <div>
                <h3 className="text-base font-semibold text-gray-900">{weekOffset === 0 ? 'This Week' : weekOffset === -1 ? 'Last Week' : `Week ${weekOffset > 0 ? '+' : ''}${weekOffset}`}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{weekLabel}</p>
              </div>
              <div className="flex items-center gap-3">
                {/* Separate controls, as on the timesheet design. */}
                <button
                  onClick={() => setWeekOffset(w => w - 1)}
                  className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <ChevronLeft size={14} /> Prev
                </button>
                <button
                  onClick={() => setWeekOffset(0)}
                  className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  This Week
                </button>
                <button
                  onClick={() => setWeekOffset(w => w + 1)}
                  className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Next <ChevronRight size={14} />
                </button>
                <ImportExportButton onClick={exportWeekCsv} />
              </div>
            </div>
          )}

          {tab === 'log' && (
            <div className={`flex items-center justify-between ${CONTENT_GAP}`}>
              <SearchInput value={search} onChange={setSearch} placeholder="Search logs" className="w-60" />
              <div className="flex items-center gap-3">
                <div className="relative" ref={filterRef}>
                  <FilterButton
                    onClick={() => { setDraft(filters); setShowFilter(!showFilter) }}
                    active={showFilter}
                    count={activeTimeFilterCount(filters)}
                  />
                  {showFilter && (
                    <div className="absolute right-0 top-11 z-30 w-[420px] bg-white rounded-2xl shadow-[0_8px_30px_rgba(16,24,40,0.14)] p-5">
                      <p className="text-[11px] text-gray-400 mb-4">Filter</p>
                      <div className="space-y-5">
                        <div>
                          <label className="text-xs font-semibold text-gray-700 block mb-2.5">Status</label>
                          <div className="flex flex-wrap gap-2.5">
                            {(['approved', 'pending', 'missed'] as DbTimeStatus[]).map(st => (
                              <button
                                key={st}
                                onClick={() => setDraft(d => ({
                                  ...d,
                                  status: d.status.includes(st) ? d.status.filter(x => x !== st) : [...d.status, st],
                                }))}
                                className={filterChipCls(draft.status.includes(st))}
                              >
                                {STATUS_LABEL[st]}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-gray-700 block mb-2.5">Project</label>
                          {projects.length === 0 ? (
                            <p className="text-[11px] text-gray-400">No projects to filter by.</p>
                          ) : (
                            <div className="flex flex-wrap gap-2.5">
                              {/* Capped so the popover stays a popover; search covers the rest. */}
                              {projects.slice(0, 3).map(pr => (
                                <button
                                  key={pr.id}
                                  onClick={() => setDraft(d => ({
                                    ...d,
                                    projects: d.projects.includes(pr.id)
                                      ? d.projects.filter(x => x !== pr.id)
                                      : [...d.projects, pr.id],
                                  }))}
                                  className={filterChipCls(draft.projects.includes(pr.id))}
                                >
                                  {pr.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-gray-700 block mb-2.5">Date</label>
                          <div className="flex flex-wrap gap-2.5">
                            {DATE_PRESETS.map(preset => (
                              <button
                                key={preset.key}
                                onClick={() => setDraft(d => ({
                                  ...d,
                                  date: d.date === preset.key ? '' : preset.key,
                                }))}
                                className={filterChipCls(draft.date === preset.key)}
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-gray-700 block mb-2.5">Employee</label>
                          <PersonSelect
                            people={employees.map(emp => ({ id: emp.id, name: emp.name, title: emp.role, avatarUrl: emp.avatar_url }))}
                            value={draft.employee}
                            onChange={id => setDraft(d => ({ ...d, employee: id }))}
                            placeholder="All employees"
                            emptyHint="No employees to filter by."
                          />
                        </div>

                        <div className="flex gap-3 pt-1">
                          <button
                            onClick={() => { setDraft(EMPTY_TIME_FILTERS); setFilters(EMPTY_TIME_FILTERS) }}
                            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            Clear All
                          </button>
                          <button
                            onClick={() => { setFilters(draft); setShowFilter(false) }}
                            className="flex-1 px-4 py-2.5 bg-[#0D1B2A] text-white rounded-lg text-xs font-semibold hover:bg-[#162437] transition-colors"
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <button onClick={() => setModal({ type: 'newEntry' })} className="flex items-center gap-2 px-4 py-2.5 bg-[#0D1B2A] text-white text-xs font-semibold rounded-xl shadow-sm hover:bg-[#162437] active:scale-95 transition-all">
                  <Plus size={16} /> Log Manual Entry
                </button>
              </div>
            </div>
          )}

          {tab === 'approvals' && (
            <div className={`flex items-center justify-between ${CONTENT_GAP}`}>
              <p className="text-xs text-gray-500 font-medium">Review and approve time entries submitted by your team</p>
              <button
                onClick={() => {
                  pendingEntries.forEach(e => { if (e.status === 'pending') handleApprove(e) })
                }}
                className="flex items-center gap-2 px-5 py-2 bg-[#0D1B2A] text-white text-xs font-semibold rounded-lg shadow-sm hover:bg-[#162437]"
              >
                <Check size={14} /> Approve All
              </button>
            </div>
          )}

          {/* Tables */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {tab === 'weekly' && (
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#F8F9FB] border-b border-gray-100">
                  <tr className="text-[13px] font-normal text-gray-500">
                    <th className="px-6 py-4">Employee</th>
                    {weekDays.map(d => <th key={d.key} className="px-4 py-4 text-center">{d.key}</th>)}
                    <th className="px-4 py-4 text-center">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-xs">
                  {weekData.length === 0 ? (
                    <tr><td colSpan={9} className="px-6 py-10 text-center text-sm text-gray-400 font-medium">No entries for this week</td></tr>
                  ) : weekData.map((row, i) => (
                    <tr key={row.userId} {...enter.item(i, 'hover:bg-gray-50/50 transition-colors', 25)}>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-full shrink-0 bg-cover bg-center flex items-center justify-center text-white font-medium text-xs"
                            style={
                              avatarByUser.get(row.userId)
                                ? { backgroundImage: `url(${avatarByUser.get(row.userId)})` }
                                : { backgroundColor: avatarColor(row.userId) }
                            }
                          >
                            {!avatarByUser.get(row.userId) && row.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <p className="text-sm font-normal text-gray-900 leading-tight">{row.name}</p>
                            <p className="text-[13px] text-gray-400 font-normal capitalize mt-0.5">{row.role}</p>
                          </div>
                        </div>
                      </td>
                      {weekDays.map(wd => {
                        const cell = row.days[wd.key] || { h: '-', s: 'none' }
                        // Every recorded state gets the same tinted pill; only
                        // an untouched future day is left bare.
                        const style =
                          cell.s === 'missed'   ? 'bg-red-50 text-red-500' :
                          cell.s === 'approved' ? 'bg-emerald-50 text-emerald-600' :
                          cell.s === 'pending'  ? 'bg-amber-50 text-amber-600' :
                          'text-gray-300'
                        return (
                          <td key={wd.key} className="px-4 py-4 text-center">
                            <span className={`inline-flex items-center justify-center min-w-[60px] px-3 py-1.5 rounded-lg text-[13px] ${style}`}>
                              {cell.s === 'missed' ? 'Missed' : cell.h}
                            </span>
                          </td>
                        )
                      })}
                      <td className="px-4 py-4 text-center">
                        <span className="font-normal text-gray-900 text-[13px]">{row.total}</span>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50/70 text-gray-900 text-[13px] border-t border-gray-100">
                    <td className="px-6 py-5">Daily Total</td>
                    {dailyTotals.map((t, i) => <td key={i} className="px-4 py-4 text-center">{t}</td>)}
                    <td className="px-4 py-4 text-center">{weekHrs.toFixed(1)}h</td>
                  </tr>
                </tbody>
              </table>
            )}

            {tab === 'log' && (
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#F8F9FB] border-b border-gray-100">
                  <tr className="text-xs font-normal text-gray-500">
                    <th className="px-6 py-4">Employee</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Project</th>
                    <th className="px-6 py-4">Site / Location</th>
                    <th className="px-6 py-4">Clock In</th>
                    <th className="px-6 py-4">Clock Out</th>
                    <th className="px-6 py-4">Hours</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-xs font-normal text-gray-600">
                  {filteredEntries.length === 0 ? (
                    <tr><td colSpan={9} className="px-6 py-10 text-center text-sm text-gray-400">No time entries found</td></tr>
                  ) : filteredEntries.map((item, i) => {
                    const cfg = STATUS_CONFIG[item.status]
                    return (
                      <tr key={item.id} onClick={() => setModal({ type: 'viewEntry', entry: item })} {...enter.item(i, 'hover:bg-gray-50/50 transition-colors cursor-pointer', 25)}>
                        <td className="px-6 py-5 font-normal text-gray-900">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-9 h-9 rounded-full shrink-0 bg-cover bg-center flex items-center justify-center text-white text-[11px] font-medium"
                              style={
                                avatarByUser.get(item.user_id)
                                  ? { backgroundImage: `url(${avatarByUser.get(item.user_id)})` }
                                  : { backgroundColor: avatarColor(item.user_id) }
                              }
                            >
                              {!avatarByUser.get(item.user_id) && item.employee_name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <span className="text-sm">{item.employee_name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5">{fmtDate(item.date)}</td>
                        <td className="px-6 py-5">{item.project_name ?? '–'}</td>
                        <td className="px-6 py-5 truncate max-w-[150px]">{item.location ?? '–'}</td>
                        <td className="px-6 py-5">{fmtTime(item.clock_in)}</td>
                        <td className="px-6 py-5">{fmtTime(item.clock_out)}</td>
                        <td className="px-6 py-5 font-normal text-gray-900">{computeHours(item.clock_in, item.clock_out)}</td>
                        <td className="px-6 py-5">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-normal px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} /> {STATUS_LABEL[item.status]}
                          </span>
                        </td>
                        <td className="px-6 py-5" onClick={e => e.stopPropagation()}>
                          <ActionMenu
                            onView={() => setModal({ type: 'viewEntry', entry: item })}
                            onEdit={() => setModal({ type: 'newEntry', entry: item })}
                            onDelete={() => setModal({ type: 'deleteConfirm', entry: item })}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}

            {tab === 'approvals' && (
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#F8F9FB] border-b border-gray-100">
                  <tr className="text-xs font-normal text-gray-500">
                    <th className="px-6 py-4">Employee</th>
                    <th className="px-6 py-4">Project</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Clock In</th>
                    <th className="px-6 py-4">Clock Out</th>
                    <th className="px-6 py-4">Hours</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-xs font-normal text-gray-600">
                  {pendingEntries.length === 0 ? (
                    <tr><td colSpan={8} className="px-6 py-10 text-center text-sm text-gray-400">No entries pending approval</td></tr>
                  ) : pendingEntries.map((item, i) => {
                    const cfg = STATUS_CONFIG[item.status]
                    return (
                      <tr key={item.id} {...enter.item(i, 'hover:bg-gray-50/50 transition-colors', 25)}>
                        <td className="px-6 py-5 font-normal text-gray-900">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-9 h-9 rounded-full shrink-0 bg-cover bg-center flex items-center justify-center text-white text-[11px] font-medium"
                              style={
                                avatarByUser.get(item.user_id)
                                  ? { backgroundImage: `url(${avatarByUser.get(item.user_id)})` }
                                  : { backgroundColor: avatarColor(item.user_id) }
                              }
                            >
                              {!avatarByUser.get(item.user_id) && item.employee_name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <span className="text-sm">{item.employee_name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5">{item.project_name ?? '–'}</td>
                        <td className="px-6 py-5">{fmtDate(item.date)}</td>
                        <td className="px-6 py-5">{fmtTime(item.clock_in)}</td>
                        <td className="px-6 py-5">{fmtTime(item.clock_out)}</td>
                        <td className="px-6 py-5 font-normal text-gray-900">{computeHours(item.clock_in, item.clock_out)}</td>
                        <td className="px-6 py-5">
                          <span className={`text-[10px] font-normal px-2 py-0.5 rounded ${cfg.bg} ${cfg.text} capitalize`}>{STATUS_LABEL[item.status]}</span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleApprove(item)}
                              disabled={isPending}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white rounded-md text-[10px] font-semibold shadow-sm hover:bg-emerald-600 disabled:opacity-50"
                            >
                              <Check size={12} /> Approve
                            </button>
                            <button
                              onClick={() => handleReject(item)}
                              disabled={isPending}
                              className="flex items-center gap-1.5 px-3 py-1.5 border border-red-100 text-red-600 bg-white rounded-md text-[10px] font-semibold hover:bg-red-50 disabled:opacity-50"
                            >
                              <X size={12} /> Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {modal.type === 'newEntry' && (
        <LogManualEntrySidebar
          entry={modal.entry}
          onClose={() => setModal({ type: 'none' })}
          onSave={handleSaveEntry}
          employees={employees}
          projects={projects}
        />
      )}
      {modal.type === 'viewEntry' && (
        <TimeEntryDetailSidebar
          entry={modal.entry}
          onClose={() => setModal({ type: 'none' })}
          onApprove={() => handleApprove(modal.entry)}
          onReject={() => handleReject(modal.entry)}
        />
      )}
      {modal.type === 'deleteConfirm' && (
        <ConfirmDeleteModal
          entry={modal.entry}
          onClose={() => setModal({ type: 'none' })}
          onConfirm={handleDelete}
        />
      )}
      {modal.type === 'success' && (
        <SuccessModal
          title={modal.title}
          subtitle="The timesheet has been successfully updated."
          onClose={() => setModal({ type: 'none' })}
        />
      )}
    </div>
  )
}
