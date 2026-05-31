'use client'

import React, { useState, useRef, useEffect, useCallback, useTransition, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, Filter, Plus, Eye, Pencil, Trash2,
  MoreHorizontal, X, Check, ShieldAlert, FileText,
  UserCheck, AlertTriangle, Key, Shield, User,
  Bell, ChevronDown
} from 'lucide-react'
import UserHeaderBadge from '@/app/components/ui/UserHeaderBadge'
import {
  type SettingsStats, type Permission, type AuditLogEntry,
  getSettingsStats, savePermissions
} from './actions'
import {
  createEmployee, updateEmployee, deleteEmployee, uploadAvatar,
  type EmployeeRow, type CreateEmployeeInput, type UpdateEmployeeInput
} from '../employees/actions'
import { EmployeeFormPanel, type FormValues } from '../employees/EmployeeFormPanel'

// --- Color Helpers ---
const avatarColors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#6366F1', '#EC4899']

function initials(first: string, last: string) {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase()
}

function avatarColor(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash)
  return avatarColors[Math.abs(hash) % avatarColors.length]
}

const statusConfig: Record<string, { label: string; dot: string; text: string; bg: string }> = {
  active:   { label: 'Active',    dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50/50' },
  on_leave: { label: 'On Leave',  dot: 'bg-amber-500',   text: 'text-amber-700',   bg: 'bg-amber-50/50'   },
  inactive: { label: 'Inactive',  dot: 'bg-red-400',     text: 'text-red-600',     bg: 'bg-red-50/50'     },
}

// --- Invite Drawer ---
function InviteDrawer({ onClose, onSave, loading, errorMsg }: {
  onClose: () => void
  onSave: (values: FormValues) => void
  loading: boolean
  errorMsg: string | null
}) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'admin' | 'manager' | 'technician'>('technician')
  const [dept, setDept] = useState('Sales')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName || !email) return
    onSave({
      firstName,
      lastName,
      email,
      role,
      employeeType: 'full_time',
      status: 'active',
      department: dept,
      gender: 'Other',
      rateOfPay: '45',
      startDate: new Date().toISOString().split('T')[0],
      phone: ''
    })
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-[1px]" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 bg-white w-[480px] max-w-full h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Invite Staff</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-7 space-y-6">
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-xs text-red-700">
              {errorMsg}
            </div>
          )}

          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Staff Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">First Name</label>
                <input
                  type="text"
                  placeholder="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0D1B2A]/10 focus:border-[#0D1B2A]"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Last Name</label>
                <input
                  type="text"
                  placeholder="Last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0D1B2A]/10 focus:border-[#0D1B2A]"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Email</label>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0D1B2A]/10 focus:border-[#0D1B2A]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Role</label>
            <div className="relative">
              <select
                value={role}
                onChange={(e) => {
                  const r = e.target.value as 'admin' | 'manager' | 'technician'
                  setRole(r)
                  if (r === 'admin') setDept('Admin')
                  else if (r === 'manager') setDept('Operations')
                  else setDept('Field Ops')
                }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-[#0D1B2A]/10 focus:border-[#0D1B2A]"
              >
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="technician">Staff (Technician)</option>
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <ChevronDown size={14} />
              </div>
            </div>
          </div>
        </form>

        <div className="flex items-center justify-end gap-3 px-7 py-5 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-2 rounded-lg bg-[#0D1B2A] text-sm font-medium text-white hover:bg-[#162437] transition-colors disabled:opacity-60"
          >
            {loading ? 'Sending...' : 'Send Invitation'}
          </button>
        </div>
      </div>
    </>
  )
}

// --- Action Menu ---
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
    <div ref={ref} className="absolute right-2 top-8 z-30 w-40 bg-white rounded-xl shadow-xl border border-gray-100 py-1">
      <button onClick={() => { onView(); onClose() }}
        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
        <Eye size={13} className="text-gray-400" />
        View Profile
      </button>
      <button onClick={() => { onEdit(); onClose() }}
        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
        <Pencil size={13} className="text-gray-400" />
        Edit Profile
      </button>
      <button onClick={() => { onDelete(); onClose() }}
        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors border-t border-gray-50">
        <Trash2 size={13} className="text-red-500" />
        Delete
      </button>
    </div>
  )
}

