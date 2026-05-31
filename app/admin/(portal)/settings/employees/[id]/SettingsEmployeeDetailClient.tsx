'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ChevronRight, Pencil, Mail, Bell, Search, Filter,
  MoreHorizontal, Eye, MessageSquare, X, FileText,
  ChevronDown, Send, Smile, ChevronLeft, Check
} from 'lucide-react'
import UserHeaderBadge from '@/app/components/ui/UserHeaderBadge'
import { updateEmployee, uploadAvatar, type EmployeeRow, type UpdateEmployeeInput } from '../../../employees/actions'
import { EmployeeFormPanel, type FormValues } from '../../../employees/EmployeeFormPanel'

// --- Shared Helpers ---
const avatarColors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#6366F1', '#EC4899']

function initials(first: string, last: string) {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase()
}

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

// --- Basic Info Section Row ---
function InfoGridSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{title}</h3>
      <div className="bg-white border border-gray-100 rounded-xl p-5 grid grid-cols-3 gap-6">
        {children}
      </div>
    </div>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-gray-400 font-medium">{label}</p>
      <p className="text-xs font-semibold text-gray-800 mt-1">{value || '—'}</p>
    </div>
  )
}

// --- Tabs ---
function BasicInfoTab({ emp }: { emp: EmployeeRow }) {
  const shortId = emp.id.substring(0, 8).toUpperCase()
  const roleLabel = emp.role === 'admin' ? 'Admin' : emp.role === 'manager' ? 'Project Manager' : 'Staff'
  const startD = emp.start_date
    ? new Date(emp.start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '—'

  return (
    <div className="space-y-6">
      <InfoGridSection title="Contact Information">
        <InfoItem label="Phone Number" value={emp.phone ?? '(209) 555-0104'} />
        <InfoItem label="Alternate Phone Number" value="oleo@example.com" />
        <InfoItem label="Secondary Email" value="oleo@example.com" />
      </InfoGridSection>

      <InfoGridSection title="Work Information">
        <InfoItem label="Employee ID" value={shortId} />
        <InfoItem label="Alternate Phone Number" value="oleo@example.com" />
        <InfoItem label="Department" value={emp.department ?? 'Sales'} />
      </InfoGridSection>

      <InfoGridSection title="Personal Information">
        <InfoItem label="First Name" value={emp.first_name} />
        <InfoItem label="Last Name" value={emp.last_name} />
        <InfoItem label="Address" value="14 Avenue, Drive. Chicago" />
        <InfoItem label="State & Country" value="Chicago, USA" />
        <InfoItem label="Pincode" value="48594" />
        <InfoItem label="Status" value={statusLabels[emp.status] ?? emp.status} />
      </InfoGridSection>
    </div>
  )
}

const mockProjects = [
  { id: 1, name: 'Oakdale Residential Reroofing', type: 'Residential · Oakdale',    status: 'Completed',   manager: 'Karen Brooks', client: 'Johnson Family', due: 'Apr 15, 2026', progress: 100, gradient: 'from-blue-400 to-blue-600' },
  { id: 2, name: 'Metro Commercial Flat Roof',    type: 'Commercial · Downtown, NV', status: 'In Progress', manager: 'Derek Owens',  client: 'Metro Corp',    due: 'May 30, 2026', progress: 50,  gradient: 'from-amber-400 to-orange-500' },
  { id: 3, name: 'Summerlin Flat TPO Install',    type: 'Commercial · Summerlin, NV',status: 'In Progress', manager: 'Derek Owens',  client: 'Summerlin Dev', due: 'Feb 28, 2026', progress: 40,  gradient: 'from-emerald-400 to-teal-500' },
]

function ProjectCard({ p }: { p: typeof mockProjects[0] }) {
  const progressColor = p.progress === 100 ? '#10B981' : '#0D1B2A'
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className={`h-32 bg-gradient-to-br ${p.gradient} relative`} />
      <div className="px-5 py-4">
        <h3 className="text-xs font-bold text-gray-800 truncate mb-1">{p.name}</h3>
        <p className="text-[10px] text-gray-400 mb-3">{p.type}</p>
        <div className="space-y-1.5 text-xs mb-3">
          <div className="flex justify-between"><span className="text-gray-400">Status</span><span className={`font-semibold ${p.status === 'In Progress' ? 'text-orange-500' : 'text-emerald-600'}`}>{p.status}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">Manager</span><span className="font-semibold text-gray-700">{p.manager}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">Client</span><span className="font-semibold text-gray-700">{p.client}</span></div>
        </div>
        <div>
          <div className="flex justify-between text-[10px] mb-1"><span className="text-gray-400">Progress</span><span className="font-semibold text-gray-700">{p.progress}%</span></div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${p.progress}%`, backgroundColor: progressColor }} /></div>
        </div>
      </div>
    </div>
  )
}

function AssignedProjectsTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-gray-800">Assigned Projects</h3>
        <div className="flex items-center gap-2">
          <div className="relative w-48">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input placeholder="Search" className="w-full pl-7 pr-3 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D1B2A]/10" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">{mockProjects.map((p) => <ProjectCard key={p.id} p={p} />)}</div>
    </div>
  )
}

const timelineDays = ['M31','T1','W2','T4','F5','S6','S7','M8','T9','W10','T11','F12','S13','S14','M15','W16','W17','T18','F19','S20']
const ganttRows = [
  { project: 'Metro Commercial Flat', tasks: [{ label: 'Roofing', sub: 'Fixing woods & metals', start: 0, width: 25, color: '#F97316', avatars: [] as string[] }, { label: 'Roofing', sub: 'Fixing woods & metals', start: 40, width: 22, color: '#F97316', avatars: ['BS', 'JO'] }] },
  { project: '', tasks: [{ label: 'Roofing', sub: 'Fixing woods & metals', start: 15, width: 28, color: '#F97316', avatars: [] as string[] }] },
  { project: 'Highland Tearoff', tasks: [{ label: '', sub: '', start: 40, width: 58, color: '#C4B5FD', avatars: [] as string[] }] },
]

function ProjectTimelineTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-gray-800">Projects Timeline</h3>
      </div>
      <div className="border border-gray-100 rounded-xl overflow-hidden text-xs">
        <div className="flex border-b border-gray-100 bg-gray-50">
          <div className="w-36 shrink-0 border-r border-gray-100" />
          <div className="flex-1 flex">{timelineDays.map((d) => <div key={d} className="flex-1 text-center text-[10px] text-gray-400 py-2 border-r border-gray-100 last:border-0">{d}</div>)}</div>
        </div>
        {ganttRows.map((row, ri) => (
          <div key={ri} className="flex border-b border-gray-50 last:border-0 min-h-[48px]">
            <div className="w-36 shrink-0 border-r border-gray-100 px-3 py-2 flex items-center">
              {row.project && <span className="text-[10px] text-gray-500 font-semibold">{row.project}</span>}
            </div>
            <div className="flex-1 relative">
              <div className="absolute inset-0 flex pointer-events-none">{timelineDays.map((d) => <div key={d} className="flex-1 border-r border-gray-50 last:border-0" />)}</div>
              {row.tasks.map((task, ti) => (
                <div key={ti} className="absolute top-2 flex items-start" style={{ left: `${task.start}%`, width: `${task.width}%` }}>
                  <div className="w-full rounded-lg px-2 py-1 min-h-[32px]" style={{ backgroundColor: task.color }}>
                    {task.label && <p className="text-[10px] font-bold text-white leading-tight">{task.label}</p>}
                    {task.sub && <p className="text-[9px] text-white/80 leading-tight truncate">{task.sub}</p>}
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

const rfis = [
  { id: 'RFI-088', subject: 'Roof Deck Thickness Clarification', project: 'Metro Commercial Flat', status: 'In Review', date: 'Jul 25, 2026' },
  { id: 'RFI-072', subject: 'Parapet Wall Height Spec',          project: 'Riverside Shingle',     status: 'In Review', date: 'Apr 12, 2026' },
  { id: 'RFI-061', subject: 'Membrane Overlap Requirements',     project: 'Oakdale Residential',   status: 'Closed',    date: 'Jan 08, 2026' },
]

function RFIsFiledTab() {
  return (
    <div className="space-y-4">
      <h3 className="text-xs font-bold text-gray-800">RFIs Filed</h3>
      <div className="border border-gray-100 rounded-xl overflow-hidden text-xs">
        <table className="w-full">
          <thead><tr className="bg-gray-50/60 border-b border-gray-100">{['RFI ID', 'Subject', 'Project', 'Status', 'Date'].map((h) => <th key={h} className="text-left px-4 py-3.5 text-gray-400 font-semibold text-[10px] uppercase tracking-wider">{h}</th>)}</tr></thead>
          <tbody>
            {rfis.map((r) => {
              const st = rfiStatusCfg[r.status] ?? rfiStatusCfg['Closed']
              return (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/10">
                  <td className="px-4 py-3 font-semibold text-gray-800">{r.id}</td>
                  <td className="px-4 py-3 text-gray-600">{r.subject}</td>
                  <td className="px-4 py-3 text-gray-600">{r.project}</td>
                  <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}><span className={`w-1.2 h-1.2 rounded-full ${st.dot}`} />{r.status}</span></td>
                  <td className="px-4 py-3 text-gray-500">{r.date}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const submittals = [
  { id: 1, name: 'Structural Load Calculations', project: 'Metro Commercial', dateSubmitted: 'Jul 25, 2026', status: 'Approved' },
  { id: 2, name: 'Shop Drawings – Parapet Detail', project: 'Riverside Shingle', dateSubmitted: 'Apr 15, 2026', status: 'In Review' },
]

function SubmittalsDrawingsTab() {
  return (
    <div className="space-y-4">
      <h3 className="text-xs font-bold text-gray-800">Submittals &amp; Drawings</h3>
      <div className="border border-gray-100 rounded-xl overflow-hidden text-xs">
        <table className="w-full">
          <thead><tr className="bg-gray-50/60 border-b border-gray-100">{['File', 'Name', 'Project', 'Date Submitted', 'Status'].map((h) => <th key={h} className="text-left px-4 py-3.5 text-gray-400 font-semibold text-[10px] uppercase tracking-wider">{h}</th>)}</tr></thead>
          <tbody>
            {submittals.map((s) => {
              const st = submStatusCfg[s.status] ?? submStatusCfg['Approved']
              return (
                <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/10">
                  <td className="px-4 py-3"><div className="w-6 h-7 bg-red-50 border border-red-100 rounded flex flex-col items-center justify-center"><FileText size={10} className="text-red-400" /><span className="text-[6px] text-red-400 font-bold">PDF</span></div></td>
                  <td className="px-4 py-3 text-gray-700 font-semibold">{s.name}</td>
                  <td className="px-4 py-3 text-gray-500">{s.project}</td>
                  <td className="px-4 py-3 text-gray-500">{s.dateSubmitted}</td>
                  <td className="px-4 py-3"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}>{s.status}</span></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const inspections = [
  { date: 'Jul 25, 2026', name: 'Roof Deck Inspection',    project: 'Metro Commercial', status: 'Pass' },
  { date: 'Apr 15, 2026', name: 'Flashing & Seam Check',   project: 'Riverside Shingle', status: 'Failed - Remediated' },
]

function InspectionLogTab() {
  return (
    <div className="space-y-4">
      <h3 className="text-xs font-bold text-gray-800">Inspection Log</h3>
      <div className="border border-gray-100 rounded-xl overflow-hidden text-xs">
        <table className="w-full">
          <thead><tr className="bg-gray-50/60 border-b border-gray-100">{['Date Submitted', 'Name', 'Project', 'Status'].map((h) => <th key={h} className="text-left px-4 py-3.5 text-gray-400 font-semibold text-[10px] uppercase tracking-wider">{h}</th>)}</tr></thead>
          <tbody>
            {inspections.map((r, i) => (
              <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/10">
                <td className="px-4 py-3 text-gray-500">{r.date}</td>
                <td className="px-4 py-3 text-gray-700 font-semibold">{r.name}</td>
                <td className="px-4 py-3 text-gray-500">{r.project}</td>
                <td className="px-4 py-3"><span className={r.status === 'Pass' ? 'text-emerald-600 font-semibold' : 'text-red-500 font-semibold'}>{r.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// --- Main Export ---
const tabs = ['Basic Info', 'Assigned Projects', 'Project Timeline', 'RFIs Filed', 'Submittals & Drawings', 'Inspection Log']

export function SettingsEmployeeDetailClient({ employee: initialEmployee }: { employee: EmployeeRow }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [emp, setEmp] = useState(initialEmployee)
  const [activeTab, setActiveTab] = useState('Basic Info')
  const [showEdit, setShowEdit] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  
  const color = avatarColor(emp.id)
  const roleLabel = emp.role === 'admin' ? 'Admin' : emp.role === 'manager' ? 'Project Manager' : 'Staff'

  const showToastMsg = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

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
      showToastMsg('Profile updated successfully')
    })
  }

  return (
    <>
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-[#E8F8F0] border border-[#B3E8CE] rounded-lg px-4 py-3 flex items-center gap-3 shadow-lg animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="w-5 h-5 rounded-full bg-[#2E7D32] flex items-center justify-center shrink-0">
            <Check size={12} className="text-white" strokeWidth={3} />
          </div>
          <span className="text-xs font-semibold text-[#1B5E20]">{toast}</span>
        </div>
      )}

      {showEdit && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-[1px]" onClick={() => setShowEdit(false)} />
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
        {/* Page Header */}
        <header className="bg-white border-b border-gray-100 px-8 py-5 flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-base font-bold text-gray-900">Settings</h1>
            <p className="text-xs text-gray-400 mt-0.5">Manage your team members, roles, and access permissions</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50">
              <Bell size={14} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
            </button>
            <UserHeaderBadge />
          </div>
        </header>

        {/* Content Wrapper */}
        <main className="flex-1 overflow-y-auto p-8 space-y-5">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Link href="/admin/settings" className="hover:text-gray-700 font-medium transition-colors">Settings</Link>
            <ChevronRight size={12} className="text-gray-300" />
            <span className="text-gray-700 font-semibold">Employee Details</span>
          </div>

          {/* Profile Overview Card */}
          <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-4">
              {emp.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={emp.avatar_url} alt={emp.first_name} className="w-12 h-12 rounded-full object-cover shadow-sm shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0"
                  style={{ backgroundColor: color }}>
                  {initials(emp.first_name, emp.last_name)}
                </div>
              )}
              <div>
                <h2 className="text-sm font-bold text-gray-900 leading-none">{emp.first_name} {emp.last_name}</h2>
                <p className="text-xs text-gray-400 mt-1.5 font-medium">{roleLabel}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setEditError(null); setShowEdit(true) }}
                className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Pencil size={12} /> Edit Info
              </button>
              <button
                onClick={() => showToastMsg(`Message sent to ${emp.first_name}`)}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#0D1B2A] hover:bg-[#162437] text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
              >
                <Mail size={12} /> Message
              </button>
            </div>
          </div>

          {/* Tab Navigation & Detail Display */}
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="flex border-b border-gray-100 px-6 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-1 py-4 mr-8 text-xs font-bold border-b-2 transition-colors -mb-px shrink-0 ${
                    activeTab === tab
                      ? 'border-[#0D1B2A] text-[#0D1B2A]'
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="p-6">
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
