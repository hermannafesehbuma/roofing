'use client'

import { useState, useRef, useEffect } from 'react'
import { X, CalendarDays, ChevronDown, Plus, Check } from 'lucide-react'
import type { Project, ProjectStatus, ProjectType } from '@/app/admin/(portal)/projects/data'

// ─── Types ────────────────────────────────────────────────────────────────────
interface FormValues {
  name: string
  type: ProjectType | ''
  status: ProjectStatus | ''
  location: string
  description: string
  startDate: string
  endDate: string
  budget: string
  client: string
  manager: string
  crew: string[]
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onSave: (project: Omit<Project, 'id' | 'image'>) => void
}

const managers = ['Karen Brooks', 'Derek Owens', 'David Park', 'Sarah Mitchell']
const crewOptions = ['Karen Brook', 'A. Lowe', 'B. Simmons', 'C. Rivera', 'D. Pham', 'N. Torres']

// ─── Helpers ──────────────────────────────────────────────────────────────────
const inputCls = (err?: boolean) =>
  `w-full border rounded-xl px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0D1B2A]/10 focus:border-[#0D1B2A] transition-colors ${err ? 'border-red-400 bg-red-50/20' : 'border-gray-200'}`

const selectCls = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-[#0D1B2A]/10 focus:border-[#0D1B2A] transition-colors'

function SelectWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
        <ChevronDown size={14} />
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-bold text-gray-900 mb-4">{children}</h3>
}

function FieldLabel({ children, error }: { children: React.ReactNode; error?: string }) {
  return (
    <div className="mb-1">
      <label className="block text-xs font-medium text-gray-600">{children}</label>
      {error && <p className="text-red-500 text-[11px] mt-0.5">{error}</p>}
    </div>
  )
}

