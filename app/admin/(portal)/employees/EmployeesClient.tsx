'use client'

import { useState, useRef, useEffect, useCallback, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, ListFilter, Download, Plus, Eye, Pencil, Trash2,
  MoreHorizontal, LayoutGrid, List, ChevronLeft,
  ChevronRight, X, Check, Upload, FileText, PenLine,
} from 'lucide-react'
import {
  createEmployee, updateEmployee, deleteEmployee, uploadAvatar, importEmployees,
  type EmployeeRow, type CreateEmployeeInput, type UpdateEmployeeInput,
} from './actions'
import { EmployeeFormPanel, type FormValues } from './EmployeeFormPanel'
import { ViewToggle } from '@/app/components/ui/ViewToggle'
import { SuccessModal } from '@/app/components/ui/SuccessModal'
import { FilterButton, ImportExportButton } from '@/app/components/ui/ToolbarButtons'
import { ConfirmDeleteModal } from '@/app/components/ui/ConfirmDeleteModal'
import { Toast } from '@/app/components/ui/Toast'

// ─── Types ────────────────────────────────────────────────────────────────────
type Status = 'active' | 'on_leave' | 'inactive'

type Modal =
  | { type: 'delete'; employee: EmployeeRow }
  | { type: 'form'; employee: EmployeeRow | null }
  | { type: 'success'; name: string; id: string }
  | { type: 'import'; summary: ImportSummary }

// ─── Helpers ──────────────────────────────────────────────────────────────────
const statusConfig: Record<Status, { label: string; dot: string; text: string; bg: string }> = {
  active:   { label: 'Active',    dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
  on_leave: { label: 'On Leave',  dot: 'bg-amber-500',   text: 'text-amber-700',   bg: 'bg-amber-50'   },
  inactive: { label: 'Inactive',  dot: 'bg-gray-400',    text: 'text-gray-600',    bg: 'bg-gray-100'   },
}

const avatarColors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#6366F1', '#EC4899']

function initials(first: string, last: string) {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase()
}

function avatarColor(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash)
  return avatarColors[Math.abs(hash) % avatarColors.length]
}

// ─── CSV import / export ──────────────────────────────────────────────────────
const CSV_COLUMNS = [
  'First Name', 'Last Name', 'Email', 'Employee ID', 'Role', 'Employee Type',
  'Status', 'Department', 'Gender', 'Phone', 'Rate of Pay', 'Start Date',
] as const

type ImportSummary = {
  added: number
  skipped: string[]
  failed: { row: string; reason: string }[]
}

