'use client'

import { useState, useEffect, useRef } from 'react'
import { 
   Search, Filter as FilterIcon, Plus, X, Check, MoreHorizontal, 
   Trash2, Eye, Pencil, ChevronLeft, ChevronRight, Calendar, 
   Clock, MapPin, User, AlertCircle, Briefcase, FileText, Map as MapIcon
} from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────────
type TimeStatus = 'Approved' | 'Pending' | 'Missed'

interface TimeEntry {
   id: string
   employee: string
   role: string
   date: string
   project: string
   location: string
   clockIn: string
   clockOut: string
   totalHours: string
   status: TimeStatus
   note?: string
   avatarColor: string
}

interface WeeklyHour {
   day: string
   hours: number
   status: 'active' | 'missed' | 'off'
}

interface EmployeeWeek {
   id: string
   name: string
   role: string
   avatarColor: string
   days: {
      [key: string]: {
         h: string,
         s: 'approved' | 'pending' | 'missed' | 'none'
      }
   }
   total: string
}

type ModalState = 
   | { type: 'none' }
   | { type: 'newEntry'; entry?: TimeEntry }
   | { type: 'viewEntry'; entry: TimeEntry }
   | { type: 'deleteConfirm'; entry: TimeEntry }
   | { type: 'success'; title: string }

// ─── Mock Data ────────────────────────────────────────────────────────────────
const mockEntries: TimeEntry[] = [
   { id: 'TE-001', employee: 'Jose Martinez', role: 'Crew Member', date: 'Apr 3, 2026', project: 'Oakdale Residential', location: 'Job Site A - Oakdale', clockIn: '7:02 AM', clockOut: '4:55 PM', totalHours: '9.9h', status: 'Approved', avatarColor: '#F59E0B', note: 'Started work on site, completed roofing tasks, and ensured the area was clean and secure before leaving.' },
   { id: 'TE-002', employee: 'Karen Brooks', role: 'Site Manager', date: 'Apr 2, 2026', project: 'Oakdale Residential', location: 'Job Site A - Oakdale', clockIn: '8:05 AM', clockOut: '5:18 PM', totalHours: '9.2h', status: 'Approved', avatarColor: '#10B981' },
   { id: 'TE-003', employee: 'Troy Shaw', role: 'Engineer', date: 'Mar 31, 2026', project: 'Green Valley Office', location: 'Job Site B - Riverside', clockIn: '8:00 AM', clockOut: '4:00 PM', totalHours: '8.0h', status: 'Pending', avatarColor: '#3B82F6' },
   { id: 'TE-004', employee: 'Linh Nguyen', role: 'Crew Member', date: 'Apr 3, 2026', project: 'Highland Tearoff', location: 'Highland Tearoff', clockIn: '7:30 AM', clockOut: '4:15 PM', totalHours: '8.5h', status: 'Missed', avatarColor: '#8B5CF6' },
   { id: 'TE-005', employee: 'Sarah Owens', role: 'Payroll Mgmt', date: 'Apr 3, 2026', project: 'Riverside Shingle', location: 'Riverside Shingle', clockIn: '7:45 AM', clockOut: '3:45 PM', totalHours: '8.0h', status: 'Approved', avatarColor: '#EC4899' },
   { id: 'TE-006', employee: 'Sandra Kim', role: 'Engineer', date: 'Apr 2, 2026', project: 'Metro Commercial Flat', location: 'Job Site A - Oakdale', clockIn: '7:10 AM', clockOut: '4:00 PM', totalHours: '8.8h', status: 'Approved', avatarColor: '#6366F1' },
]

