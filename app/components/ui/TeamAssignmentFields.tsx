'use client'

import { useRef, useState, useEffect } from 'react'
import Image from 'next/image'
import { ChevronDown, Plus, X } from 'lucide-react'

export interface EmployeeOption {
  id: string
  name: string
  role: 'admin' | 'manager' | 'technician'
  avatar_url: string | null
}

interface Props {
  employees: EmployeeOption[]
  managerId: string
  crew: string[]
  onManagerChange: (id: string) => void
  onCrewChange: (ids: string[]) => void
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).map((n) => n[0]).join('').slice(0, 2).toUpperCase()
}

function Avatar({ employee, size = 24, tone = 'blue' }: { employee: EmployeeOption; size?: number; tone?: 'blue' | 'orange' }) {
  const gradient = tone === 'orange' ? 'from-orange-300 to-orange-500' : 'from-blue-400 to-blue-500'
  return (
    <div
      style={{ width: size, height: size }}
      className={`rounded-full overflow-hidden relative shrink-0 flex items-center justify-center bg-gradient-to-br ${gradient}`}
    >
      {employee.avatar_url ? (
        <Image src={employee.avatar_url} alt={employee.name} fill sizes={`${size}px`} className="object-cover" />
      ) : (
        <span className="text-white font-semibold" style={{ fontSize: Math.max(8, size * 0.38) }}>
          {initials(employee.name)}
        </span>
      )}
    </div>
  )
}

/**
 * Manager + crew pickers, both sourced from the employee list. A person picked
 * as manager stays visible in the crew dropdown but is greyed out and locked,
 * so the same employee can never hold both roles on one project.
 */
export function TeamAssignmentFields({ employees, managerId, crew, onManagerChange, onCrewChange }: Props) {
  const [crewInput, setCrewInput] = useState('')
  const [showCrewDropdown, setShowCrewDropdown] = useState(false)
  const crewRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function h(e: MouseEvent) {
      if (crewRef.current && !crewRef.current.contains(e.target as Node)) setShowCrewDropdown(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const managers = employees.filter((e) => e.role === 'admin' || e.role === 'manager')
  const selectedManager = employees.find((e) => e.id === managerId)

  function selectManager(id: string) {
    onManagerChange(id)
    // A manager cannot double as crew — drop them if they were already added.
    if (id && crew.includes(id)) onCrewChange(crew.filter((c) => c !== id))
  }

  function addCrew(id: string) {
    if (id === managerId || crew.includes(id)) return
    onCrewChange([...crew, id])
    setCrewInput('')
    setShowCrewDropdown(false)
  }

  const matches = employees.filter(
    (e) => e.name.toLowerCase().includes(crewInput.trim().toLowerCase()) && !crew.includes(e.id)
  )
  const selectable = matches.filter((e) => e.id !== managerId)

  return (
    <div className="space-y-4">
      {/* Assigned Manager */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">Assigned Manager</label>
        <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[#0D1B2A]/10 focus-within:border-[#0D1B2A] transition-colors">
          {selectedManager && (
            <div className="ml-3">
              <Avatar employee={selectedManager} tone="orange" />
            </div>
          )}
          <select
            value={managerId}
            onChange={(e) => selectManager(e.target.value)}
            className={`flex-1 appearance-none py-2.5 text-sm text-gray-800 bg-white focus:outline-none ${selectedManager ? 'pl-2 pr-8' : 'px-4'}`}
          >
            <option value="">Select Manager</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <ChevronDown size={14} className="text-gray-400 mr-3 shrink-0 pointer-events-none" />
        </div>
        {managers.length === 0 && (
          <p className="text-[11px] text-gray-400 mt-1">No managers or admins found.</p>
        )}
      </div>

      {/* Crew Members */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">Crew Members</label>
        <div ref={crewRef} className="relative">
          <div className="flex flex-wrap items-center gap-2 min-h-[44px] border border-gray-200 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-[#0D1B2A]/10 focus-within:border-[#0D1B2A] transition-colors">
            {crew.map((id) => {
              const member = employees.find((e) => e.id === id)
              if (!member) return null
              return (
                <span key={id} className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 text-xs font-medium pl-1 pr-2 py-1 rounded-full">
                  <Avatar employee={member} size={18} />
                  {member.name}
                  <button
                    type="button"
                    onClick={() => onCrewChange(crew.filter((c) => c !== id))}
                    className="text-gray-400 hover:text-gray-600 ml-0.5"
                  >
                    <X size={11} />
                  </button>
                </span>
              )
            })}
            <div className="flex items-center gap-2 flex-1 min-w-[120px]">
              <input
                placeholder={crew.length === 0 ? 'Add Crew Member' : ''}
                value={crewInput}
                onChange={(e) => { setCrewInput(e.target.value); setShowCrewDropdown(true) }}
                onFocus={() => setShowCrewDropdown(true)}
                onKeyDown={(e) => { if (e.key === 'Enter' && selectable.length > 0) { e.preventDefault(); addCrew(selectable[0].id) } }}
                className="flex-1 text-sm text-gray-700 placeholder-gray-400 focus:outline-none bg-transparent"
              />
              <button
                type="button"
                onClick={() => setShowCrewDropdown(!showCrewDropdown)}
                className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 shrink-0"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          {showCrewDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1 max-h-52 overflow-y-auto">
              {matches.length === 0 ? (
                <p className="px-3 py-2 text-sm text-gray-400">
                  {employees.length === 0 ? 'No employees found' : 'No matching employees'}
                </p>
              ) : (
                matches.map((e) => {
                  const isManager = e.id === managerId
                  return (
                    <button
                      key={e.id}
                      type="button"
                      disabled={isManager}
                      onClick={() => addCrew(e.id)}
                      title={isManager ? 'Already assigned as project manager' : undefined}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                        isManager ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className={isManager ? 'opacity-40' : ''}>
                        <Avatar employee={e} />
                      </span>
                      <span className="flex-1 truncate">{e.name}</span>
                      <span className={`text-[10px] capitalize ${isManager ? 'text-gray-300' : 'text-gray-400'}`}>
                        {isManager ? 'Manager' : e.role}
                      </span>
                    </button>
                  )
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
