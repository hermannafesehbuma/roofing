'use client'

import { useState, useRef } from 'react'
import { X, Upload, Trash2, CalendarDays } from 'lucide-react'
import type { EmployeeRow } from './actions'

export interface FormValues {
  firstName: string
  lastName: string
  employeeId: string
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

/* ---------- design tokens ---------- */

const LABEL = 'block text-[13px] font-medium text-[#344054] mb-2'

const inputCls = (hasErr?: boolean) =>
  `w-full h-11 rounded-lg border px-3.5 text-[14px] text-[#101828] placeholder:text-[#98A2B3] bg-white focus:outline-none focus:ring-4 transition-colors ${
    hasErr
      ? 'border-[#F04438] focus:border-[#F04438] focus:ring-[#F04438]/10'
      : 'border-[#E4E7EC] focus:border-[#0D1B2A] focus:ring-[#0D1B2A]/8'
  }`

const selectCls = (hasErr?: boolean) =>
  `${inputCls(hasErr)} pr-9 appearance-none cursor-pointer`

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={LABEL}>{label}</label>
      {children}
      {error && <p className="mt-1.5 text-[13px] text-[#F04438]">{error}</p>}
    </div>
  )
}

function Chevron() {
  return (
    <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#667085]">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M2.5 4.25 6 7.75l3.5-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

/** Rate-of-pay options — design renders this as a dropdown ("$45/hr"). */
function rateOptions(current: string) {
  const opts: string[] = []
  for (let r = 15; r <= 100; r += 5) opts.push(String(r))
  if (current && !opts.includes(current)) opts.unshift(current)
  return opts
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
    employeeId:   employee?.employee_id ?? '',
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
    if (fileRef.current) fileRef.current.value = ''
  }

  function handleSubmit() {
    const errs: typeof errors = {}
    if (!values.firstName.trim()) errs.firstName = 'Full name is required'
    if (!values.email.trim()) errs.email = 'Email is required'
    if (Object.keys(errs).length) { setErrors(errs); return }
    // Pass new file if selected; otherwise pass the existing URL (or null if cleared)
    onSave(values, avatarFile, avatarFile ? null : previewUrl)
  }

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex">
      <div className="bg-white w-[640px] max-w-full h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 shrink-0">
          <h2 className="text-[17px] font-semibold text-[#101828]">
            {employee ? 'Edit Employee' : 'Add New Employee'}
          </h2>
          <button onClick={onCancel} aria-label="Close"
            className="w-8 h-8 flex items-center justify-center rounded-full text-[#667085] hover:bg-gray-100 transition-colors">
            <X size={18} strokeWidth={1.8} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-8 pb-6">
          {errorMsg && (
            <div className="mb-5 rounded-lg border border-[#FDA29B] bg-[#FEF3F2] px-4 py-3 text-[13px] text-[#B42318]">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-2 gap-x-6 gap-y-5">
            <Field label="Full Name" error={errors.firstName}>
              <input placeholder="Full Name" value={values.firstName} onChange={set('firstName')}
                className={inputCls(!!errors.firstName)} />
            </Field>
            <Field label="Last Name">
              <input placeholder="Last Name" value={values.lastName} onChange={set('lastName')} className={inputCls()} />
            </Field>

            <Field label="Employee ID">
              <input placeholder="Employee ID" value={values.employeeId} onChange={set('employeeId')} className={inputCls()} />
            </Field>
            <Field label="Email" error={errors.email}>
              <input placeholder="Email" type="email" value={values.email} onChange={set('email')}
                className={inputCls(!!errors.email)} disabled={!!employee} />
            </Field>

            <Field label="Employee Type">
              <div className="relative">
                <select value={values.employeeType} onChange={set('employeeType')} className={selectCls()}>
                  <option value="contractor">Contractor</option>
                  <option value="full_time">Full-Time</option>
                  <option value="part_time">Part-Time</option>
                  <option value="subcontractor">Subcontractor</option>
                </select>
                <Chevron />
              </div>
            </Field>
            <Field label="Employee Status">
              <div className="relative">
                <select value={values.status} onChange={set('status')} className={selectCls()}>
                  <option value="active">Active</option>
                  <option value="on_leave">On Leave</option>
                  <option value="inactive">Inactive</option>
                </select>
                <Chevron />
              </div>
            </Field>

            <Field label="Department">
              <div className="relative">
                <select value={values.department} onChange={set('department')}
                  className={`${selectCls()} ${values.department ? '' : 'text-[#98A2B3]'}`}>
                  <option value="">Select</option>
                  <option>Lead Roofer</option>
                  <option>Field Ops</option>
                  <option>Engineering</option>
                  <option>Operations</option>
                  <option>Sales</option>
                  <option>Admin</option>
                </select>
                <Chevron />
              </div>
            </Field>
            <Field label="Gender">
              <input placeholder="Gender" value={values.gender} onChange={set('gender')} className={inputCls()} />
            </Field>

            <Field label="Rate of Pay">
              <div className="relative">
                <select value={values.rateOfPay} onChange={set('rateOfPay')}
                  className={`${selectCls()} ${values.rateOfPay ? '' : 'text-[#98A2B3]'}`}>
                  <option value="">Select</option>
                  {rateOptions(values.rateOfPay).map((r) => (
                    <option key={r} value={r}>${r}/hr</option>
                  ))}
                </select>
                <Chevron />
              </div>
            </Field>
            <Field label="Start Date">
              <div className="relative">
                <input type="date" value={values.startDate} onChange={set('startDate')}
                  className={`${inputCls()} pr-9 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-9 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer`} />
                <CalendarDays size={15} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#667085]" />
              </div>
            </Field>

            {/* Not in the Figma frame, but required to keep role/phone editable */}
            <Field label="Role">
              <div className="relative">
                <select value={values.role} onChange={set('role')} className={selectCls()}>
                  <option value="technician">Technician</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
                <Chevron />
              </div>
            </Field>
            <Field label="Phone No">
              <input placeholder="Phone No" value={values.phone} onChange={set('phone')} className={inputCls()} />
            </Field>
          </div>

          {/* Upload image */}
          <div className="mt-6">
            <label className={LABEL}>Upload Image</label>
            <div className="rounded-xl border border-dashed border-[#D0D5DD] bg-[#F9FAFB] px-4 py-4 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-white border border-[#E4E7EC] flex items-center justify-center shrink-0">
                <Upload size={17} className="text-[#475467]" strokeWidth={1.8} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium text-[#101828]">Upload Image</p>
                <p className="text-[12px] text-[#98A2B3] mt-0.5">Name of the document &bull; Max. 5MB</p>
              </div>
              <button type="button" onClick={() => fileRef.current?.click()}
                className="shrink-0 h-9 px-4 rounded-lg bg-[#0D1B2A] text-white text-[13px] font-medium hover:bg-[#162437] transition-colors">
                Upload
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </div>

            {previewUrl && (
              <div className="mt-5">
                <div className="relative w-[76px] h-[76px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt="Profile preview"
                    className="w-full h-full rounded-full object-cover border border-[#E4E7EC]" />
                  <button type="button" onClick={clearPhoto} aria-label="Remove image"
                    className="absolute -top-0.5 -right-0.5 w-6 h-6 rounded-full bg-white border border-[#E4E7EC] shadow-sm flex items-center justify-center hover:bg-[#FEF3F2] transition-colors">
                    <Trash2 size={12} className="text-[#F04438]" strokeWidth={1.8} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-8 py-5 shrink-0">
          <button onClick={onCancel}
            className="h-10 px-7 rounded-lg border border-[#E4E7EC] text-[14px] font-medium text-[#344054] hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={loading}
            className="h-10 px-9 rounded-lg bg-[#0D1B2A] text-[14px] font-medium text-white hover:bg-[#162437] transition-colors disabled:opacity-60">
            {loading ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