const mockWeekData: EmployeeWeek[] = [
   { id: 'emp1', name: 'Jose Martinez', role: 'Crew Member', avatarColor: '#F59E0B', total: '42.2h', days: {
      'Mon 08': { h: '8.2h', s: 'approved' },
      'Tue 09': { h: '8.0h', s: 'approved' },
      'Wed 10': { h: '9.0h', s: 'approved' },
      'Thu 11': { h: '8.5h', s: 'approved' },
      'Fri 12': { h: '8.5h', s: 'approved' },
      'Sat 13': { h: '-', s: 'none' },
      'Sun 14': { h: '-', s: 'none' },
   }},
   { id: 'emp2', name: 'Karen Brooks', role: 'Site Manager', avatarColor: '#10B981', total: '38.0h', days: {
      'Mon 08': { h: '8.0h', s: 'pending' },
      'Tue 09': { h: '8.0h', s: 'approved' },
      'Wed 10': { h: '8.0h', s: 'approved' },
      'Thu 11': { h: '9.0h', s: 'missed' },
      'Fri 12': { h: '5.0h', s: 'approved' },
      'Sat 13': { h: '-', s: 'none' },
      'Sun 14': { h: '-', s: 'none' },
   }},
   { id: 'emp3', name: 'Troy Shaw', role: 'Engineer', avatarColor: '#3B82F6', total: '32.5h', days: {
      'Mon 08': { h: '8.0h', s: 'approved' },
      'Tue 09': { h: '8.5h', s: 'approved' },
      'Wed 10': { h: '8.0h', s: 'approved' },
      'Thu 11': { h: '8.0h', s: 'approved' },
      'Fri 12': { h: '-', s: 'none' },
      'Sat 13': { h: '-', s: 'none' },
      'Sun 14': { h: '-', s: 'none' },
   }},
   { id: 'emp4', name: 'Linh Nguyen', role: 'Crew Member', avatarColor: '#8B5CF6', total: '24.5h', days: {
      'Mon 08': { h: '8.0h', s: 'approved' },
      'Tue 09': { h: '8.0h', s: 'approved' },
      'Wed 10': { h: '-', s: 'missed' },
      'Thu 11': { h: '8.5h', s: 'approved' },
      'Fri 12': { h: '-', s: 'none' },
      'Sat 13': { h: '-', s: 'none' },
      'Sun 14': { h: '-', s: 'none' },
   }},
   { id: 'emp5', name: 'Sarah Owens', role: 'Payroll Mgmt', avatarColor: '#EC4899', total: '40.0h', days: {
      'Mon 08': { h: '8.0h', s: 'approved' },
      'Tue 09': { h: '8.0h', s: 'approved' },
      'Wed 10': { h: '8.0h', s: 'approved' },
      'Thu 11': { h: '8.0h', s: 'missed' },
      'Fri 12': { h: '8.0h', s: 'approved' },
      'Sat 13': { h: '-', s: 'none' },
      'Sun 14': { h: '-', s: 'none' },
   }},
]

const weekCols = ['Mon 08', 'Tue 09', 'Wed 10', 'Thu 11', 'Fri 12', 'Sat 13', 'Sun 14']

const inputCls = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
const selectCls = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all"