// ─── Success Modal ────────────────────────────────────────────────────────────
function SuccessModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4 backdrop-blur-[1px]">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center text-center relative">
        <button onClick={onClose} className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">
          <X size={16} />
        </button>
        <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mb-5 shadow-md">
          <Check size={30} className="text-white" strokeWidth={2.5} />
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">Project created successfully</h2>
        <p className="text-sm text-gray-500 leading-relaxed mb-7">
          Your project has been set up and is ready for tracking, updates, and team collaboration.
        </p>
        <button
          onClick={onClose}
          className="w-full py-3 bg-[#0D1B2A] text-white rounded-xl text-sm font-semibold hover:bg-[#162437] transition-colors"
        >
          Okay
        </button>
      </div>
    </div>
  )
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
export function NewProjectModal({ isOpen, onClose, onSave }: Props) {
  const empty: FormValues = {
    name: '', type: '', status: '', location: '', description: '',
    startDate: '', endDate: '', budget: '', client: '', manager: '', crew: [],
  }
  const [values, setValues] = useState<FormValues>(empty)
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({})
  const [crewInput, setCrewInput] = useState('')
  const [showCrewDropdown, setShowCrewDropdown] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const crewRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) { setValues(empty); setErrors({}); setCrewInput(''); setShowSuccess(false) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  useEffect(() => {
    function h(e: MouseEvent) { if (crewRef.current && !crewRef.current.contains(e.target as Node)) setShowCrewDropdown(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  function set<K extends keyof FormValues>(k: K, v: FormValues[K]) {
    setValues((prev) => ({ ...prev, [k]: v }))
    if (errors[k]) setErrors((e) => { const n = { ...e }; delete n[k]; return n })
  }

  function addCrew(name: string) {
    const trimmed = name.trim()
    if (trimmed && !values.crew.includes(trimmed)) set('crew', [...values.crew, trimmed])
    setCrewInput('')
    setShowCrewDropdown(false)
  }

  function removeCrew(name: string) {
    set('crew', values.crew.filter((c) => c !== name))
  }

  function validate() {
    const errs: typeof errors = {}
    if (!values.name.trim()) errs.name = 'Project name is required'
    if (!values.budget.trim()) errs.budget = 'Budget is required!'
    return errs
  }

  function handleSubmit() {
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    onSave({
      name: values.name,
      type: (values.type || 'Residential') as ProjectType,
      status: (values.status || 'In Progress') as ProjectStatus,
      location: values.location,
      manager: values.manager || managers[0],
      client: values.client,
      dueDate: values.endDate || '—',
      progress: 0,
    })
    setShowSuccess(true)
  }

  function handleSuccessClose() {
    setShowSuccess(false)
    onClose()
  }

  const filteredCrew = crewOptions.filter(
    (c) => c.toLowerCase().includes(crewInput.toLowerCase()) && !values.crew.includes(c)
  )

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-[1px]" onClick={onClose} />

      {/* Panel — slides in from right */}
      <div className="fixed inset-y-0 right-0 z-50 flex">
        <div className="bg-white w-[480px] max-w-full h-full flex flex-col shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100 shrink-0">
            <h2 className="text-base font-bold text-gray-900">New Project</h2>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto flex-1 px-7 py-6 space-y-7">

            {/* Project Details */}
            <div>
              <SectionLabel>Project Details</SectionLabel>
              <div className="space-y-4">
                {/* Project Name */}
                <div>
                  <FieldLabel error={errors.name}>Project Name</FieldLabel>
                  <input
                    placeholder="Enter name"
                    value={values.name}
                    onChange={(e) => set('name', e.target.value)}
                    className={inputCls(!!errors.name)}
                  />
                </div>

                {/* Type + Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <FieldLabel>Project Type</FieldLabel>
                    <SelectWrapper>
                      <select value={values.type} onChange={(e) => set('type', e.target.value as ProjectType)} className={selectCls}>
                        <option value="">Select Type</option>
                        <option>Residential</option>
                        <option>Commercial</option>
                      </select>
                    </SelectWrapper>
                  </div>
                  <div>
                    <FieldLabel>Status</FieldLabel>
                    <SelectWrapper>
                      <select value={values.status} onChange={(e) => set('status', e.target.value as ProjectStatus)} className={selectCls}>
                        <option value="">Select Status</option>
                        <option>In Progress</option>
                        <option>Completed</option>
                        <option>On Hold</option>
                      </select>
                    </SelectWrapper>
                  </div>
                </div>

                {/* Location */}
                <div>
                  <FieldLabel>Location</FieldLabel>
                  <input placeholder="Enter site location" value={values.location} onChange={(e) => set('location', e.target.value)} className={inputCls()} />
                </div>

                {/* Description */}
                <div>
                  <FieldLabel>Description</FieldLabel>
                  <textarea
                    placeholder="Enter scope of project"
                    value={values.description}
                    onChange={(e) => set('description', e.target.value)}
                    rows={3}
                    className={`${inputCls()} resize-none`}
                  />
                </div>
              </div>
            </div>

            {/* Dates & Budget */}
            <div>
              <SectionLabel>Dates &amp; Budget</SectionLabel>
              <div className="space-y-4">
                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <FieldLabel>Start Date</FieldLabel>
                    <div className="relative">
                      <input type="date" value={values.startDate} onChange={(e) => set('startDate', e.target.value)} className={`${inputCls()} pr-10`} />
                      <CalendarDays size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                  </div>
                  <div>
                    <FieldLabel>End Date</FieldLabel>
                    <div className="relative">
                      <input type="date" value={values.endDate} onChange={(e) => set('endDate', e.target.value)} className={`${inputCls()} pr-10`} />
                      <CalendarDays size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                  </div>
                </div>

                {/* Budget + Client */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <FieldLabel error={errors.budget}>Budget ($)</FieldLabel>
                    <input
                      placeholder="Enter Budget"
                      value={values.budget}
                      onChange={(e) => set('budget', e.target.value)}
                      className={inputCls(!!errors.budget)}
                    />
                    {errors.budget && <p className="text-red-500 text-[11px] mt-1">{errors.budget}</p>}
                  </div>
                  <div>
                    <FieldLabel>Client</FieldLabel>
                    <input placeholder="Enter Client's Name" value={values.client} onChange={(e) => set('client', e.target.value)} className={inputCls()} />
                  </div>
                </div>
              </div>
            </div>

            {/* Team Assignment */}
            <div>
              <SectionLabel>Team Assignment</SectionLabel>
              <div className="space-y-4">
                {/* Assigned Manager */}
                <div>
                  <FieldLabel>Assigned Manager</FieldLabel>
                  <div className="relative">
                    <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[#0D1B2A]/10 focus-within:border-[#0D1B2A] transition-colors">
                      {values.manager && (
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-300 to-orange-500 flex items-center justify-center ml-3 shrink-0">
                          <span className="text-white text-[9px] font-bold">{values.manager.split(' ').map((n) => n[0]).join('')}</span>
                        </div>
                      )}
                      <select
                        value={values.manager}
                        onChange={(e) => set('manager', e.target.value)}
                        className={`flex-1 appearance-none px-3 py-2.5 text-sm text-gray-800 bg-white focus:outline-none ${values.manager ? 'pl-2' : 'pl-4'}`}
                      >
                        <option value="">Select Manager</option>
                        {managers.map((m) => <option key={m}>{m}</option>)}
                      </select>
                      <ChevronDown size={14} className="text-gray-400 mr-3 shrink-0 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Crew Member */}
                <div>
                  <FieldLabel>Crew Member</FieldLabel>
                  <div ref={crewRef} className="relative">
                    <div className="flex flex-wrap items-center gap-2 min-h-[44px] border border-gray-200 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-[#0D1B2A]/10 focus-within:border-[#0D1B2A] transition-colors">
                      {values.crew.map((c) => (
                        <span key={c} className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 text-xs font-medium px-2.5 py-1 rounded-full">
                          <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center shrink-0">
                            <span className="text-white text-[8px] font-bold">{c.split(' ').map((n) => n[0]).join('')}</span>
                          </div>
                          {c}
                          <button onClick={() => removeCrew(c)} className="text-gray-400 hover:text-gray-600 ml-0.5">
                            <X size={11} />
                          </button>
                        </span>
                      ))}
                      <div className="flex items-center gap-2 flex-1 min-w-[120px]">
                        <input
                          placeholder={values.crew.length === 0 ? 'Add Crew Member' : ''}
                          value={crewInput}
                          onChange={(e) => { setCrewInput(e.target.value); setShowCrewDropdown(true) }}
                          onFocus={() => setShowCrewDropdown(true)}
                          onKeyDown={(e) => { if (e.key === 'Enter' && crewInput) addCrew(crewInput) }}
                          className="flex-1 text-sm text-gray-700 placeholder-gray-400 focus:outline-none bg-transparent"
                        />
                        <button
                          onClick={() => { if (crewInput) addCrew(crewInput); else setShowCrewDropdown(!showCrewDropdown) }}
                          className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 shrink-0"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Dropdown suggestions */}
                    {showCrewDropdown && filteredCrew.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1 max-h-40 overflow-y-auto">
                        {filteredCrew.map((c) => (
                          <button key={c} onClick={() => addCrew(c)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center shrink-0">
                              <span className="text-white text-[9px] font-bold">{c.split(' ').map((n) => n[0]).join('')}</span>
                            </div>
                            {c}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-7 py-5 border-t border-gray-100 shrink-0">
            <button onClick={onClose} className="px-6 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button onClick={handleSubmit} className="px-6 py-2.5 rounded-xl bg-[#0D1B2A] text-sm font-medium text-white hover:bg-[#162437] transition-colors">
              Save Project
            </button>
          </div>
        </div>
      </div>

      {/* Success */}
      {showSuccess && <SuccessModal onClose={handleSuccessClose} />}
    </>
  )
}
