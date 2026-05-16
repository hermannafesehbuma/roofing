'use client'

import { useState, useRef } from 'react'
import { X, Upload, CalendarDays } from 'lucide-react'
import type { EmployeeRow } from './actions'

export interface FormValues {
  firstName: string
  lastName: string
  email: string
  role: 'admin' | 'manager' | 'technician'
  employeeType: 'full_time' | 'part_time' | 'contractor' | 'subcontractor'
  status: 'active' | 'on_leave' | 'inactive'
  department: string
  gender: string
  rateOfPay: string
  startDate: string
  phone: string
}

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

function ChevronDownIcon() {
  return (
    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

export function EmployeeFormPanel({ employee, onSave, onCancel, loading, errorMsg }: {
  employee: EmployeeRow | null
  onSave: (values: FormValues, avatarFile: File | null, currentAvatarUrl: string | null) => void
  onCancel: () => void
  loading: boolean
  errorMsg: string | null
}) {
  const [values, setValues] = useState<FormValues>({
    firstName:    employee?.first_name ?? '',
    lastName:     employee?.last_name ?? '',
    email:        employee?.email ?? '',
    role:         (employee?.role as 'admin' | 'manager' | 'technician') ?? 'technician',
    employeeType: employee?.employee_type ?? 'contractor',
    status:       employee?.status ?? 'active',
    department:   employee?.department ?? '',
    gender:       employee?.gender ?? '',
    rateOfPay:    employee?.rate_of_pay ? String(employee.rate_of_pay) : '',
    startDate:    employee?.start_date ?? '',
    phone:        employee?.phone ?? '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({})
  // avatarFile = newly selected File; previewUrl = object URL for display; existingUrl = from DB
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(employee?.avatar_url ?? null)
  const existingAvatarUrl = employee?.avatar_url ?? null
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
    setAvatarFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  function clearPhoto() {
    if (previewUrl && avatarFile) URL.revokeObjectURL(previewUrl)
    setAvatarFile(null)
    setPreviewUrl(null)
  }

  function handleSubmit() {
    const errs: typeof errors = {}
    if (!values.firstName.trim()) errs.firstName = 'First name is required'
    if (!values.email.trim()) errs.email = 'Email is required'
    if (Object.keys(errs).length) { setErrors(errs); return }
    // Pass new file if selected; otherwise pass the existing URL (or null if cleared)
    onSave(values, avatarFile, avatarFile ? null : previewUrl)
  }

  return (
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
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Field label="First Name">
              <input placeholder="First Name" value={values.firstName} onChange={set('firstName')} className={inputCls(!!errors.firstName)} />
              {errors.firstName && <p className="text-red-500 text-[11px] mt-1">{errors.firstName}</p>}
            </Field>
            <Field label="Last Name">
              <input placeholder="Last Name" value={values.lastName} onChange={set('lastName')} className={inputCls()} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Email">
              <input placeholder="Email" type="email" value={values.email} onChange={set('email')}
                className={inputCls(!!errors.email)} disabled={!!employee} />
              {errors.email && <p className="text-red-500 text-[11px] mt-1">{errors.email}</p>}
            </Field>
            <Field label="Phone">
              <input placeholder="+1 555 000 0000" value={values.phone} onChange={set('phone')} className={inputCls()} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Role">
              <div className="relative">
                <select value={values.role} onChange={set('role')} className={selectCls}>
                  <option value="technician">Technician</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
                <ChevronDownIcon />
              </div>
            </Field>
            <Field label="Employee Type">
              <div className="relative">
                <select value={values.employeeType} onChange={set('employeeType')} className={selectCls}>
                  <option value="contractor">Contractor</option>
                  <option value="full_time">Full-Time</option>
                  <option value="part_time">Part-Time</option>
                  <option value="subcontractor">Subcontractor</option>
                </select>
                <ChevronDownIcon />
              </div>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Status">
              <div className="relative">
                <select value={values.status} onChange={set('status')} className={selectCls}>
                  <option value="active">Active</option>
                  <option value="on_leave">On Leave</option>
                  <option value="inactive">Inactive</option>
                </select>
                <ChevronDownIcon />
              </div>
            </Field>
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
                <ChevronDownIcon />
              </div>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Gender">
              <input placeholder="Gender" value={values.gender} onChange={set('gender')} className={inputCls()} />
            </Field>
            <Field label="Rate of Pay ($/hr)">
              <input placeholder="45" type="number" value={values.rateOfPay} onChange={set('rateOfPay')} className={inputCls()} />
            </Field>
          </div>

          <Field label="Start Date">
            <div className="relative">
              <input type="date" value={values.startDate} onChange={set('startDate')} className={`${inputCls()} pr-9`} />
              <CalendarDays size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
          </Field>

          {/* Profile photo */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Profile Photo</label>
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-4">
              {previewUrl ? (
                <div className="flex items-center gap-4">
                  <div className="relative w-14 h-14 rounded-full overflow-hidden shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    <button onClick={clearPhoto}
                      className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                      <X size={10} className="text-white" />
                    </button>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-700">Photo uploaded</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Click Change to update</p>
                  </div>
                  <button onClick={() => fileRef.current?.click()}
                    className="ml-auto px-4 py-2 bg-[#0D1B2A] text-white text-xs font-medium rounded-lg hover:bg-[#162437] transition-colors">
                    Change
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                    <Upload size={16} className="text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700">Upload Photo</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">JPG or PNG · Max 5 MB</p>
                  </div>
                  <button onClick={() => fileRef.current?.click()}
                    className="px-4 py-2 bg-[#0D1B2A] text-white text-xs font-medium rounded-lg hover:bg-[#162437] transition-colors shrink-0">
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
          <button onClick={onCancel}
            className="px-6 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={loading}
            className="px-6 py-2.5 rounded-lg bg-[#0D1B2A] text-sm font-medium text-white hover:bg-[#162437] transition-colors disabled:opacity-60">
            {loading ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