const statusConfigs: Record<TimeStatus, { bg: string; text: string; dot: string }> = {
   Approved: { bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-500' },
   Pending: { bg: 'bg-amber-50', text: 'text-amber-600', dot: 'bg-amber-500' },
   Missed: { bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-500' },
}

// ─── Shared Components ──────────────────────────────────────────────────────
function StatCard({ label, value, sub, variant = 'default' }: { label: string; value: string; sub?: string; variant?: 'default' | 'success' | 'info' | 'alert' | 'purple' }) {
   const getBorder = () => {
      if (variant === 'success') return 'border-emerald-100'
      if (variant === 'alert') return 'border-red-100'
      if (variant === 'purple') return 'border-purple-100'
      return 'border-gray-100'
   }
   const getTagColor = () => {
      if (variant === 'success') return 'bg-emerald-50 text-emerald-600'
      if (variant === 'alert') return 'bg-red-50 text-red-600'
      if (variant === 'info') return 'bg-blue-50 text-blue-600'
      return 'bg-purple-50 text-purple-600'
   }
   return (
      <div className={`bg-white rounded-xl border p-5 shadow-sm relative overflow-hidden ${getBorder()}`}>
         <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-gray-500 font-bold tracking-wide uppercase">{label}</span>
            {sub && <span className={`text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${getTagColor()}`}>{sub}</span>}
         </div>
         <p className="text-3xl font-black text-gray-900">{value}</p>
      </div>
   )
}

// ─── Feature Sidebars ────────────────────────────────────────────────────────
function LogManualEntrySidebar({ entry, onClose, onSave }: { entry?: TimeEntry; onClose: () => void; onSave: (e: Partial<TimeEntry>) => void }) {
   const [employee, setEmployee] = useState(entry?.employee || '')
   const [date, setDate] = useState(entry?.date || '')
   const [project, setProject] = useState(entry?.project || '')
   const [loc, setLoc] = useState(entry?.location || '')
   const [inTime, setInTime] = useState(entry?.clockIn || '')
   const [outTime, setOutTime] = useState(entry?.clockOut || '')
   const [note, setNote] = useState(entry?.note || '')

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
                           <select value={employee} onChange={e => setEmployee(e.target.value)} className={selectCls}>
                              <option value="">Select Employee</option>
                              <option>Jose Martinez</option>
                              <option>Karen Brooks</option>
                              <option>Troy Shaw</option>
                           </select>
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-gray-600 mb-1.5">Date</label>
                           <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-gray-600 mb-1.5">Project</label>
                           <select value={project} onChange={e => setProject(e.target.value)} className={selectCls}>
                              <option value="">Select Project</option>
                              <option>Oakdale Residential</option>
                              <option>Highland Tearoff</option>
                              <option>Metro Commercial Flat</option>
                           </select>
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-gray-600 mb-1.5">Site / Location</label>
                           <select value={loc} onChange={e => setLoc(e.target.value)} className={selectCls}>
                              <option value="">Select Site</option>
                              <option>Job Site A - Oakdale</option>
                              <option>Job Site B - Riverside</option>
                           </select>
                        </div>
                     </div>
                  </div>

                  <div>
                     <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Time</h3>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="block text-xs font-bold text-gray-600 mb-1.5">Clock In</label>
                           <input type="time" value={inTime} onChange={e => setInTime(e.target.value)} className={inputCls} />
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-gray-600 mb-1.5">Clock Out</label>
                           <input type="time" value={outTime} onChange={e => setOutTime(e.target.value)} className={inputCls} />
                        </div>
                     </div>
                  </div>

                  <div>
                     <label className="block text-xs font-bold text-gray-600 mb-1.5">Note</label>
                     <textarea rows={4} value={note} onChange={e => setNote(e.target.value)} placeholder="Enter reason or details..." className={`${inputCls} resize-none py-3`}></textarea>
                  </div>
               </div>

               <div className="flex items-center justify-end gap-3 px-7 py-5 border-t border-gray-100 bg-white shadow-[0_-4px_15px_rgba(0,0,0,0.02)]">
                  <button onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition-colors">Close</button>
                  <button 
                     onClick={() => onSave({ employee, date, project, location: loc, clockIn: inTime, clockOut: outTime, status: 'Pending' })}
                     className="px-7 py-2.5 text-sm font-bold text-white bg-[#0D1B2A] hover:bg-[#162437] rounded-xl shadow-sm transition-all"
                  >
                     Save Entry
                  </button>
               </div>
            </div>
         </div>
      </>
   )
}

function TimeEntryDetailSidebar({ entry, onClose }: { entry: TimeEntry, onClose: () => void }) {
   const status = statusConfigs[entry.status]
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
                  {/* User Header Card */}
                  <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm relative">
                     <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                           <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-black text-base shadow-md" style={{ backgroundColor: entry.avatarColor }}>
                              {entry.employee.split(' ').map(n => n[0]).join('')}
                           </div>
                           <div>
                              <h3 className="text-base font-black text-gray-900">{entry.employee}</h3>
                              <p className="text-xs font-bold text-gray-400">{entry.role}</p>
                           </div>
                        </div>
                        <span className={`flex items-center gap-1.5 text-[10px] font-black px-2 py-1 rounded-full ${status.bg} ${status.text} uppercase tracking-wider`}>
                           <div className={`w-1.5 h-1.5 rounded-full ${status.dot}`} /> {entry.status}
                        </span>
                     </div>
                  </div>

                  {/* Stat Grid */}
                  <div>
                     <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Time Details</h4>
                     <div className="bg-white border border-gray-100 rounded-xl divide-y divide-gray-50 shadow-sm">
                        <div className="flex justify-between items-center px-5 py-4">
                           <span className="text-sm text-gray-500 font-medium">Date</span>
                           <span className="text-sm text-gray-900 font-bold">{entry.date}</span>
                        </div>
                        <div className="flex justify-between items-center px-5 py-4">
                           <span className="text-sm text-gray-500 font-medium">Clock In</span>
                           <span className="text-sm text-gray-900 font-bold">{entry.clockIn}</span>
                        </div>
                        <div className="flex justify-between items-center px-5 py-4">
                           <span className="text-sm text-gray-500 font-medium">Clock Out</span>
                           <span className="text-sm text-gray-900 font-bold">{entry.clockOut}</span>
                        </div>
                        <div className="flex justify-between items-center px-5 py-4 bg-gray-50/50">
                           <span className="text-sm text-gray-900 font-bold">Total Hours</span>
                           <span className="text-lg font-black text-gray-900">{entry.totalHours}</span>
                        </div>
                     </div>
                  </div>

                  {/* Note Section */}
                  {entry.note && (
                     <div>
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Notes</h4>
                        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                           <p className="text-xs text-gray-600 font-medium leading-relaxed italic">"{entry.note}"</p>
                        </div>
                     </div>
                  )}

                  {/* Location Visual */}
                  <div>
                     <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Location & Project</h4>
                     <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-4">
                        <div className="flex justify-between items-start">
                           <div>
                              <p className="text-xs font-bold text-gray-400">Project</p>
                              <p className="text-sm font-bold text-gray-900">{entry.project}</p>
                           </div>
                           <div className="text-right">
                              <p className="text-xs font-bold text-gray-400">Site</p>
                              <p className="text-sm font-bold text-gray-900">{entry.location}</p>
                           </div>
                        </div>

                        {/* Fake Map Visualization */}
                        <div className="w-full h-32 bg-[#F0F3F8] rounded-xl relative overflow-hidden flex items-center justify-center group cursor-pointer border border-gray-100">
                           <div className="absolute inset-0 opacity-30 bg-[radial-gradient(#D1D5DB_1px,transparent_1px)] [background-size:10px_10px]" />
                           <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-blue-100/50 rounded-full animate-pulse flex items-center justify-center">
                              <div className="w-8 h-8 bg-white shadow-lg rounded-full flex items-center justify-center text-blue-600">
                                 <MapPin size={18} fill="currentColor" fillOpacity={0.3} />
                              </div>
                           </div>
                           <div className="absolute bottom-3 left-3 bg-white px-2.5 py-1 rounded-md shadow-sm border border-gray-100 text-[10px] font-black text-gray-500 flex items-center gap-1.5">
                              <MapIcon size={10} /> 36.1699° N, 115.1398° W
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* Entry Log Timeline */}
                  <div>
                     <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Entry Log</h4>
                     <div className="relative pl-6 space-y-6 text-xs">
                        <div className="absolute left-[6px] top-1 bottom-1 w-px border-l border-dashed border-gray-200" />
                        
                        <div className="relative">
                           <div className="absolute left-[-24px] top-0.5 w-3 h-3 rounded-full border-2 border-white bg-gray-400" />
                           <div>
                              <p className="font-bold text-gray-900">Clocked Out</p>
                              <p className="text-gray-400 mt-0.5">Apr 3, 2026 at {entry.clockOut} • GPS verified</p>
                           </div>
                        </div>

                        <div className="relative">
                           <div className="absolute left-[-24px] top-0.5 w-3 h-3 rounded-full border-2 border-white bg-emerald-500" />
                           <div>
                              <p className="font-bold text-gray-900">Clocked In</p>
                              <p className="text-gray-400 mt-0.5">Apr 3, 2026 at {entry.clockIn} • GPS verified</p>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>

               <div className="px-7 py-5 bg-white border-t border-gray-100 flex justify-end gap-3">
                  <button onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50 border border-gray-200 rounded-xl transition-colors">Close</button>
                  {entry.status === 'Pending' && (
                     <button className="px-6 py-2.5 text-sm font-bold text-white bg-[#0D1B2A] rounded-xl shadow-sm flex items-center gap-2">
                        <Check size={16} /> Approve Entry
                     </button>
                  )}
               </div>
            </div>
         </div>
      </>
   )
}

