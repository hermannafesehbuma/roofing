'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Search, Filter as FilterIcon, Plus, X, Check, MoreHorizontal, Trash2,
  Eye, Pencil, KanbanSquare, List as ListIcon, ChevronDown, FileText,
  AlertTriangle, ShieldCheck, FileWarning, Trash, Upload,
  Calendar, User, Briefcase, Building2, History, ChevronLeft, ChevronRight, ArrowUpRight
} from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────────
type PolicyStatus = 'Valid' | 'Expiring Soon' | 'Expired'
type CoverageType = 'General Liability' | 'Workers Comp' | 'Auto Liability' | 'Umbrella'
type ViewMode = 'kanban' | 'list'

interface Policy {
  id: number
  policyHolder: string
  coverageType: CoverageType
  insurer: string
  policyNumber: string
  coverageAmount: string
  effectiveDate: string
  expiryDate: string
  renewalReminder: string
  status: PolicyStatus
  daysRemaining: number
}

interface Certification {
  id: number
  employeeName: string
  employeeTitle: string
  certName: string
  issuingBody: string
  department: string
  issueDate: string
  expiryDate: string
  status: PolicyStatus
  daysLeft: number
}

interface UploadPolicyForm {
  id?: number
  policyHolder: string
  coverageType: CoverageType | ''
  insurer: string
  policyNumber: string
  coverageAmount: string
  effectiveDate: string
  expiryDate: string
  renewalReminder: string
}

interface AddCertForm {
  id?: number
  employeeName: string
  employeeTitle?: string
  certName: string
  issuingBody: string
  department: string
  issueDate: string
  expiryDate: string
}

type Modal =
  | { type: 'deletePolicy'; policy: Policy }
  | { type: 'uploadPolicy'; policy?: Policy }
  | { type: 'policySuccess'; title: string; subtitle: string; actionBtn?: string }
  | { type: 'viewPolicy'; policy: Policy }
  | { type: 'certForm'; cert?: Certification }
  | { type: 'viewCert'; cert: Certification }
  | { type: 'deleteCert'; cert: Certification }

interface Filters {
  status: PolicyStatus[]
  coverageType: CoverageType[]
  expiresWithin: string[]
}

// ─── Mock data ─────────────────────────────────────────────────────────────────
const mockPolicies: Policy[] = [
  { id: 1, policyHolder: 'Peak Roofing Inc.', coverageType: 'General Liability', insurer: 'Nationwide Insurance', policyNumber: 'GL-2024-0091', coverageAmount: '$2,000,000', effectiveDate: 'Jun 11, 2025', expiryDate: 'Jun 11, 2026', renewalReminder: '90 days before expiry', status: 'Valid', daysRemaining: 65 },
  { id: 2, policyHolder: 'Peak Roofing Inc.', coverageType: 'General Liability', insurer: 'Nationwide Insurance', policyNumber: 'GL-2024-0091', coverageAmount: '$2,000,000', effectiveDate: 'Jun 11, 2025', expiryDate: 'Jun 11, 2026', renewalReminder: '90 days before expiry', status: 'Valid', daysRemaining: 65 },
  { id: 3, policyHolder: 'Peak Roofing Inc.', coverageType: 'General Liability', insurer: 'Nationwide Insurance', policyNumber: 'GL-2024-0091', coverageAmount: '$2,000,000', effectiveDate: 'Jun 11, 2025', expiryDate: 'Jun 11, 2026', renewalReminder: '90 days before expiry', status: 'Expiring Soon', daysRemaining: 45 },
  { id: 4, policyHolder: 'Peak Roofing Inc.', coverageType: 'General Liability', insurer: 'Nationwide Insurance', policyNumber: 'GL-2024-0091', coverageAmount: '$2,000,000', effectiveDate: 'Jun 11, 2025', expiryDate: 'Mar 11, 2026', renewalReminder: '90 days before expiry', status: 'Expired', daysRemaining: -8 },
]

const mockCerts: Certification[] = [
  { id: 1, employeeName: 'Jose Martinez', employeeTitle: 'Crew Member', certName: 'OSHA 30-Hour Card', issuingBody: 'OSHA', department: 'Field Ops', issueDate: 'Aug 16, 2024', expiryDate: 'Dec 29, 2026', status: 'Valid', daysLeft: 265 },
  { id: 2, employeeName: 'Jose Martinez', employeeTitle: 'Crew Member', certName: 'Fall Protection Training', issuingBody: 'NRCA', department: 'Field Ops', issueDate: 'Mar 4, 2025', expiryDate: 'Jun 2, 2025', status: 'Expiring Soon', daysLeft: 55 },
  { id: 3, employeeName: 'Jose Martinez', employeeTitle: 'Crew Member', certName: 'First Aid / CPR', issuingBody: 'Red Cross', department: 'Field Ops', issueDate: 'Dec 29, 2025', expiryDate: 'Dec 29, 2026', status: 'Valid', daysLeft: 265 },
  { id: 4, employeeName: 'Karen Brooks', employeeTitle: 'Site Manager', certName: 'Forklift Certification', issuingBody: 'ANSI', department: 'Field Ops', issueDate: 'Jan 29, 2024', expiryDate: 'Feb 2, 2026', status: 'Expired', daysLeft: -80 },
  { id: 5, employeeName: 'Karen Brooks', employeeTitle: 'Site Manager', certName: 'OSHA 30-Hour Card', issuingBody: 'OSHA', department: 'Field Ops', issueDate: 'Nov 24, 2024', expiryDate: 'Apr 8, 2027', status: 'Valid', daysLeft: 430 },
  { id: 6, employeeName: 'Karen Brooks', employeeTitle: 'Site Manager', certName: 'Project Management PMP', issuingBody: 'PMI', department: 'Field Ops', issueDate: 'May 8, 2024', expiryDate: 'Jun 12, 2027', status: 'Valid', daysLeft: 500 },
  { id: 7, employeeName: 'Troy Shaw', employeeTitle: 'Engineer', certName: 'PE License - Structural', issuingBody: 'NSPE', department: 'Field Ops', issueDate: 'Jul 13, 2023', expiryDate: 'Aug 21, 2027', status: 'Valid', daysLeft: 401 },
]

// ─── Constants ─────────────────────────────────────────────────────────────────
const STATUSES: PolicyStatus[] = ['Valid', 'Expiring Soon', 'Expired']
const COVERAGE_TYPES: CoverageType[] = ['General Liability', 'Workers Comp', 'Auto Liability', 'Umbrella']
const DEPARTMENTS = ['Field Ops', 'Safety', 'Administration', 'Management']
const EXPIRES_OPTIONS = ['30 Days', '60 Days', '90 Days']

const statusBadge: Record<PolicyStatus, string> = {
  Valid: 'text-emerald-700 bg-emerald-50',
  'Expiring Soon': 'text-orange-700 bg-orange-50',
  Expired: 'text-red-700 bg-red-50',
}

