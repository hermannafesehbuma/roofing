'use client'

import { useState, useEffect, useRef, useTransition, useMemo } from 'react'
import {
  Search, Filter as FilterIcon, Plus, X, Check, MoreHorizontal,
  Trash2, Eye, Pencil, ChevronLeft, ChevronRight,
  Clock, MapPin, FileText, Map as MapIcon
} from 'lucide-react'
import type { TimeEntryRow, DbTimeStatus, CreateTimeEntryInput, TimeFormOptions } from './actions'
import {
  createTimeEntry, updateTimeEntry, deleteTimeEntry,
  approveTimeEntry, rejectTimeEntry,
} from './actions'

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

function computeHours(clockIn: string, clockOut: string | null): string {
  if (!clockOut) return '–'
  const [hi, mi] = clockIn.split(':').map(Number)
  const [ho, mo] = clockOut.split(':').map(Number)
  const mins = ho * 60 + mo - (hi * 60 + mi)
  if (mins <= 0) return '–'
  return `${(mins / 60).toFixed(1)}h`
}

function computeHoursNum(clockIn: string, clockOut: string | null): number {
  if (!clockOut) return 0
  const [hi, mi] = clockIn.split(':').map(Number)
  const [ho, mo] = clockOut.split(':').map(Number)
  const mins = ho * 60 + mo - (hi * 60 + mi)
  return Math.max(0, mins / 60)
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
    const dayNum = String(d.getDate()).padStart(2, '0')
    const iso = d.toISOString().split('T')[0]
    return { key: `${dayName} ${dayNum}`, iso, label: dayName }
  })
}

interface WeekRow {
  userId: string
  name: string
  role: string
  days: Record<string, { h: string; s: 'approved' | 'pending' | 'missed' | 'none' }>
  total: string
}

function buildWeekData(entries: TimeEntryRow[], weekDays: { key: string; iso: string }[]): WeekRow[] {
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
      if (!entry) {
        days[wd.key] = { h: '-', s: 'none' }
      } else {
        const h = computeHoursNum(entry.clock_in, entry.clock_out)
        total += h
        days[wd.key] = {
          h: h > 0 ? `${h.toFixed(1)}h` : '-',
          s: entry.status as 'approved' | 'pending' | 'missed',
        }
      }
    }
    return { userId, name: first.employee_name, role: first.employee_role, days, total: `${total.toFixed(1)}h` }
  })
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
function StatCard({ label, value, sub, variant = 'default' }: { label: string; value: string; sub?: string; variant?: 'default' | 'success' | 'info' | 'alert' | 'purple' }) {
  const border = variant === 'success' ? 'border-emerald-100' : variant === 'alert' ? 'border-red-100' : variant === 'purple' ? 'border-purple-100' : 'border-gray-100'
  const tag = variant === 'success' ? 'bg-emerald-50 text-emerald-600' : variant === 'alert' ? 'bg-red-50 text-red-600' : variant === 'info' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
  return (
    <div className={`bg-white rounded-xl border p-5 shadow-sm ${border}`}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-gray-500 font-bold tracking-wide uppercase">{label}</span>
        {sub && <span className={`text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${tag}`}>{sub}</span>}
      </div>
      <p className="text-3xl font-black text-gray-900">{value}</p>
    </div>
  )
}