// ─── Confirmation Modals ───────────────────────────────────────────────────────
function ConfirmDeleteModal({ entry, onClose, onConfirm }: { entry: TimeEntry; onClose: () => void; onConfirm: () => void }) {
   return (
      <>
         <div className="fixed inset-0 bg-black/50 backdrop-blur-[1px] z-[110]" onClick={onClose} />
         <div className="fixed inset-0 z-[111] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center relative">
               <button onClick={onClose} className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"><X size={16}/></button>
               <div className="w-14 h-14 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm border border-red-100">
                  <Trash2 size={24} />
               </div>
               <h3 className="text-lg font-black text-gray-900 mb-2">Delete Entry</h3>
               <p className="text-sm text-gray-500 mb-8">Are you sure you want to delete this <span className="font-bold text-gray-800">{entry.employee}</span> time entry?<br/>This action cannot be undone.</p>
               <div className="flex gap-3">
                  <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
                  <button onClick={onConfirm} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 rounded-xl text-sm font-bold text-white shadow-sm transition-colors">Delete</button>
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
               <div className="w-14 h-14 bg-emerald-500 rounded-xl flex items-center justify-center shadow-md mb-5 shadow-emerald-100 text-white">
                  <Check size={32} strokeWidth={3} />
               </div>
               <h3 className="text-lg font-black text-gray-900 mb-1">{title}</h3>
               <p className="text-xs font-medium text-gray-400 mb-6">The timesheet has been successfully updated.</p>
               <button onClick={onClose} className="w-full bg-[#0D1B2A] text-white py-2.5 rounded-xl text-sm font-bold hover:bg-[#162437] shadow-sm">View Log</button>
            </div>
         </div>
      </>
   )
}

