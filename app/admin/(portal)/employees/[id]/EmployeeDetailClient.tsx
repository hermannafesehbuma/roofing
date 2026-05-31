'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ChevronRight, Pencil, Mail, Bell, Search, Filter,
  MoreHorizontal, Eye, MessageSquare, X, FileText,
  ChevronDown, Send, Smile, ChevronLeft,
} from 'lucide-react'
import UserHeaderBadge from '@/app/components/ui/UserHeaderBadge'
import { updateEmployee, uploadAvatar, type EmployeeRow, type UpdateEmployeeInput } from '../actions'
import { EmployeeFormPanel, type FormValues } from '../EmployeeFormPanel'

// ─── Shared ───────────────────────────────────────────────────────────────────
function Overlay({ onClick }: { onClick?: () => void }) {
  return <div className="fixed inset-0 bg-black/30 z-40 backdrop-blur-[1px]" onClick={onClick} />
}

function useOutsideClick(ref: React.RefObject<HTMLElement | null>, cb: () => void) {
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) cb() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [ref, cb])
}

const avatarColors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#6366F1', '#EC4899']

function avatarColor(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash)
  return avatarColors[Math.abs(hash) % avatarColors.length]
}

const statusLabels: Record<string, string> = { active: 'Active', on_leave: 'On Leave', inactive: 'Inactive' }
const typeLabels: Record<string, string> = {
  full_time: 'Full-Time', part_time: 'Part-Time',
  contractor: 'Contractor', subcontractor: 'Subcontractor',
}

const rfiStatusCfg: Record<string, { text: string; dot: string; bg: string }> = {
  'In Review': { text: 'text-orange-600', dot: 'bg-orange-400', bg: 'bg-orange-50' },
  'Closed':    { text: 'text-gray-500',   dot: 'bg-gray-400',   bg: 'bg-gray-100' },
}
const submStatusCfg: Record<string, { text: string; bg: string }> = {
  'Approved':  { text: 'text-emerald-600', bg: 'bg-emerald-50' },
  'In Review': { text: 'text-orange-600',  bg: 'bg-orange-50'  },
}

// ─── Basic Info Tab ───────────────────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center border-b border-gray-50 pb-3 last:border-0 last:pb-0">
      <span className="w-52 text-xs text-gray-500">{label}:</span>
      <span className="text-xs font-medium text-gray-800">{value || '—'}</span>
    </div>
  )
}

function BasicInfoTab({ emp }: { emp: EmployeeRow }) {
  return (
    <>
      <div className="mb-8">
        <p className="text-[10px] font-semibold text-gray-400 tracking-widest uppercase mb-4">Contact Information</p>
        <div className="space-y-3">
          <InfoRow label="Email" value={emp.email} />
          <InfoRow label="Phone Number" value={emp.phone ?? ''} />
        </div>
      </div>
      <div className="mb-8">
        <p className="text-[10px] font-semibold text-gray-400 tracking-widest uppercase mb-4">Work Information</p>
        <div className="space-y-3">
          <InfoRow label="Role" value={emp.role.charAt(0).toUpperCase() + emp.role.slice(1)} />
          <InfoRow label="Employee Type" value={typeLabels[emp.employee_type ?? ''] ?? ''} />
          <InfoRow label="Department" value={emp.department ?? ''} />
          <InfoRow label="Rate of Pay" value={emp.rate_of_pay ? `$${emp.rate_of_pay}/hr` : ''} />
          <InfoRow label="Start Date" value={emp.start_date ?? ''} />
        </div>
      </div>
      <div className="mb-8">
        <p className="text-[10px] font-semibold text-gray-400 tracking-widest uppercase mb-4">Personal Information</p>
        <div className="space-y-3">
          <InfoRow label="First Name" value={emp.first_name} />
          <InfoRow label="Last Name" value={emp.last_name} />
          <InfoRow label="Gender" value={emp.gender ?? ''} />
          <InfoRow label="Status" value={statusLabels[emp.status] ?? emp.status} />
        </div>
      </div>
    </>
  )
}