function ActionMenu({ onView, onEdit, onDelete }: { onView: () => void; onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  return (
    <div ref={ref} className="relative flex justify-center">
      <button onClick={(e) => { e.stopPropagation(); setOpen(!open) }} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">
        <MoreHorizontal size={14} />
      </button>
      {open && (
        <div className="absolute right-0 top-8 w-40 bg-white border border-gray-100 rounded-xl shadow-xl z-30 py-1 origin-top-right overflow-hidden">
          <button onClick={() => { setOpen(false); onView() }} className="w-full text-left px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2"><Eye size={14} className="text-gray-400" /> View Detail</button>
          <button onClick={() => { setOpen(false); onEdit() }} className="w-full text-left px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2"><Pencil size={14} className="text-gray-400" /> Edit</button>
          <div className="border-t border-gray-50 my-1" />
          <button onClick={() => { setOpen(false); onDelete() }} className="w-full text-left px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 size={14} /> Delete</button>
        </div>
      )}
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
      <div className="fixed inset-0 bg-black/40 z-[100] backdrop-blur-[1px]" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-[101] flex">
        <div className="bg-white w-[580px] max-w-full h-full flex flex-col shadow-2xl">
          <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100 shrink-0">
            <h2 className="text-lg font-black text-gray-900">{entry ? 'Edit Entry' : 'Log Manual Entry'}</h2>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"><X size={18} /></button>
          </div>

          <div className="overflow-y-auto flex-1 px-8 py-8 bg-[#FCFCFD] space-y-6">
            <div>
              <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Entry Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">Employee</label>
                  <select value={userId} onChange={e => setUserId(e.target.value)} className={selectCls}>
                    <option value="">Select Employee</option>
                    {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">Date</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">Project</label>
                  <select value={projectId} onChange={e => setProjectId(e.target.value)} className={selectCls}>
                    <option value="">Select Project</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">Site / Location</label>
                  <input value={loc} onChange={e => setLoc(e.target.value)} placeholder="Enter site location" className={inputCls} />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Time</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">Clock In</label>
                  <input type="time" value={clockIn} onChange={e => setClockIn(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">Clock Out</label>
                  <input type="time" value={clockOut} onChange={e => setClockOut(e.target.value)} className={inputCls} />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">Note</label>
              <textarea rows={4} value={note} onChange={e => setNote(e.target.value)} placeholder="Enter reason or details..." className={`${inputCls} resize-none py-3`} />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-7 py-5 border-t border-gray-100 bg-white">
            <button onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-50 rounded-xl">Close</button>
            <button
              onClick={submit}
              disabled={saving || !userId || !date || !clockIn}
              className="px-7 py-2.5 text-sm font-bold text-white bg-[#0D1B2A] hover:bg-[#162437] rounded-xl shadow-sm disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Entry'}
            </button>
          </div>
        </div>
      </div>
    </>
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
  const cfg = STATUS_CONFIG[entry.status]
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[100] backdrop-blur-[1px]" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-[101] flex">
        <div className="bg-white w-[520px] max-w-full h-full flex flex-col shadow-2xl">
          <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100 shrink-0">
            <h2 className="text-lg font-black text-gray-900">Time Entry Detail</h2>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"><X size={18} /></button>
          </div>

          <div className="overflow-y-auto flex-1 px-8 py-7 bg-[#FCFCFD] space-y-8">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-black text-base shadow-md" style={{ backgroundColor: avatarColor(entry.user_id) }}>
                    {entry.employee_name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-gray-900">{entry.employee_name}</h3>
                    <p className="text-xs font-bold text-gray-400 capitalize">{entry.employee_role}</p>
                  </div>
                </div>
                <span className={`flex items-center gap-1.5 text-[10px] font-black px-2 py-1 rounded-full ${cfg.bg} ${cfg.text} uppercase tracking-wider`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} /> {STATUS_LABEL[entry.status]}
                </span>
              </div>
            </div>

            <div>
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Time Details</h4>
              <div className="bg-white border border-gray-100 rounded-xl divide-y divide-gray-50 shadow-sm">
                {[
                  { label: 'Date',       val: fmtDate(entry.date) },
                  { label: 'Clock In',   val: fmtTime(entry.clock_in) },
                  { label: 'Clock Out',  val: fmtTime(entry.clock_out) },
                ].map(r => (
                  <div key={r.label} className="flex justify-between items-center px-5 py-4">
                    <span className="text-sm text-gray-500 font-medium">{r.label}</span>
                    <span className="text-sm text-gray-900 font-bold">{r.val}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center px-5 py-4 bg-gray-50/50">
                  <span className="text-sm text-gray-900 font-bold">Total Hours</span>
                  <span className="text-lg font-black text-gray-900">{computeHours(entry.clock_in, entry.clock_out)}</span>
                </div>
              </div>
            </div>

            {entry.note && (
              <div>
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Notes</h4>
                <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                  <p className="text-xs text-gray-600 font-medium leading-relaxed italic">"{entry.note}"</p>
                </div>
              </div>
            )}

            <div>
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Location &amp; Project</h4>
              <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-bold text-gray-400">Project</p>
                    <p className="text-sm font-bold text-gray-900">{entry.project_name ?? '–'}</p>
                  </div>
                  {entry.location && (
                    <div className="text-right">
                      <p className="text-xs font-bold text-gray-400">Site</p>
                      <p className="text-sm font-bold text-gray-900">{entry.location}</p>
                    </div>
                  )}
                </div>
                <div className="w-full h-32 bg-[#F0F3F8] rounded-xl relative overflow-hidden flex items-center justify-center border border-gray-100">
                  <div className="absolute inset-0 opacity-30 bg-[radial-gradient(#D1D5DB_1px,transparent_1px)] [background-size:10px_10px]" />
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-blue-100/50 rounded-full animate-pulse flex items-center justify-center">
                    <div className="w-8 h-8 bg-white shadow-lg rounded-full flex items-center justify-center text-blue-600">
                      <MapPin size={18} fill="currentColor" fillOpacity={0.3} />
                    </div>
                  </div>
                  <div className="absolute bottom-3 left-3 bg-white px-2.5 py-1 rounded-md shadow-sm border border-gray-100 text-[10px] font-black text-gray-500 flex items-center gap-1.5">
                    <MapIcon size={10} /> GPS Verified
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Entry Log</h4>
              <div className="relative pl-6 space-y-6 text-xs">
                <div className="absolute left-[6px] top-1 bottom-1 w-px border-l border-dashed border-gray-200" />
                <div className="relative">
                  <div className="absolute left-[-24px] top-0.5 w-3 h-3 rounded-full border-2 border-white bg-gray-400" />
                  <p className="font-bold text-gray-900">Clocked Out</p>
                  <p className="text-gray-400 mt-0.5">{fmtDate(entry.date)} at {fmtTime(entry.clock_out)} • GPS verified</p>
                </div>
                <div className="relative">
                  <div className="absolute left-[-24px] top-0.5 w-3 h-3 rounded-full border-2 border-white bg-emerald-500" />
                  <p className="font-bold text-gray-900">Clocked In</p>
                  <p className="text-gray-400 mt-0.5">{fmtDate(entry.date)} at {fmtTime(entry.clock_in)} • GPS verified</p>
                </div>
              </div>
            </div>
          </div>

          <div className="px-7 py-5 bg-white border-t border-gray-100 flex justify-end gap-3">
            <button onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50 border border-gray-200 rounded-xl">Close</button>
            {entry.status === 'pending' && (
              <>
                <button onClick={onReject} className="px-4 py-2.5 text-sm font-bold text-red-600 border border-red-100 hover:bg-red-50 rounded-xl">Reject</button>
                <button onClick={onApprove} className="px-6 py-2.5 text-sm font-bold text-white bg-[#0D1B2A] rounded-xl shadow-sm flex items-center gap-2">
                  <Check size={16} /> Approve Entry
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function ConfirmDeleteModal({ entry, onClose, onConfirm }: { entry: TimeEntryRow; onClose: () => void; onConfirm: () => void }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-[1px] z-[110]" onClick={onClose} />
      <div className="fixed inset-0 z-[111] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center relative">
          <button onClick={onClose} className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"><X size={16} /></button>
          <div className="w-14 h-14 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-5 border border-red-100">
            <Trash2 size={24} />
          </div>
          <h3 className="text-lg font-black text-gray-900 mb-2">Delete Entry</h3>
          <p className="text-sm text-gray-500 mb-8">Are you sure you want to delete this <span className="font-bold text-gray-800">{entry.employee_name}</span> time entry?<br />This action cannot be undone.</p>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={onConfirm} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 rounded-xl text-sm font-bold text-white shadow-sm">Delete</button>
          </div>
        </div>
      </div>
    </>
  )
}

function SuccessPopup({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-[1px] z-[120]" onClick={onClose} />
      <div className="fixed inset-0 z-[121] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center text-center">
          <div className="w-14 h-14 bg-emerald-500 rounded-xl flex items-center justify-center shadow-md mb-5 text-white">
            <Check size={32} strokeWidth={3} />
          </div>
          <h3 className="text-lg font-black text-gray-900 mb-1">{title}</h3>
          <p className="text-xs font-medium text-gray-400 mb-6">The timesheet has been successfully updated.</p>
          <button onClick={onClose} className="w-full bg-[#0D1B2A] text-white py-2.5 rounded-xl text-sm font-bold hover:bg-[#162437] shadow-sm">Done</button>
        </div>
      </div>
    </>
  )
}

// ─── Main Client Component ─────────────────────────────────────────────────────
interface Props {
  initialEntries: TimeEntryRow[]
  employees: TimeFormOptions['employees']
  projects:  TimeFormOptions['projects']
}

export function TimeTrackingClient({ initialEntries, employees, projects }: Props) {
  const [entries,      setEntries]      = useState(initialEntries)
  const [tab,          setTab]          = useState<'weekly' | 'log' | 'approvals'>('weekly')
  const [search,       setSearch]       = useState('')
  const [modal,        setModal]        = useState<ModalState>({ type: 'none' })
  const [weekOffset,   setWeekOffset]   = useState(0)
  const [showFilter,   setShowFilter]   = useState(false)
  const [isPending,    startTransition] = useTransition()

  const weekDays = useMemo(() => getWeekDays(weekOffset), [weekOffset])
  const weekData = useMemo(() => buildWeekData(entries, weekDays), [entries, weekDays])

  // Stats
  const today    = new Date().toISOString().split('T')[0]
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

  const filteredEntries = entries.filter(e =>
    !search || e.employee_name.toLowerCase().includes(search.toLowerCase()) ||
    (e.project_name ?? '').toLowerCase().includes(search.toLowerCase())
  )
  const pendingEntries = filteredEntries.filter(e => e.status === 'pending' || e.status === 'missed')

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
            id: res.id,
            code: res.code ?? '',
            employee_name: emp?.name ?? '',
            employee_role: emp?.role ?? '',
            project_name: proj?.name ?? null,
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
      if (!('error' in res)) setEntries(prev => prev.filter(e => e.id !== entry.id))
    })
    setModal({ type: 'none' })
  }

  function handleApprove(entry: TimeEntryRow) {
    startTransition(async () => {
      const res = await approveTimeEntry(entry.id)
      if (!('error' in res)) setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, status: 'approved' } : e))
    })
    if (modal.type === 'viewEntry') setModal({ type: 'none' })
  }

  function handleReject(entry: TimeEntryRow) {
    startTransition(async () => {
      const res = await rejectTimeEntry(entry.id)
      if (!('error' in res)) setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, status: 'missed' } : e))
    })
    if (modal.type === 'viewEntry') setModal({ type: 'none' })
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#F4F6F9]">
      {/* Header */}
      <div className="flex-none bg-white border-b border-gray-100 px-8 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight">Time Tracking</h1>
            <p className="text-gray-400 text-xs mt-0.5 font-medium">Clock In/Out, manage timesheets, and approve team hours.</p>
          </div>
          <div className="flex items-center gap-3">
            <Clock size={18} className="text-gray-400" />
            <span className="text-sm font-bold text-gray-600">{entries.length} entries</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-10">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-5 px-8 pt-6 mb-8">
          <StatCard label="Clocked In Now"     value={String(todayIn)}             sub="Live on site" variant="success" />
          <StatCard label="Hours This Week"     value={`${weekHrs.toFixed(0)}h`}   sub="Team total"   variant="info" />
          <StatCard label="Missed Punch-outs"   value={String(missedPunchout)}                         variant="alert" />
          <StatCard label="Pending Approvals"   value={String(pendingCount)}                           variant="purple" />
        </div>

        <div className="px-8">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 gap-6 mb-6">
            <button onClick={() => setTab('weekly')} className={`pb-3 text-sm font-bold border-b-2 -mb-px transition-colors ${tab === 'weekly' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>Weekly Timesheet</button>
            <button onClick={() => setTab('log')} className={`pb-3 text-sm font-bold border-b-2 -mb-px flex items-center gap-2 transition-colors ${tab === 'log' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
              Time Log <span className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px]">{entries.length}</span>
            </button>
            <button onClick={() => setTab('approvals')} className={`pb-3 text-sm font-bold border-b-2 -mb-px flex items-center gap-2 transition-colors ${tab === 'approvals' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
              Approvals <span className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px]">{pendingCount}</span>
            </button>
          </div>

          {/* Toolbar */}
          {tab === 'weekly' && (
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-black text-gray-900">{weekOffset === 0 ? 'This Week' : weekOffset === -1 ? 'Last Week' : `Week ${weekOffset > 0 ? '+' : ''}${weekOffset}`}</h3>
                <p className="text-xs text-gray-400 font-medium">{weekLabel}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
                  <button onClick={() => setWeekOffset(w => w - 1)} className="p-1.5 hover:bg-gray-50 rounded-lg text-gray-400"><ChevronLeft size={16} /></button>
                  <button onClick={() => setWeekOffset(0)} className="px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 rounded-lg">This Week</button>
                  <button onClick={() => setWeekOffset(w => w + 1)} className="p-1.5 hover:bg-gray-50 rounded-lg text-gray-400"><ChevronRight size={16} /></button>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 shadow-sm">
                  <FileText size={14} /> Export
                </button>
              </div>
            </div>
          )}

          {tab === 'log' && (
            <div className="flex items-center justify-between mb-5">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search logs..."
                  className="pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-xl bg-white w-60 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                />
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <button onClick={() => setShowFilter(!showFilter)} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 shadow-sm">
                    <FilterIcon size={14} /> Filter
                  </button>
                  {showFilter && (
                    <div className="absolute right-0 top-11 bg-white border border-gray-100 shadow-xl rounded-xl w-72 z-20 p-5">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Filter Options</h4>
                      <div className="space-y-3">
                        <label className="text-xs font-bold text-gray-700 block mb-1">Status</label>
                        <div className="flex gap-2">
                          {(['approved', 'pending', 'missed'] as DbTimeStatus[]).map(s => (
                            <button key={s} className="px-3 py-1 text-xs font-bold rounded-full border border-gray-200 hover:border-blue-500 hover:text-blue-600 bg-white capitalize">{STATUS_LABEL[s]}</button>
                          ))}
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 border-t border-gray-100 mt-4 pt-3">
                        <button onClick={() => setShowFilter(false)} className="px-3 py-1.5 text-xs font-bold text-gray-500">Clear</button>
                        <button onClick={() => setShowFilter(false)} className="px-4 py-1.5 bg-[#0D1B2A] text-white text-xs font-bold rounded-lg">Apply</button>
                      </div>
                    </div>
                  )}
                </div>
                <button onClick={() => setModal({ type: 'newEntry' })} className="flex items-center gap-2 px-4 py-2 bg-[#0D1B2A] text-white text-xs font-bold rounded-xl shadow-sm hover:bg-[#162437] active:scale-95 transition-all">
                  <Plus size={16} /> Log Manual Entry
                </button>
              </div>
            </div>
          )}

          {tab === 'approvals' && (
            <div className="flex items-center justify-between mb-5">
              <p className="text-xs text-gray-500 font-medium">Review and approve time entries submitted by your team</p>
              <button
                onClick={() => {
                  pendingEntries.forEach(e => { if (e.status === 'pending') handleApprove(e) })
                }}
                className="flex items-center gap-2 px-5 py-2 bg-[#0D1B2A] text-white text-xs font-bold rounded-lg shadow-sm hover:bg-[#162437]"
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
                  <tr className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                    <th className="px-6 py-4">Employee</th>
                    {weekDays.map(d => <th key={d.key} className="px-4 py-4 text-center">{d.key}</th>)}
                    <th className="px-4 py-4 text-center">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-xs">
                  {weekData.length === 0 ? (
                    <tr><td colSpan={9} className="px-6 py-10 text-center text-sm text-gray-400 font-medium">No entries for this week</td></tr>
                  ) : weekData.map(row => (
                    <tr key={row.userId} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-[10px]" style={{ backgroundColor: avatarColor(row.userId) }}>
                            {row.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <p className="font-black text-gray-900">{row.name}</p>
                            <p className="text-[10px] text-gray-400 font-medium capitalize">{row.role}</p>
                          </div>
                        </div>
                      </td>
                      {weekDays.map(wd => {
                        const cell = row.days[wd.key] || { h: '-', s: 'none' }
                        const style =
                          cell.s === 'approved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                          cell.s === 'pending'  ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                          cell.s === 'missed'   ? 'bg-red-50 text-red-500 border border-red-100' :
                          'text-gray-400'
                        return (
                          <td key={wd.key} className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center justify-center w-14 py-1.5 rounded-lg font-black text-[10px] ${style}`}>{cell.h}</span>
                          </td>
                        )
                      })}
                      <td className="px-4 py-3 text-center">
                        <span className="font-black text-gray-900 text-xs">{row.total}</span>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-black text-gray-900 text-[10px] uppercase tracking-wider border-t border-gray-200">
                    <td className="px-6 py-4">Daily Total</td>
                    {dailyTotals.map((t, i) => <td key={i} className="px-4 py-4 text-center">{t}</td>)}
                    <td className="px-4 py-4 text-center">{weekHrs.toFixed(1)}h</td>
                  </tr>
                </tbody>
              </table>
            )}

            {tab === 'log' && (
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#F8F9FB] border-b border-gray-100">
                  <tr className="text-[10px] font-black uppercase tracking-wider text-gray-500">
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
                <tbody className="divide-y divide-gray-50 text-xs font-medium text-gray-600">
                  {filteredEntries.length === 0 ? (
                    <tr><td colSpan={9} className="px-6 py-10 text-center text-sm text-gray-400">No time entries found</td></tr>
                  ) : filteredEntries.map(item => {
                    const cfg = STATUS_CONFIG[item.status]
                    return (
                      <tr key={item.id} onClick={() => setModal({ type: 'viewEntry', entry: item })} className="hover:bg-gray-50/50 transition-colors cursor-pointer">
                        <td className="px-6 py-4 font-black text-gray-900">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[8px] font-black" style={{ backgroundColor: avatarColor(item.user_id) }}>
                              {item.employee_name.split(' ').map(n => n[0]).join('')}
                            </div>
                            {item.employee_name}
                          </div>
                        </td>
                        <td className="px-6 py-4">{fmtDate(item.date)}</td>
                        <td className="px-6 py-4">{item.project_name ?? '–'}</td>
                        <td className="px-6 py-4 truncate max-w-[150px]">{item.location ?? '–'}</td>
                        <td className="px-6 py-4">{fmtTime(item.clock_in)}</td>
                        <td className="px-6 py-4">{fmtTime(item.clock_out)}</td>
                        <td className="px-6 py-4 font-black text-gray-900">{computeHours(item.clock_in, item.clock_out)}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.text} uppercase tracking-wider`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} /> {STATUS_LABEL[item.status]}
                          </span>
                        </td>
                        <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
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
                  <tr className="text-[10px] font-black uppercase tracking-wider text-gray-500">
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
                <tbody className="divide-y divide-gray-50 text-xs font-medium text-gray-600">
                  {pendingEntries.length === 0 ? (
                    <tr><td colSpan={8} className="px-6 py-10 text-center text-sm text-gray-400">No entries pending approval</td></tr>
                  ) : pendingEntries.map(item => {
                    const cfg = STATUS_CONFIG[item.status]
                    return (
                      <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 font-black text-gray-900">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[8px] font-black" style={{ backgroundColor: avatarColor(item.user_id) }}>
                              {item.employee_name.split(' ').map(n => n[0]).join('')}
                            </div>
                            {item.employee_name}
                          </div>
                        </td>
                        <td className="px-6 py-4">{item.project_name ?? '–'}</td>
                        <td className="px-6 py-4">{fmtDate(item.date)}</td>
                        <td className="px-6 py-4">{fmtTime(item.clock_in)}</td>
                        <td className="px-6 py-4">{fmtTime(item.clock_out)}</td>
                        <td className="px-6 py-4 font-black text-gray-900">{computeHours(item.clock_in, item.clock_out)}</td>
                        <td className="px-6 py-4">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.text} capitalize`}>{STATUS_LABEL[item.status]}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleApprove(item)}
                              disabled={isPending}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white rounded-md text-[10px] font-black shadow-sm hover:bg-emerald-600 disabled:opacity-50"
                            >
                              <Check size={12} /> Approve
                            </button>
                            <button
                              onClick={() => handleReject(item)}
                              disabled={isPending}
                              className="flex items-center gap-1.5 px-3 py-1.5 border border-red-100 text-red-600 bg-white rounded-md text-[10px] font-black hover:bg-red-50 disabled:opacity-50"
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
        <SuccessPopup title={modal.title} onClose={() => setModal({ type: 'none' })} />
      )}
    </div>
  )
}
