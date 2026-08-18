'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import {
  Plus, X, Check,
  KanbanSquare, List as ListIcon, ChevronDown, FileText,
  AlertCircle, ShieldCheck, UserCheck, Clock,
  History, ChevronLeft, ChevronRight, ArrowUpRight, CalendarDays, Trash2,
} from 'lucide-react'
import { ActionsDropdown } from '@/app/components/ui/ActionsDropdown'
import { PersonSelect } from '@/app/components/ui/PersonSelect'
import { FilterButton, filterChipCls } from '@/app/components/ui/ToolbarButtons'
import { SuccessModal } from '@/app/components/ui/SuccessModal'
import { CONTENT_GAP } from '@/app/components/ui/spacing'
import { useEntry } from '@/app/components/ui/animations'
import { ViewToggle } from '@/app/components/ui/ViewToggle'
import { ConfirmDeleteModal } from '@/app/components/ui/ConfirmDeleteModal'
import {
  type PolicyRow, type CertRow, type EmployeeOption,
  type DbPolicyStatus, type DbCoverageType, type DbCertStatus,
  createPolicy, updatePolicy, deletePolicy,
  createCertification, updateCertification, deleteCertification,
  uploadInsuranceDocument, getInsuranceDocumentUrl,
} from './actions'
import { Toast } from '@/app/components/ui/Toast'
import { useSlideOver } from '@/app/components/ui/useSlideOver'
import { SearchInput } from '@/app/components/ui/SearchInput'
import { StatCard, StatCardGrid } from '@/app/components/ui/StatCard'

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
/** Fill colour of the "policy period used" bar in the detail panel. */
const PERIOD_BAR: Record<DbPolicyStatus, string> = {
  valid: 'bg-emerald-500',
  expiring_soon: 'bg-orange-500',
  expired: 'bg-red-500',
}
const STATUS_DOT: Record<DbPolicyStatus, string> = {
  valid: 'bg-emerald-500',
  expiring_soon: 'bg-orange-500',
  expired: 'bg-red-500',
}
const STATUS_TEXT: Record<DbPolicyStatus, string> = {
  valid: 'text-emerald-600',
  expiring_soon: 'text-orange-500',
  expired: 'text-red-500',
}
const STATUS_BAR: Record<DbPolicyStatus, string> = {
  valid: 'bg-emerald-500',
  expiring_soon: 'bg-orange-400',
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

/**
 * How much of the policy period has elapsed, as a percentage. Derived from the
 * server-computed `days_remaining` so the bar renders identically on both sides
 * of hydration.
 */
function periodUsedPct(effective: string, expiry: string, daysRemaining: number): number {
  if (daysRemaining <= 0) return 100
  if (!effective || !expiry) return 0
  const total = Math.round(
    (new Date(expiry + 'T00:00:00').getTime() - new Date(effective + 'T00:00:00').getTime()) / 86400000
  )
  if (total <= 0) return 100
  return Math.max(0, Math.min(100, Math.round(((total - daysRemaining) / total) * 100)))
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
  file?: File | null
}

interface CertFormValues {
  certId?: string
  user_id: string
  cert_name: string
  issuing_body: string
  department: string
  issue_date: string
  expiry_date: string
  file?: File | null
  /** Set when the user clears an already-stored document. */
  removeFile?: boolean
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
      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer">
        <ChevronLeft size={14} /> Previous
      </button>
      <div className="flex gap-1.5">
        <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#0D1B2A] text-white text-xs font-semibold">1</div>
      </div>
      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer">
        Next <ChevronRight size={14} />
      </button>
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
    <div ref={ref} className="absolute right-0 top-12 z-40 w-[420px] bg-white rounded-2xl shadow-[0_8px_30px_rgba(16,24,40,0.14)] p-5">
      <p className="text-[11px] text-gray-400 mb-4">Filter</p>
      <div className="space-y-5">
        <div>
          <label className="text-xs font-semibold text-gray-700 block mb-2.5">Status</label>
          <div className="flex flex-wrap gap-2.5">
            {DB_STATUSES.map(s => (
              <button key={s} onClick={() => toggleStatus(s)} className={filterChipCls(filters.status.includes(s))}>
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-700 block mb-2.5">Coverage Type</label>
          <div className="flex flex-wrap gap-2.5">
            {COVERAGE_OPTIONS.map(({ value, label }) => (
              <button key={value} onClick={() => toggleCoverage(value)} className={filterChipCls(filters.coverageType.includes(value))}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-700 block mb-2.5">Expires Within</label>
          <div className="flex flex-wrap gap-2.5">
            {EXPIRES_OPTIONS.map(e => (
              <button key={e} onClick={() => toggleExpires(e)} className={filterChipCls(filters.expiresWithin.includes(e))}>
                {e}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={() => onChange({ status: [], coverageType: [], expiresWithin: [] })} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
            Clear All
          </button>
          <button onClick={onClose} className="flex-1 px-4 py-2.5 bg-[#0D1B2A] text-white rounded-lg text-xs font-semibold hover:bg-[#162437] transition-colors">
            Apply
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Policy Card ───────────────────────────────────────────────────────────────
function PolicyCard({ policy, index, onView, onEdit, onDelete }: { policy: PolicyRow; index: number; onView: () => void; onEdit: () => void; onDelete: () => void }) {
  const used = periodUsedPct(policy.effective_date, policy.expiry_date, policy.days_remaining)
  const enter = useEntry()
  return (
    <div {...enter.item(index, 'bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow relative')}>
      <div className="flex items-center justify-center bg-gray-50 rounded-lg py-6 mb-3">
        <div className="w-10 h-12 bg-white rounded shadow-sm flex items-center justify-center relative">
          <FileText className="text-red-500" size={24} />
          <span className="absolute -bottom-1 right-[-4px] bg-red-500 text-white text-[8px] font-semibold px-1 rounded">PDF</span>
        </div>
      </div>

      {/* Name and actions sit below the document preview, as on the board design. */}
      <div className="flex justify-between items-start gap-2 mb-4">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-gray-900 truncate">{policy.policy_holder}</h4>
          <p className="text-xs text-gray-500">{COVERAGE_LABEL[policy.coverage_type]}</p>
        </div>
        <ActionsDropdown onView={onView} onEdit={onEdit} onDelete={onDelete} />
      </div>

      <div className="space-y-2.5 text-xs mb-4">
        <div className="flex justify-between items-center gap-2">
          <span className="text-gray-400">Status</span>
          <span className={`font-medium flex items-center gap-1.5 ${STATUS_TEXT[policy.status]}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[policy.status]}`} />
            {STATUS_LABEL[policy.status]}
          </span>
        </div>
        <div className="flex justify-between items-center gap-2">
          <span className="text-gray-400">Policy #</span>
          <span className="text-gray-700 truncate">{policy.policy_number || '—'}</span>
        </div>
        <div className="flex justify-between items-center gap-2">
          <span className="text-gray-400">Insurer</span>
          <span className="text-gray-700 truncate max-w-[150px]">{policy.insurer}</span>
        </div>
        <div className="flex justify-between items-center gap-2">
          <span className="text-gray-400">Policy Holder</span>
          <span className="text-gray-700 truncate max-w-[150px]">{policy.policy_holder}</span>
        </div>
        <div className="flex justify-between items-center gap-2">
          <span className="text-gray-400">Coverage Type</span>
          <span className="text-gray-700">{COVERAGE_LABEL[policy.coverage_type]}</span>
        </div>
        <div className="flex justify-between items-center gap-2">
          <span className="text-gray-400">Coverage Amount</span>
          <span className="text-gray-700 font-medium">{formatCurrency(policy.coverage_amount)}</span>
        </div>
        <div className="flex justify-between items-center gap-2">
          <span className="text-gray-400">Effective Date</span>
          <span className="text-gray-700">{formatDate(policy.effective_date)}</span>
        </div>
        <div className="flex justify-between items-center gap-2">
          <span className="text-gray-400">Expiry Date</span>
          <span className={`font-medium ${STATUS_TEXT[policy.status]}`}>{formatDate(policy.expiry_date)}</span>
        </div>
      </div>

      <div className="h-1 w-full rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full rounded-full ${STATUS_BAR[policy.status]}`} style={{ width: `${used}%` }} />
      </div>
      <div className="pt-2.5 flex items-center justify-between text-[11px]">
        <span className="text-gray-400">Policy period used</span>
        <span className={`font-medium ${STATUS_TEXT[policy.status]}`}>
          {policy.days_remaining < 0
            ? `${Math.abs(policy.days_remaining)} days over due`
            : `${policy.days_remaining} days left`}
        </span>
      </div>
    </div>
  )
}

// ─── Certification Card ────────────────────────────────────────────────────────
function CertCard({ cert, index, onView, onEdit, onDelete }: { cert: CertRow; index: number; onView: () => void; onEdit: () => void; onDelete: () => void }) {
  const enter = useEntry()
  return (
    <div {...enter.item(index, 'bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow relative')}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-100 to-blue-300 flex items-center justify-center text-blue-900 font-semibold text-xs shrink-0">
            {cert.employee_name.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900">{cert.employee_name}</h4>
            <p className="text-xs text-gray-500">{cert.employee_title}</p>
          </div>
        </div>
        <ActionsDropdown onView={onView} onEdit={onEdit} onDelete={onDelete} />
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
            <tr className="bg-gray-50/50 text-[10px] uppercase tracking-wider font-semibold text-gray-400 border-b border-gray-100">
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
                  <div className="flex justify-end">
                    <ActionsDropdown onView={() => onView(p)} onEdit={() => onEdit(p)} onDelete={() => onDelete(p)} />
                  </div>
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
            <tr className="bg-gray-50/50 text-[10px] uppercase tracking-wider font-semibold text-gray-400 border-b border-gray-100">
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
                    <div className="w-7 h-7 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-semibold">
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
                  <div className="flex justify-end">
                    <ActionsDropdown onView={() => onView(c)} onEdit={() => onEdit(c)} onDelete={() => onDelete(c)} />
                  </div>
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
    <ConfirmDeleteModal
      title={title}
      message={message}
      onCancel={onCancel}
      onConfirm={onConfirm}
      loading={loading}
    />
  )
}

// ─── Policy Detail Modal ───────────────────────────────────────────────────────
function PolicyDetailModal({ policy, onClose, onEdit }: { policy: PolicyRow; onClose: () => void; onEdit: () => void }) {
  const { close, backdropCls, panelCls } = useSlideOver(onClose)

  const [opening, setOpening] = useState(false)
  const [docError, setDocError] = useState<string | null>(null)

  // How much of the cover has elapsed — the bar used to be pinned at 80%.
  const periodUsedPercent = periodUsedPct(policy.effective_date, policy.expiry_date, policy.days_remaining)

  // The bucket is private, so the stored value is an object path — it has to be
  // exchanged for a signed URL before the browser can open it.
  async function openDocument() {
    if (!policy.file_url) return
    setOpening(true)
    setDocError(null)
    const res = await getInsuranceDocumentUrl(policy.file_url)
    setOpening(false)
    if ('error' in res) {
      setDocError(res.error)
      return
    }
    window.open(res.url, '_blank', 'noopener,noreferrer')
  }

  return (
    <>
      <div className={`fixed inset-0 bg-black/40 z-40 backdrop-blur-[1px] ${backdropCls}`} onClick={close} />
      <div className="fixed inset-y-0 right-0 z-50 flex">
        <div className={`bg-white w-[640px] max-w-full h-full flex flex-col shadow-2xl ${panelCls}`}>
          <div className="flex items-center justify-between px-7 pt-6 pb-5 shrink-0">
            <h2 className="text-lg font-semibold text-gray-900">COI Policy Detail</h2>
            <button onClick={close} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"><X size={18} /></button>
          </div>

          <div className="overflow-y-auto flex-1 px-7 pb-6 space-y-6 bg-white">
            {/* Identity — plain on white, with the period bar carrying the status colour. */}
            <div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">{policy.policy_holder}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{COVERAGE_LABEL[policy.coverage_type]}</p>
                </div>
                <span className={`shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full ${STATUS_BADGE[policy.status]}`}>
                  • {STATUS_LABEL[policy.status]}
                </span>
              </div>

              <div className="w-full bg-gray-100 h-1.5 rounded-full mt-4 overflow-hidden">
                <div
                  className={`h-full rounded-full ${PERIOD_BAR[policy.status]}`}
                  style={{ width: `${periodUsedPercent}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-[11px] text-gray-500">
                <span>Policy period used</span>
                <span>{policy.days_remaining > 0 ? `${policy.days_remaining} days left` : `${Math.abs(policy.days_remaining)} days over due`}</span>
              </div>
            </div>

            <div>
              <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Policy Information</h4>
              <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                {[
                  ['Policy Number', policy.policy_number],
                  ['Insurer', policy.insurer],
                  ['Policy Holder', policy.policy_holder],
                  ['Coverage Type', COVERAGE_LABEL[policy.coverage_type]],
                  ['Coverage Amount', formatCurrency(policy.coverage_amount)],
                  ['Effective Date', formatDate(policy.effective_date)],
                  ['Expiry Date', formatDate(policy.expiry_date)],
                ].map(([k, v], idx, arr) => (
                  <div key={k} className={`flex items-center justify-between px-4 py-3 text-sm ${idx !== arr.length - 1 ? 'border-b border-gray-100' : ''}`}>
                    <span className="text-gray-500">{k}</span>
                    <span className="font-medium text-gray-900">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Renewal History</h4>
              <div className="space-y-0">
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className="w-7 h-7 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                      <Check size={12} className="text-emerald-600" strokeWidth={3} />
                    </span>
                    <span className="w-px flex-1 bg-gray-200 my-1" />
                  </div>
                  <div className="pb-6">
                    <p className="text-sm text-gray-900">Policy uploaded and activated</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(policy.effective_date)} · Admin</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="w-7 h-7 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center shrink-0 text-gray-500">
                    <History size={12} />
                  </span>
                  <div>
                    <p className="text-sm text-gray-900">Renewal reminder sent to insurer</p>
                    <p className="text-xs text-gray-400 mt-0.5">{policy.renewal_reminder} days before expiry · System</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">File</h4>
              <button
                type="button"
                onClick={openDocument}
                disabled={!policy.file_url || opening}
                className="w-full bg-[#FDF6F5] border border-[#F6E3E0] rounded-xl py-10 flex flex-col items-center justify-center transition-colors hover:bg-[#FBEFED] disabled:cursor-not-allowed disabled:hover:bg-[#FDF6F5]"
              >
                <div className="w-10 h-12 bg-white rounded shadow-sm flex items-center justify-center relative mb-3 border border-gray-100">
                  <FileText className="text-red-500" size={22} />
                  <span className="absolute -bottom-1 right-[-4px] bg-red-500 text-white text-[7px] font-semibold px-1 rounded">PDF</span>
                </div>
                <p className="text-xs text-gray-500 font-medium">
                  {!policy.file_url
                    ? 'No document attached'
                    : opening
                      ? 'Opening…'
                      : 'Click to view PDF'}
                </p>
                {docError && <p className="text-xs text-red-600 mt-1">{docError}</p>}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-7 py-5 shrink-0 bg-white">
            <button onClick={close} className="px-6 py-2.5 rounded-lg bg-[#F5F6F8] text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors">Close</button>
            <button onClick={() => { onClose(); onEdit() }} className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#0D1B2A] text-sm font-medium text-white hover:bg-[#162437] transition-colors">
              Renewal Policy <ArrowUpRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Cert Detail Modal ─────────────────────────────────────────────────────────
function CertDetailModal({ cert, onClose, onEdit }: { cert: CertRow; onClose: () => void; onEdit: () => void }) {
  const { close, backdropCls, panelCls } = useSlideOver(onClose)

  const validityUsedPercent = periodUsedPct(cert.issue_date, cert.expiry_date, cert.days_left)
  return (
    <>
      <div className={`fixed inset-0 bg-black/40 z-40 backdrop-blur-[1px] ${backdropCls}`} onClick={close} />
      <div className="fixed inset-y-0 right-0 z-50 flex">
        <div className={`bg-white w-[640px] max-w-full h-full flex flex-col shadow-2xl ${panelCls}`}>
          <div className="flex items-center justify-between px-7 pt-6 pb-5 shrink-0">
            <h2 className="text-lg font-semibold text-gray-900">Certification Detail</h2>
            <button onClick={close} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"><X size={18} /></button>
          </div>

          <div className="overflow-y-auto flex-1 px-7 pb-6 space-y-6 bg-white">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-semibold text-sm shrink-0">
                {cert.employee_name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-gray-900 truncate">{cert.employee_name}</h3>
                <p className="text-xs text-gray-500 truncate">
                  {[cert.employee_title, cert.department].filter(Boolean).join(' · ')}
                </p>
              </div>
            </div>

            {/* Certificate summary — white card, with the validity strip beneath. */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 pt-4 pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="font-semibold text-gray-900 text-sm truncate">{cert.cert_name}</h4>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Issued by {cert.issuing_body} · ID: {cert.id.slice(0, 8).toUpperCase()}
                    </p>
                  </div>
                  <span className={`shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full ${STATUS_BADGE[cert.status]}`}>
                    • {STATUS_LABEL[cert.status]}
                  </span>
                </div>
                <div className="w-full bg-gray-100 h-1.5 rounded-full mt-4 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${PERIOD_BAR[cert.status]}`}
                    style={{ width: `${validityUsedPercent}%` }}
                  />
                </div>
              </div>
              <div className="flex justify-between items-center px-4 py-2.5 bg-[#F9FAFB] border-t border-gray-100 text-[11px] text-gray-500">
                <span>Validity period used</span>
                <span>{cert.days_left > 0 ? `${cert.days_left} days remaining` : `${Math.abs(cert.days_left)} days over due`}</span>
              </div>
            </div>

            <div>
              <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Certification Details</h4>
              <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                {[
                  ['Certification', cert.cert_name],
                  ['Issuing Body', cert.issuing_body],
                  ['Department', cert.department ?? '—'],
                  ['Issue Date', formatDate(cert.issue_date)],
                  ['Expiry Date', formatDate(cert.expiry_date)],
                ].map(([k, v], idx, arr) => (
                  <div key={k} className={`flex items-center justify-between px-4 py-3 text-sm ${idx !== arr.length - 1 ? 'border-b border-gray-100' : ''}`}>
                    <span className="text-gray-500">{k}</span>
                    <span className="font-medium text-gray-900">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Compliance History</h4>
              <div className="space-y-0">
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className="w-7 h-7 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                      <Check size={12} className="text-emerald-600" strokeWidth={3} />
                    </span>
                    {cert.status === 'expired' && <span className="w-px flex-1 bg-gray-200 my-1" />}
                  </div>
                  <div className={cert.status === 'expired' ? 'pb-6' : ''}>
                    <p className="text-sm text-gray-900">Certificate issued and logged</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(cert.issue_date)} · HR Admin</p>
                  </div>
                </div>
                {cert.status === 'expired' && (
                  <div className="flex gap-3">
                    <span className="w-7 h-7 rounded-full bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                      <X size={12} className="text-red-600" strokeWidth={3} />
                    </span>
                    <div>
                      <p className="text-sm text-gray-900">Certificate has expired</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(cert.expiry_date)} · System</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-7 py-5 shrink-0 bg-white">
            <button onClick={close} className="px-6 py-2.5 rounded-lg bg-[#F5F6F8] text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors">Close</button>
            <button onClick={() => { onClose(); onEdit() }} className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#0D1B2A] text-sm font-medium text-white hover:bg-[#162437] transition-colors">
              Update Certification <ArrowUpRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Success Modal ─────────────────────────────────────────────────────────────
// ─── Policy Form Modal ─────────────────────────────────────────────────────────
function PolicyFormModal({ policy, onClose, onSave, loading }: {
  policy?: PolicyRow; onClose: () => void; onSave: (v: PolicyFormValues) => void; loading?: boolean
}) {
  const { close, backdropCls, panelCls } = useSlideOver(onClose)

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
    file: null,
  })

  const fileInputRef = useRef<HTMLInputElement>(null)

  function set<K extends keyof PolicyFormValues>(k: K, val: PolicyFormValues[K]) {
    setV(prev => ({ ...prev, [k]: val }))
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      set('file', e.target.files[0])
    }
  }

  const canSave = v.policy_holder.trim() && v.coverage_type && v.insurer.trim() && v.expiry_date

  return (
    <>
      <div className={`fixed inset-0 bg-black/40 z-40 backdrop-blur-[1px] ${backdropCls}`} onClick={close} />
      <div className="fixed inset-y-0 right-0 z-50 flex">
        <div className={`bg-white w-[640px] max-w-full h-full flex flex-col shadow-2xl ${panelCls}`}>
          <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100 shrink-0">
            <h2 className="text-base font-semibold text-gray-900">{policy ? 'Edit COI Policy' : 'Upload COI Policy'}</h2>
            <button onClick={close} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"><X size={16} /></button>
          </div>

          <div className="overflow-y-auto flex-1 px-7 py-6 space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Policy Information</h3>
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
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Policy Dates</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Effective Date</label>
                  <div className="relative">
                    <input type="date" value={v.effective_date} onChange={e => set('effective_date', e.target.value)} className={`${inputCls} pr-10`} />
                    <CalendarDays size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Expiry Date</label>
                  <div className="relative">
                    <input type="date" value={v.expiry_date} onChange={e => set('expiry_date', e.target.value)} className={`${inputCls} pr-10`} />
                    <CalendarDays size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
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
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Document Upload</h3>
              <p className="text-xs text-gray-500 mb-2">Upload COI Document (PDF)</p>
              <input type="file" ref={fileInputRef} hidden accept=".pdf,image/*" onChange={handleFileChange} />
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
              >
                <div className="w-10 h-12 bg-white rounded shadow-sm flex items-center justify-center relative mb-2">
                  <FileText className="text-red-500" size={24} />
                  <span className="absolute -bottom-1 right-[-4px] bg-red-500 text-white text-[8px] font-semibold px-1 rounded">PDF</span>
                </div>
                <span className="text-xs font-medium text-gray-800">{v.file ? v.file.name : 'Click to upload document'}</span>
                {v.file && <span className="text-[10px] text-gray-400 mt-1">Ready to upload</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-7 py-5 border-t border-gray-100 shrink-0">
            <button onClick={close} className="px-6 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
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
  const { close, backdropCls, panelCls } = useSlideOver(onClose)

  const [v, setV] = useState<CertFormValues>({
    certId: cert?.id,
    user_id: cert?.user_id ?? '',
    cert_name: cert?.cert_name ?? '',
    issuing_body: cert?.issuing_body ?? '',
    department: cert?.department ?? '',
    issue_date: cert?.issue_date ?? '',
    expiry_date: cert?.expiry_date ?? '',
    file: null,
  })

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [docError, setDocError] = useState<string | null>(null)

  function set<K extends keyof CertFormValues>(k: K, val: CertFormValues[K]) {
    setV(prev => ({ ...prev, [k]: val }))
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      setV(prev => ({ ...prev, file: e.target.files![0], removeFile: false }))
      setDocError(null)
    }
  }

  // A stored document counts, and so does one picked in this session but not
  // saved yet — unless it has since been cleared.
  const storedDocument = v.removeFile ? null : cert?.file_url ?? null
  const hasDocument = Boolean(v.file || storedDocument)

  /** Opens the saved file; a freshly picked one has no URL yet, so re-pick. */
  async function viewOrReplace() {
    if (v.file || !storedDocument) {
      fileInputRef.current?.click()
      return
    }
    setDocError(null)
    const res = await getInsuranceDocumentUrl(storedDocument)
    if ('error' in res) {
      setDocError(res.error)
      return
    }
    window.open(res.url, '_blank', 'noopener,noreferrer')
  }

  function clearDocument() {
    setV(prev => ({ ...prev, file: null, removeFile: Boolean(cert?.file_url) }))
    setDocError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const canSave = v.user_id && v.cert_name.trim() && v.expiry_date

  return (
    <>
      <div className={`fixed inset-0 bg-black/40 z-40 backdrop-blur-[1px] ${backdropCls}`} onClick={close} />
      <div className="fixed inset-y-0 right-0 z-50 flex">
        <div className={`bg-white w-[640px] max-w-full h-full flex flex-col shadow-2xl ${panelCls}`}>
          <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100 shrink-0">
            <h2 className="text-base font-semibold text-gray-900">{cert ? 'Edit Certification' : 'Add Certification'}</h2>
            <button onClick={close} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"><X size={16} /></button>
          </div>

          <div className="overflow-y-auto flex-1 px-7 py-6 space-y-7">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Employee & Certification</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Employee</label>
                  <PersonSelect
                    people={employees.map(emp => ({ id: emp.id, name: emp.name, title: emp.title, avatarUrl: emp.avatar_url }))}
                    value={v.user_id}
                    onChange={id => set('user_id', id)}
                    emptyHint="No employees found — add a team member first."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Certification Name</label>
                  <input placeholder="Enter name" value={v.cert_name} onChange={e => set('cert_name', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Issuing Body</label>
                  <input placeholder="eg OSHA" value={v.issuing_body} onChange={e => set('issuing_body', e.target.value)} className={inputCls} />
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
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Dates</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Issue Date</label>
                  <div className="relative">
                    <input type="date" value={v.issue_date} onChange={e => set('issue_date', e.target.value)} className={`${inputCls} pr-10`} />
                    <CalendarDays size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Expiry Date</label>
                  <div className="relative">
                    <input type="date" value={v.expiry_date} onChange={e => set('expiry_date', e.target.value)} className={`${inputCls} pr-10`} />
                    <CalendarDays size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Document Upload</h3>
              <p className="text-xs text-gray-500 mb-2">Upload Certificate (PDF / Image)</p>
              <input type="file" ref={fileInputRef} hidden accept=".pdf,image/*" onChange={handleFileChange} />

              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={hasDocument ? viewOrReplace : () => fileInputRef.current?.click()}
                  className="flex-1 min-w-0 bg-[#FDF6F5] border border-[#F6E3E0] rounded-xl py-8 flex flex-col items-center justify-center transition-colors hover:bg-[#FBEFED]"
                >
                  <div className="w-10 h-12 bg-white rounded shadow-sm flex items-center justify-center relative mb-3 border border-gray-100">
                    <FileText className="text-red-500" size={22} />
                    <span className="absolute -bottom-1 right-[-4px] bg-red-500 text-white text-[7px] font-semibold px-1 rounded">PDF</span>
                  </div>
                  <p className="text-xs text-gray-500 font-medium px-4 truncate max-w-full">
                    {v.file ? v.file.name : hasDocument ? 'Click to view PDF' : 'Click to upload a certificate'}
                  </p>
                  {docError && <p className="text-xs text-red-600 mt-1">{docError}</p>}
                </button>

                {hasDocument && (
                  <button
                    type="button"
                    onClick={clearDocument}
                    aria-label="Remove document"
                    className="w-11 h-11 shrink-0 rounded-lg border border-red-200 text-red-500 flex items-center justify-center hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-7 py-5 shrink-0">
            <button onClick={close} className="px-6 py-2.5 rounded-lg bg-[#F5F6F8] text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors">Cancel</button>
            <button
              onClick={() => { if (canSave) onSave(v) }}
              disabled={!canSave || loading}
              className="px-6 py-2.5 rounded-lg bg-[#0D1B2A] text-sm font-semibold text-white hover:bg-[#162437] transition-colors disabled:opacity-60"
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
  const enter = useEntry()
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

  /**
   * Goes through a server action rather than the browser Supabase client: the
   * bucket is private and this app has no real Supabase auth session, so a
   * client-side upload is rejected before it starts.
   */
  async function uploadDocument(file: File): Promise<string | null> {
    const fd = new FormData()
    fd.append('file', file)
    const res = await uploadInsuranceDocument(fd)
    if ('error' in res) {
      console.error('Upload error:', res.error)
      showToast(`Upload failed: ${res.error}`)
      return null
    }
    return res.path
  }

  function handleSavePolicy(values: PolicyFormValues) {
    startTransition(async () => {
      let file_url = null
      if (values.file) {
        file_url = await uploadDocument(values.file)
      }

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
          ...(file_url ? { file_url } : {})
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
          file_url,
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
      let file_url = null
      if (values.file) {
        file_url = await uploadDocument(values.file)
      }

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
          ...(file_url ? { file_url } : values.removeFile ? { file_url: null } : {})
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
          file_url,
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
  const activeFilterCount = filters.status.length + filters.coverageType.length + filters.expiresWithin.length
  const certCompliance = certs.length > 0
    ? `${Math.round(certs.filter(c => c.status === 'valid').length / certs.length * 100)}%`
    : '—'

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      {/* Header */}
      {/* Body */}
      <div className="flex-1 overflow-y-auto relative flex flex-col">
        {toast && <Toast message={toast} />}

        {/* Stat cards */}
        <StatCardGrid className="px-8 pt-6 flex-none">
          <StatCard label="Active COIs" value={stats.active} sub="All policies tracked" subColor="text-emerald-500"
            iconBg="bg-emerald-50"
            icon={<ShieldCheck size={16} className="text-emerald-500" strokeWidth={1.8} />} />
          <StatCard label="Expiring Soon" value={stats.expiring} sub="Within 60 days" subColor="text-orange-500"
            iconBg="bg-orange-50"
            icon={<Clock size={16} className="text-orange-500" strokeWidth={1.8} />} />
          <StatCard label="Expired" value={stats.expired} sub="Needs renewal" subColor="text-red-500"
            iconBg="bg-red-50"
            icon={<AlertCircle size={16} className="text-red-500" strokeWidth={1.8} />} />
          <StatCard label="Cert Compliance" value={certCompliance}
            iconBg="bg-blue-50"
            icon={<UserCheck size={16} className="text-blue-500" strokeWidth={1.8} />} />
        </StatCardGrid>

        {/* Tabs & Toolbar */}
        <div className="px-8 flex-none">
          <div className={`flex items-center gap-3 ${CONTENT_GAP}`}>
            <button onClick={() => setTab('coi')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-colors ${tab === 'coi' ? 'bg-[#0D1B2A] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              COI Policies ({policies.length})
            </button>
            <button onClick={() => setTab('certs')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-colors ${tab === 'certs' ? 'bg-[#0D1B2A] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              Employee Certifications ({certs.length})
            </button>
          </div>

          <div {...enter.fade(`flex items-center gap-3 relative ${CONTENT_GAP}`)}>
            <ViewToggle
              value={viewMode}
              onChange={setViewMode}
              className="shrink-0 mr-3"
              options={[
                { value: 'kanban', label: 'Kanban', icon: KanbanSquare },
                { value: 'list',   label: 'List',   icon: ListIcon },
              ]}
            />
            <SearchInput value={search} onChange={setSearch} className="w-52" />
            <div className="flex-1" />
            <div className="relative">
              <FilterButton onClick={() => setShowFilters(!showFilters)} active={showFilters} count={activeFilterCount} />
              {showFilters && <FilterDropdown filters={filters} onChange={setFilters} onClose={() => setShowFilters(false)} />}
            </div>
            {tab === 'coi' ? (
              <button onClick={() => setModal({ type: 'uploadPolicy' })}
                className="flex items-center gap-1.5 px-4 py-2.5 text-xs text-white bg-[#0D1B2A] rounded-lg hover:bg-[#162437] font-semibold transition-colors">
                <Plus size={13} /> Upload COI
              </button>
            ) : (
              <button onClick={() => setModal({ type: 'certForm' })}
                className="flex items-center gap-1.5 px-4 py-2.5 text-xs text-white bg-[#0D1B2A] rounded-lg hover:bg-[#162437] font-semibold transition-colors">
                <Plus size={13} /> Add Certification
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="px-8 pb-8 flex-1 overflow-y-auto">
          {viewMode === 'kanban' ? (
            // Columns share the row evenly rather than sitting at a fixed 320px,
            // so the board fills the width the toolbar above it already spans.
            <div className="flex gap-6 items-start overflow-x-auto">
              {DB_STATUSES.map(status => {
                const colItems = tab === 'coi'
                  ? filteredPolicies.filter(p => p.status === status)
                  : filteredCerts.filter(c => c.status === status)
                return (
                  <div key={status} className="flex-1 min-w-[320px]">
                    <div className="flex items-center gap-2 mb-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                      <div className={`w-2 h-2 rounded-full ${STATUS_DOT[status]}`} />
                      <span className="font-semibold text-gray-800 text-sm">{STATUS_LABEL[status]}</span>
                      <span className="ml-auto text-[10px] font-semibold text-gray-500">{colItems.length}</span>
                    </div>
                    <div className="space-y-4">
                      {tab === 'coi'
                        ? (colItems as PolicyRow[]).map((p, i) => (
                          <PolicyCard key={p.id} index={i} policy={p}
                            onView={() => setModal({ type: 'viewPolicy', policy: p })}
                            onEdit={() => setModal({ type: 'uploadPolicy', policy: p })}
                            onDelete={() => setModal({ type: 'deletePolicy', policy: p })}
                          />
                        ))
                        : (colItems as CertRow[]).map((c, i) => (
                          <CertCard key={c.id} index={i} cert={c}
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
          message={`Deleting this COI policy (${modal.policy.policy_holder}) will remove all associated data permanently.`}
          onConfirm={confirmDeletePolicy}
          onCancel={() => setModal(null)}
          loading={isPending}
        />
      )}
      {modal?.type === 'deleteCert' && (
        <DeleteModal
          title="Delete Certification"
          message={`Deleting this certification (${modal.cert.employee_name}, ${modal.cert.cert_name}) will remove all associated data permanently.`}
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
          actionLabel={modal.actionBtn}
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