// ─── Tab: Assigned Projects ───────────────────────────────────────────────────
const projects = [
  { id: 1, name: 'Oakdale Residential Reroofing', type: 'Residential · Oakdale',    status: 'Completed',   manager: 'Karen Brooks', client: 'Johnson Family', due: 'Apr 15, 2026', progress: 100, gradient: 'from-blue-400 to-blue-600' },
  { id: 2, name: 'Metro Commercial Flat Roof',    type: 'Commercial · Downtown, NV', status: 'In Progress', manager: 'Derek Owens',  client: 'Metro Corp',    due: 'May 30, 2026', progress: 50,  gradient: 'from-amber-400 to-orange-500' },
  { id: 3, name: 'Summerlin Flat TPO Install',    type: 'Commercial · Summerlin, NV',status: 'In Progress', manager: 'Derek Owens',  client: 'Summerlin Dev', due: 'Feb 28, 2026', progress: 40,  gradient: 'from-emerald-400 to-teal-500' },
]

function ProjectCard({ p }: { p: typeof projects[0] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useOutsideClick(ref, () => setOpen(false))
  const progressColor = p.progress === 100 ? '#10B981' : '#0D1B2A'
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-visible hover:shadow-md transition-shadow">
      <div className={`h-40 bg-gradient-to-br ${p.gradient} rounded-t-xl relative`}>
        <div ref={ref} className="absolute top-3 right-3">
          <button onClick={() => setOpen(!open)} className="w-7 h-7 flex items-center justify-center rounded-full bg-white/80 hover:bg-white text-gray-600 shadow-sm">
            <MoreHorizontal size={15} />
          </button>
          {open && (
            <div className="absolute right-0 top-9 z-20 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 w-36">
              <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"><Eye size={13} /> View Project</button>
            </div>
          )}
        </div>
      </div>
      <div className="px-4 py-3.5">
        <h3 className="text-sm font-semibold text-gray-900 leading-tight mb-1">{p.name}</h3>
        <p className="text-[11px] text-gray-400 mb-3">{p.type}</p>
        <div className="space-y-1.5 text-xs mb-3">
          <div className="flex justify-between"><span className="text-gray-400">Status</span><span className={`font-medium ${p.status === 'In Progress' ? 'text-orange-500' : 'text-emerald-600'}`}>{p.status}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">Manager</span><span className="font-medium text-gray-700">{p.manager}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">Client</span><span className="font-medium text-gray-700">{p.client}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">Due Date</span><span className="font-medium text-gray-700">{p.due}</span></div>
        </div>
        <div>
          <div className="flex justify-between text-[11px] mb-1"><span className="text-gray-400">Progress</span><span className="font-medium text-gray-700">{p.progress}%</span></div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${p.progress}%`, backgroundColor: progressColor }} /></div>
        </div>
      </div>
    </div>
  )
}

function AssignedProjectsTab() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input placeholder="Search" className="w-full pl-8 pr-4 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D1B2A]/10 focus:border-[#0D1B2A]" />
        </div>
        <div className="flex-1" />
        <button className="flex items-center gap-1.5 px-3 py-2 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"><Filter size={13} /> Filter</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{projects.map((p) => <ProjectCard key={p.id} p={p} />)}</div>
    </div>
  )
}

// ─── Tab: Project Timeline ────────────────────────────────────────────────────
const timelineDays = ['M31','T1','W2','T4','F5','S6','S7','M8','T9','W10','T11','F12','S13','S14','M15','W16','W17','T18','F19','S20']
const ganttRows = [
  { project: 'Metro Commercial Flat', tasks: [{ label: 'Roofing', sub: 'Fixing woods & metals', start: 0, width: 25, color: '#F97316', avatars: [] as string[] }, { label: 'Roofing', sub: 'Fixing woods & metals', start: 40, width: 22, color: '#F97316', avatars: ['BS', 'JO'] }] },
  { project: '', tasks: [{ label: 'Roofing', sub: 'Fixing woods & metals', start: 15, width: 28, color: '#F97316', avatars: [] as string[] }] },
  { project: 'Highland Tearoff', tasks: [{ label: '', sub: '', start: 40, width: 58, color: '#C4B5FD', avatars: [] as string[] }] },
  { project: '', tasks: [{ label: 'Installing', sub: 'Installing metal sheet', start: 40, width: 22, color: '#8B5CF6', avatars: ['BS', 'JO'] }] },
  { project: '', tasks: [{ label: 'Installing', sub: 'Installing metal sheet', start: 48, width: 30, color: '#7C3AED', avatars: ['NT', 'JO'] }] },
]

function ProjectTimelineTab() {
  const [view, setView] = useState<'Day' | 'Week' | 'Month'>('Week')
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-800">Projects Timeline</h3>
        <div className="flex items-center gap-2">
          <div className="flex border border-gray-200 rounded-lg overflow-hidden text-xs">
            {(['Day', 'Week', 'Month'] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 transition-colors ${view === v ? 'bg-[#0D1B2A] text-white' : 'text-gray-500 hover:bg-gray-50'}`}>{v}</button>
            ))}
          </div>
          <button className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50">March <ChevronDown size={12} /></button>
        </div>
      </div>
      <div className="border border-gray-100 rounded-xl overflow-hidden">
        <div className="flex border-b border-gray-100 bg-gray-50">
          <div className="w-36 shrink-0 border-r border-gray-100" />
          <div className="flex-1 flex">{timelineDays.map((d) => <div key={d} className="flex-1 text-center text-[10px] text-gray-400 py-2 border-r border-gray-100 last:border-0">{d}</div>)}</div>
        </div>
        {ganttRows.map((row, ri) => (
          <div key={ri} className="flex border-b border-gray-50 last:border-0 min-h-[52px]">
            <div className="w-36 shrink-0 border-r border-gray-100 px-3 py-2 flex items-center">
              {row.project && <span className="text-[11px] text-gray-500 font-medium">{row.project}</span>}
            </div>
            <div className="flex-1 relative">
              <div className="absolute inset-0 flex pointer-events-none">{timelineDays.map((d) => <div key={d} className="flex-1 border-r border-gray-50 last:border-0" />)}</div>
              {row.tasks.map((task, ti) => (
                <div key={ti} className="absolute top-2 flex items-start" style={{ left: `${task.start}%`, width: `${task.width}%` }}>
                  <div className="w-full rounded-lg px-2 py-1.5 min-h-[36px]" style={{ backgroundColor: task.color }}>
                    {task.label && <p className="text-[11px] font-semibold text-white leading-tight">{task.label}</p>}
                    {task.sub && <p className="text-[10px] text-white/80 leading-tight truncate">{task.sub}</p>}
                    {task.avatars.length > 0 && (
                      <div className="flex -space-x-1 mt-1">
                        {task.avatars.map((a, ai) => (
                          <div key={ai} className="w-4 h-4 rounded-full bg-white/30 border border-white/50 flex items-center justify-center">
                            <span className="text-[8px] text-white font-bold">{a[0]}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Tab: RFIs Filed ──────────────────────────────────────────────────────────
const rfis = [
  { id: 'RFI-088', subject: 'Roof Deck Thickness Clarification', project: 'Metro Commercial Flat', status: 'In Review', date: 'Jul 25, 2026' },
  { id: 'RFI-072', subject: 'Parapet Wall Height Spec',          project: 'Riverside Shingle',     status: 'In Review', date: 'Apr 12, 2026' },
  { id: 'RFI-061', subject: 'Membrane Overlap Requirements',     project: 'Oakdale Residential',   status: 'Closed',    date: 'Jan 08, 2026' },
  { id: 'RFI-054', subject: 'Drainage Slope Verification',       project: 'Highland Tearoff',      status: 'Closed',    date: 'May 02, 2026' },
]
const rfiDetail = {
  title: 'Flashing detail at parapet wall junction', rfiId: 'RFI-0041', project: 'Riverside Plaza',
  dateSubmitted: 'Apr 10, 2025', assignedManager: 'Karen Brook',
  notes: 'Requesting clarification on the flashing specification at the north parapet wall. Current drawings show a conflict between the cap sheet termination and the metal coping detail.',
  comments: [{ author: 'John Doe', time: 'Apr 11, 9:14 AM', text: 'Flagged to structural for review. Will update by EOD.' }],
  timeline: [{ label: 'RFI created', by: 'M. Torres', date: 'Apr 10, 3:22 PM' }, { label: 'Assigned to J. Okafor', by: 'Admin', date: 'Apr 11, 8:00 AM' }, { label: 'Comment added', by: 'J. Okafor', date: 'Apr 11, 9:14 AM' }],
}

function AddCommentModal({ onClose }: { onClose: () => void }) {
  const [msg, setMsg] = useState('')
  return (
    <>
      <Overlay onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col" style={{ minHeight: 360 }}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
            <h3 className="text-sm font-bold text-gray-900">Add Comment</h3>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"><X size={14} /></button>
          </div>
          <div className="flex-1 px-5 py-4 overflow-y-auto">
            {rfiDetail.comments.map((c, i) => (
              <div key={i} className="flex gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shrink-0"><span className="text-white text-[10px] font-bold">JD</span></div>
                <div><div className="flex items-center gap-2 mb-1"><span className="text-xs font-semibold text-gray-900">{c.author}</span><span className="text-[10px] text-gray-400">{c.time}</span></div><p className="text-xs text-gray-600">{c.text}</p></div>
              </div>
            ))}
          </div>
          <div className="px-5 py-4 border-t border-gray-100 shrink-0">
            <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5">
              <input value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Type your message here..." className="flex-1 text-xs text-gray-700 placeholder-gray-400 focus:outline-none bg-transparent" />
              <button className="text-gray-400 hover:text-gray-600"><Smile size={16} /></button>
              <button className="w-7 h-7 bg-[#0D1B2A] rounded-full flex items-center justify-center hover:bg-[#162437]"><Send size={12} className="text-white" /></button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function RFIDetailsModal({ status, onClose, onComment }: { status: string; onClose: () => void; onComment: () => void }) {
  const st = rfiStatusCfg[status] ?? rfiStatusCfg['Closed']
  return (
    <>
      <Overlay onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
            <h3 className="text-sm font-bold text-gray-900">RFI Details</h3>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"><X size={16} /></button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div><h2 className="text-base font-bold text-gray-900">{rfiDetail.title}</h2><p className="text-xs text-gray-400 mt-0.5">{rfiDetail.rfiId}</p></div>
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full shrink-0 ${st.bg} ${st.text}`}><span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} /> {status}</span>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 tracking-widest uppercase mb-3">RFI Information</p>
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                {[['Project', rfiDetail.project], ['Date submitted', rfiDetail.dateSubmitted]].map(([k, v]) => (
                  <div key={k} className="flex border-b border-gray-50 last:border-0"><div className="w-36 px-4 py-2.5 text-xs text-gray-500 bg-gray-50/50">{k}</div><div className="flex-1 px-4 py-2.5 text-xs font-medium text-gray-800">{v}</div></div>
                ))}
              </div>
            </div>
            <div><p className="text-xs font-medium text-gray-700 mb-2">Notes</p><div className="border border-gray-200 rounded-xl px-4 py-3 text-xs text-gray-600 leading-relaxed bg-gray-50/30">{rfiDetail.notes}</div></div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 tracking-widest uppercase mb-3">Comments</p>
              {rfiDetail.comments.map((c, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shrink-0"><span className="text-white text-[10px] font-bold">JD</span></div>
                  <div><div className="flex items-center gap-2 mb-1"><span className="text-xs font-semibold text-gray-900">{c.author}</span><span className="text-[10px] text-gray-400">{c.time}</span></div><p className="text-xs text-gray-600">{c.text}</p></div>
                </div>
              ))}
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 tracking-widest uppercase mb-3">Status Timeline</p>
              {rfiDetail.timeline.map((t, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center"><div className="w-3 h-3 rounded-full bg-emerald-400 shrink-0 mt-0.5" />{i < rfiDetail.timeline.length - 1 && <div className="w-px flex-1 bg-gray-200 my-1" style={{ minHeight: 24 }} />}</div>
                  <div className="pb-4"><p className="text-xs font-medium text-gray-800">{t.label}</p><p className="text-[11px] text-gray-400">by {t.by} · {t.date}</p></div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
            <button onClick={onClose} className="px-5 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">Close</button>
            <button onClick={onComment} className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#0D1B2A] text-sm font-medium text-white hover:bg-[#162437]"><MessageSquare size={13} /> Comment</button>
          </div>
        </div>
      </div>
    </>
  )
}

function RFIsFiledTab() {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [activeRFI, setActiveRFI] = useState<typeof rfis[0] | null>(null)
  const [showComment, setShowComment] = useState(false)
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-800 mb-4">RFIs Filed</h3>
      {activeRFI && !showComment && <RFIDetailsModal status={activeRFI.status} onClose={() => setActiveRFI(null)} onComment={() => setShowComment(true)} />}
      {showComment && <AddCommentModal onClose={() => { setShowComment(false); setActiveRFI(null) }} />}
      <div className="border border-gray-100 rounded-xl overflow-hidden">
        <table className="w-full text-xs">
          <thead><tr className="bg-gray-50/60 border-b border-gray-100">{['RFI ID', 'Subject', 'Project', 'Status', 'Date', 'Actions'].map((h) => <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {rfis.map((r) => {
              const st = rfiStatusCfg[r.status] ?? rfiStatusCfg['Closed']
              return (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/40 transition-colors relative">
                  <td className="px-4 py-3 font-medium text-gray-800">{r.id}</td>
                  <td className="px-4 py-3 text-gray-600">{r.subject}</td>
                  <td className="px-4 py-3 text-gray-600">{r.project}</td>
                  <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}><span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />{r.status}</span></td>
                  <td className="px-4 py-3 text-gray-500">{r.date}</td>
                  <td className="px-4 py-3 relative">
                    <button onClick={() => setOpenMenuId(openMenuId === r.id ? null : r.id)} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"><MoreHorizontal size={14} /></button>
                    {openMenuId === r.id && (
                      <div className="absolute right-5 top-8 z-20 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 w-36">
                        <button onClick={() => { setActiveRFI(r); setOpenMenuId(null) }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"><Eye size={13} /> View RFI</button>
                        <button onClick={() => { setActiveRFI(r); setShowComment(true); setOpenMenuId(null) }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"><MessageSquare size={13} /> Comment</button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Tab: Submittals & Drawings ───────────────────────────────────────────────
const submittals = [
  { id: 1, name: 'Structural Load Calculations', project: 'Metro Commercial', dateSubmitted: 'Jul 25, 2026', status: 'Approved' },
  { id: 2, name: 'Shop Drawings – Parapet Detail', project: 'Riverside Shingle', dateSubmitted: 'Apr 15, 2026', status: 'In Review' },
  { id: 3, name: 'Material Specs – TPO Membrane', project: 'Metro Commercial', dateSubmitted: 'Jun 10, 2026', status: 'Approved' },
]

function SubmittalsDrawingsTab() {
  const [statuses, setStatuses] = useState<Record<number, string>>(Object.fromEntries(submittals.map((s) => [s.id, s.status])))
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  useOutsideClick(menuRef, () => { setOpenMenuId(null); setShowStatusMenu(false) })
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-800 mb-4">Submittals &amp; Drawings</h3>
      <div className="border border-gray-100 rounded-xl overflow-visible">
        <table className="w-full text-xs">
          <thead><tr className="bg-gray-50/60 border-b border-gray-100">{['File', 'Name', 'Project', 'Date Submitted', 'Status', 'Actions'].map((h) => <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {submittals.map((s) => {
              const st = submStatusCfg[statuses[s.id]] ?? submStatusCfg['Approved']
              return (
                <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/40 transition-colors">
                  <td className="px-4 py-3"><div className="w-7 h-8 bg-red-50 border border-red-100 rounded flex flex-col items-center justify-center"><FileText size={11} className="text-red-400" /><span className="text-[8px] text-red-400 font-bold">PDF</span></div></td>
                  <td className="px-4 py-3 text-gray-700 font-medium">{s.name}</td>
                  <td className="px-4 py-3 text-gray-500">{s.project}</td>
                  <td className="px-4 py-3 text-gray-500">{s.dateSubmitted}</td>
                  <td className="px-4 py-3"><span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}>{statuses[s.id]}</span></td>
                  <td className="px-4 py-3 relative">
                    <button onClick={() => { setOpenMenuId(openMenuId === s.id ? null : s.id); setShowStatusMenu(false) }} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"><MoreHorizontal size={14} /></button>
                    {openMenuId === s.id && (
                      <div ref={menuRef} className="absolute right-5 top-8 z-20 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 w-44">
                        <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"><Eye size={13} /> View PDF</button>
                        <div className="relative">
                          <button onClick={() => setShowStatusMenu(!showStatusMenu)} className="w-full flex items-center justify-between px-3 py-2 text-xs text-gray-700 hover:bg-gray-50">
                            <span className="flex items-center gap-2"><MessageSquare size={13} /> Change Status</span><ChevronRight size={12} className="text-gray-400" />
                          </button>
                          {showStatusMenu && (
                            <div className="absolute left-full top-0 ml-1 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 w-36">
                              {['Approved', 'In Review'].map((opt) => (
                                <button key={opt} onClick={() => { setStatuses((p) => ({ ...p, [s.id]: opt })); setOpenMenuId(null); setShowStatusMenu(false) }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50">
                                  <span className={`w-2 h-2 rounded-full ${opt === 'Approved' ? 'bg-emerald-400' : 'bg-amber-400'}`} />{opt}{statuses[s.id] === opt && <span className="ml-auto text-[#0D1B2A]">✓</span>}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Tab: Inspection Log ──────────────────────────────────────────────────────
const inspections = [
  { date: 'Jul 25, 2026', name: 'Roof Deck Inspection',    project: 'Metro Commercial', status: 'Pass' },
  { date: 'Apr 15, 2026', name: 'Flashing & Seam Check',   project: 'Riverside Shingle', status: 'Failed - Remediated' },
  { date: 'Jun 10, 2026', name: 'Drainage & Slope Verify', project: 'Metro Commercial', status: 'Pass' },
  { date: 'Jun 10, 2026', name: 'Final Walkthrough',       project: 'Highland Tearoff', status: 'Pass' },
]

function InspectionLogTab() {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-800 mb-4">Inspection Log</h3>
      <div className="border border-gray-100 rounded-xl overflow-hidden">
        <table className="w-full text-xs">
          <thead><tr className="bg-gray-50/60 border-b border-gray-100">{['Date Submitted', 'Name', 'Project', 'Status'].map((h) => <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {inspections.map((r, i) => (
              <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/40 transition-colors">
                <td className="px-4 py-3 text-gray-500">{r.date}</td>
                <td className="px-4 py-3 text-gray-700 font-medium">{r.name}</td>
                <td className="px-4 py-3 text-gray-500">{r.project}</td>
                <td className="px-4 py-3"><span className={r.status === 'Pass' ? 'text-emerald-600 font-medium' : 'text-red-500 font-medium'}>{r.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Main Export ──────────────────────────────────────────────────────────────
const tabs = ['Basic Info', 'Assigned Projects', 'Project Timeline', 'RFIs Filed', 'Submittals & Drawings', 'Inspection Log']

export function EmployeeDetailClient({ employee: initialEmployee }: { employee: EmployeeRow }) {
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
        email: values.email, role: values.role,
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
        <header className="bg-white border-b border-gray-100 px-7 py-4 flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-base font-semibold text-gray-900">Employees</h1>
            <p className="text-xs text-gray-400 mt-0.5">Manage all your team members in one place.</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50">
              <Bell size={14} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
            </button>
            <UserHeaderBadge />
          </div>
        </header>

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
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm"
                    style={{ backgroundColor: color }}>
                    {`${emp.first_name[0] ?? ''}${emp.last_name[0] ?? ''}`.toUpperCase()}
                  </div>
                )}
                <div>
                  <h2 className="text-sm font-bold text-gray-900">{emp.first_name} {emp.last_name}</h2>
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
                <button className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#0D1B2A] rounded-lg hover:bg-[#162437] transition-colors">
                  <Mail size={12} /> Message
                </button>
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
              {activeTab === 'Assigned Projects' && <AssignedProjectsTab />}
              {activeTab === 'Project Timeline' && <ProjectTimelineTab />}
              {activeTab === 'RFIs Filed' && <RFIsFiledTab />}
              {activeTab === 'Submittals & Drawings' && <SubmittalsDrawingsTab />}
              {activeTab === 'Inspection Log' && <InspectionLogTab />}
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
