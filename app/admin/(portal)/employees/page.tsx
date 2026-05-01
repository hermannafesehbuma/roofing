'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, Filter, Download, Plus, Eye, Pencil, Trash2,
  MoreHorizontal, LayoutGrid, List, Bell, ChevronLeft,
  ChevronRight, X, Check, Upload, CalendarDays,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
type Status = 'Active' | 'On Leave' | 'Inactive'

interface Employee {
  id: number
  name: string
  role: string
  department: string
  phone: string
  email: string
  status: Status
  avatarColor: string
}

interface FormValues {
  firstName: string
  lastName: string
  employeeId: string
  email: string
  employeeType: string
  employeeStatus: string
  department: string
  gender: string
  rateOfPay: string
  startDate: string
}

type Modal =
  | { type: 'delete'; employee: Employee }
  | { type: 'form'; employee: Employee | null }
  | { type: 'success'; name: string; id: number }

// ─── Seed data ────────────────────────────────────────────────────────────────
const seedEmployees: Employee[] = [
  { id: 1, name: 'Ben Simmons', role: 'Construction Assistant', department: 'Lead Roofer', phone: '+44 075 5044 605', email: 'ben.s@gmail.com', status: 'Active', avatarColor: '#3B82F6' },
  { id: 2, name: 'Sarah Mitchell', role: 'Construction Assistant', department: 'Lead Roofer', phone: '+44 075 5044 605', email: 'sarah.m@gmail.com', status: 'Active', avatarColor: '#8B5CF6' },
  { id: 3, name: 'Carlos Rivera', role: 'Construction Assistant', department: 'Lead Roofer', phone: '+44 075 5044 605', email: 'carlos.r@gmail.com', status: 'Active', avatarColor: '#10B981' },
  { id: 4, name: 'Tom Wallace', role: 'Construction Assistant', department: 'Lead Roofer', phone: '+44 075 5044 605', email: 'tom.w@gmail.com', status: 'Active', avatarColor: '#F59E0B' },
  { id: 5, name: 'Priya Nair', role: 'Construction Assistant', department: 'Lead Roofer', phone: '+44 075 5044 605', email: 'priya.n@gmail.com', status: 'On Leave', avatarColor: '#EF4444' },
  { id: 6, name: 'James Okafor', role: 'Construction Assistant', department: 'Lead Roofer', phone: '+44 075 5044 605', email: 'james.o@gmail.com', status: 'Active', avatarColor: '#06B6D4' },
  { id: 7, name: 'Nina Torres', role: 'Construction Assistant', department: 'Lead Roofer', phone: '+44 075 5044 605', email: 'nina.t@gmail.com', status: 'On Leave', avatarColor: '#6366F1' },
  { id: 8, name: 'Derek Pham', role: 'Construction Assistant', department: 'Lead Roofer', phone: '+44 075 5044 605', email: 'derek.p@gmail.com', status: 'Active', avatarColor: '#EC4899' },
]

