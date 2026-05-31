'use client'

import { useState, useRef, useEffect, useCallback, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, Filter, Download, Plus, Eye, Pencil, Trash2,
  MoreHorizontal, LayoutGrid, List, Bell, ChevronLeft,
  ChevronRight, X, Check,
} from 'lucide-react'
import UserHeaderBadge from '@/app/components/ui/UserHeaderBadge'
import {
  createEmployee, updateEmployee, deleteEmployee, uploadAvatar,
  type EmployeeRow, type CreateEmployeeInput, type UpdateEmployeeInput,
} from './actions'
import { EmployeeFormPanel, type FormValues } from './EmployeeFormPanel'

// ─── Types ────────────────────────────────────────────────────────────────────
type Status = 'active' | 'on_leave' | 'inactive'

type Modal =
  | { type: 'delete'; employee: EmployeeRow }
  | { type: 'form'; employee: EmployeeRow | null }
  | { type: 'success'; name: string; id: string }

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
    <>
      <Overlay onClick={onCancel} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center text-center relative">
          <button onClick={onCancel} className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">
            <X size={16} />
          </button>
          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-5">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <Trash2 size={20} className="text-red-500" />
            </div>
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Delete Employee</h2>
          <p className="text-sm text-gray-500 leading-relaxed mb-7">
            Are you sure want to delete <span className="font-medium text-gray-800">{employee.first_name} {employee.last_name}</span> from Employees management?
          </p>
          <div className="flex gap-3 w-full">
            <button onClick={onCancel}
              className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button onClick={onConfirm} disabled={loading}
              className="flex-1 py-2.5 rounded-lg bg-[#0D1B2A] text-sm font-medium text-white hover:bg-[#162437] transition-colors disabled:opacity-60">
              {loading ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Success Modal ────────────────────────────────────────────────────────────
function SuccessModal({ name, id, onView, onClose }: {
  name: string; id: string; onView: () => void; onClose: () => void
}) {
  return (
    <>
      <Overlay onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center text-center relative">
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
          <button onClick={onView}
            className="w-full py-3 rounded-lg bg-[#0D1B2A] text-sm font-medium text-white hover:bg-[#162437] transition-colors">
            View Employee
          </button>
        </div>
      </div>
    </>
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
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-md"
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
  const pageSize = 20

  const filtered = employees.filter((e) => {
    const q = search.toLowerCase()
    return (
      e.first_name.toLowerCase().includes(q) ||
      e.last_name.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q) ||
      (e.department ?? '').toLowerCase().includes(q)
    )
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  function handleDelete(emp: EmployeeRow) { setModal({ type: 'delete', employee: emp }) }
  function handleEdit(emp: EmployeeRow) { setFormError(null); setModal({ type: 'form', employee: emp }) }
  function handleView(emp: EmployeeRow) { router.push(`/admin/employees/${emp.id}`) }

  function confirmDelete() {
    if (modal?.type !== 'delete') return
    const id = modal.employee.id
    startTransition(async () => {
      const result = await deleteEmployee(id)
      if (result.error) {
        alert(`Delete failed: ${result.error}`)
        return
      }
      setEmployees((prev) => prev.filter((e) => e.id !== id))
      setModal(null)
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
          email: values.email, role: values.role,
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
                email: values.email, role: values.role, status: values.status,
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
          email: values.email, role: values.role,
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
          email: values.email, role: values.role, status: values.status,
          phone: values.phone || null, department: values.department || null,
          employee_type: values.employeeType, gender: values.gender || null,
          rate_of_pay: rateOfPay, start_date: values.startDate || null,
          avatar_url: avatarUrl,
        }
        setEmployees((prev) => [newEmp, ...prev])
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
      {modal?.type === 'success' && (
        <SuccessModal
          name={modal.name} id={modal.id}
          onView={() => { setModal(null); router.push(`/admin/employees/${modal.id}`) }}
          onClose={() => setModal(null)}
        />
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
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
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} placeholder="Search"
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
            onClick={() => { setFormError(null); setModal({ type: 'form', employee: null }) }}
            className="flex items-center gap-1.5 px-4 py-2 text-xs text-white bg-[#0D1B2A] rounded-lg hover:bg-[#162437] transition-colors font-medium"
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