const statusColor: Record<PolicyStatus, string> = {
  Valid: 'bg-emerald-500',
  'Expiring Soon': 'bg-orange-500',
  Expired: 'bg-red-500',
}

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0D1B2A]/10 focus:border-[#0D1B2A] transition-colors'
const selectCls = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-[#0D1B2A]/10 focus:border-[#0D1B2A] transition-colors'

// Helper to format days left exactly as Figma layout shows
const getDaysLeftLabel = (days: number, status: PolicyStatus) => {
   if (status === 'Expired') {
      return <span className="text-red-500 font-medium">{Math.abs(days)}d overdue</span>
   }
   if (status === 'Expiring Soon') {
      return <span className="text-amber-500 font-medium">{days}d</span>
   }
   return <span className="text-gray-600 font-medium">{days}d</span>
}

// ─── Pagination Controls ───────────────────────────────────────────────────────────
function PaginationBar({ current = 1, total = 1 }: { current?: number; total?: number }) {
   return (
      <div className="flex items-center justify-between px-6 py-4 bg-white border-t border-gray-100">
         <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:hover:bg-transparent cursor-pointer">
            <ChevronLeft size={14} /> Previous
         </button>
         <div className="flex gap-1.5">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#0D1B2A] text-white text-xs font-bold">1</div>
         </div>
         <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer">
            Next <ChevronRight size={14} />
         </button>
      </div>
   )
}

// ─── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, subColor, icon }: {
  label: string; value: number | string; sub: string; subColor: string
  icon: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-4 relative overflow-hidden">
      <div className="shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
        <p className={`text-[11px] font-medium mt-1 ${subColor}`}>{sub}</p>
      </div>
      {label === 'Cert Compliance' && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
             <ShieldCheck size={20} />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Action Menu ───────────────────────────────────────────────────────────────
function ActionMenu({ onView, onEdit, onDelete }: { onView: () => void; onEdit?: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
        <MoreHorizontal size={14} />
      </button>
      {open && (
        <div className="absolute right-0 top-7 z-30 w-40 bg-white rounded-xl shadow-lg border border-gray-100 py-1 overflow-hidden">
          <button onClick={() => { setOpen(false); onView() }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">
            <Eye size={13} /> View Detail
          </button>
          {onEdit && (
            <button onClick={() => { setOpen(false); onEdit() }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">
              <Pencil size={13} /> Edit
            </button>
          )}
          <button onClick={() => { setOpen(false); onDelete() }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 text-left">
            <Trash2 size={13} /> Delete
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Filter Dropdown ───────────────────────────────────────────────────────────
function FilterDropdown({ filters, onChange, onClose }: { filters: Filters, onChange: (f: Filters) => void, onClose: () => void }) {
   const ref = useRef<HTMLDivElement>(null)
   
   useEffect(() => {
      function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
      document.addEventListener('mousedown', h)
      return () => document.removeEventListener('mousedown', h)
   }, [onClose])

   const toggleFilter = (key: keyof Filters, val: string) => {
      const current = filters[key] as string[]
      const updated = current.includes(val) ? current.filter(c => c !== val) : [...current, val]
      onChange({ ...filters, [key]: updated })
   }

   const handleClearAll = () => {
      onChange({ status: [], coverageType: [], expiresWithin: [] })
   }

   return (
      <div ref={ref} className="absolute right-0 top-12 z-40 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 p-5 animate-in fade-in slide-in-from-top-2 duration-200">
         <div className="space-y-5">
            <div>
               <label className="text-xs font-bold text-gray-500 block mb-2">Status</label>
               <div className="flex flex-wrap gap-2">
                  {STATUSES.map(s => (
                     <button key={s} onClick={() => toggleFilter('status', s)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filters.status.includes(s) ? 'bg-[#0D1B2A] text-white border-[#0D1B2A]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                        {s}
                     </button>
                  ))}
               </div>
            </div>
            <div>
               <label className="text-xs font-bold text-gray-500 block mb-2">Coverage Type</label>
               <div className="flex flex-wrap gap-2">
                  {COVERAGE_TYPES.map(c => (
                     <button key={c} onClick={() => toggleFilter('coverageType', c)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filters.coverageType.includes(c) ? 'bg-[#0D1B2A] text-white border-[#0D1B2A]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                        {c}
                     </button>
                  ))}
               </div>
            </div>
            <div>
               <label className="text-xs font-bold text-gray-500 block mb-2">Expires Within</label>
               <div className="flex flex-wrap gap-2">
                  {EXPIRES_OPTIONS.map(e => (
                     <button key={e} onClick={() => toggleFilter('expiresWithin', e)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filters.expiresWithin.includes(e) ? 'bg-[#0D1B2A] text-white border-[#0D1B2A]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                        {e}
                     </button>
                  ))}
               </div>
            </div>
            <div className="pt-3 flex gap-2 border-t border-gray-100">
               <button onClick={handleClearAll} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors">
                  Clear All
               </button>
               <button onClick={onClose} className="flex-1 px-4 py-2 bg-[#0D1B2A] text-white rounded-lg text-xs font-bold hover:bg-[#162437] transition-colors">
                  Apply
               </button>
            </div>
         </div>
      </div>
   )
}

// ─── Policy Card ───────────────────────────────────────────────────────────────
function PolicyCard({ policy, onView, onEdit, onDelete }: { policy: Policy; onView: () => void; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow relative">
      <div className="flex justify-between items-start mb-3">
        <div>
           <h4 className="text-sm font-bold text-gray-900">{policy.policyHolder}</h4>
           <p className="text-xs text-gray-500">{policy.coverageType}</p>
        </div>
        <ActionMenu onView={onView} onEdit={onEdit} onDelete={onDelete} />
      </div>

      <div className="flex items-center justify-center bg-gray-50 rounded-lg py-6 mb-4">
        <div className="flex flex-col items-center">
           <div className="w-10 h-12 bg-white rounded shadow-sm flex items-center justify-center relative">
              <FileText className="text-red-500" size={24} />
              <span className="absolute -bottom-1 right-[-4px] bg-red-500 text-white text-[8px] font-bold px-1 rounded">PDF</span>
           </div>
        </div>
      </div>

      <div className="space-y-2 text-xs mb-3">
        <div className="flex justify-between">
          <span className="text-gray-400">Status:</span>
          <span className={`font-medium flex items-center gap-1 ${statusBadge[policy.status]} px-1.5 rounded text-[10px]`}>
             <div className={`w-1 h-1 rounded-full ${statusColor[policy.status]}`} />
             {policy.status}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Policy #:</span>
          <span className="text-gray-700">{policy.policyNumber}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Insurer:</span>
          <span className="text-gray-700 truncate max-w-[140px]">{policy.insurer}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Coverage Amount:</span>
          <span className="text-gray-700 font-medium">{policy.coverageAmount}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Effective Date:</span>
          <span className="text-gray-700">{policy.effectiveDate}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Expiry Date:</span>
          <span className="text-gray-700">{policy.expiryDate}</span>
        </div>
      </div>

      <div className="border-t border-gray-50 pt-3 flex items-center justify-between text-[11px]">
        <span className="text-gray-400">Policy period used</span>
        <span className={`font-medium ${policy.status === 'Expired' ? 'text-red-500' : 'text-emerald-600'}`}>
          {policy.status === 'Expired' 
            ? `${Math.abs(policy.daysRemaining)} days over due`
            : `${policy.daysRemaining} days left`}
        </span>
      </div>
    </div>
  )
}

// ─── Certification Card ────────────────────────────────────────────────────────
function CertCard({ cert, onView, onEdit, onDelete }: { cert: Certification; onView: () => void; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow relative">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-xs shrink-0 overflow-hidden">
             <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-300 flex items-center justify-center text-blue-900 font-bold">
                {cert.employeeName.split(' ').map(n => n[0]).join('')}
             </div>
          </div>
          <div>
             <h4 className="text-sm font-bold text-gray-900">{cert.employeeName}</h4>
             <p className="text-xs text-gray-500">{cert.employeeTitle}</p>
          </div>
        </div>
        <ActionMenu onView={onView} onEdit={onEdit} onDelete={onDelete} />
      </div>

      <div className="space-y-2.5 text-[11px]">
        <div className="flex justify-between items-start">
           <span className="text-gray-400">Certification</span>
           <span className="text-gray-800 font-medium text-right">{cert.certName}</span>
        </div>
        <div className="flex justify-between items-center">
           <span className="text-gray-400">Issuing Body</span>
           <span className="text-gray-800">{cert.issuingBody}</span>
        </div>
        <div className="flex justify-between items-center">
           <span className="text-gray-400">Department</span>
           <span className="text-gray-800">{cert.department}</span>
        </div>
        <div className="flex justify-between items-center">
           <span className="text-gray-400">Issue Date</span>
           <span className="text-gray-800">{cert.issueDate}</span>
        </div>
        <div className="flex justify-between items-center pt-1 border-t border-gray-50">
           <span className="text-gray-400">Status</span>
           <span className={`font-medium flex items-center gap-1.5 ${statusBadge[cert.status]} px-1.5 py-0.5 rounded text-[10px]`}>
             <div className={`w-1.5 h-1.5 rounded-full ${statusColor[cert.status]}`} />
             {cert.status}
           </span>
        </div>
      </div>
    </div>
  )
}

// ─── Policy List Table ──────────────────────────────────────────────────────────
function PolicyListTable({ policies, onView, onEdit, onDelete }: { policies: Policy[], onView: (p: Policy) => void, onEdit: (p: Policy) => void, onDelete: (p: Policy) => void }) {
   return (
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden flex flex-col">
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
               <thead>
                  <tr className="bg-gray-50/50 text-[10px] uppercase tracking-wider font-bold text-gray-400 border-b border-gray-100">
                     <th className="pl-6 py-4 w-10">
                        <input type="checkbox" className="w-3.5 h-3.5 rounded border-gray-300 text-[#0D1B2A] focus:ring-0" />
                     </th>
                     <th className="px-4 py-4">Policy Holder</th>
                     <th className="px-4 py-4">Coverage</th>
                     <th className="px-4 py-4">Insurer</th>
                     <th className="px-4 py-4">Number</th>
                     <th className="px-4 py-4">Expires</th>
                     <th className="px-4 py-4">Status</th>
                     <th className="px-6 py-4 w-10"></th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-50 text-sm text-gray-800">
                  {policies.map(p => (
                     <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="pl-6 py-4">
                           <input type="checkbox" className="w-3.5 h-3.5 rounded border-gray-300 text-[#0D1B2A] focus:ring-0" />
                        </td>
                        <td className="px-4 py-4 font-medium text-gray-900">{p.policyHolder}</td>
                        <td className="px-4 py-4">{p.coverageType}</td>
                        <td className="px-4 py-4 text-gray-500">{p.insurer}</td>
                        <td className="px-4 py-4 font-mono text-xs text-gray-600">{p.policyNumber}</td>
                        <td className="px-4 py-4">{p.expiryDate}</td>
                        <td className="px-4 py-4">
                           <span className={`inline-flex items-center gap-1.5 ${statusBadge[p.status]} px-2 py-0.5 rounded-full text-xs font-medium`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${statusColor[p.status]}`} />
                              {p.status}
                           </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                           <ActionMenu onView={() => onView(p)} onEdit={() => onEdit(p)} onDelete={() => onDelete(p)} />
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
            {policies.length === 0 && (
               <div className="py-12 text-center text-gray-400 text-sm">No matching policies found</div>
            )}
         </div>
         {policies.length > 0 && <PaginationBar />}
      </div>
   )
}

// ─── Cert List Table ───────────────────────────────────────────────────────────
function CertListTable({ certs, onView, onEdit, onDelete }: { certs: Certification[], onView: (c: Certification) => void, onEdit: (c: Certification) => void, onDelete: (c: Certification) => void }) {
   return (
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden flex flex-col">
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
               <thead>
                  <tr className="bg-gray-50/50 text-[10px] uppercase tracking-wider font-bold text-gray-400 border-b border-gray-100">
                     <th className="pl-6 py-4 w-10">
                        <input type="checkbox" className="w-3.5 h-3.5 rounded border-gray-300 text-[#0D1B2A] focus:ring-0" />
                     </th>
                     <th className="px-4 py-4">Employee</th>
                     <th className="px-4 py-4">Certification</th>
                     <th className="px-4 py-4">Issuing Body</th>
                     <th className="px-4 py-4">Issue Date</th>
                     <th className="px-4 py-4">Expiry Date</th>
                     <th className="px-4 py-4">Days Left</th>
                     <th className="px-4 py-4">Status</th>
                     <th className="px-6 py-4 w-10 text-right">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-50 text-sm text-gray-800">
                  {certs.map(c => (
                     <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="pl-6 py-4">
                           <input type="checkbox" className="w-3.5 h-3.5 rounded border-gray-300 text-[#0D1B2A] focus:ring-0" />
                        </td>
                        <td className="px-4 py-4">
                           <div className="flex items-center gap-3">
                              <div className="w-7 h-7 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">
                                 {c.employeeName.split(' ').map(n => n[0]).join('')}
                              </div>
                              <div>
                                 <p className="font-medium text-gray-900 leading-none">{c.employeeName}</p>
                                 <p className="text-[10px] text-gray-400 mt-1">{c.employeeTitle}</p>
                              </div>
                           </div>
                        </td>
                        <td className="px-4 py-4 font-medium text-gray-800">{c.certName}</td>
                        <td className="px-4 py-4 text-gray-500">{c.issuingBody}</td>
                        <td className="px-4 py-4 text-gray-500">{c.issueDate}</td>
                        <td className={`px-4 py-4 ${c.status === 'Expiring Soon' ? 'text-amber-600' : c.status === 'Expired' ? 'text-red-600' : 'text-gray-500'}`}>
                           {c.expiryDate}
                        </td>
                        <td className="px-4 py-4 text-xs">
                           {getDaysLeftLabel(c.daysLeft, c.status)}
                        </td>
                        <td className="px-4 py-4">
                           <span className={`inline-flex items-center gap-1.5 ${statusBadge[c.status]} px-2 py-0.5 rounded-full text-xs font-medium`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${statusColor[c.status]}`} />
                              {c.status}
                           </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                           <ActionMenu onView={() => onView(c)} onEdit={() => onEdit(c)} onDelete={() => onDelete(c)} />
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
            {certs.length === 0 && (
               <div className="py-12 text-center text-gray-400 text-sm">No certifications found</div>
            )}
         </div>
         {certs.length > 0 && <PaginationBar />}
      </div>
   )
}

// ─── Delete Modal ────────────────────────────────────────────────────────────
function DeleteModal({ title, message, onConfirm, onCancel }: { title: string; message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50 backdrop-blur-[1px]" onClick={onCancel} />
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 flex flex-col items-center text-center">
          <button onClick={onCancel} className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">
            <X size={16} />
          </button>
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-5">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <Trash size={20} className="text-red-500" />
            </div>
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">{title}</h2>
          <div className="text-sm text-gray-500 leading-relaxed mb-7 max-w-[280px]" dangerouslySetInnerHTML={{ __html: message }}></div>
          <div className="flex gap-3 w-full">
            <button onClick={onCancel} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
            <button onClick={onConfirm} className="flex-1 py-2.5 rounded-lg bg-[#0D1B2A] text-sm font-medium text-white hover:bg-[#162437] transition-colors">Delete</button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Policy Detail Modal (Sidebar Drawer) ─────────────────────────────────────
function PolicyDetailModal({ policy, onClose, onEdit }: { policy: Policy; onClose: () => void; onEdit: () => void }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-[1px]" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 flex">
        <div className="bg-white w-[520px] max-w-full h-full flex flex-col shadow-2xl">
          <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100 shrink-0">
            <h2 className="text-base font-bold text-gray-900">Policy Detail</h2>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"><X size={16} /></button>
          </div>

          <div className="overflow-y-auto flex-1 px-7 py-6 space-y-7 bg-[#FDFDFD]">
            {/* Company Head */}
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <ShieldCheck size={24} />
               </div>
               <div>
                  <h3 className="text-base font-bold text-gray-900">{policy.insurer}</h3>
                  <p className="text-xs text-gray-500">Policy: {policy.policyNumber}</p>
               </div>
            </div>

            {/* Green Banner (Similar to Certs for symmetry) */}
            <div className="bg-[#F0FDF4] border border-green-100 rounded-xl p-5">
               <div className="flex items-start justify-between mb-1">
                  <div>
                     <h4 className="font-bold text-gray-900 text-sm">{policy.policyHolder}</h4>
                     <p className="text-[11px] text-gray-500 mt-0.5">{policy.coverageType}</p>
                  </div>
                  <span className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase ${policy.status === 'Valid' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                     • {policy.status}
                  </span>
               </div>
               <div className="w-full bg-green-200 h-1.5 rounded-full mt-4 relative">
                  <div className={`h-full rounded-full ${policy.status === 'Expired' ? 'bg-red-500 w-full' : 'bg-[#10B981] w-[80%]'}`} />
               </div>
               <div className="flex justify-between mt-2 text-[10px] text-gray-500 font-medium">
                  <span>Coverage coverage period</span>
                  <span>{policy.daysRemaining} days left</span>
               </div>
            </div>

            {/* Details Array */}
            <div>
               <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-4">Policy Information</h4>
               <div className="border border-gray-100 rounded-xl overflow-hidden bg-white">
                  {[
                     ['Policy Holder', policy.policyHolder],
                     ['Coverage Limit', policy.coverageAmount],
                     ['Coverage Type', policy.coverageType],
                     ['Effective Date', policy.effectiveDate],
                     ['Expiration Date', policy.expiryDate],
                  ].map(([k, v], idx) => (
                     <div key={k} className={`flex items-center justify-between px-4 py-3 text-sm ${idx !== 4 ? 'border-b border-gray-50' : ''}`}>
                        <span className="text-gray-400">{k}</span>
                        <span className="font-medium text-gray-900">{v}</span>
                     </div>
                  ))}
               </div>
            </div>

            {/* History */}
            <div>
               <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-1.5"><History size={12}/> History Log</h4>
               <div className="relative pl-6 space-y-6">
                  <div className="absolute left-[9px] top-2 bottom-2 w-[1px] border-l border-dashed border-gray-200" />
                  <div className="relative">
                     <div className="absolute left-[-22px] top-0.5 w-4 h-4 bg-green-100 rounded-full flex items-center justify-center ring-4 ring-white">
                        <Check size={10} className="text-green-600" strokeWidth={3} />
                     </div>
                     <div>
                        <p className="text-xs font-bold text-gray-800 leading-none">Policy uploaded & approved</p>
                        <p className="text-[10px] text-gray-400 mt-1.5">{policy.effectiveDate} · Admin</p>
                     </div>
                  </div>
               </div>
            </div>

            {/* Document Preview */}
            <div>
               <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Attached Document</h4>
               <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center bg-white hover:bg-gray-50 cursor-pointer transition-colors group relative">
                  <div className="w-10 h-12 bg-white rounded shadow-sm flex items-center justify-center relative mb-2 border border-gray-100 group-hover:border-gray-300 transition-colors">
                     <FileText className="text-red-500" size={22} />
                     <span className="absolute -bottom-1 right-[-4px] bg-red-500 text-white text-[7px] font-bold px-1 rounded">PDF</span>
                  </div>
                  <p className="text-xs text-gray-500 font-medium">Preview full policy file</p>
               </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-7 py-5 border-t border-gray-100 shrink-0 bg-white">
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Close</button>
            <button onClick={() => { onClose(); onEdit() }} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0D1B2A] text-sm font-medium text-white hover:bg-[#162437] transition-colors">
               Renew & Update <ArrowUpRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Cert Detail Modal (Sidebar Drawer) ───────────────────────────────────────
function CertDetailModal({ cert, onClose, onEdit }: { cert: Certification; onClose: () => void; onEdit: () => void }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-[1px]" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 flex">
        <div className="bg-white w-[520px] max-w-full h-full flex flex-col shadow-2xl">
          <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100 shrink-0">
            <h2 className="text-base font-bold text-gray-900">Certification Detail</h2>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"><X size={16} /></button>
          </div>

          <div className="overflow-y-auto flex-1 px-7 py-6 space-y-7 bg-[#FDFDFD]">
            {/* Top profile */}
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm overflow-hidden shrink-0">
                  {cert.employeeName.split(' ').map(n => n[0]).join('')}
               </div>
               <div>
                  <h3 className="text-base font-bold text-gray-900">{cert.employeeName}</h3>
                  <p className="text-xs text-gray-500">{cert.employeeTitle} · {cert.department}</p>
               </div>
            </div>

            {/* Green Credential Banner */}
            <div className="bg-[#F0FDF4] border border-green-100 rounded-xl p-5">
               <div className="flex items-start justify-between mb-1">
                  <div>
                     <h4 className="font-bold text-gray-900 text-sm">{cert.certName}</h4>
                     <p className="text-[11px] text-gray-500 mt-0.5">Issued by {cert.issuingBody} - ID: CRT-00{cert.id}</p>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 px-1.5 py-0.5 bg-emerald-100 rounded-md uppercase">
                     • {cert.status}
                  </span>
               </div>
               {/* Progress bar mockup */}
               <div className="w-full bg-green-200 h-1.5 rounded-full mt-4 relative">
                  <div className={`h-full rounded-full bg-[#10B981] ${cert.status === 'Expired' ? 'w-full bg-red-500' : 'w-[75%]'}`} />
               </div>
               <div className="flex justify-between mt-2 text-[10px] text-gray-500 font-medium">
                  <span>Policy period used</span>
                  <span>{cert.daysLeft > 0 ? `${cert.daysLeft} days remaining` : 'Expired'}</span>
               </div>
            </div>

            {/* Certification Details */}
            <div>
               <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-4">Certification Details</h4>
               <div className="border border-gray-100 rounded-xl overflow-hidden bg-white">
                  {[
                     ['Certification', cert.certName],
                     ['Issuing Body', cert.issuingBody],
                     ['Department', cert.department],
                     ['Issue Date', cert.issueDate],
                     ['Expiry Date', cert.expiryDate],
                  ].map(([k, v], idx) => (
                     <div key={k} className={`flex items-center justify-between px-4 py-3 text-sm ${idx !== 4 ? 'border-b border-gray-50' : ''}`}>
                        <span className="text-gray-400">{k}</span>
                        <span className="font-medium text-gray-900">{v}</span>
                     </div>
                  ))}
               </div>
            </div>

            {/* Compliance History */}
            <div>
               <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-4">Compliance History</h4>
               <div className="relative pl-6 space-y-6">
                  <div className="absolute left-[9px] top-2 bottom-2 w-[1px] border-l border-dashed border-gray-200" />
                  <div className="relative">
                     <div className="absolute left-[-22px] top-0.5 w-4 h-4 bg-green-100 rounded-full flex items-center justify-center ring-4 ring-white">
                        <Check size={10} className="text-green-600" strokeWidth={3} />
                     </div>
                     <div>
                        <p className="text-xs font-bold text-gray-800 leading-none">Certificate issued and logged</p>
                        <p className="text-[10px] text-gray-400 mt-1.5">{cert.issueDate} · Admin</p>
                     </div>
                  </div>
                  {cert.status === 'Expired' && (
                     <div className="relative">
                        <div className="absolute left-[-22px] top-0.5 w-4 h-4 bg-red-100 rounded-full flex items-center justify-center ring-4 ring-white">
                           <X size={10} className="text-red-600" strokeWidth={3} />
                        </div>
                        <div>
                           <p className="text-xs font-bold text-gray-800 leading-none">Certificate has expired</p>
                           <p className="text-[10px] text-gray-400 mt-1.5">{cert.expiryDate} · System</p>
                        </div>
                     </div>
                  )}
               </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-7 py-5 border-t border-gray-100 shrink-0 bg-white">
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Close</button>
            <button onClick={() => { onClose(); onEdit() }} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0D1B2A] text-sm font-medium text-white hover:bg-[#162437] transition-colors">
               Update Certification <ArrowUpRight size={14} className="ml-0.5" />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Success Modal ──────────────────────────────────────────────────────────
function SuccessModal({ title, subtitle, actionBtn = "Okay", onClose }: { title: string; subtitle: string; actionBtn?: string; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50 backdrop-blur-[1px]" onClick={onClose} />
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center text-center">
          <button onClick={onClose} className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"><X size={16} /></button>
          <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-emerald-100">
            <Check size={32} className="text-white" strokeWidth={3} />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">{title}</h2>
          <p className="text-sm text-gray-500 leading-relaxed mb-8">{subtitle}</p>
          <button onClick={onClose} className="w-full py-3 bg-[#0D1B2A] text-white rounded-xl text-sm font-bold hover:bg-[#162437] transition-colors">{actionBtn}</button>
        </div>
      </div>
    </>
  )
}

// ─── Upload/Edit Policy Modal ──────────────────────────────────────────────────
function PolicyFormModal({ policy, onClose, onSave }: { policy?: Policy; onClose: () => void; onSave: (v: UploadPolicyForm) => void }) {
  const [v, setV] = useState<UploadPolicyForm>({
    id: policy?.id,
    policyHolder: policy?.policyHolder || 'Peak Roofing Inc.', 
    coverageType: policy?.coverageType || '', 
    insurer: policy?.insurer || '', 
    policyNumber: policy?.policyNumber || '',
    coverageAmount: policy?.coverageAmount || '', 
    effectiveDate: policy?.effectiveDate || 'Jun 11, 2025', 
    expiryDate: policy?.expiryDate || 'Jun 11, 2026', 
    renewalReminder: policy?.renewalReminder || '90 days before expiry',
  })

  function set<K extends keyof UploadPolicyForm>(k: K, val: UploadPolicyForm[K]) {
    setV(prev => ({ ...prev, [k]: val }))
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-[1px]" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 flex">
        <div className="bg-white w-[480px] max-w-full h-full flex flex-col shadow-2xl">
          <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100 shrink-0">
            <h2 className="text-base font-bold text-gray-900">{policy ? 'Edit COI Policy' : 'Upload COI Policy'}</h2>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"><X size={16} /></button>
          </div>

          <div className="overflow-y-auto flex-1 px-7 py-6 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-4">Policy Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Policy Holder Name</label>
                  <input placeholder="Policy Holder Name" value={v.policyHolder} onChange={e => set('policyHolder', e.target.value)} className={inputCls} />
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Coverage Type</label>
                    <div className="relative">
                      <select value={v.coverageType} onChange={e => set('coverageType', e.target.value as CoverageType)} className={selectCls}>
                        <option value="">Select coverage</option>
                        {COVERAGE_TYPES.map(c => <option key={c}>{c}</option>)}
                      </select>
                      <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Insurer</label>
                    <input placeholder="Insurance company name" value={v.insurer} onChange={e => set('insurer', e.target.value)} className={inputCls} />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Policy Number</label>
                    <input placeholder="Policy Number" value={v.policyNumber} onChange={e => set('policyNumber', e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Coverage Amount</label>
                    <input placeholder="Enter amount" value={v.coverageAmount} onChange={e => set('coverageAmount', e.target.value)} className={inputCls} />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-4">Policy Dates</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Effective Date</label>
                    <input type="text" placeholder="Effective Date" value={v.effectiveDate} onChange={e => set('effectiveDate', e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Expiry Date</label>
                    <input type="text" placeholder="Expiry Date" value={v.expiryDate} onChange={e => set('expiryDate', e.target.value)} className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Renewal Reminder</label>
                  <div className="relative">
                    <select value={v.renewalReminder} onChange={e => set('renewalReminder', e.target.value)} className={selectCls}>
                       <option>30 days before expiry</option>
                       <option>60 days before expiry</option>
                       <option>90 days before expiry</option>
                       <option>120 Days</option>
                    </select>
                    <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>

            <div>
               <h3 className="text-sm font-bold text-gray-900 mb-4">Document Upload</h3>
               <p className="text-xs text-gray-500 mb-2">Upload COI Document (PDF)</p>
               <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center bg-gray-50 relative cursor-pointer hover:bg-gray-100 transition-colors">
                  <div className="flex flex-col items-center">
                     <div className="w-10 h-12 bg-white rounded shadow-sm flex items-center justify-center relative mb-2">
                        <FileText className="text-red-500" size={24} />
                        <span className="absolute -bottom-1 right-[-4px] bg-red-500 text-white text-[8px] font-bold px-1 rounded">PDF</span>
                     </div>
                     <span className="text-xs text-gray-500">Click to view PDF</span>
                  </div>
                  <div className="absolute right-4 bottom-4 bg-white border border-gray-200 p-1.5 rounded-md text-gray-400 hover:text-red-500 cursor-pointer">
                     <Trash2 size={14} />
                  </div>
               </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-7 py-5 border-t border-gray-100 shrink-0">
            <button onClick={onClose} className="px-6 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
            <button onClick={() => { if (v.policyHolder.trim()) onSave(v) }} className="px-6 py-2.5 rounded-xl bg-[#0D1B2A] text-sm font-medium text-white hover:bg-[#162437] transition-colors">Save</button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Form/Edit Cert Modal ──────────────────────────────────────────────────────────
function CertFormModal({ cert, onClose, onSave }: { cert?: Certification; onClose: () => void; onSave: (v: AddCertForm) => void }) {
   const [v, setV] = useState<AddCertForm>({
      id: cert?.id,
      employeeName: cert?.employeeName || '', 
      employeeTitle: cert?.employeeTitle || 'Crew Member',
      certName: cert?.certName || '', 
      issuingBody: cert?.issuingBody || '', 
      department: cert?.department || '', 
      issueDate: cert?.issueDate || 'Aug 16, 2024', 
      expiryDate: cert?.expiryDate || 'Dec 29, 2026'
   })

   function set<K extends keyof AddCertForm>(k: K, val: AddCertForm[K]) {
      setV(prev => ({ ...prev, [k]: val }))
   }

   return (
      <>
        <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-[1px]" onClick={onClose} />
        <div className="fixed inset-y-0 right-0 z-50 flex">
          <div className="bg-white w-[480px] max-w-full h-full flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100 shrink-0">
              <h2 className="text-base font-bold text-gray-900">{cert ? 'Edit Certification' : 'Add Certification'}</h2>
              <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"><X size={16} /></button>
            </div>
  
            <div className="overflow-y-auto flex-1 px-7 py-6 space-y-6">
               <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-4">Employee & Certification</h3>
                  <div className="space-y-4">
                     <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Employee</label>
                        <div className="relative">
                           <select value={v.employeeName} onChange={e => set('employeeName', e.target.value)} className={selectCls}>
                              <option value="">Select employee</option>
                              <option>Jose Martinez</option>
                              <option>Karen Brooks</option>
                              <option>Troy Shaw</option>
                              <option>John Smith</option>
                           </select>
                           <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        </div>
                     </div>
                     <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Certification Name</label>
                        <input placeholder="Enter name" value={v.certName} onChange={e => set('certName', e.target.value)} className={inputCls} />
                     </div>
                     <div className="grid grid-cols-1 gap-4">
                        <div>
                           <label className="block text-xs font-medium text-gray-600 mb-1.5">Issuing Body</label>
                           <input placeholder="eg OSHA" value={v.issuingBody} onChange={e => set('issuingBody', e.target.value)} className={inputCls} />
                        </div>
                        <div>
                           <label className="block text-xs font-medium text-gray-600 mb-1.5">Department</label>
                           <div className="relative">
                              <select value={v.department} onChange={e => set('department', e.target.value)} className={selectCls}>
                                 <option value="">Select department</option>
                                 {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                              </select>
                              <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                           </div>
                        </div>
                     </div>
                  </div>
               </div>

               <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-4">Dates</h3>
                  <div className="grid grid-cols-1 gap-4">
                     <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Issue Date</label>
                        <div className="relative">
                           <input type="text" placeholder="Select" value={v.issueDate} onChange={e => set('issueDate', e.target.value)} className={inputCls} />
                           <Calendar size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                     </div>
                     <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Expiry Date</label>
                        <div className="relative">
                           <input type="text" placeholder="Select" value={v.expiryDate} onChange={e => set('expiryDate', e.target.value)} className={inputCls} />
                           <Calendar size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                     </div>
                  </div>
               </div>

               <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-4">Document Upload</h3>
                  <p className="text-xs text-gray-500 mb-2">Upload Certificate (PDF / Image)</p>
                  <div className="border border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center bg-gray-50 text-center transition-colors relative min-h-[140px]">
                     <div className="flex flex-col items-center justify-center">
                        <div className="w-10 h-12 bg-white rounded shadow-sm flex items-center justify-center relative mb-2">
                           <FileText className="text-red-500" size={22} />
                           <span className="absolute -bottom-1 right-[-4px] bg-red-500 text-white text-[7px] font-bold px-1 rounded">PDF</span>
                        </div>
                        <p className="text-xs text-gray-500 font-medium">Click to view PDF</p>
                     </div>
                     <button className="absolute right-3 bottom-3 w-7 h-7 border border-red-100 bg-white text-red-400 flex items-center justify-center rounded hover:bg-red-50">
                        <Trash2 size={14} />
                     </button>
                  </div>
               </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-7 py-5 border-t border-gray-100 shrink-0">
              <button onClick={onClose} className="px-6 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={() => { if (v.employeeName && v.certName) onSave(v) }} className="px-6 py-2.5 rounded-xl bg-[#0D1B2A] text-sm font-bold text-white hover:bg-[#162437] transition-colors">Save</button>
            </div>
          </div>
        </div>
      </>
   )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function InsurancePage() {
  const [tab, setTab] = useState<'coi' | 'certs'>('coi')
  const [viewMode, setViewMode] = useState<ViewMode>('kanban')
  const [policies, setPolicies] = useState<Policy[]>(mockPolicies)
  const [certs, setCerts] = useState<Certification[]>(mockCerts)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<Modal | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<Filters>({ status: [], coverageType: [], expiresWithin: [] })

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  function confirmDeletePolicy() {
    if (modal?.type !== 'deletePolicy') return
    setPolicies(prev => prev.filter(p => p.id !== modal.policy.id))
    setModal(null)
    showToast(`Policy deleted successfully`)
  }

  function confirmDeleteCert() {
     if (modal?.type !== 'deleteCert') return
     const c = modal.cert
     setCerts(prev => prev.filter(curr => curr.id !== c.id))
     setModal(null)
     // Styled toast exactly matching Figma
     showToast(`Certification (${c.employeeName}, ${c.certName}) deleted successfully`)
  }

  function handleSavePolicy(values: UploadPolicyForm) {
    if (values.id) {
       setPolicies(prev => prev.map(p => p.id === values.id ? {
          ...p,
          policyHolder: values.policyHolder,
          coverageType: (values.coverageType || 'General Liability') as CoverageType,
          insurer: values.insurer || 'Unknown',
          policyNumber: values.policyNumber || 'TBD',
          coverageAmount: values.coverageAmount || '$0',
          effectiveDate: values.effectiveDate,
          expiryDate: values.expiryDate,
          renewalReminder: values.renewalReminder,
       } : p))
       setModal({ type: 'policySuccess', title: 'Policy updated', subtitle: 'The changes were successfully saved.' })
    } else {
      const newId = Math.max(...policies.map(p => p.id), 0) + 1
      setPolicies(prev => [...prev, {
        id: newId,
        policyHolder: values.policyHolder,
        coverageType: (values.coverageType || 'General Liability') as CoverageType,
        insurer: values.insurer || 'Unknown',
        policyNumber: values.policyNumber || 'TBD',
        coverageAmount: values.coverageAmount || '$0',
        effectiveDate: values.effectiveDate,
        expiryDate: values.expiryDate,
        renewalReminder: values.renewalReminder,
        status: 'Valid',
        daysRemaining: 60,
      }])
      setModal({ type: 'policySuccess', title: 'Policy uploaded', subtitle: 'You can now review, update, or share this policy with your team.' })
    }
  }

  function handleSaveCert(values: AddCertForm) {
     if (values.id) {
        setCerts(prev => prev.map(c => c.id === values.id ? {
           ...c,
           employeeName: values.employeeName,
           certName: values.certName,
           issuingBody: values.issuingBody,
           department: values.department || 'Field Ops',
           issueDate: values.issueDate,
           expiryDate: values.expiryDate
        } : c))
        setModal(null)
        showToast('Certification updated successfully')
     } else {
        const newId = Math.max(...certs.map(c => c.id), 0) + 1
        setCerts(prev => [...prev, {
           id: newId,
           employeeName: values.employeeName,
           employeeTitle: values.employeeTitle || 'Crew Member',
           certName: values.certName,
           issuingBody: values.issuingBody,
           department: values.department || 'Field Ops',
           issueDate: values.issueDate || 'Aug 16, 2024',
           expiryDate: values.expiryDate || 'Dec 29, 2026',
           status: 'Valid',
           daysLeft: 365
        }])
        setModal({ type: 'policySuccess', title: 'Certification added successfully', subtitle: 'The certification has been uploaded and is now available for review and tracking.', actionBtn: "View Task" })
     }
  }

  const filteredPolicies = policies.filter(p => {
     const matchSearch = p.policyHolder.toLowerCase().includes(search.toLowerCase()) ||
                         p.policyNumber.toLowerCase().includes(search.toLowerCase()) ||
                         p.insurer.toLowerCase().includes(search.toLowerCase())
     if (!matchSearch) return false
     if (filters.status.length > 0 && !filters.status.includes(p.status)) return false
     if (filters.coverageType.length > 0 && !filters.coverageType.includes(p.coverageType)) return false
     return true
  })

  const filteredCerts = certs.filter(c => {
     const matchSearch = c.employeeName.toLowerCase().includes(search.toLowerCase()) ||
                         c.certName.toLowerCase().includes(search.toLowerCase())
     if (!matchSearch) return false
     if (filters.status.length > 0 && !filters.status.includes(c.status)) return false
     return true
  })

  const stats = {
    active: policies.filter(p => p.status === 'Valid').length,
    expiring: policies.filter(p => p.status === 'Expiring Soon').length,
    expired: policies.filter(p => p.status === 'Expired').length,
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#F4F6F9]">
      {/* Header */}
      <div className="flex-none bg-white border-b border-gray-100 px-8 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Insurance & Certificates</h1>
            <p className="text-gray-500 text-xs mt-0.5">Track COI policies, employee certifications, and upcoming expirations.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-900">John Doe</p>
              <p className="text-xs text-gray-400">john.doe@peakroofing.com</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-semibold">JD</span>
            </div>
          </div>
        </div>
      </div>

      {/* Body container */}
      <div className="flex-1 overflow-y-auto relative flex flex-col">
        {/* Styled Success Banner/Toast matching Figma */}
        {toast && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-2 bg-emerald-100 text-emerald-800 text-[13px] font-medium px-5 py-2.5 rounded-lg shadow-sm border border-emerald-200">
              <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center shrink-0">
                 <Check size={12} className="text-white" strokeWidth={3} />
              </div>
              {toast}
            </div>
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-4 px-8 pt-5 flex-none">
          <StatCard label="Active COIs" value={stats.active} sub="All policies tracked" subColor="text-emerald-500"
            icon={<div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center"><ShieldCheck size={20} className="text-emerald-500" /></div>} />
          
          <StatCard label="Expiring Soon" value={stats.expiring} sub="Within 60 days" subColor="text-orange-500"
            icon={<div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center"><AlertTriangle size={20} className="text-orange-500" /></div>} />
          
          <StatCard label="Expired" value={stats.expired} sub="Needs renewal" subColor="text-red-500"
            icon={<div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center"><FileWarning size={20} className="text-red-500" /></div>} />
          
          <StatCard label="Cert Compliance" value="64%" sub="" subColor=""
            icon={<div className="w-10 h-10 rounded-full border-4 border-gray-100 border-t-blue-500 flex items-center justify-center rotate-45"></div>} />
        </div>

        {/* Tabs & Toolbar */}
        <div className="px-8 pt-5 flex-none">
          <div className="flex items-center mb-4 gap-3">
             <button 
               onClick={() => setTab('coi')}
               className={`px-4 py-1.5 text-xs font-bold rounded-full transition-colors ${tab === 'coi' ? 'bg-[#0D1B2A] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
             >
               COI Policies ({policies.length})
             </button>
             <button 
               onClick={() => setTab('certs')}
               className={`px-4 py-1.5 text-xs font-bold rounded-full transition-colors ${tab === 'certs' ? 'bg-[#0D1B2A] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
             >
               Employee Certifications ({certs.length})
             </button>
          </div>

          <div className="flex items-center gap-3 mb-4 relative">
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5 gap-0.5 shrink-0">
              <button 
                 onClick={() => setViewMode('kanban')}
                 className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${viewMode === 'kanban' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <KanbanSquare size={13} /> Kanban
              </button>
              <button 
                 onClick={() => setViewMode('list')}
                 className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${viewMode === 'list' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <ListIcon size={13} /> List
              </button>
            </div>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search"
                className="pl-8 pr-4 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D1B2A]/10 focus:border-[#0D1B2A] w-52 bg-white" />
            </div>
            <div className="flex-1" />
            <div className="relative">
               <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-1.5 px-3 py-2 text-xs border border-gray-200 rounded-lg bg-white font-medium transition-colors ${showFilters || Object.values(filters).some(a => a.length > 0) ? 'text-blue-600 border-blue-200 bg-blue-50' : 'text-gray-600 hover:bg-gray-50'}`}>
                 <FilterIcon size={13} /> Filter
               </button>
               {showFilters && (
                  <FilterDropdown 
                     filters={filters} 
                     onChange={setFilters} 
                     onClose={() => setShowFilters(false)} 
                  />
               )}
            </div>
            {tab === 'coi' ? (
               <button onClick={() => setModal({ type: 'uploadPolicy' })}
                 className="flex items-center gap-1.5 px-4 py-2 text-xs text-white bg-[#0D1B2A] rounded-lg hover:bg-[#162437] font-bold transition-colors">
                 <Plus size={13} /> Upload COI
               </button>
            ) : (
               <button onClick={() => setModal({ type: 'certForm' })}
                 className="flex items-center gap-1.5 px-4 py-2 text-xs text-white bg-[#0D1B2A] rounded-lg hover:bg-[#162437] font-bold transition-colors">
                 <Plus size={13} /> Add Certification
               </button>
            )}
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="px-8 pb-8 flex-1 overflow-y-auto">
            {viewMode === 'kanban' ? (
               <div className="flex gap-6 items-start min-w-max">
                  {STATUSES.map(status => {
                     const colItems = tab === 'coi' 
                        ? filteredPolicies.filter(p => p.status === status)
                        : filteredCerts.filter(c => c.status === status)
                     return (
                        <div key={status} className="w-80 shrink-0">
                           <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                 <div className={`w-2 h-2 rounded-full ${statusColor[status]}`} />
                                 <span className="font-bold text-gray-800 text-xs">{status}</span>
                                 <span className="bg-gray-200 text-gray-600 text-[10px] font-bold px-1.5 py-0.5 rounded-md">{colItems.length}</span>
                              </div>
                           </div>
                           
                           <div className="space-y-4">
                              {tab === 'coi' 
                                 ? (colItems as Policy[]).map(p => (
                                    <PolicyCard 
                                       key={p.id} 
                                       policy={p} 
                                       onView={() => setModal({ type: 'viewPolicy', policy: p })} 
                                       onEdit={() => setModal({ type: 'uploadPolicy', policy: p })}
                                       onDelete={() => setModal({ type: 'deletePolicy', policy: p })} 
                                    />
                                 ))
                                 : (colItems as Certification[]).map(c => (
                                    <CertCard 
                                       key={c.id} 
                                       cert={c} 
                                       onView={() => setModal({ type: 'viewCert', cert: c })}
                                       onEdit={() => setModal({ type: 'certForm', cert: c })}
                                       onDelete={() => setModal({ type: 'deleteCert', cert: c })}
                                    />
                                 ))
                              }
                              
                              {colItems.length === 0 && (
                                 <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center text-gray-400 text-xs">
                                    No {status.toLowerCase()} items found.
                                 </div>
                              )}
                           </div>
                        </div>
                     )
                  })}
               </div>
            ) : (
               <div className="w-full">
                  {tab === 'coi' ? (
                     <PolicyListTable 
                        policies={filteredPolicies} 
                        onView={(p) => setModal({ type: 'viewPolicy', policy: p })}
                        onEdit={(p) => setModal({ type: 'uploadPolicy', policy: p })}
                        onDelete={(p) => setModal({ type: 'deletePolicy', policy: p })}
                     />
                  ) : (
                     <CertListTable 
                        certs={filteredCerts}
                        onView={(c) => setModal({ type: 'viewCert', cert: c })}
                        onEdit={(c) => setModal({ type: 'certForm', cert: c })}
                        onDelete={(c) => setModal({ type: 'deleteCert', cert: c })}
                     />
                  )}
               </div>
            )}
        </div>
      </div>

      {/* Modals Controller */}
      {modal?.type === 'deletePolicy' && (
        <DeleteModal 
          title="Delete COI Policy"
          message={`This action will permanently delete this COI policy (<b>${modal.policy.policyHolder}</b>) and all associated records.<br/><br/>This cannot be undone.`}
          onConfirm={confirmDeletePolicy} 
          onCancel={() => setModal(null)} 
        />
      )}
      {modal?.type === 'deleteCert' && (
         <DeleteModal 
            title="Delete Certification"
            message={`This action will permanently delete this certification (<b>${modal.cert.employeeName}, ${modal.cert.certName}</b>) and all associated records.<br/><br/>This cannot be undone.`}
            onConfirm={confirmDeleteCert}
            onCancel={() => setModal(null)}
         />
      )}
      {modal?.type === 'uploadPolicy' && (
        <PolicyFormModal 
          policy={modal.policy}
          onClose={() => setModal(null)} 
          onSave={handleSavePolicy} 
        />
      )}
      {modal?.type === 'viewPolicy' && (
         <PolicyDetailModal 
            policy={modal.policy}
            onClose={() => setModal(null)}
            onEdit={() => setModal({ type: 'uploadPolicy', policy: modal.policy })}
         />
      )}
      {modal?.type === 'policySuccess' && (
         <SuccessModal 
            title={modal.title}
            subtitle={modal.subtitle}
            actionBtn={modal.actionBtn}
            onClose={() => setModal(null)}
         />
      )}
      {modal?.type === 'certForm' && (
         <CertFormModal 
            cert={modal.cert}
            onClose={() => setModal(null)}
            onSave={handleSaveCert}
         />
      )}
      {modal?.type === 'viewCert' && (
         <CertDetailModal 
            cert={modal.cert}
            onClose={() => setModal(null)}
            onEdit={() => setModal({ type: 'certForm', cert: modal.cert })}
         />
      )}
    </div>
  )
}