function csvCell(value: string | number | null) {
  const s = value == null ? '' : String(value)
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function toCsv(rows: EmployeeRow[]) {
  const lines = [CSV_COLUMNS.join(',')]
  for (const e of rows) {
    lines.push([
      e.first_name, e.last_name, e.email, e.employee_id, e.role, e.employee_type,
      e.status, e.department, e.gender, e.phone, e.rate_of_pay, e.start_date,
    ].map(csvCell).join(','))
  }
  return lines.join('\r\n')
}

function downloadCsv(filename: string, csv: string) {
  // BOM keeps Excel from mangling non-ASCII names
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

/** Minimal RFC-4180 reader — handles quoted fields, escaped quotes and CRLF. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c !== '"') field += c
      else if (text[i + 1] === '"') { field += '"'; i++ }
      else quoted = false
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else if (c !== '\r') field += c
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row) }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ''))
}

const normalize = (s: string) => s.trim().toLowerCase().replace(/[\s_-]+/g, '')

function matchEnum<T extends string>(raw: string, allowed: readonly T[], fallback: T): T {
  return allowed.find((a) => normalize(a) === normalize(raw)) ?? fallback
}

/** Turns raw CSV text into create-inputs, collecting per-row problems instead of throwing. */
function parseEmployeeCsv(text: string): { rows: CreateEmployeeInput[]; failed: ImportSummary['failed'] } {
  const table = parseCsv(text.replace(/^\uFEFF/, ''))
  const rows: CreateEmployeeInput[] = []
  const failed: ImportSummary['failed'] = []
  if (table.length < 2) return { rows, failed }

  const header = table[0].map(normalize)
  const col = (name: string) => header.indexOf(normalize(name))
  const idx = {
    firstName: col('First Name'), lastName: col('Last Name'), email: col('Email'),
    employeeId: col('Employee ID'), role: col('Role'), employeeType: col('Employee Type'),
    status: col('Status'), department: col('Department'), gender: col('Gender'),
    phone: col('Phone'), rateOfPay: col('Rate of Pay'), startDate: col('Start Date'),
  }

  if (idx.email === -1 || idx.firstName === -1) {
    return { rows, failed: [{ row: 'Header', reason: 'CSV needs at least "First Name" and "Email" columns' }] }
  }

  for (const cells of table.slice(1)) {
    const at = (i: number) => (i === -1 ? '' : (cells[i] ?? '').trim())
    const email = at(idx.email)
    const firstName = at(idx.firstName)
    const label = email || firstName || 'Unnamed row'

    if (!firstName || !email) { failed.push({ row: label, reason: 'Missing first name or email' }); continue }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { failed.push({ row: label, reason: 'Invalid email address' }); continue }

    const rate = parseFloat(at(idx.rateOfPay).replace(/[^0-9.]/g, ''))
    const startDate = at(idx.startDate)

    rows.push({
      firstName,
      lastName: at(idx.lastName),
      email,
      employeeId: at(idx.employeeId),
      role: matchEnum(at(idx.role), ['admin', 'manager', 'technician'] as const, 'technician'),
      employeeType: matchEnum(at(idx.employeeType), ['full_time', 'part_time', 'contractor', 'subcontractor'] as const, 'full_time'),
      status: matchEnum(at(idx.status), ['active', 'on_leave', 'inactive'] as const, 'active'),
      department: at(idx.department),
      gender: at(idx.gender),
      rateOfPay: isNaN(rate) ? null : rate,
      startDate: /^\d{4}-\d{2}-\d{2}$/.test(startDate) ? startDate : null,
      avatarUrl: null,
      phone: at(idx.phone),
    })
  }

  return { rows, failed }
}

// ─── Overlay ──────────────────────────────────────────────────────────────────
function Overlay({ onClick }: { onClick: () => void }) {
  return <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-[1px]" onClick={onClick} />
}

// ─── Delete Modal ─────────────────────────────────────────────────────────────
function DeleteModal({ employee, onConfirm, onCancel, loading }: {
  employee: EmployeeRow
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  return (
    <ConfirmDeleteModal
      title="Delete Employee"
      message={`Deleting this employee (${`${employee.first_name} ${employee.last_name}`.trim()}) will remove all associated data permanently.`}
      onCancel={onCancel}
      onConfirm={onConfirm}
      loading={loading}
    />
  )
}

// ─── Import Summary Modal ─────────────────────────────────────────────────────
function ImportSummaryModal({ summary, onClose }: { summary: ImportSummary; onClose: () => void }) {
  const clean = summary.failed.length === 0 && summary.skipped.length === 0
  return (
    <>
      <Overlay onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center text-center relative">
          <button onClick={onClose} className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">
            <X size={16} />
          </button>
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-5 ${clean ? 'bg-emerald-100' : 'bg-amber-100'}`}>
            {clean
              ? <Check size={28} className="text-emerald-600" strokeWidth={2.5} />
              : <Upload size={26} className="text-amber-600" strokeWidth={2.2} />}
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            {summary.added > 0 ? `${summary.added} employee${summary.added === 1 ? '' : 's'} imported` : 'Nothing imported'}
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed mb-5">
            {clean
              ? 'Every row in the file was added to your team.'
              : `${summary.skipped.length} skipped as duplicates, ${summary.failed.length} could not be imported.`}
          </p>

          {(summary.skipped.length > 0 || summary.failed.length > 0) && (
            <div className="w-full max-h-44 overflow-y-auto text-left border border-gray-100 rounded-lg divide-y divide-gray-50 mb-6">
              {summary.skipped.map((email) => (
                <div key={email} className="px-3 py-2 text-xs">
                  <span className="text-gray-700">{email}</span>
                  <span className="text-gray-400"> — already on the team</span>
                </div>
              ))}
              {summary.failed.map((f, i) => (
                <div key={`${f.row}-${i}`} className="px-3 py-2 text-xs">
                  <span className="text-gray-700">{f.row}</span>
                  <span className="text-red-500"> — {f.reason}</span>
                </div>
              ))}
            </div>
          )}

          <button onClick={onClose}
            className="w-full py-3 rounded-lg bg-[#0D1B2A] text-sm font-medium text-white hover:bg-[#162437] transition-colors">
            Done
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Filter Popover ───────────────────────────────────────────────────────────
type Filters = {
  role: string[]
  status: string[]
  employeeType: string[]
  department: string[]
}

const EMPTY_FILTERS: Filters = { role: [], status: [], employeeType: [], department: [] }

const roleOptions = ['admin', 'manager', 'technician']
const statusOptions: Status[] = ['active', 'on_leave', 'inactive']
const typeOptions = ['full_time', 'part_time', 'contractor', 'subcontractor']

const typeLabels: Record<string, string> = {
  full_time: 'Full-Time', part_time: 'Part-Time',
  contractor: 'Contractor', subcontractor: 'Subcontractor',
}

function countFilters(f: Filters) {
  return f.role.length + f.status.length + f.employeeType.length + f.department.length
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 text-[11px] rounded-full border transition-colors ${
        active
          ? 'bg-[#0D1B2A]/5 border-[#0D1B2A]/25 text-[#0D1B2A] font-medium'
          : 'border-gray-200 text-gray-600 hover:border-gray-300'
      }`}
    >
      {label}
    </button>
  )
}

function FilterPopover({ filters, departments, onChange, onClose }: {
  filters: Filters
  departments: string[]
  onChange: (next: Filters) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [deptSearch, setDeptSearch] = useState('')

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  /** Adds or removes one value from a filter group. */
  function toggle(group: keyof Filters, value: string) {
    const current = filters[group]
    onChange({
      ...filters,
      [group]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
    })
  }

  const visibleDepts = departments.filter((d) => d.toLowerCase().includes(deptSearch.toLowerCase()))

  return (
    <div ref={ref} className="absolute right-0 top-10 z-30 w-72 bg-white rounded-xl shadow-xl border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-gray-800">Filter</h4>
        <button
          onClick={() => onChange(EMPTY_FILTERS)}
          disabled={countFilters(filters) === 0}
          className="text-[11px] text-gray-500 hover:text-gray-800 disabled:opacity-40 disabled:hover:text-gray-500"
        >
          Clear all
        </button>
      </div>

      <div className="mb-3.5">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Role</p>
        <div className="flex flex-wrap gap-1.5">
          {roleOptions.map((r) => (
            <Chip key={r} label={r.charAt(0).toUpperCase() + r.slice(1)} active={filters.role.includes(r)} onClick={() => toggle('role', r)} />
          ))}
        </div>
      </div>

      <div className="mb-3.5">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Status</p>
        <div className="flex flex-wrap gap-1.5">
          {statusOptions.map((s) => (
            <Chip key={s} label={statusConfig[s].label} active={filters.status.includes(s)} onClick={() => toggle('status', s)} />
          ))}
        </div>
      </div>

      <div className="mb-3.5">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Employee Type</p>
        <div className="flex flex-wrap gap-1.5">
          {typeOptions.map((t) => (
            <Chip key={t} label={typeLabels[t]} active={filters.employeeType.includes(t)} onClick={() => toggle('employeeType', t)} />
          ))}
        </div>
      </div>

      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Department</p>
        {departments.length === 0 ? (
          <p className="text-[11px] text-gray-400">No departments set.</p>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="flex items-center px-2.5 py-2 border-b border-gray-100 bg-gray-50/50">
              <Search size={12} className="text-gray-400 mr-2 shrink-0" />
              <input
                value={deptSearch}
                onChange={(e) => setDeptSearch(e.target.value)}
                placeholder="Search"
                className="bg-transparent outline-none text-[11px] w-full text-gray-700 placeholder-gray-400"
              />
            </div>
            <div className="max-h-32 overflow-y-auto p-1">
              {visibleDepts.map((d) => (
                <label key={d} className="flex items-center justify-between px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer">
                  <span className="text-[11px] text-gray-700 truncate">{d}</span>
                  <input
                    type="checkbox"
                    checked={filters.department.includes(d)}
                    onChange={() => toggle('department', d)}
                    className="rounded border-gray-300 text-[#0D1B2A] focus:ring-[#0D1B2A] shrink-0"
                  />
                </label>
              ))}
              {visibleDepts.length === 0 && <p className="px-2 py-1.5 text-[11px] text-gray-400">No match.</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Import / Export Menu ─────────────────────────────────────────────────────
function ImportExportMenu({ exportCount, onClose, onImport, onExport, onTemplate }: {
  exportCount: number
  onClose: () => void
  onImport: () => void
  onExport: () => void
  onTemplate: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const item = 'w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors text-left disabled:opacity-40 disabled:hover:bg-transparent'

  return (
    <div ref={ref} className="absolute right-0 top-10 z-30 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5">
      <button onClick={() => { onImport(); onClose() }} className={item}>
        <Upload size={13} className="text-gray-400 shrink-0" />
        Import from CSV
      </button>
      <button onClick={() => { onExport(); onClose() }} disabled={exportCount === 0} className={item}>
        <Download size={13} className="text-gray-400 shrink-0" />
        Export CSV
        <span className="ml-auto text-[10px] text-gray-400">{exportCount}</span>
      </button>
      <div className="h-px bg-gray-100 my-1" />
      <button onClick={() => { onTemplate(); onClose() }} className={item}>
        <FileText size={13} className="text-gray-400 shrink-0" />
        Download template
      </button>
    </div>
  )
}

// ─── Action Menu ──────────────────────────────────────────────────────────────
function ActionMenu({ onClose, onView, onEdit, onDelete }: {
  onClose: () => void; onView: () => void; onEdit: () => void; onDelete: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <div ref={ref} className="absolute right-2 top-10 z-30 w-[215px] bg-white rounded-2xl shadow-[0_8px_30px_rgba(16,24,40,0.14)] p-1.5">
      <button onClick={() => { onView(); onClose() }}
        className="w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-[15px] text-[#1D2939] hover:bg-[#F2F4F7] transition-colors">
        <Eye size={19} className="text-[#1D2939] shrink-0" strokeWidth={1.6} />
        View Detail
      </button>
      <button onClick={() => { onEdit(); onClose() }}
        className="w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-[15px] text-[#1D2939] hover:bg-[#F2F4F7] transition-colors">
        <PenLine size={19} className="text-[#1D2939] shrink-0" strokeWidth={1.6} />
        Edit
      </button>
      <button onClick={() => { onDelete(); onClose() }}
        className="w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-[15px] text-[#1D2939] hover:bg-[#F2F4F7] transition-colors">
        <Trash2 size={19} className="text-[#F04438] shrink-0" strokeWidth={1.6} />
        Delete
      </button>
    </div>
  )
}

// ─── Employee Card ────────────────────────────────────────────────────────────
function EmployeeCard({ emp, onEdit, onDelete, onView }: {
  emp: EmployeeRow; onEdit: () => void; onDelete: () => void; onView: () => void
}) {
  const [open, setOpen] = useState(false)
  const st = statusConfig[emp.status]
  const close = useCallback(() => setOpen(false), [])
  const color = avatarColor(emp.id)

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-visible hover:shadow-md transition-shadow">
      <div className="h-36 relative flex items-center justify-center rounded-t-xl" style={{ backgroundColor: `${color}18` }}>
        {emp.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={emp.avatar_url} alt={emp.first_name} className="w-20 h-20 rounded-full object-cover shadow-md" />
        ) : (
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-semibold text-white shadow-md"
            style={{ backgroundColor: color }}>
            {initials(emp.first_name, emp.last_name)}
          </div>
        )}
        <div className="absolute top-3 right-3">
          <button onClick={() => setOpen(!open)}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-white/80 hover:bg-white text-gray-500 shadow-sm transition-colors">
            <MoreHorizontal size={15} />
          </button>
          {open && <ActionMenu onClose={close} onView={onView} onEdit={onEdit} onDelete={onDelete} />}
        </div>
      </div>
      <div className="px-4 py-3.5">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-gray-900 text-sm leading-tight">{emp.first_name} {emp.last_name}</h3>
          <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full inline-block ${st.dot}`} />
            {st.label}
          </span>
        </div>
        <p className="text-xs text-gray-500 mb-3 capitalize">{emp.role}</p>
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Department</span>
            <span className="font-medium text-gray-700">{emp.department ?? '—'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Phone</span>
            <span className="font-medium text-gray-700">{emp.phone ?? '—'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Email</span>
            <span className="font-medium text-gray-700 truncate ml-2 text-right">{emp.email}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Client Component ────────────────────────────────────────────────────
export function EmployeesClient({ initialEmployees }: { initialEmployees: EmployeeRow[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [employees, setEmployees] = useState<EmployeeRow[]>(initialEmployees)
  const [view, setView] = useState<'kanban' | 'list'>('kanban')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState<Modal | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [ioOpen, setIoOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const fileRef = useRef<HTMLInputElement>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const pageSize = 20

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  const departments = [...new Set(employees.map((e) => e.department).filter((d): d is string => !!d))].sort()
  const activeFilterCount = countFilters(filters)

  const filtered = employees.filter((e) => {
    const q = search.toLowerCase()
    const matchesSearch =
      e.first_name.toLowerCase().includes(q) ||
      e.last_name.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q) ||
      (e.department ?? '').toLowerCase().includes(q)

    // An empty group means "no constraint", so every group must either be empty or contain the value.
    return (
      matchesSearch &&
      (filters.role.length === 0 || filters.role.includes(e.role)) &&
      (filters.status.length === 0 || filters.status.includes(e.status)) &&
      (filters.employeeType.length === 0 || filters.employeeType.includes(e.employee_type ?? '')) &&
      (filters.department.length === 0 || filters.department.includes(e.department ?? ''))
    )
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  function handleDelete(emp: EmployeeRow) { setModal({ type: 'delete', employee: emp }) }
  function handleEdit(emp: EmployeeRow) { setFormError(null); setModal({ type: 'form', employee: emp }) }
  function handleView(emp: EmployeeRow) { router.push(`/admin/employees/${emp.id}`) }

  /** Exports what's on screen — the search filter carries through to the file. */
  function handleExport() {
    const stamp = new Date().toISOString().slice(0, 10)
    downloadCsv(`employees-${stamp}.csv`, toCsv(filtered))
  }

  function handleTemplate() {
    downloadCsv('employees-template.csv', [
      CSV_COLUMNS.join(','),
      'Jane,Doe,jane.doe@example.com,EMP-001,technician,full_time,active,Field Ops,female,+15550000000,32.50,2026-01-15',
    ].join('\r\n'))
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // let the same file be picked again after a fix
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const { rows, failed } = parseEmployeeCsv(String(reader.result ?? ''))
      const existing = new Set(employees.map((emp) => emp.email.toLowerCase()))
      const skipped = rows.filter((r) => existing.has(r.email.toLowerCase())).map((r) => r.email)
      const toCreate = rows.filter((r) => !existing.has(r.email.toLowerCase()))

      if (toCreate.length === 0) {
        setModal({ type: 'import', summary: { added: 0, skipped, failed } })
        return
      }

      startTransition(async () => {
        const results = await importEmployees(toCreate)
        const created: EmployeeRow[] = []
        const allFailed = [...failed]

        results.forEach((result, i) => {
          const input = toCreate[i]
          if (!result.id) {
            allFailed.push({ row: input.email, reason: result.error ?? 'Unknown error' })
            return
          }
          created.push({
            id: result.id,
            first_name: input.firstName, last_name: input.lastName,
            email: input.email, employee_id: input.employeeId || null,
            role: input.role, status: input.status,
            phone: input.phone || null, department: input.department || null,
            employee_type: input.employeeType, gender: input.gender || null,
            rate_of_pay: input.rateOfPay, start_date: input.startDate,
            avatar_url: null,
          })
        })

        setEmployees((prev) => [...created, ...prev])
        setModal({ type: 'import', summary: { added: created.length, skipped, failed: allFailed } })
      })
    }
    reader.readAsText(file)
  }

  function confirmDelete() {
    if (modal?.type !== 'delete') return
    const { id, first_name, last_name } = modal.employee
    startTransition(async () => {
      const result = await deleteEmployee(id)
      if (result.error) {
        showToast(`Delete failed: ${result.error}`, 'error')
        return
      }
      setEmployees((prev) => prev.filter((e) => e.id !== id))
      setModal(null)
      showToast(`Employee(${`${first_name} ${last_name}`.trim()}) deleted successfully`)
    })
  }

  function handleSave(values: FormValues, avatarFile: File | null, currentAvatarUrl: string | null) {
    if (modal?.type !== 'form') return
    setFormError(null)

    const rateOfPay = values.rateOfPay ? parseFloat(values.rateOfPay) : null

    if (modal.employee) {
      startTransition(async () => {
        let avatarUrl = currentAvatarUrl
        if (avatarFile) {
          const fd = new FormData()
          fd.append('file', avatarFile)
          const up = await uploadAvatar(fd)
          if ('error' in up) { setFormError(up.error); return }
          avatarUrl = up.url
        }
        const input: UpdateEmployeeInput = {
          id: modal.employee!.id,
          firstName: values.firstName, lastName: values.lastName,
          email: values.email, employeeId: values.employeeId, role: values.role,
          employeeType: values.employeeType, status: values.status,
          department: values.department, gender: values.gender,
          rateOfPay, startDate: values.startDate || null,
          avatarUrl, phone: values.phone,
        }
        const result = await updateEmployee(input)
        if (result.error) { setFormError(result.error); return }
        setEmployees((prev) => prev.map((e) =>
          e.id === modal.employee!.id
            ? { ...e, first_name: values.firstName, last_name: values.lastName,
                email: values.email, employee_id: values.employeeId || null, role: values.role, status: values.status,
                department: values.department, phone: values.phone,
                employee_type: values.employeeType, gender: values.gender,
                rate_of_pay: rateOfPay, start_date: values.startDate || null,
                avatar_url: avatarUrl }
            : e
        ))
        setModal(null)
      })
    } else {
      startTransition(async () => {
        let avatarUrl = currentAvatarUrl
        if (avatarFile) {
          const fd = new FormData()
          fd.append('file', avatarFile)
          const up = await uploadAvatar(fd)
          if ('error' in up) { setFormError(up.error); return }
          avatarUrl = up.url
        }
        const input: CreateEmployeeInput = {
          firstName: values.firstName, lastName: values.lastName,
          email: values.email, employeeId: values.employeeId, role: values.role,
          employeeType: values.employeeType, status: values.status,
          department: values.department, gender: values.gender,
          rateOfPay, startDate: values.startDate || null,
          avatarUrl, phone: values.phone,
        }
        const result = await createEmployee(input)
        if (result.error) { setFormError(result.error); return }
        const newEmp: EmployeeRow = {
          id: result.id!,
          first_name: values.firstName, last_name: values.lastName,
          email: values.email, employee_id: values.employeeId || null, role: values.role, status: values.status,
          phone: values.phone || null, department: values.department || null,
          employee_type: values.employeeType, gender: values.gender || null,
          rate_of_pay: rateOfPay, start_date: values.startDate || null,
          avatar_url: avatarUrl,
        }
        // Insert in the same order the server returns (by first name) and drop
        // any active search/filter/page so the new employee is actually on screen.
        setEmployees((prev) =>
          [...prev, newEmp].sort((a, b) => a.first_name.localeCompare(b.first_name))
        )
        setSearch('')
        setFilters(EMPTY_FILTERS)
        setPage(1)
        router.refresh() // keep the server-rendered list in sync for the next visit
        setModal({ type: 'success', name: `${values.firstName} ${values.lastName}`, id: result.id! })
      })
    }
  }

  return (
    <>
      {/* Modals */}
      {modal?.type === 'delete' && (
        <DeleteModal employee={modal.employee} onConfirm={confirmDelete} onCancel={() => setModal(null)} loading={isPending} />
      )}
      {modal?.type === 'form' && (
        <>
          <Overlay onClick={() => setModal(null)} />
          <EmployeeFormPanel employee={modal.employee} onSave={handleSave} onCancel={() => setModal(null)} loading={isPending} errorMsg={formError} />
        </>
      )}
      {toast && <Toast message={toast.message} variant={toast.type} />}
      {modal?.type === 'import' && (
        <ImportSummaryModal summary={modal.summary} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'success' && (
        <SuccessModal
          title="Employee added successfully"
          subtitle="They've been added to your team and can now access the system based on their role."
          actionLabel="View Employee"
          onAction={() => { setModal(null); router.push(`/admin/employees/${modal.id}`) }}
          onClose={() => setModal(null)}
        />
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        {/* Toolbar */}
        <div className="bg-white border-b border-gray-100 px-7 py-3 flex items-center gap-3">
          <ViewToggle
            value={view}
            onChange={setView}
            options={[
              { value: 'kanban', label: 'Kanban', icon: LayoutGrid },
              { value: 'list', label: 'List', icon: List },
            ]}
          />
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} placeholder="Search"
              className="w-full pl-8 pr-4 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D1B2A]/10 focus:border-[#0D1B2A]" />
          </div>
          <div className="flex-1" />
          <div className="relative">
            <FilterButton onClick={() => setFilterOpen((o) => !o)} active={filterOpen} count={activeFilterCount} />
            {filterOpen && (
              <FilterPopover
                filters={filters}
                departments={departments}
                onChange={(next) => { setFilters(next); setPage(1) }}
                onClose={() => setFilterOpen(false)}
              />
            )}
          </div>
          <div className="relative">
            <ImportExportButton onClick={() => setIoOpen((o) => !o)} active={ioOpen} />
            {ioOpen && (
              <ImportExportMenu
                exportCount={filtered.length}
                onClose={() => setIoOpen(false)}
                onImport={() => fileRef.current?.click()}
                onExport={handleExport}
                onTemplate={handleTemplate}
              />
            )}
            <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleImportFile} className="hidden" />
          </div>
          <button
            onClick={() => { setFormError(null); setModal({ type: 'form', employee: null }) }}
            className="flex items-center gap-1.5 px-4 py-2.5 text-xs text-white bg-[#0D1B2A] rounded-lg hover:bg-[#162437] transition-colors font-medium"
          >
            <Plus size={13} /> Add Employee
          </button>
        </div>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {view === 'kanban' ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {paginated.map((emp) => (
                <EmployeeCard
                  key={emp.id} emp={emp}
                  onEdit={() => handleEdit(emp)}
                  onDelete={() => handleDelete(emp)}
                  onView={() => handleView(emp)}
                />
              ))}
              {paginated.length === 0 && (
                <div className="col-span-4 py-20 text-center text-gray-400 text-sm">No employees found.</div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    {['Employee', 'Role', 'Department', 'Phone', 'Email', 'Status', ''].map((h) => (
                      <th key={h} className="text-left px-5 py-3 text-gray-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((emp) => {
                    const st = statusConfig[emp.status]
                    const color = avatarColor(emp.id)
                    return (
                      <tr key={emp.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            {emp.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={emp.avatar_url} alt={emp.first_name} className="w-7 h-7 rounded-full object-cover shrink-0" />
                            ) : (
                              <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-white text-[10px] font-semibold" style={{ backgroundColor: color }}>
                                {initials(emp.first_name, emp.last_name)}
                              </div>
                            )}
                            <span className="font-medium text-gray-800">{emp.first_name} {emp.last_name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-gray-600 capitalize">{emp.role}</td>
                        <td className="px-5 py-3 text-gray-600">{emp.department ?? '—'}</td>
                        <td className="px-5 py-3 text-gray-500">{emp.phone ?? '—'}</td>
                        <td className="px-5 py-3 text-gray-500">{emp.email}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                            {st.label}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleView(emp)} className="p-1 rounded hover:bg-gray-100 text-gray-400"><Eye size={13} /></button>
                            <button onClick={() => handleEdit(emp)} className="p-1 rounded hover:bg-gray-100 text-gray-400"><Pencil size={13} /></button>
                            <button onClick={() => handleDelete(emp)} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {paginated.length === 0 && (
                    <tr><td colSpan={7} className="px-5 py-10 text-center text-gray-400">No employees found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 text-xs text-gray-500">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-40">
                <ChevronLeft size={13} /> Previous
              </button>
              <span>Page {page} of {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-40">
                Next <ChevronRight size={13} />
              </button>
            </div>
          )}
        </main>
      </div>
    </>
  )
}
