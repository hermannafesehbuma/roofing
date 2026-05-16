'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import {
  Search, Filter as FilterIcon, Plus, X, Check, MoreHorizontal, Trash2,
  Eye, Pencil, KanbanSquare, List as ListIcon, ChevronDown, FileText,
  AlertTriangle, ShieldCheck, FileWarning, Trash,
  Calendar, History, ChevronLeft, ChevronRight, ArrowUpRight,
} from 'lucide-react'
import {
  type PolicyRow, type CertRow, type EmployeeOption,
  type DbPolicyStatus, type DbCoverageType, type DbCertStatus,
  createPolicy, updatePolicy, deletePolicy,
  createCertification, updateCertification, deleteCertification,
} from './actions'

// ─── Display maps ──────────────────────────────────────────────────────────────
const STATUS_LABEL: Record<DbPolicyStatus, string> = {
  valid: 'Valid',
  expiring_soon: 'Expiring Soon',
  expired: 'Expired',
}
const STATUS_BADGE: Record<DbPolicyStatus, string> = {
  valid: 'text-emerald-700 bg-emerald-50',
  expiring_soon: 'text-orange-700 bg-orange-50',
  expired: 'text-red-700 bg-red-50',
}
const STATUS_DOT: Record<DbPolicyStatus, string> = {
  valid: 'bg-emerald-500',
  expiring_soon: 'bg-orange-500',
  expired: 'bg-red-500',
}
const COVERAGE_LABEL: Record<DbCoverageType, string> = {
  general_liability: 'General Liability',
  workers_comp: 'Workers Comp',
  auto_liability: 'Auto Liability',
  umbrella: 'Umbrella',
}
const COVERAGE_OPTIONS: { value: DbCoverageType; label: string }[] = [
  { value: 'general_liability', label: 'General Liability' },
  { value: 'workers_comp', label: 'Workers Comp' },
  { value: 'auto_liability', label: 'Auto Liability' },
  { value: 'umbrella', label: 'Umbrella' },
]
const DB_STATUSES: DbPolicyStatus[] = ['valid', 'expiring_soon', 'expired']
const DEPARTMENTS = ['Field Ops', 'Safety', 'Administration', 'Management']
const EXPIRES_OPTIONS = ['30 Days', '60 Days', '90 Days']

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(iso: string): string {
  if (!iso) return '—'
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatCurrency(amount: number | null): string {
  if (amount == null) return '—'
  return `$${amount.toLocaleString()}`
}

function daysDiff(expiryDate: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return Math.floor((new Date(expiryDate + 'T00:00:00').getTime() - today.getTime()) / 86400000)
}

function computeStatus(days: number, reminder: number): DbPolicyStatus {
  if (days < 0) return 'expired'
  if (days <= reminder) return 'expiring_soon'
  return 'valid'
}

function computeCertStatus(days: number): DbCertStatus {
  if (days < 0) return 'expired'
  if (days <= 60) return 'expiring_soon'
  return 'valid'
}

// ─── Types ─────────────────────────────────────────────────────────────────────
type ViewMode = 'kanban' | 'list'

interface PolicyFormValues {
  id?: string
  policy_holder: string
  coverage_type: DbCoverageType | ''
  insurer: string
  policy_number: string
  coverage_amount: string
  effective_date: string
  expiry_date: string
  renewal_reminder: number
}

interface CertFormValues {
  certId?: string
  user_id: string
  cert_name: string
  issuing_body: string
  department: string
  issue_date: string
  expiry_date: string
}

interface Filters {
  status: DbPolicyStatus[]
  coverageType: DbCoverageType[]
  expiresWithin: string[]
}

type Modal =
  | { type: 'deletePolicy'; policy: PolicyRow }
  | { type: 'uploadPolicy'; policy?: PolicyRow }
  | { type: 'policySuccess'; title: string; subtitle: string; actionBtn?: string }
  | { type: 'viewPolicy'; policy: PolicyRow }
  | { type: 'certForm'; cert?: CertRow }
  | { type: 'viewCert'; cert: CertRow }
  | { type: 'deleteCert'; cert: CertRow }

// ─── Styles ────────────────────────────────────────────────────────────────────
const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0D1B2A]/10 focus:border-[#0D1B2A] transition-colors'
const selectCls = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-[#0D1B2A]/10 focus:border-[#0D1B2A] transition-colors'

// ─── Pagination Bar ────────────────────────────────────────────────────────────
function PaginationBar() {
  return (
    <div className="flex items-center justify-between px-6 py-4 bg-white border-t border-gray-100">
      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer">
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
function FilterDropdown({ filters, onChange, onClose }: { filters: Filters; onChange: (f: Filters) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  function toggleStatus(val: DbPolicyStatus) {
    const updated = filters.status.includes(val) ? filters.status.filter(s => s !== val) : [...filters.status, val]
    onChange({ ...filters, status: updated })
  }
  function toggleCoverage(val: DbCoverageType) {
    const updated = filters.coverageType.includes(val) ? filters.coverageType.filter(c => c !== val) : [...filters.coverageType, val]
    onChange({ ...filters, coverageType: updated })
  }
  function toggleExpires(val: string) {
    const updated = filters.expiresWithin.includes(val) ? filters.expiresWithin.filter(e => e !== val) : [...filters.expiresWithin, val]
    onChange({ ...filters, expiresWithin: updated })
  }

  return (
    <div ref={ref} className="absolute right-0 top-12 z-40 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 p-5 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="space-y-5">
        <div>
          <label className="text-xs font-bold text-gray-500 block mb-2">Status</label>
          <div className="flex flex-wrap gap-2">
            {DB_STATUSES.map(s => (
              <button key={s} onClick={() => toggleStatus(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filters.status.includes(s) ? 'bg-[#0D1B2A] text-white border-[#0D1B2A]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-bold text-gray-500 block mb-2">Coverage Type</label>
          <div className="flex flex-wrap gap-2">
            {COVERAGE_OPTIONS.map(({ value, label }) => (
              <button key={value} onClick={() => toggleCoverage(value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filters.coverageType.includes(value) ? 'bg-[#0D1B2A] text-white border-[#0D1B2A]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-bold text-gray-500 block mb-2">Expires Within</label>
          <div className="flex flex-wrap gap-2">
            {EXPIRES_OPTIONS.map(e => (
              <button key={e} onClick={() => toggleExpires(e)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filters.expiresWithin.includes(e) ? 'bg-[#0D1B2A] text-white border-[#0D1B2A]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                {e}
              </button>
            ))}
          </div>
        </div>
        <div className="pt-3 flex gap-2 border-t border-gray-100">
          <button onClick={() => onChange({ status: [], coverageType: [], expiresWithin: [] })} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors">
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
function PolicyCard({ policy, onView, onEdit, onDelete }: { policy: PolicyRow; onView: () => void; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow relative">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="text-sm font-bold text-gray-900">{policy.policy_holder}</h4>
          <p className="text-xs text-gray-500">{COVERAGE_LABEL[policy.coverage_type]}</p>
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
          <span className={`font-medium flex items-center gap-1 ${STATUS_BADGE[policy.status]} px-1.5 rounded text-[10px]`}>
            <div className={`w-1 h-1 rounded-full ${STATUS_DOT[policy.status]}`} />
            {STATUS_LABEL[policy.status]}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Policy #:</span>
          <span className="text-gray-700">{policy.policy_number}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Insurer:</span>
          <span className="text-gray-700 truncate max-w-[140px]">{policy.insurer}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Coverage Amount:</span>
          <span className="text-gray-700 font-medium">{formatCurrency(policy.coverage_amount)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Effective Date:</span>
          <span className="text-gray-700">{formatDate(policy.effective_date)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Expiry Date:</span>
          <span className="text-gray-700">{formatDate(policy.expiry_date)}</span>
        </div>
      </div>

      <div className="border-t border-gray-50 pt-3 flex items-center justify-between text-[11px]">
        <span className="text-gray-400">Policy period used</span>
        <span className={`font-medium ${policy.status === 'expired' ? 'text-red-500' : 'text-emerald-600'}`}>
          {policy.status === 'expired'
            ? `${Math.abs(policy.days_remaining)} days over due`
            : `${policy.days_remaining} days left`}
        </span>
      </div>
    </div>
  )
}

// ─── Certification Card ────────────────────────────────────────────────────────
function CertCard({ cert, onView, onEdit, onDelete }: { cert: CertRow; onView: () => void; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow relative">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-100 to-blue-300 flex items-center justify-center text-blue-900 font-bold text-xs shrink-0">
            {cert.employee_name.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-900">{cert.employee_name}</h4>
            <p className="text-xs text-gray-500">{cert.employee_title}</p>
          </div>
        </div>
        <ActionMenu onView={onView} onEdit={onEdit} onDelete={onDelete} />
      </div>

      <div className="space-y-2.5 text-[11px]">
        <div className="flex justify-between items-start">
          <span className="text-gray-400">Certification</span>
          <span className="text-gray-800 font-medium text-right">{cert.cert_name}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Issuing Body</span>
          <span className="text-gray-800">{cert.issuing_body}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Department</span>
          <span className="text-gray-800">{cert.department ?? '—'}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Issue Date</span>
          <span className="text-gray-800">{formatDate(cert.issue_date)}</span>
        </div>
        <div className="flex justify-between items-center pt-1 border-t border-gray-50">
          <span className="text-gray-400">Status</span>
          <span className={`font-medium flex items-center gap-1.5 ${STATUS_BADGE[cert.status]} px-1.5 py-0.5 rounded text-[10px]`}>
            <div className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[cert.status]}`} />
            {STATUS_LABEL[cert.status]}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Policy List Table ──────────────────────────────────────────────────────────
function PolicyListTable({ policies, onView, onEdit, onDelete }: { policies: PolicyRow[]; onView: (p: PolicyRow) => void; onEdit: (p: PolicyRow) => void; onDelete: (p: PolicyRow) => void }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-gray-50/50 text-[10px] uppercase tracking-wider font-bold text-gray-400 border-b border-gray-100">
              <th className="pl-6 py-4 w-10"><input type="checkbox" className="w-3.5 h-3.5 rounded border-gray-300" /></th>
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
                <td className="pl-6 py-4"><input type="checkbox" className="w-3.5 h-3.5 rounded border-gray-300" /></td>
                <td className="px-4 py-4 font-medium text-gray-900">{p.policy_holder}</td>
                <td className="px-4 py-4">{COVERAGE_LABEL[p.coverage_type]}</td>
                <td className="px-4 py-4 text-gray-500">{p.insurer}</td>
                <td className="px-4 py-4 font-mono text-xs text-gray-600">{p.policy_number}</td>
                <td className="px-4 py-4">{formatDate(p.expiry_date)}</td>
                <td className="px-4 py-4">
                  <span className={`inline-flex items-center gap-1.5 ${STATUS_BADGE[p.status]} px-2 py-0.5 rounded-full text-xs font-medium`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[p.status]}`} />
                    {STATUS_LABEL[p.status]}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <ActionMenu onView={() => onView(p)} onEdit={() => onEdit(p)} onDelete={() => onDelete(p)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {policies.length === 0 && <div className="py-12 text-center text-gray-400 text-sm">No matching policies found</div>}
      </div>
      {policies.length > 0 && <PaginationBar />}
    </div>
  )
}

// ─── Cert List Table ───────────────────────────────────────────────────────────
function CertListTable({ certs, onView, onEdit, onDelete }: { certs: CertRow[]; onView: (c: CertRow) => void; onEdit: (c: CertRow) => void; onDelete: (c: CertRow) => void }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead>
            <tr className="bg-gray-50/50 text-[10px] uppercase tracking-wider font-bold text-gray-400 border-b border-gray-100">
              <th className="pl-6 py-4 w-10"><input type="checkbox" className="w-3.5 h-3.5 rounded border-gray-300" /></th>
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
                <td className="pl-6 py-4"><input type="checkbox" className="w-3.5 h-3.5 rounded border-gray-300" /></td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">
                      {c.employee_name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 leading-none">{c.employee_name}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{c.employee_title}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 font-medium text-gray-800">{c.cert_name}</td>
                <td className="px-4 py-4 text-gray-500">{c.issuing_body}</td>
                <td className="px-4 py-4 text-gray-500">{formatDate(c.issue_date)}</td>
                <td className={`px-4 py-4 ${c.status === 'expiring_soon' ? 'text-amber-600' : c.status === 'expired' ? 'text-red-600' : 'text-gray-500'}`}>
                  {formatDate(c.expiry_date)}
                </td>
                <td className="px-4 py-4 text-xs">
                  {c.status === 'expired'
                    ? <span className="text-red-500 font-medium">{Math.abs(c.days_left)}d overdue</span>
                    : c.status === 'expiring_soon'
                      ? <span className="text-amber-500 font-medium">{c.days_left}d</span>
                      : <span className="text-gray-600 font-medium">{c.days_left}d</span>}
                </td>
                <td className="px-4 py-4">
                  <span className={`inline-flex items-center gap-1.5 ${STATUS_BADGE[c.status]} px-2 py-0.5 rounded-full text-xs font-medium`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[c.status]}`} />
                    {STATUS_LABEL[c.status]}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <ActionMenu onView={() => onView(c)} onEdit={() => onEdit(c)} onDelete={() => onDelete(c)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {certs.length === 0 && <div className="py-12 text-center text-gray-400 text-sm">No certifications found</div>}
      </div>
      {certs.length > 0 && <PaginationBar />}
    </div>
  )
}

// ─── Delete Modal ──────────────────────────────────────────────────────────────
function DeleteModal({ title, message, onConfirm, onCancel, loading }: {
  title: string; message: string; onConfirm: () => void; onCancel: () => void; loading?: boolean
}) {
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
          <div className="text-sm text-gray-500 leading-relaxed mb-7 max-w-[280px]" dangerouslySetInnerHTML={{ __html: message }} />
          <div className="flex gap-3 w-full">
            <button onClick={onCancel} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
            <button onClick={onConfirm} disabled={loading} className="flex-1 py-2.5 rounded-lg bg-[#0D1B2A] text-sm font-medium text-white hover:bg-[#162437] transition-colors disabled:opacity-60">
              {loading ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Policy Detail Modal ───────────────────────────────────────────────────────
function PolicyDetailModal({ policy, onClose, onEdit }: { policy: PolicyRow; onClose: () => void; onEdit: () => void }) {
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
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">{policy.insurer}</h3>
                <p className="text-xs text-gray-500">Policy: {policy.policy_number}</p>
              </div>
            </div>

            <div className="bg-[#F0FDF4] border border-green-100 rounded-xl p-5">
              <div className="flex items-start justify-between mb-1">
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">{policy.policy_holder}</h4>
                  <p className="text-[11px] text-gray-500 mt-0.5">{COVERAGE_LABEL[policy.coverage_type]}</p>
                </div>
                <span className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase ${STATUS_BADGE[policy.status]}`}>
                  • {STATUS_LABEL[policy.status]}
                </span>
              </div>
              <div className="w-full bg-green-200 h-1.5 rounded-full mt-4 relative">
                <div className={`h-full rounded-full ${policy.status === 'expired' ? 'bg-red-500 w-full' : 'bg-[#10B981] w-[80%]'}`} />
              </div>
              <div className="flex justify-between mt-2 text-[10px] text-gray-500 font-medium">
                <span>Coverage period</span>
                <span>{policy.days_remaining > 0 ? `${policy.days_remaining} days left` : 'Expired'}</span>
              </div>
            </div>

            <div>
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-4">Policy Information</h4>
              <div className="border border-gray-100 rounded-xl overflow-hidden bg-white">
                {[
                  ['Policy Holder', policy.policy_holder],
                  ['Coverage Limit', formatCurrency(policy.coverage_amount)],
                  ['Coverage Type', COVERAGE_LABEL[policy.coverage_type]],
                  ['Effective Date', formatDate(policy.effective_date)],
                  ['Expiration Date', formatDate(policy.expiry_date)],
                ].map(([k, v], idx, arr) => (
                  <div key={k} className={`flex items-center justify-between px-4 py-3 text-sm ${idx !== arr.length - 1 ? 'border-b border-gray-50' : ''}`}>
                    <span className="text-gray-400">{k}</span>
                    <span className="font-medium text-gray-900">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-1.5"><History size={12} /> History Log</h4>
              <div className="relative pl-6 space-y-6">
                <div className="absolute left-[9px] top-2 bottom-2 w-[1px] border-l border-dashed border-gray-200" />
                <div className="relative">
                  <div className="absolute left-[-22px] top-0.5 w-4 h-4 bg-green-100 rounded-full flex items-center justify-center ring-4 ring-white">
                    <Check size={10} className="text-green-600" strokeWidth={3} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800 leading-none">Policy uploaded & approved</p>
                    <p className="text-[10px] text-gray-400 mt-1.5">{formatDate(policy.effective_date)} · Admin</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Attached Document</h4>
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center bg-white hover:bg-gray-50 cursor-pointer transition-colors group">
                <div className="w-10 h-12 bg-white rounded shadow-sm flex items-center justify-center relative mb-2 border border-gray-100">
                  <FileText className="text-red-500" size={22} />
                  <span className="absolute -bottom-1 right-[-4px] bg-red-500 text-white text-[7px] font-bold px-1 rounded">PDF</span>
                </div>
                <p className="text-xs text-gray-500 font-medium">Preview full policy file</p>
              </div>
            </div>
          </div>

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

// ─── Cert Detail Modal ─────────────────────────────────────────────────────────
function CertDetailModal({ cert, onClose, onEdit }: { cert: CertRow; onClose: () => void; onEdit: () => void }) {
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
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm shrink-0">
                {cert.employee_name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">{cert.employee_name}</h3>
                <p className="text-xs text-gray-500">{cert.employee_title} · {cert.department}</p>
              </div>
            </div>

            <div className="bg-[#F0FDF4] border border-green-100 rounded-xl p-5">
              <div className="flex items-start justify-between mb-1">
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">{cert.cert_name}</h4>
                  <p className="text-[11px] text-gray-500 mt-0.5">Issued by {cert.issuing_body} · ID: {cert.id.slice(0, 8).toUpperCase()}</p>
                </div>
                <span className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase ${STATUS_BADGE[cert.status]}`}>
                  • {STATUS_LABEL[cert.status]}
                </span>
              </div>
              <div className="w-full bg-green-200 h-1.5 rounded-full mt-4">
                <div className={`h-full rounded-full ${cert.status === 'expired' ? 'bg-red-500 w-full' : 'bg-[#10B981] w-[75%]'}`} />
              </div>
              <div className="flex justify-between mt-2 text-[10px] text-gray-500 font-medium">
                <span>Validity period</span>
                <span>{cert.days_left > 0 ? `${cert.days_left} days remaining` : 'Expired'}</span>
              </div>
            </div>

            <div>
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-4">Certification Details</h4>
              <div className="border border-gray-100 rounded-xl overflow-hidden bg-white">
                {[
                  ['Certification', cert.cert_name],
                  ['Issuing Body', cert.issuing_body],
                  ['Department', cert.department ?? '—'],
                  ['Issue Date', formatDate(cert.issue_date)],
                  ['Expiry Date', formatDate(cert.expiry_date)],
                ].map(([k, v], idx, arr) => (
                  <div key={k} className={`flex items-center justify-between px-4 py-3 text-sm ${idx !== arr.length - 1 ? 'border-b border-gray-50' : ''}`}>
                    <span className="text-gray-400">{k}</span>
                    <span className="font-medium text-gray-900">{v}</span>
                  </div>
                ))}
              </div>
            </div>

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
                    <p className="text-[10px] text-gray-400 mt-1.5">{formatDate(cert.issue_date)} · Admin</p>
                  </div>
                </div>
                {cert.status === 'expired' && (
                  <div className="relative">
                    <div className="absolute left-[-22px] top-0.5 w-4 h-4 bg-red-100 rounded-full flex items-center justify-center ring-4 ring-white">
                      <X size={10} className="text-red-600" strokeWidth={3} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-800 leading-none">Certificate has expired</p>
                      <p className="text-[10px] text-gray-400 mt-1.5">{formatDate(cert.expiry_date)} · System</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-7 py-5 border-t border-gray-100 shrink-0 bg-white">
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Close</button>
            <button onClick={() => { onClose(); onEdit() }} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0D1B2A] text-sm font-medium text-white hover:bg-[#162437] transition-colors">
              Update Certification <ArrowUpRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Success Modal ─────────────────────────────────────────────────────────────
function SuccessModal({ title, subtitle, actionBtn = 'Okay', onClose }: { title: string; subtitle: string; actionBtn?: string; onClose: () => void }) {
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

// ─── Policy Form Modal ─────────────────────────────────────────────────────────
function PolicyFormModal({ policy, onClose, onSave, loading }: {
  policy?: PolicyRow; onClose: () => void; onSave: (v: PolicyFormValues) => void; loading?: boolean
}) {
  const [v, setV] = useState<PolicyFormValues>({
    id: policy?.id,
    policy_holder: policy?.policy_holder ?? 'Peak Roofing Inc.',
    coverage_type: policy?.coverage_type ?? '',
    insurer: policy?.insurer ?? '',
    policy_number: policy?.policy_number ?? '',
    coverage_amount: policy?.coverage_amount?.toString() ?? '',
    effective_date: policy?.effective_date ?? '',
    expiry_date: policy?.expiry_date ?? '',
    renewal_reminder: policy?.renewal_reminder ?? 90,
  })

  function set<K extends keyof PolicyFormValues>(k: K, val: PolicyFormValues[K]) {
    setV(prev => ({ ...prev, [k]: val }))
  }

  const canSave = v.policy_holder.trim() && v.coverage_type && v.insurer.trim() && v.expiry_date

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
                  <input placeholder="Policy Holder Name" value={v.policy_holder} onChange={e => set('policy_holder', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Coverage Type</label>
                  <div className="relative">
                    <select value={v.coverage_type} onChange={e => set('coverage_type', e.target.value as DbCoverageType)} className={selectCls}>
                      <option value="">Select coverage</option>
                      {COVERAGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Insurer</label>
                  <input placeholder="Insurance company name" value={v.insurer} onChange={e => set('insurer', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Policy Number</label>
                  <input placeholder="e.g. GL-2024-0091" value={v.policy_number} onChange={e => set('policy_number', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Coverage Amount ($)</label>
                  <input type="number" placeholder="e.g. 2000000" value={v.coverage_amount} onChange={e => set('coverage_amount', e.target.value)} className={inputCls} />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-4">Policy Dates</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Effective Date</label>
                  <input type="date" value={v.effective_date} onChange={e => set('effective_date', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Expiry Date</label>
                  <input type="date" value={v.expiry_date} onChange={e => set('expiry_date', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Renewal Reminder (days before expiry)</label>
                  <div className="relative">
                    <select value={v.renewal_reminder} onChange={e => set('renewal_reminder', Number(e.target.value))} className={selectCls}>
                      <option value={30}>30 days before expiry</option>
                      <option value={60}>60 days before expiry</option>
                      <option value={90}>90 days before expiry</option>
                      <option value={120}>120 days before expiry</option>
                    </select>
                    <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-4">Document Upload</h3>
              <p className="text-xs text-gray-500 mb-2">Upload COI Document (PDF)</p>
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors">
                <div className="w-10 h-12 bg-white rounded shadow-sm flex items-center justify-center relative mb-2">
                  <FileText className="text-red-500" size={24} />
                  <span className="absolute -bottom-1 right-[-4px] bg-red-500 text-white text-[8px] font-bold px-1 rounded">PDF</span>
                </div>
                <span className="text-xs text-gray-500">Click to upload PDF</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-7 py-5 border-t border-gray-100 shrink-0">
            <button onClick={onClose} className="px-6 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
            <button
              onClick={() => { if (canSave) onSave(v) }}
              disabled={!canSave || loading}
              className="px-6 py-2.5 rounded-xl bg-[#0D1B2A] text-sm font-medium text-white hover:bg-[#162437] transition-colors disabled:opacity-60"
            >
              {loading ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Cert Form Modal ───────────────────────────────────────────────────────────
function CertFormModal({ cert, employees, onClose, onSave, loading }: {
  cert?: CertRow; employees: EmployeeOption[]; onClose: () => void; onSave: (v: CertFormValues) => void; loading?: boolean
}) {
  const [v, setV] = useState<CertFormValues>({
    certId: cert?.id,
    user_id: cert?.user_id ?? '',
    cert_name: cert?.cert_name ?? '',
    issuing_body: cert?.issuing_body ?? '',
    department: cert?.department ?? '',
    issue_date: cert?.issue_date ?? '',
    expiry_date: cert?.expiry_date ?? '',
  })

  function set<K extends keyof CertFormValues>(k: K, val: CertFormValues[K]) {
    setV(prev => ({ ...prev, [k]: val }))
  }

  const canSave = v.user_id && v.cert_name.trim() && v.expiry_date

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
                    <select value={v.user_id} onChange={e => set('user_id', e.target.value)} className={selectCls}>
                      <option value="">Select employee</option>
                      {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}{emp.title ? ` — ${emp.title}` : ''}</option>)}
                    </select>
                    <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Certification Name</label>
                  <input placeholder="e.g. OSHA 30-Hour Card" value={v.cert_name} onChange={e => set('cert_name', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Issuing Body</label>
                  <input placeholder="e.g. OSHA" value={v.issuing_body} onChange={e => set('issuing_body', e.target.value)} className={inputCls} />
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

            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-4">Dates</h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Issue Date</label>
                  <input type="date" value={v.issue_date} onChange={e => set('issue_date', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Expiry Date</label>
                  <input type="date" value={v.expiry_date} onChange={e => set('expiry_date', e.target.value)} className={inputCls} />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-4">Document Upload</h3>
              <p className="text-xs text-gray-500 mb-2">Upload Certificate (PDF / Image)</p>
              <div className="border border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center bg-gray-50 text-center min-h-[140px]">
                <div className="w-10 h-12 bg-white rounded shadow-sm flex items-center justify-center relative mb-2">
                  <FileText className="text-red-500" size={22} />
                  <span className="absolute -bottom-1 right-[-4px] bg-red-500 text-white text-[7px] font-bold px-1 rounded">PDF</span>
                </div>
                <p className="text-xs text-gray-500 font-medium">Click to upload</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-7 py-5 border-t border-gray-100 shrink-0">
            <button onClick={onClose} className="px-6 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
            <button
              onClick={() => { if (canSave) onSave(v) }}
              disabled={!canSave || loading}
              className="px-6 py-2.5 rounded-xl bg-[#0D1B2A] text-sm font-bold text-white hover:bg-[#162437] transition-colors disabled:opacity-60"
            >
              {loading ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Main Client Component ─────────────────────────────────────────────────────
export function InsuranceClient({ initialPolicies, initialCerts, employees }: {
  initialPolicies: PolicyRow[]
  initialCerts: CertRow[]
  employees: EmployeeOption[]
}) {
  const [isPending, startTransition] = useTransition()
  const [tab, setTab] = useState<'coi' | 'certs'>('coi')
  const [viewMode, setViewMode] = useState<ViewMode>('kanban')
  const [policies, setPolicies] = useState<PolicyRow[]>(initialPolicies)
  const [certs, setCerts] = useState<CertRow[]>(initialCerts)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<Modal | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<Filters>({ status: [], coverageType: [], expiresWithin: [] })

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  function handleSavePolicy(values: PolicyFormValues) {
    startTransition(async () => {
      const coverage_amount = values.coverage_amount ? (parseFloat(values.coverage_amount) || null) : null
      const days = values.expiry_date ? daysDiff(values.expiry_date) : 0
      const status = computeStatus(days, values.renewal_reminder)

      if (values.id) {
        const res = await updatePolicy(values.id, {
          policy_holder: values.policy_holder,
          coverage_type: values.coverage_type as DbCoverageType,
          insurer: values.insurer,
          policy_number: values.policy_number,
          coverage_amount,
          effective_date: values.effective_date,
          expiry_date: values.expiry_date,
          renewal_reminder: values.renewal_reminder,
          status,
        })
        if (res?.error) { showToast(`Error: ${res.error}`); return }
        setPolicies(prev => prev.map(p => p.id === values.id ? {
          ...p,
          policy_holder: values.policy_holder,
          coverage_type: values.coverage_type as DbCoverageType,
          insurer: values.insurer,
          policy_number: values.policy_number,
          coverage_amount,
          effective_date: values.effective_date,
          expiry_date: values.expiry_date,
          renewal_reminder: values.renewal_reminder,
          status,
          days_remaining: days,
        } : p))
        setModal({ type: 'policySuccess', title: 'Policy updated', subtitle: 'The changes were successfully saved.' })
      } else {
        const res = await createPolicy({
          policy_holder: values.policy_holder,
          coverage_type: values.coverage_type as DbCoverageType,
          insurer: values.insurer,
          policy_number: values.policy_number,
          coverage_amount,
          effective_date: values.effective_date,
          expiry_date: values.expiry_date,
          renewal_reminder: values.renewal_reminder,
          status,
        })
        if ('error' in res) { showToast(`Error: ${res.error}`); return }
        const newPolicy: PolicyRow = {
          id: res.id,
          policy_holder: values.policy_holder,
          coverage_type: values.coverage_type as DbCoverageType,
          insurer: values.insurer,
          policy_number: values.policy_number,
          coverage_amount,
          effective_date: values.effective_date,
          expiry_date: values.expiry_date,
          renewal_reminder: values.renewal_reminder,
          status,
          file_url: null,
          days_remaining: days,
          created_at: new Date().toISOString(),
        }
        setPolicies(prev => [newPolicy, ...prev])
        setModal({ type: 'policySuccess', title: 'Policy uploaded', subtitle: 'You can now review, update, or share this policy with your team.' })
      }
    })
  }

  function handleSaveCert(values: CertFormValues) {
    startTransition(async () => {
      const employee = employees.find(e => e.id === values.user_id)
      const days = values.expiry_date ? daysDiff(values.expiry_date) : 0
      const status = computeCertStatus(days)

      if (values.certId) {
        const res = await updateCertification(values.certId, {
          user_id: values.user_id,
          cert_name: values.cert_name,
          issuing_body: values.issuing_body,
          department: values.department || null,
          issue_date: values.issue_date,
          expiry_date: values.expiry_date,
          status,
        })
        if (res?.error) { showToast(`Error: ${res.error}`); return }
        setCerts(prev => prev.map(c => c.id === values.certId ? {
          ...c,
          user_id: values.user_id,
          employee_name: employee?.name ?? c.employee_name,
          employee_title: employee?.title ?? c.employee_title,
          cert_name: values.cert_name,
          issuing_body: values.issuing_body,
          department: values.department || null,
          issue_date: values.issue_date,
          expiry_date: values.expiry_date,
          status,
          days_left: days,
        } : c))
        setModal(null)
        showToast('Certification updated successfully')
      } else {
        const res = await createCertification({
          user_id: values.user_id,
          cert_name: values.cert_name,
          issuing_body: values.issuing_body,
          department: values.department || null,
          issue_date: values.issue_date,
          expiry_date: values.expiry_date,
          status,
        })
        if ('error' in res) { showToast(`Error: ${res.error}`); return }
        const newCert: CertRow = {
          id: res.id,
          user_id: values.user_id,
          employee_name: employee?.name ?? 'Unknown',
          employee_title: employee?.title ?? null,
          cert_name: values.cert_name,
          issuing_body: values.issuing_body,
          department: values.department || null,
          issue_date: values.issue_date,
          expiry_date: values.expiry_date,
          status,
          file_url: null,
          days_left: days,
          created_at: new Date().toISOString(),
        }
        setCerts(prev => [newCert, ...prev])
        setModal({ type: 'policySuccess', title: 'Certification added successfully', subtitle: 'The certification has been uploaded and is now available for review and tracking.', actionBtn: 'View Certification' })
      }
    })
  }

  function confirmDeletePolicy() {
    if (modal?.type !== 'deletePolicy') return
    const policy = modal.policy
    startTransition(async () => {
      const res = await deletePolicy(policy.id)
      if (res?.error) { showToast(`Error: ${res.error}`); return }
      setPolicies(prev => prev.filter(p => p.id !== policy.id))
      setModal(null)
      showToast('Policy deleted successfully')
    })
  }

  function confirmDeleteCert() {
    if (modal?.type !== 'deleteCert') return
    const cert = modal.cert
    startTransition(async () => {
      const res = await deleteCertification(cert.id)
      if (res?.error) { showToast(`Error: ${res.error}`); return }
      setCerts(prev => prev.filter(c => c.id !== cert.id))
      setModal(null)
      showToast(`Certification (${cert.employee_name}, ${cert.cert_name}) deleted successfully`)
    })
  }

  const filteredPolicies = policies.filter(p => {
    const matchSearch = p.policy_holder.toLowerCase().includes(search.toLowerCase()) ||
      p.policy_number.toLowerCase().includes(search.toLowerCase()) ||
      p.insurer.toLowerCase().includes(search.toLowerCase())
    if (!matchSearch) return false
    if (filters.status.length > 0 && !filters.status.includes(p.status)) return false
    if (filters.coverageType.length > 0 && !filters.coverageType.includes(p.coverage_type)) return false
    if (filters.expiresWithin.length > 0) {
      const maxDays = Math.min(...filters.expiresWithin.map(e => parseInt(e)))
      if (p.days_remaining > maxDays || p.days_remaining < 0) return false
    }
    return true
  })

  const filteredCerts = certs.filter(c => {
    const matchSearch = c.employee_name.toLowerCase().includes(search.toLowerCase()) ||
      c.cert_name.toLowerCase().includes(search.toLowerCase())
    if (!matchSearch) return false
    if (filters.status.length > 0 && !filters.status.includes(c.status)) return false
    return true
  })

  const stats = {
    active: policies.filter(p => p.status === 'valid').length,
    expiring: policies.filter(p => p.status === 'expiring_soon').length,
    expired: policies.filter(p => p.status === 'expired').length,
  }
  const certCompliance = certs.length > 0
    ? `${Math.round(certs.filter(c => c.status === 'valid').length / certs.length * 100)}%`
    : '—'

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
              <p className="text-sm font-semibold text-gray-900">Admin</p>
              <p className="text-xs text-gray-400">Peak Roofing Co.</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-semibold">PR</span>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto relative flex flex-col">
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
          <StatCard label="Cert Compliance" value={certCompliance} sub={`${certs.filter(c => c.status === 'valid').length} of ${certs.length} valid`} subColor="text-blue-500"
            icon={<div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center"><ShieldCheck size={20} className="text-blue-500" /></div>} />
        </div>

        {/* Tabs & Toolbar */}
        <div className="px-8 pt-5 flex-none">
          <div className="flex items-center mb-4 gap-3">
            <button onClick={() => setTab('coi')}
              className={`px-4 py-1.5 text-xs font-bold rounded-full transition-colors ${tab === 'coi' ? 'bg-[#0D1B2A] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              COI Policies ({policies.length})
            </button>
            <button onClick={() => setTab('certs')}
              className={`px-4 py-1.5 text-xs font-bold rounded-full transition-colors ${tab === 'certs' ? 'bg-[#0D1B2A] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              Employee Certifications ({certs.length})
            </button>
          </div>

          <div className="flex items-center gap-3 mb-4 relative">
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5 gap-0.5 shrink-0">
              <button onClick={() => setViewMode('kanban')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${viewMode === 'kanban' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                <KanbanSquare size={13} /> Kanban
              </button>
              <button onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${viewMode === 'list' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
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
              <button onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs border border-gray-200 rounded-lg bg-white font-medium transition-colors ${showFilters || Object.values(filters).some(a => a.length > 0) ? 'text-blue-600 border-blue-200 bg-blue-50' : 'text-gray-600 hover:bg-gray-50'}`}>
                <FilterIcon size={13} /> Filter
              </button>
              {showFilters && <FilterDropdown filters={filters} onChange={setFilters} onClose={() => setShowFilters(false)} />}
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

        {/* Content */}
        <div className="px-8 pb-8 flex-1 overflow-y-auto">
          {viewMode === 'kanban' ? (
            <div className="flex gap-6 items-start min-w-max">
              {DB_STATUSES.map(status => {
                const colItems = tab === 'coi'
                  ? filteredPolicies.filter(p => p.status === status)
                  : filteredCerts.filter(c => c.status === status)
                return (
                  <div key={status} className="w-80 shrink-0">
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-2 h-2 rounded-full ${STATUS_DOT[status]}`} />
                      <span className="font-bold text-gray-800 text-xs">{STATUS_LABEL[status]}</span>
                      <span className="bg-gray-200 text-gray-600 text-[10px] font-bold px-1.5 py-0.5 rounded-md">{colItems.length}</span>
                    </div>
                    <div className="space-y-4">
                      {tab === 'coi'
                        ? (colItems as PolicyRow[]).map(p => (
                          <PolicyCard key={p.id} policy={p}
                            onView={() => setModal({ type: 'viewPolicy', policy: p })}
                            onEdit={() => setModal({ type: 'uploadPolicy', policy: p })}
                            onDelete={() => setModal({ type: 'deletePolicy', policy: p })}
                          />
                        ))
                        : (colItems as CertRow[]).map(c => (
                          <CertCard key={c.id} cert={c}
                            onView={() => setModal({ type: 'viewCert', cert: c })}
                            onEdit={() => setModal({ type: 'certForm', cert: c })}
                            onDelete={() => setModal({ type: 'deleteCert', cert: c })}
                          />
                        ))
                      }
                      {colItems.length === 0 && (
                        <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center text-gray-400 text-xs">
                          No {STATUS_LABEL[status].toLowerCase()} items.
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

      {/* Modals */}
      {modal?.type === 'deletePolicy' && (
        <DeleteModal
          title="Delete COI Policy"
          message={`This action will permanently delete this COI policy (<b>${modal.policy.policy_holder}</b>) and all associated records.<br/><br/>This cannot be undone.`}
          onConfirm={confirmDeletePolicy}
          onCancel={() => setModal(null)}
          loading={isPending}
        />
      )}
      {modal?.type === 'deleteCert' && (
        <DeleteModal
          title="Delete Certification"
          message={`This action will permanently delete this certification (<b>${modal.cert.employee_name}, ${modal.cert.cert_name}</b>) and all associated records.<br/><br/>This cannot be undone.`}
          onConfirm={confirmDeleteCert}
          onCancel={() => setModal(null)}
          loading={isPending}
        />
      )}
      {modal?.type === 'uploadPolicy' && (
        <PolicyFormModal
          policy={modal.policy}
          onClose={() => setModal(null)}
          onSave={handleSavePolicy}
          loading={isPending}
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
          employees={employees}
          onClose={() => setModal(null)}
          onSave={handleSaveCert}
          loading={isPending}
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