// --- Delete Modal ---
function DeleteModal({ employee, onConfirm, onCancel, loading }: {
  employee: EmployeeRow
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-[1px]" onClick={onCancel} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center text-center relative">
          <button onClick={onCancel} className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">
            <X size={16} />
          </button>
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-5">
            <Trash2 size={24} className="text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Delete Employee</h2>
          <p className="text-sm text-gray-500 leading-relaxed mb-7">
            Are you sure want to delete this Employees from Employees management?
          </p>
          <div className="flex gap-3 w-full">
            <button onClick={onCancel}
              className="flex-1 py-2.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button onClick={onConfirm} disabled={loading}
              className="flex-1 py-2.5 rounded-lg bg-[#0D1B2A] text-xs font-semibold text-white hover:bg-[#162437] transition-colors disabled:opacity-60">
              {loading ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// --- Filter Popover ---
interface FilterState {
  status: string[]
  role: string[]
}

function FilterPopover({ activeFilters, onApply, onClose }: {
  activeFilters: FilterState
  onApply: (filters: FilterState) => void
  onClose: () => void
}) {
  const popoverRef = useRef<HTMLDivElement>(null)
  const [localFilters, setLocalFilters] = useState<FilterState>({ ...activeFilters })

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose()
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [onClose])

  const toggleStatus = (status: string) => {
    setLocalFilters(prev => {
      const isSelected = prev.status.includes(status)
      return {
        ...prev,
        status: isSelected ? prev.status.filter(s => s !== status) : [...prev.status, status]
      }
    })
  }

  const toggleRole = (role: string) => {
    setLocalFilters(prev => {
      const isSelected = prev.role.includes(role)
      return {
        ...prev,
        role: isSelected ? prev.role.filter(r => r !== role) : [...prev.role, role]
      }
    })
  }

  const handleClear = () => {
    setLocalFilters({ status: [], role: [] })
  }

  const handleApply = () => {
    onApply(localFilters)
  }

  return (
    <div ref={popoverRef} className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 p-5 z-50">
      <div className="mb-5">
        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2.5">Status</h4>
        <div className="flex flex-wrap gap-2">
          {['Active', 'Inactive'].map((s) => {
            const val = s.toLowerCase()
            const active = localFilters.status.includes(val)
            return (
              <button
                key={s}
                onClick={() => toggleStatus(val)}
                className={`px-4 py-1.5 text-xs rounded-full border transition-colors ${
                  active
                    ? 'bg-[#0D1B2A]/5 border-[#0D1B2A]/20 text-[#0D1B2A] font-semibold'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {s}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mb-6">
        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2.5">Role</h4>
        <div className="flex flex-wrap gap-2">
          {['Admin', 'Manager', 'Staff'].map((r) => {
            const val = r === 'Staff' ? 'technician' : r.toLowerCase()
            const active = localFilters.role.includes(val)
            return (
              <button
                key={r}
                onClick={() => toggleRole(val)}
                className={`px-4 py-1.5 text-xs rounded-full border transition-colors ${
                  active
                    ? 'bg-[#0D1B2A]/5 border-[#0D1B2A]/20 text-[#0D1B2A] font-semibold'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {r}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex gap-2 pt-3 border-t border-gray-50">
        <button
          onClick={handleClear}
          className="flex-1 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors"
        >
          Clear All
        </button>
        <button
          onClick={handleApply}
          className="flex-1 py-2 text-xs font-semibold text-white bg-[#0D1B2A] hover:bg-[#162437] rounded-lg transition-colors"
        >
          Apply
        </button>
      </div>
    </div>
  )
}

// --- Main Settings Component ---
interface SettingsClientProps {
  initialEmployees: EmployeeRow[]
  stats: SettingsStats
  initialPermissions: Permission[]
  initialAuditLogs: AuditLogEntry[]
}

export function SettingsClient({
  initialEmployees,
  stats: initialStats,
  initialPermissions,
  initialAuditLogs
}: SettingsClientProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'Staff Directory' | 'Permissions' | 'Audit log' | 'Security'>('Staff Directory')
  const [isPending, startTransition] = useTransition()
  const [employees, setEmployees] = useState<EmployeeRow[]>(initialEmployees)
  const [stats, setStats] = useState<SettingsStats>(initialStats)

  // Filters/Search
  const [search, setSearch] = useState('')
  const [showFilter, setShowFilter] = useState(false)
  const [filters, setFilters] = useState<FilterState>({ status: [], role: [] })

  // Modal / drawer state
  const [drawerType, setDrawerType] = useState<'invite' | 'edit' | null>(null)
  const [selectedEmp, setSelectedEmp] = useState<EmployeeRow | null>(null)
  const [deleteEmp, setDeleteEmp] = useState<EmployeeRow | null>(null)
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Permissions state
  const [permissions, setPermissions] = useState<Permission[]>(initialPermissions)

  useEffect(() => {
    const stored = localStorage.getItem('peak_permissions')
    if (stored) {
      try {
        setPermissions(JSON.parse(stored))
      } catch (e) {
        console.error(e)
      }
    }
  }, [])

  // Audit log state
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(initialAuditLogs)

  // Account state (Security/Profile)
  const [profileName, setProfileName] = useState('John Doe')
  const [profileEmail, setProfileEmail] = useState('john.doe@email.com')
  const [mfaEnabled, setMfaEnabled] = useState(false)

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  // Refresh Stats
  const refreshStats = async () => {
    const updated = await getSettingsStats()
    setStats(updated)
  }

  // Filter logic
  const filtered = employees.filter((e) => {
    const q = search.toLowerCase()
    const matchesSearch =
      e.first_name.toLowerCase().includes(q) ||
      e.last_name.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q) ||
      (e.department ?? '').toLowerCase().includes(q)

    const matchesStatus = filters.status.length === 0 || filters.status.includes(e.status)
    const matchesRole = filters.role.length === 0 || filters.role.includes(e.role)

    return matchesSearch && matchesStatus && matchesRole
  })

  // Delete flow
  const confirmDelete = () => {
    if (!deleteEmp) return
    const id = deleteEmp.id
    const fullName = `${deleteEmp.first_name} ${deleteEmp.last_name}`
    startTransition(async () => {
      const result = await deleteEmployee(id)
      if (result.error) {
        showToast(result.error, 'error')
        return
      }
      setEmployees((prev) => prev.filter((e) => e.id !== id))
      setDeleteEmp(null)
      showToast(`Employee(${fullName}) deleted successfully`)
      refreshStats()
    })
  }

  // Invite flow
  const handleInvite = (values: FormValues) => {
    setErrorMsg(null)
    startTransition(async () => {
      const input: CreateEmployeeInput = {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        role: values.role,
        employeeType: 'full_time',
        status: 'active',
        department: values.department,
        gender: 'Other',
        rateOfPay: 45,
        startDate: values.startDate || null,
        avatarUrl: null,
        phone: ''
      }
      const result = await createEmployee(input)
      if (result.error) {
        setErrorMsg(result.error)
        return
      }
      const newEmp: EmployeeRow = {
        id: result.id!,
        first_name: values.firstName,
        last_name: values.lastName,
        email: values.email,
        role: values.role,
        status: 'active',
        phone: null,
        department: values.department || null,
        employee_type: 'full_time',
        gender: 'Other',
        rate_of_pay: 45,
        start_date: values.startDate || null,
        avatar_url: null
      }
      setEmployees((prev) => [newEmp, ...prev])
      setDrawerType(null)
      showToast(`Invitation sent to ${values.email} successfully`)
      refreshStats()
      
      // Update Audit Logs locally
      setAuditLogs(prev => [
        {
          id: crypto.randomUUID(),
          user: 'John Doe',
          email: 'john.doe@email.com',
          action: `Invited staff member (${values.firstName} ${values.lastName})`,
          module: 'Staff Directory',
          timestamp: 'Just now',
          ipAddress: '192.168.1.45'
        },
        ...prev
      ])
    })
  }

  // Edit flow
  const handleEditSave = (values: FormValues, avatarFile: File | null, currentAvatarUrl: string | null) => {
    if (!selectedEmp) return
    setErrorMsg(null)
    startTransition(async () => {
      let avatarUrl = currentAvatarUrl
      if (avatarFile) {
        const fd = new FormData()
        fd.append('file', avatarFile)
        const up = await uploadAvatar(fd)
        if ('error' in up) {
          setErrorMsg(up.error)
          return
        }
        avatarUrl = up.url
      }
      const rateOfPay = values.rateOfPay ? parseFloat(values.rateOfPay) : null
      const input: UpdateEmployeeInput = {
        id: selectedEmp.id,
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        role: values.role as any,
        employeeType: values.employeeType,
        status: values.status,
        department: values.department,
        gender: values.gender,
        rateOfPay,
        startDate: values.startDate || null,
        avatarUrl,
        phone: values.phone
      }
      const result = await updateEmployee(input)
      if (result.error) {
        setErrorMsg(result.error)
        return
      }
      setEmployees((prev) => prev.map((e) => e.id === selectedEmp.id ? {
        ...e,
        first_name: values.firstName,
        last_name: values.lastName,
        email: values.email,
        role: values.role as any,
        status: values.status,
        department: values.department,
        phone: values.phone || null,
        employee_type: values.employeeType,
        gender: values.gender || null,
        rate_of_pay: rateOfPay,
        start_date: values.startDate || null,
        avatar_url: avatarUrl
      } : e))
      setDrawerType(null)
      setSelectedEmp(null)
      showToast(`Employee details updated successfully`)
      refreshStats()
    })
  }

  // Permissions change
  const handlePermissionToggle = (permId: string, role: 'admin' | 'manager' | 'staff' | 'client') => {
    setPermissions(prev => prev.map(p => {
      if (p.id === permId) {
        return {
          ...p,
          [role]: !p[role]
        }
      }
      return p
    }))
  }

  const handleSavePermissions = async () => {
    startTransition(async () => {
      await savePermissions(permissions)
      localStorage.setItem('peak_permissions', JSON.stringify(permissions))
      window.dispatchEvent(new Event('permissions-changed'))
      showToast('Permissions configuration updated successfully')
      setAuditLogs(prev => [
        {
          id: crypto.randomUUID(),
          user: 'John Doe',
          email: 'john.doe@email.com',
          action: 'Updated system security permissions',
          module: 'Permissions',
          timestamp: 'Just now',
          ipAddress: '192.168.1.45'
        },
        ...prev
      ])
    })
  }

  return (
    <>
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-[#E8F8F0] border border-[#B3E8CE] rounded-lg px-4 py-3 flex items-center gap-3 shadow-lg animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="w-5 h-5 rounded-full bg-[#2E7D32] flex items-center justify-center shrink-0">
            <Check size={12} className="text-white" strokeWidth={3} />
          </div>
          <span className="text-xs font-semibold text-[#1B5E20]">{toast.message}</span>
        </div>
      )}

      {/* Invite Drawer */}
      {drawerType === 'invite' && (
        <InviteDrawer
          onClose={() => setDrawerType(null)}
          onSave={handleInvite}
          loading={isPending}
          errorMsg={errorMsg}
        />
      )}

      {/* Edit Drawer */}
      {drawerType === 'edit' && selectedEmp && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-[1px]" onClick={() => { setDrawerType(null); setSelectedEmp(null) }} />
          <EmployeeFormPanel
            employee={selectedEmp}
            onSave={handleEditSave}
            onCancel={() => { setDrawerType(null); setSelectedEmp(null) }}
            loading={isPending}
            errorMsg={errorMsg}
          />
        </>
      )}

      {/* Delete Modal */}
      {deleteEmp && (
        <DeleteModal
          employee={deleteEmp}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteEmp(null)}
          loading={isPending}
        />
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

        {/* Dashboard Panels */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {/* Stats Cards */}
          {activeTab === 'Staff Directory' && (
            <div className="grid grid-cols-4 gap-4">
              {[
                { title: 'Total Staff', count: stats.totalStaff },
                { title: 'Active Members', count: stats.activeMembers },
                { title: 'Managers', count: stats.managers },
                { title: 'Inactive', count: stats.inactive }
              ].map((card) => (
                <div key={card.title} className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                  <p className="text-xs text-gray-400 font-medium">{card.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1.5">{card.count}</p>
                </div>
              ))}
            </div>
          )}

          {/* Sub Navigation Tabs */}
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="flex border-b border-gray-100 px-6">
              {(['Staff Directory', 'Permissions', 'Audit log', 'Security'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-1 py-4 mr-8 text-xs font-bold border-b-2 transition-colors -mb-px ${
                    activeTab === tab
                      ? 'border-[#0D1B2A] text-[#0D1B2A]'
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* TAB CONTENT */}
            <div className="p-6">
              {/* STAFF DIRECTORY TAB */}
              {activeTab === 'Staff Directory' && (
                <div className="space-y-4">
                  {/* Toolbar */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-gray-800">Staff Directory</h3>
                      <p className="text-xs text-gray-400 mt-0.5">{filtered.length} members across all roles</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative w-56">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D1B2A]/10 focus:border-[#0D1B2A]"
                        />
                      </div>
                      <div className="relative">
                        <button
                          onClick={() => setShowFilter(!showFilter)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-medium bg-white"
                        >
                          <Filter size={13} /> Filter
                        </button>
                        {showFilter && (
                          <FilterPopover
                            activeFilters={filters}
                            onApply={(nextFilters) => {
                              setFilters(nextFilters)
                              setShowFilter(false)
                            }}
                            onClose={() => setShowFilter(false)}
                          />
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setErrorMsg(null)
                          setDrawerType('invite')
                        }}
                        className="flex items-center gap-1.5 px-4 py-1.5 text-xs text-white bg-[#0D1B2A] hover:bg-[#162437] rounded-lg transition-colors font-semibold"
                      >
                        <Plus size={13} /> Invite Staff
                      </button>
                    </div>
                  </div>

                  {/* Staff Table */}
                  <div className="border border-gray-100 rounded-xl overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50/60">
                          {['Employee', 'Role', 'Status', 'Joined', ''].map((h) => (
                            <th key={h} className="text-left px-5 py-3 text-gray-400 font-semibold uppercase tracking-wider text-[10px]">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((emp) => {
                          const st = statusConfig[emp.status] ?? statusConfig.active
                          const color = avatarColor(emp.id)
                          const roleLabel = emp.role === 'admin' ? 'Admin' : emp.role === 'manager' ? 'Manager' : 'Staff'
                          const deptLabel = emp.department ?? 'Field Operations'
                          const joinedDate = emp.start_date
                            ? new Date(emp.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                            : 'Jan 2023'

                          return (
                            <tr key={emp.id} className="border-b border-gray-50 hover:bg-gray-50/20 transition-colors">
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-3">
                                  {emp.avatar_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={emp.avatar_url} alt={emp.first_name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                                  ) : (
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold" style={{ backgroundColor: color }}>
                                      {initials(emp.first_name, emp.last_name)}
                                    </div>
                                  )}
                                  <div>
                                    <span className="font-semibold text-gray-800 block">{emp.first_name} {emp.last_name}</span>
                                    <span className="text-[10px] text-gray-400 block mt-0.5">{deptLabel}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-3.5 text-gray-600 font-medium">{roleLabel}</td>
                              <td className="px-5 py-3.5">
                                <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                                  {st.label}
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-gray-500 font-medium">{joinedDate}</td>
                              <td className="px-5 py-3.5 relative">
                                <button
                                  onClick={() => setActiveMenuId(activeMenuId === emp.id ? null : emp.id)}
                                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"
                                >
                                  <MoreHorizontal size={14} />
                                </button>
                                {activeMenuId === emp.id && (
                                  <ActionMenu
                                    onClose={() => setActiveMenuId(null)}
                                    onView={() => router.push(`/admin/settings/employees/${emp.id}`)}
                                    onEdit={() => {
                                      setSelectedEmp(emp)
                                      setErrorMsg(null)
                                      setDrawerType('edit')
                                    }}
                                    onDelete={() => setDeleteEmp(emp)}
                                  />
                                )}
                              </td>
                            </tr>
                          )
                        })}
                        {filtered.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-5 py-12 text-center text-gray-400">
                              No staff members found matching criteria.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* PERMISSIONS TAB */}
              {activeTab === 'Permissions' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-gray-800">Permissions Matrix</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Control which user roles have access to specific modules</p>
                  </div>

                  <div className="border border-gray-100 rounded-xl overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50/60 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                          <th className="text-left px-6 py-4">Features</th>
                          <th className="text-center px-4 py-4 w-28">Admin</th>
                          <th className="text-center px-4 py-4 w-28">Manager</th>
                          <th className="text-center px-4 py-4 w-28">Staff</th>
                          <th className="text-center px-4 py-4 w-28">Client</th>
                        </tr>
                      </thead>
                      <tbody>
                        {['Projects', 'Staff', 'Finance', 'Task', 'CRM'].map((category) => {
                          const categoryPerms = permissions.filter(p => p.category === category)
                          return (
                            <Fragment key={category}>
                              {/* Category Header Row */}
                              <tr className="bg-gray-50/30 border-b border-gray-100">
                                <td colSpan={5} className="px-6 py-2.5 font-bold text-[10px] text-gray-400 uppercase tracking-wider bg-gray-50/40">
                                  {category}
                                </td>
                              </tr>
                              {categoryPerms.map((p) => (
                                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/20 transition-colors">
                                  <td className="px-8 py-3.5 font-medium text-xs text-gray-700">
                                    {p.name}
                                  </td>
                                  <td className="text-center px-4 py-3.5">
                                    <input
                                      type="checkbox"
                                      checked={p.admin}
                                      onChange={() => handlePermissionToggle(p.id, 'admin')}
                                      className="rounded border-gray-300 text-[#0D1B2A] focus:ring-[#0D1B2A] w-3.5 h-3.5 cursor-pointer"
                                    />
                                  </td>
                                  <td className="text-center px-4 py-3.5">
                                    <input
                                      type="checkbox"
                                      checked={p.manager}
                                      onChange={() => handlePermissionToggle(p.id, 'manager')}
                                      className="rounded border-gray-300 text-[#0D1B2A] focus:ring-[#0D1B2A] w-3.5 h-3.5 cursor-pointer"
                                    />
                                  </td>
                                  <td className="text-center px-4 py-3.5">
                                    <input
                                      type="checkbox"
                                      checked={p.staff}
                                      onChange={() => handlePermissionToggle(p.id, 'staff')}
                                      className="rounded border-gray-300 text-[#0D1B2A] focus:ring-[#0D1B2A] w-3.5 h-3.5 cursor-pointer"
                                    />
                                  </td>
                                  <td className="text-center px-4 py-3.5">
                                    <input
                                      type="checkbox"
                                      checked={p.client}
                                      onChange={() => handlePermissionToggle(p.id, 'client')}
                                      className="rounded border-gray-300 text-[#0D1B2A] focus:ring-[#0D1B2A] w-3.5 h-3.5 cursor-pointer"
                                    />
                                  </td>
                                </tr>
                              ))}
                            </Fragment>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      onClick={handleSavePermissions}
                      disabled={isPending}
                      className="px-6 py-2 bg-[#0D1B2A] hover:bg-[#162437] text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                      {isPending ? 'Saving...' : 'Save Permissions'}
                    </button>
                  </div>
                </div>
              )}

              {/* AUDIT LOG TAB */}
              {activeTab === 'Audit log' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-gray-800">Security Audit Log</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Chronological record of recent administrative security operations</p>
                  </div>

                  <div className="border border-gray-100 rounded-xl overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50/60 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                          <th className="text-left px-5 py-3.5">User</th>
                          <th className="text-left px-5 py-3.5">Action</th>
                          <th className="text-left px-5 py-3.5">Module</th>
                          <th className="text-left px-5 py-3.5">Timestamp</th>
                          <th className="text-left px-5 py-3.5">IP Address</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditLogs.map((log) => {
                          const initialsText = log.user.split(' ').map(n => n[0]).join('').toUpperCase()
                          return (
                            <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50/20 transition-colors">
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0 text-slate-600 text-[10px] font-bold">
                                    {initialsText}
                                  </div>
                                  <div>
                                    <span className="font-semibold text-gray-800 block">{log.user}</span>
                                    <span className="text-[10px] text-gray-400 block">{log.email}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-3.5 text-gray-700 font-medium">{log.action}</td>
                              <td className="px-5 py-3.5">
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-semibold uppercase tracking-wide">
                                  {log.module}
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-gray-500">{log.timestamp}</td>
                              <td className="px-5 py-3.5 text-gray-500 font-mono">{log.ipAddress}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SECURITY / ACCOUNT TAB */}
              {activeTab === 'Security' && (
                <div className="space-y-8 max-w-2xl">
                  {/* Account Settings */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-gray-800">Account Details</h3>
                      <p className="text-xs text-gray-400 mt-0.5">Manage your personal account coordinates and communications</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">Full Name</label>
                        <input
                          type="text"
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0D1B2A]/10 focus:border-[#0D1B2A]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">Email Address</label>
                        <input
                          type="email"
                          value={profileEmail}
                          onChange={(e) => setProfileEmail(e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0D1B2A]/10 focus:border-[#0D1B2A]"
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => showToast('Account details updated successfully')}
                      className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Update Details
                    </button>
                  </div>

                  <hr className="border-gray-100" />

                  {/* Password reset */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-gray-800">Change Password</h3>
                      <p className="text-xs text-gray-400 mt-0.5">Ensure your account is using a long, random password to stay secure</p>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">Current Password</label>
                        <input
                          type="password"
                          className="w-full max-w-sm border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D1B2A]/10 focus:border-[#0D1B2A]"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4 max-w-lg">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1.5">New Password</label>
                          <input
                            type="password"
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D1B2A]/10 focus:border-[#0D1B2A]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1.5">Confirm New Password</label>
                          <input
                            type="password"
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D1B2A]/10 focus:border-[#0D1B2A]"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => showToast('Password updated successfully')}
                      className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Update Password
                    </button>
                  </div>

                  <hr className="border-gray-100" />

                  {/* Two-Factor */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-gray-800">Two-Factor Authentication (2FA)</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Add an extra layer of security using an authenticator application</p>
                      </div>
                      <button
                        onClick={() => {
                          setMfaEnabled(!mfaEnabled)
                          showToast(`Two-Factor Authentication ${!mfaEnabled ? 'enabled' : 'disabled'} successfully`)
                        }}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          mfaEnabled ? 'bg-[#0D1B2A]' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            mfaEnabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