const statusConfig: Record<Status, { label: string; dot: string; text: string; bg: string }> = {
  Active: { label: 'Active', dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
  'On Leave': { label: 'On Leave', dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' },
  Inactive: { label: 'Inactive', dot: 'bg-gray-400', text: 'text-gray-600', bg: 'bg-gray-100' },
}

const avatarColors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#6366F1', '#EC4899']

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
}

// ─── Overlay backdrop ─────────────────────────────────────────────────────────
function Overlay({ onClick }: { onClick: () => void }) {
  return <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-[1px]" onClick={onClick} />
}

// ─── Delete Modal ─────────────────────────────────────────────────────────────
function DeleteModal({ employee, onConfirm, onCancel }: {
  employee: Employee
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <>
      <Overlay onClick={onCancel} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center text-center">
          <button onClick={onCancel} className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">
            <X size={16} />
          </button>
          {/* Icon */}
          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-5">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <Trash2 size={20} className="text-red-500" />
            </div>
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Delete Employee</h2>
          <p className="text-sm text-gray-500 leading-relaxed mb-7">
            Are you sure want to delete this Employees<br />from Employees management?
          </p>
          <div className="flex gap-3 w-full">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-2.5 rounded-lg bg-[#0D1B2A] text-sm font-medium text-white hover:bg-[#162437] transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Success Modal ────────────────────────────────────────────────────────────
function SuccessModal({ name, id, onView, onClose }: {
  name: string
  id: number
  onView: () => void
  onClose: () => void
}) {
  return (
    <>
      <Overlay onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center text-center">
          <button onClick={onClose} className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">
            <X size={16} />
          </button>
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-5">
            <Check size={28} className="text-emerald-600" strokeWidth={2.5} />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Employee added successfully</h2>
          <p className="text-sm text-gray-500 leading-relaxed mb-7">
            They&apos;ve been added to your team and can now access the system based on their role.
          </p>
          <button
            onClick={onView}
            className="w-full py-3 rounded-lg bg-[#0D1B2A] text-sm font-medium text-white hover:bg-[#162437] transition-colors"
          >
            View Employee
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Form field helpers ───────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

const inputCls = (hasErr?: boolean) =>
  `w-full border rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0D1B2A]/10 focus:border-[#0D1B2A] transition-colors ${hasErr ? 'border-red-400 bg-red-50/30 focus:ring-red-200' : 'border-gray-200'}`

const selectCls = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-[#0D1B2A]/10 focus:border-[#0D1B2A] transition-colors'

// ─── Employee Form Modal ──────────────────────────────────────────────────────
function EmployeeFormModal({ employee, onSave, onCancel }: {
  employee: Employee | null
  onSave: (values: FormValues, imagePreview: string | null) => void
  onCancel: () => void
}) {
  const nameParts = employee?.name.split(' ') ?? []
  const [values, setValues] = useState<FormValues>({
    firstName: nameParts[0] ?? '',
    lastName: nameParts[1] ?? '',
    employeeId: employee ? `EMP${String(employee.id).padStart(6, '0')}` : '',
    email: employee?.email ?? '',
    employeeType: 'Contractor',
    employeeStatus: employee?.status ?? 'Active',
    department: employee?.department ?? '',
    gender: 'Male',
    rateOfPay: '$45/hr',
    startDate: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({})
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function set(field: keyof FormValues) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setValues((v) => ({ ...v, [field]: e.target.value }))
      if (errors[field]) setErrors((er) => { const n = { ...er }; delete n[field]; return n })
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  function handleSubmit() {
    const errs: typeof errors = {}
    if (!values.email.trim()) errs.email = 'Email is required'
    if (!values.firstName.trim()) errs.firstName = 'First name is required'
    if (Object.keys(errs).length) { setErrors(errs); return }
    onSave(values, imagePreview)
  }

  return (
    <>
      <Overlay onClick={onCancel} />
      <div className="fixed inset-y-0 right-0 z-50 flex">
        <div className="bg-white w-[480px] max-w-full h-full flex flex-col shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100 shrink-0">
            <h2 className="text-base font-bold text-gray-900">
              {employee ? 'Edit Employee' : 'Add New Employee'}
            </h2>
            <button onClick={onCancel} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto flex-1 px-7 py-6 space-y-4">
            {/* Row 1 */}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Full Name">
                <input placeholder="Full Name" value={values.firstName} onChange={set('firstName')}
                  className={inputCls(!!errors.firstName)} />
                {errors.firstName && <p className="text-red-500 text-[11px] mt-1">{errors.firstName}</p>}
              </Field>
              <Field label="Last Name">
                <input placeholder="Last Name" value={values.lastName} onChange={set('lastName')}
                  className={inputCls()} />
              </Field>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Employee ID">
                <input placeholder="Employee ID" value={values.employeeId} onChange={set('employeeId')}
                  className={inputCls()} />
              </Field>
              <Field label="Email">
                <input placeholder="Email" type="email" value={values.email} onChange={set('email')}
                  className={inputCls(!!errors.email)} />
                {errors.email && <p className="text-red-500 text-[11px] mt-1">{errors.email}</p>}
              </Field>
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Employee Type">
                <div className="relative">
                  <select value={values.employeeType} onChange={set('employeeType')} className={selectCls}>
                    <option value="">Select</option>
                    <option>Full-Time</option>
                    <option>Part-Time</option>
                    <option>Contractor</option>
                    <option>Subcontractor</option>
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                </div>
              </Field>
              <Field label="Employee Status">
                <div className="relative">
                  <select value={values.employeeStatus} onChange={set('employeeStatus')} className={selectCls}>
                    <option value="">Select</option>
                    <option>Active</option>
                    <option>On Leave</option>
                    <option>Inactive</option>
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                </div>
              </Field>
            </div>

            {/* Row 4 */}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Department">
                <div className="relative">
                  <select value={values.department} onChange={set('department')} className={selectCls}>
                    <option value="">Select</option>
                    <option>Lead Roofer</option>
                    <option>Field Ops</option>
                    <option>Engineering</option>
                    <option>Operations</option>
                    <option>Sales</option>
                    <option>Admin</option>
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                </div>
              </Field>
              <Field label="Gender">
                <input placeholder="Phone No" value={values.gender} onChange={set('gender')}
                  className={inputCls()} />
              </Field>
            </div>

            {/* Row 5 */}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Rate of Pay">
                <div className="relative">
                  <select value={values.rateOfPay} onChange={set('rateOfPay')} className={selectCls}>
                    <option value="">Select</option>
                    <option>$25/hr</option>
                    <option>$35/hr</option>
                    <option>$45/hr</option>
                    <option>$55/hr</option>
                    <option>$65/hr</option>
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                </div>
              </Field>
              <Field label="Start Date">
                <div className="relative">
                  <input type="date" value={values.startDate} onChange={set('startDate')}
                    className={`${inputCls()} pr-9`} />
                  <CalendarDays size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </Field>
            </div>

            {/* Upload Image */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Upload Image</label>
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-4">
                {imagePreview ? (
                  <div className="flex items-center gap-4">
                    <div className="relative w-14 h-14 rounded-full overflow-hidden shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        onClick={() => setImagePreview(null)}
                        className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
                      >
                        <X size={10} className="text-white" />
                      </button>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-700">Image uploaded</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">Click Upload to change</p>
                    </div>
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="ml-auto px-4 py-2 bg-[#0D1B2A] text-white text-xs font-medium rounded-lg hover:bg-[#162437] transition-colors"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                      <Upload size={16} className="text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700">Upload Image</p>
                      <p className="text-[11px] text-gray-400 mt-0.5 truncate">Name of the document • Max. 5MB</p>
                    </div>
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="px-4 py-2 bg-[#0D1B2A] text-white text-xs font-medium rounded-lg hover:bg-[#162437] transition-colors shrink-0"
                    >
                      Upload
                    </button>
                  </div>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-7 py-5 border-t border-gray-100 shrink-0">
            <button
              onClick={onCancel}
              className="px-6 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-6 py-2.5 rounded-lg bg-[#0D1B2A] text-sm font-medium text-white hover:bg-[#162437] transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Action Menu ──────────────────────────────────────────────────────────────
function ActionMenu({ onClose, onView, onEdit, onDelete }: {
  onClose: () => void
  onView: () => void
  onEdit: () => void
  onDelete: () => void
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
    <div ref={ref} className="absolute right-2 top-10 z-30 w-44 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5">
      <button onClick={() => { onView(); onClose() }}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
        <div className="w-8 h-8 rounded-full border-2 border-gray-200 flex items-center justify-center shrink-0">
          <Eye size={14} className="text-gray-500" />
        </div>
        View Detail
      </button>
      <button onClick={() => { onEdit(); onClose() }}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
        <div className="w-8 h-8 rounded-full border-2 border-gray-200 flex items-center justify-center shrink-0">
          <Pencil size={13} className="text-gray-500" />
        </div>
        Edit
      </button>
      <button onClick={() => { onDelete(); onClose() }}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors">
        <div className="w-8 h-8 rounded-full bg-red-50 border-2 border-red-100 flex items-center justify-center shrink-0">
          <Trash2 size={13} className="text-red-500" />
        </div>
        Delete
      </button>
    </div>
  )
}

// ─── Employee Card ────────────────────────────────────────────────────────────
function EmployeeCard({ emp, onEdit, onDelete, onView }: {
  emp: Employee
  onEdit: () => void
  onDelete: () => void
  onView: () => void
}) {
  const [open, setOpen] = useState(false)
  const st = statusConfig[emp.status]
  const close = useCallback(() => setOpen(false), [])

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-visible hover:shadow-md transition-shadow">
      <div className="h-36 relative flex items-center justify-center rounded-t-xl" style={{ backgroundColor: `${emp.avatarColor}18` }}>
        <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-md"
          style={{ backgroundColor: emp.avatarColor }}>
          {initials(emp.name)}
        </div>
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
          <h3 className="font-semibold text-gray-900 text-sm leading-tight">{emp.name}</h3>
          <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full inline-block ${st.dot}`} />
            {st.label}
          </span>
        </div>
        <p className="text-xs text-gray-500 mb-3">{emp.role}</p>
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Department</span>
            <span className="font-medium text-gray-700">{emp.department}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Phone No</span>
            <span className="font-medium text-gray-700">{emp.phone}</span>
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

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function EmployeesPage() {
  const router = useRouter()
  const [employees, setEmployees] = useState<Employee[]>(seedEmployees)
  const [view, setView] = useState<'kanban' | 'list'>('kanban')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState<Modal | null>(null)
  const totalPages = 10

  const filtered = employees.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.role.toLowerCase().includes(search.toLowerCase())
  )

  function handleDelete(emp: Employee) { setModal({ type: 'delete', employee: emp }) }
  function handleEdit(emp: Employee) { setModal({ type: 'form', employee: emp }) }
  function handleView(emp: Employee) { router.push(`/admin/employees/${emp.id}`) }

  function confirmDelete() {
    if (modal?.type !== 'delete') return
    setEmployees((prev) => prev.filter((e) => e.id !== modal.employee.id))
    setModal(null)
  }

  function handleSave(values: FormValues) {
    if (modal?.type !== 'form') return
    const fullName = `${values.firstName} ${values.lastName}`.trim()
    if (modal.employee) {
      setEmployees((prev) => prev.map((e) =>
        e.id === modal.employee!.id
          ? { ...e, name: fullName, email: values.email, department: values.department || e.department, status: (values.employeeStatus as Status) || e.status }
          : e
      ))
      setModal(null)
    } else {
      const newId = Math.max(...employees.map((e) => e.id)) + 1
      const newEmp: Employee = {
        id: newId,
        name: fullName,
        role: values.employeeType || 'Construction Assistant',
        department: values.department || 'Lead Roofer',
        phone: '',
        email: values.email,
        status: (values.employeeStatus as Status) || 'Active',
        avatarColor: avatarColors[newId % avatarColors.length],
      }
      setEmployees((prev) => [...prev, newEmp])
      setModal({ type: 'success', name: fullName, id: newId })
    }
  }

  return (
    <>
      {/* ── Modals ── */}
      {modal?.type === 'delete' && (
        <DeleteModal employee={modal.employee} onConfirm={confirmDelete} onCancel={() => setModal(null)} />
      )}
      {modal?.type === 'form' && (
        <EmployeeFormModal employee={modal.employee} onSave={handleSave} onCancel={() => setModal(null)} />
      )}
      {modal?.type === 'success' && (
        <SuccessModal
          name={modal.name}
          id={modal.id}
          onView={() => { setModal(null); router.push(`/admin/employees/${modal.id}`) }}
          onClose={() => setModal(null)}
        />
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-100 px-7 py-4 flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-base font-semibold text-gray-900">Employees</h1>
            <p className="text-xs text-gray-400 mt-0.5">Manage all your clients, projects, and invoices in one place.</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50">
              <Bell size={14} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
            </button>
            <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                <span className="text-white text-[10px] font-semibold">JD</span>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-800 leading-none">John Doe</p>
                <p className="text-[10px] text-gray-400">Admin</p>
              </div>
            </div>
          </div>
        </header>

        {/* Toolbar */}
        <div className="bg-white border-b border-gray-100 px-7 py-3 flex items-center gap-3">
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5 gap-0.5">
            <button onClick={() => setView('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === 'kanban' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              <LayoutGrid size={13} /> Kanban
            </button>
            <button onClick={() => setView('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === 'list' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              <List size={13} /> List
            </button>
          </div>
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search"
              className="w-full pl-8 pr-4 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D1B2A]/10 focus:border-[#0D1B2A]" />
          </div>
          <div className="flex-1" />
          <button className="flex items-center gap-1.5 px-3 py-2 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Filter size={13} /> Filter
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Download size={13} /> Import/Export
          </button>
          <button
            onClick={() => setModal({ type: 'form', employee: null })}
            className="flex items-center gap-1.5 px-4 py-2 text-xs text-white bg-[#0D1B2A] rounded-lg hover:bg-[#162437] transition-colors font-medium"
          >
            <Plus size={13} /> Add Employee
          </button>
        </div>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {view === 'kanban' ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((emp) => (
                <EmployeeCard
                  key={emp.id}
                  emp={emp}
                  onEdit={() => handleEdit(emp)}
                  onDelete={() => handleDelete(emp)}
                  onView={() => handleView(emp)}
                />
              ))}
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
                  {filtered.map((emp) => {
                    const st = statusConfig[emp.status]
                    return (
                      <tr key={emp.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-white text-[10px] font-semibold" style={{ backgroundColor: emp.avatarColor }}>
                              {initials(emp.name)}
                            </div>
                            <span className="font-medium text-gray-800">{emp.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-gray-600">{emp.role}</td>
                        <td className="px-5 py-3 text-gray-600">{emp.department}</td>
                        <td className="px-5 py-3 text-gray-500">{emp.phone}</td>
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
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between mt-6 text-xs text-gray-500">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-40">
              <ChevronLeft size={13} /> Previous
            </button>
            <div className="flex items-center gap-1">
              {[1, 2, 3, '...', 8, 9, 10].map((p, i) => (
                <button key={i} onClick={() => typeof p === 'number' && setPage(p)} disabled={p === '...'}
                  className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors text-xs ${p === page ? 'bg-[#0D1B2A] text-white font-medium' : p === '...' ? 'text-gray-400 cursor-default' : 'text-gray-600 hover:bg-gray-100'}`}>
                  {p}
                </button>
              ))}
            </div>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-40">
              Next <ChevronRight size={13} />
            </button>
          </div>
        </main>
      </div>
    </>
  )
}