// ─── Contextual Dropdown ───────────────────────────────────────────────────────
function ActionMenu({ onView, onEdit, onDelete }: { onView: () => void, onEdit: () => void, onDelete: () => void }) {
   const [open, setOpen] = useState(false)
   const ref = useRef<HTMLDivElement>(null)
   useEffect(() => {
      const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
      document.addEventListener('mousedown', h)
      return () => document.removeEventListener('mousedown', h)
   }, [])
   return (
      <div ref={ref} className="relative flex justify-center">
         <button onClick={(e) => { e.stopPropagation(); setOpen(!open) }} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors"><MoreHorizontal size={14} /></button>
         {open && (
            <div className="absolute right-0 top-8 w-40 bg-white border border-gray-100 rounded-xl shadow-xl z-30 py-1 animate-in fade-in zoom-in-95 duration-100 origin-top-right overflow-hidden">
               <button onClick={() => { setOpen(false); onView() }} className="w-full text-left px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2"><Eye size={14} className="text-gray-400"/> View Detail</button>
               <button onClick={() => { setOpen(false); onEdit() }} className="w-full text-left px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2"><Pencil size={14} className="text-gray-400"/> Edit</button>
               <div className="border-t border-gray-50 my-1"/>
               <button onClick={() => { setOpen(false); onDelete() }} className="w-full text-left px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 size={14} /> Delete</button>
            </div>
         )}
      </div>
   )
}

// ─── Main Dashboard Page ───────────────────────────────────────────────────────
export default function TimeTrackingPage() {
   const [tab, setTab] = useState<'weekly' | 'log' | 'approvals'>('weekly')
   const [search, setSearch] = useState('')
   const [modal, setModal] = useState<ModalState>({ type: 'none' })
   const [showFilterDrop, setShowFilterDrop] = useState(false)
   const [entries, setEntries] = useState<TimeEntry[]>(mockEntries)

   const handleSaveEntry = (data: Partial<TimeEntry>) => {
      // Mock save 
      setModal({ type: 'success', title: 'Entry Logged Successfully' })
   }

   const handleDelete = () => {
      setModal({ type: 'none' })
      // in real logic, would pop a brief toast or sync
   }

   return (
      <div className="flex flex-col h-full overflow-hidden bg-[#F4F6F9]">
         {/* Top Navigation */}
         <div className="flex-none bg-white border-b border-gray-100 px-8 py-5">
            <div className="flex items-center justify-between">
               <div>
                  <h1 className="text-xl font-black text-gray-900 tracking-tight">Time Tracking</h1>
                  <p className="text-gray-400 text-xs mt-0.5 font-medium">Clock In/Out, manage timesheets, and approve team hours.</p>
               </div>
               <div className="flex items-center gap-3">
                  <div className="text-right">
                     <p className="text-sm font-extrabold text-gray-900">John Doe</p>
                     <p className="text-[11px] text-gray-400">john.doe@peakroofing.com</p>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-black shadow-sm ring-2 ring-white">
                     JD
                  </div>
               </div>
            </div>
         </div>

         <div className="flex-1 overflow-y-auto pb-10">
            {/* Stat Deck */}
            <div className="grid grid-cols-4 gap-5 px-8 pt-6 mb-8">
               <StatCard label="Clocked In Now" value="1" sub="Live on site" variant="success" />
               <StatCard label="Hours This Week" value="223h" sub="Team total" variant="info" />
               <StatCard label="Missed Punch-outs" value="0" variant="alert" />
               <StatCard label="Pending Approvals" value="6" variant="purple" />
            </div>

            {/* View Controls */}
            <div className="px-8">
               <div className="flex border-b border-gray-200 gap-6 mb-6">
                  <button onClick={() => setTab('weekly')} className={`pb-3 text-sm font-bold transition-colors border-b-2 -mb-px ${tab === 'weekly' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>Weekly Timesheet</button>
                  <button onClick={() => setTab('log')} className={`pb-3 text-sm font-bold transition-colors border-b-2 -mb-px flex items-center gap-2 ${tab === 'log' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>Time Log <span className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px]">18</span></button>
                  <button onClick={() => setTab('approvals')} className={`pb-3 text-sm font-bold transition-colors border-b-2 -mb-px flex items-center gap-2 ${tab === 'approvals' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>Approvals Log <span className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px]">5</span></button>
               </div>

               {/* Toolbar Contexts */}
               {tab === 'weekly' && (
                  <div className="flex items-center justify-between mb-5">
                     <div>
                        <h3 className="text-sm font-black text-gray-900">This Week</h3>
                        <p className="text-xs text-gray-400 font-medium">Apr 8 - Apr 12, 2026</p>
                     </div>
                     <div className="flex items-center gap-3">
                        <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
                           <button className="p-1.5 hover:bg-gray-50 rounded-lg text-gray-400"><ChevronLeft size={16} /></button>
                           <button className="px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 rounded-lg">This Week</button>
                           <button className="p-1.5 hover:bg-gray-50 rounded-lg text-gray-400"><ChevronRight size={16} /></button>
                        </div>
                        <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 shadow-sm transition-colors">
                           <FileText size={14} /> Export
                        </button>
                     </div>
                  </div>
               )}

               {tab === 'log' && (
                  <div className="flex items-center justify-between mb-5">
                     <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input placeholder="Search logs..." className="pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-xl bg-white w-60 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all" />
                     </div>
                     <div className="flex items-center gap-3">
                        <div className="relative">
                           <button onClick={() => setShowFilterDrop(!showFilterDrop)} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors shadow-sm">
                              <FilterIcon size={14} /> Filter
                           </button>
                           {showFilterDrop && (
                              <div className="absolute right-0 top-11 bg-white border border-gray-100 shadow-xl rounded-xl w-80 z-20 p-5 animate-in fade-in slide-in-from-top-2 duration-150">
                                 <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Filter Options</h4>
                                 <div className="space-y-4">
                                    <div>
                                       <label className="text-xs font-bold text-gray-700 mb-2 block">Status</label>
                                       <div className="flex flex-wrap gap-2">
                                          {['Approved', 'Pending', 'Missed'].map(s => (
                                             <button key={s} className="px-3 py-1 text-xs font-bold rounded-full border border-gray-200 hover:border-blue-500 hover:text-blue-600 bg-white transition-all">{s}</button>
                                          ))}
                                       </div>
                                    </div>
                                    <div>
                                       <label className="text-xs font-bold text-gray-700 mb-2 block">Date Range</label>
                                       <div className="flex gap-2">
                                          {['Today', 'This Week', 'Last 30 Days'].map(d => (
                                             <button key={d} className="px-3 py-1 text-[10px] font-bold rounded-full bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors">{d}</button>
                                          ))}
                                       </div>
                                    </div>
                                 </div>
                                 <div className="border-t border-gray-100 mt-4 pt-3 flex justify-end gap-2">
                                    <button onClick={() => setShowFilterDrop(false)} className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:text-gray-700">Clear All</button>
                                    <button onClick={() => setShowFilterDrop(false)} className="px-4 py-1.5 bg-[#0D1B2A] text-white text-xs font-bold rounded-lg shadow-sm">Apply</button>
                                 </div>
                              </div>
                           )}
                        </div>
                        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"><FileText size={14}/> Import/Export</button>
                        <button onClick={() => setModal({ type: 'newEntry' })} className="flex items-center gap-2 px-4 py-2 bg-[#0D1B2A] text-white text-xs font-bold rounded-xl shadow-sm hover:bg-[#162437] transition-all active:scale-95">
                           <Plus size={16} /> Log Manual Entry
                        </button>
                     </div>
                  </div>
               )}

               {tab === 'approvals' && (
                  <div className="flex items-center justify-between mb-5">
                     <div>
                        <p className="text-xs text-gray-500 font-medium">Review and approve time entries submitted by your team</p>
                     </div>
                     <div>
                        <button className="flex items-center gap-2 px-5 py-2 bg-[#0D1B2A] text-white text-xs font-bold rounded-lg shadow-sm hover:bg-[#162437] transition-all">
                           <Check size={14} /> Approve All
                        </button>
                     </div>
                  </div>
               )}

               {/* Content Engine */}
               <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  {tab === 'weekly' && (
                     <table className="w-full text-left border-collapse overflow-x-auto block md:table">
                        <thead className="bg-[#F8F9FB] border-b border-gray-100">
                           <tr className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                              <th className="px-6 py-4">Employee</th>
                              {weekCols.map(d => <th key={d} className="px-4 py-4 text-center">{d}</th>)}
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-xs">
                           {mockWeekData.map(row => (
                              <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                                 <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                       <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-[10px]" style={{ backgroundColor: row.avatarColor }}>
                                          {row.name.split(' ').map(n => n[0]).join('')}
                                       </div>
                                       <div>
                                          <p className="font-black text-gray-900">{row.name}</p>
                                          <p className="text-[10px] text-gray-400 font-medium">{row.role}</p>
                                       </div>
                                    </div>
                                 </td>
                                 {weekCols.map(day => {
                                    const cell = row.days[day] || { h: '-', s: 'none' }
                                    let style = 'text-gray-400'
                                    if (cell.s === 'approved') style = 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                    if (cell.s === 'pending') style = 'bg-amber-50 text-amber-600 border border-amber-100'
                                    if (cell.s === 'missed') style = 'bg-red-50 text-red-500 border border-red-100'
                                    
                                    return (
                                       <td key={day} className="px-4 py-3 text-center">
                                          <span className={`inline-flex items-center justify-center w-14 py-1.5 rounded-lg font-black text-[10px] ${style}`}>
                                             {cell.h}
                                          </span>
                                       </td>
                                    )
                                 })}
                              </tr>
                           ))}
                           {/* Footer Row */}
                           <tr className="bg-gray-50 font-black text-gray-900 text-[10px] uppercase tracking-wider border-t border-gray-200">
                              <td className="px-6 py-4">Daily Total</td>
                              {weekCols.map(d => <td key={d} className="px-4 py-4 text-center">{Math.floor(Math.random() * 20) + 30}.5h</td>)}
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
                           {entries.map(item => {
                              const status = statusConfigs[item.status]
                              return (
                                 <tr key={item.id} onClick={() => setModal({ type: 'viewEntry', entry: item })} className="hover:bg-gray-50/50 transition-colors group cursor-pointer">
                                    <td className="px-6 py-4 font-black text-gray-900">
                                       <div className="flex items-center gap-2">
                                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[8px] font-black" style={{ backgroundColor: item.avatarColor }}>{item.employee.split(' ').map(n => n[0]).join('')}</div>
                                          {item.employee}
                                       </div>
                                    </td>
                                    <td className="px-6 py-4">{item.date}</td>
                                    <td className="px-6 py-4">{item.project}</td>
                                    <td className="px-6 py-4 truncate max-w-[150px]">{item.location}</td>
                                    <td className="px-6 py-4">{item.clockIn}</td>
                                    <td className="px-6 py-4">{item.clockOut}</td>
                                    <td className="px-6 py-4 font-black text-gray-900">{item.totalHours}</td>
                                    <td className="px-6 py-4">
                                       <span className={`inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-full border ${status.bg} ${status.text} border-current opacity-90`}>
                                          {item.status}
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
                           {entries.filter(e => e.status !== 'Approved').map(item => {
                              const status = statusConfigs[item.status]
                              return (
                                 <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4 font-black text-gray-900">
                                       <div className="flex items-center gap-2">
                                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[8px] font-black" style={{ backgroundColor: item.avatarColor }}>{item.employee.split(' ').map(n => n[0]).join('')}</div>
                                          {item.employee}
                                       </div>
                                    </td>
                                    <td className="px-6 py-4">{item.project}</td>
                                    <td className="px-6 py-4">{item.date}</td>
                                    <td className="px-6 py-4">{item.clockIn}</td>
                                    <td className="px-6 py-4">{item.clockOut}</td>
                                    <td className="px-6 py-4 font-black text-gray-900">{item.totalHours}</td>
                                    <td className="px-6 py-4">
                                       <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${status.bg} ${status.text}`}>
                                          {item.status}
                                       </span>
                                    </td>
                                    <td className="px-6 py-4">
                                       <div className="flex items-center justify-center gap-2">
                                          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white rounded-md text-[10px] font-black shadow-sm hover:bg-emerald-600 transition-colors">
                                             <Check size={12} /> Approve
                                          </button>
                                          <button className="flex items-center gap-1.5 px-3 py-1.5 border border-red-100 text-red-600 bg-white rounded-md text-[10px] font-black hover:bg-red-50 transition-colors">
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

               {/* Pager Mock for Table Views */}
               {(tab === 'log' || tab === 'approvals') && (
                  <div className="flex items-center justify-between mt-5 px-2">
                     <button className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-bold text-gray-500 hover:bg-white flex items-center gap-1 transition-colors"><ChevronLeft size={14}/> Previous</button>
                     <div className="flex items-center gap-1 text-xs font-bold text-gray-500">
                        <span className="w-7 h-7 flex items-center justify-center bg-[#0D1B2A] text-white rounded-lg">1</span>
                        <span className="w-7 h-7 flex items-center justify-center hover:bg-white rounded-lg cursor-pointer transition-colors">2</span>
                        <span className="w-7 h-7 flex items-center justify-center hover:bg-white rounded-lg cursor-pointer transition-colors">3</span>
                        <span className="px-1">...</span>
                        <span className="w-7 h-7 flex items-center justify-center hover:bg-white rounded-lg cursor-pointer transition-colors">10</span>
                     </div>
                     <button className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-bold text-gray-500 hover:bg-white flex items-center gap-1 transition-colors">Next <ChevronRight size={14}/></button>
                  </div>
               )}
            </div>
         </div>

         {/* Layer Stack */}
         {modal.type === 'newEntry' && (
            <LogManualEntrySidebar 
               entry={modal.entry}
               onClose={() => setModal({ type: 'none' })}
               onSave={handleSaveEntry}
            />
         )}
         {modal.type === 'viewEntry' && (
            <TimeEntryDetailSidebar 
               entry={modal.entry}
               onClose={() => setModal({ type: 'none' })}
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
            <SuccessPopup 
               title={modal.title}
               onClose={() => setModal({ type: 'none' })}
            />
         )}
      </div>
   )
}
