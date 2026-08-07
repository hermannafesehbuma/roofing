'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Filter, Search, ChevronDown, Check } from 'lucide-react'
import type { DbTaskStatus, DbTaskPriority, AssigneeOption } from '@/app/admin/(portal)/tasks/actions'
import { FilterButton } from '@/app/components/ui/ToolbarButtons';

export type DueDateFilter = '' | 'today' | 'tomorrow' | 'this_week' | 'overdue' | 'no_date'

export type TaskFilters = {
  status: DbTaskStatus[]
  priority: DbTaskPriority[]
  dueDate: DueDateFilter
  /** Assignee ids — the design labels this column "Manager". */
  assignees: string[]
}

export const EMPTY_TASK_FILTERS: TaskFilters = {
  status: [], priority: [], dueDate: '', assignees: [],
}

const PRIORITY_OPTIONS: { key: DbTaskPriority; label: string }[] = [
  { key: 'high', label: 'High' },
  { key: 'medium', label: 'Medium' },
  { key: 'low', label: 'Low' },
]

const STATUS_OPTIONS: { key: DbTaskStatus; label: string }[] = [
  { key: 'todo', label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'in_review', label: 'In Review' },
  { key: 'completed', label: 'Completed' },
]

const DUE_OPTIONS: { key: DueDateFilter; label: string }[] = [
  { key: '', label: 'Any date' },
  { key: 'today', label: 'Today' },
  { key: 'tomorrow', label: 'Tomorrow' },
  { key: 'this_week', label: 'This Week' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'no_date', label: 'No Due Date' },
]

function Pill({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-xs rounded-full border transition-colors ${
        active
          ? 'bg-[#0D1B2A] border-[#0D1B2A] text-white font-medium'
          : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
      }`}
    >
      {children}
    </button>
  )
}

export function TaskFilterPopover({
  assignees,
  filters,
  onFilterChange,
}: {
  assignees: AssigneeOption[]
  filters: TaskFilters
  onFilterChange: (filters: TaskFilters) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [assigneeSearch, setAssigneeSearch] = useState('')
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function toggle<K extends 'status' | 'priority' | 'assignees'>(key: K, value: TaskFilters[K][number]) {
    const current = filters[key] as TaskFilters[K][number][]
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value]
    onFilterChange({ ...filters, [key]: next })
  }

  const count =
    filters.status.length + filters.priority.length + filters.assignees.length + (filters.dueDate ? 1 : 0)

  const filteredAssignees = assignees.filter((a) =>
    a.name.toLowerCase().includes(assigneeSearch.toLowerCase())
  )
  const selectedNames = assignees
    .filter((a) => filters.assignees.includes(a.id))
    .map((a) => a.name)

  return (
    <div className="relative" ref={popoverRef}>
      <FilterButton onClick={() => setIsOpen(!isOpen)} active={isOpen} count={count} />

      {isOpen && (
        <div className="absolute right-0 mt-2 w-[360px] bg-white rounded-2xl shadow-[0_8px_30px_rgba(16,24,40,0.14)] border border-gray-100 p-5 z-50 max-h-[70vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs text-gray-400">Filter</h3>
            {count > 0 && (
              <button
                onClick={() => onFilterChange(EMPTY_TASK_FILTERS)}
                className="text-[11px] text-gray-400 hover:text-gray-700 transition-colors"
              >
                Clear all
              </button>
            )}
          </div>

          <h4 className="text-xs font-medium text-gray-900 mb-2.5">Priority</h4>
          <div className="flex flex-wrap gap-2 mb-5">
            {PRIORITY_OPTIONS.map(({ key, label }) => (
              <Pill key={key} active={filters.priority.includes(key)} onClick={() => toggle('priority', key)}>
                {label}
              </Pill>
            ))}
          </div>

          <h4 className="text-xs font-medium text-gray-900 mb-2.5">Status</h4>
          <div className="flex flex-wrap gap-2 mb-5">
            {STATUS_OPTIONS.map(({ key, label }) => (
              <Pill key={key} active={filters.status.includes(key)} onClick={() => toggle('status', key)}>
                {label}
              </Pill>
            ))}
          </div>

          <h4 className="text-xs font-medium text-gray-900 mb-2.5">Due Date</h4>
          <div className="relative mb-5">
            <select
              value={filters.dueDate}
              onChange={(e) => onFilterChange({ ...filters, dueDate: e.target.value as DueDateFilter })}
              className="w-full appearance-none border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#0D1B2A]/10 focus:border-[#0D1B2A]"
            >
              {DUE_OPTIONS.map(({ key, label }) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>

          <h4 className="text-xs font-medium text-gray-900 mb-2.5">Manager</h4>
          <div className="border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-gray-700 mb-2 flex items-center justify-between gap-2">
            <span className="truncate">
              {selectedNames.length === 0
                ? 'Anyone'
                : selectedNames.length === 1
                  ? selectedNames[0]
                  : `${selectedNames[0]} +${selectedNames.length - 1}`}
            </span>
            <ChevronDown size={14} className="text-gray-400 shrink-0" />
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex items-center px-3 py-2.5 border-b border-gray-100">
              <Search size={13} className="text-gray-400 mr-2 shrink-0" />
              <input
                type="text"
                placeholder="Search"
                value={assigneeSearch}
                onChange={(e) => setAssigneeSearch(e.target.value)}
                className="bg-transparent border-none outline-none text-xs w-full text-gray-700"
              />
            </div>
            <div className="max-h-44 overflow-y-auto">
              {filteredAssignees.length === 0 && (
                <p className="px-4 py-3 text-xs text-gray-400">No people found</p>
              )}
              {filteredAssignees.map((person) => {
                const checked = filters.assignees.includes(person.id)
                return (
                  <button
                    key={person.id}
                    onClick={() => toggle('assignees', person.id)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-0"
                  >
                    <span className="w-6 h-6 rounded-full overflow-hidden relative bg-indigo-100 shrink-0 flex items-center justify-center">
                      {person.avatar_url ? (
                        <Image src={person.avatar_url} alt={person.name} fill sizes="24px" className="object-cover" />
                      ) : (
                        <span className="text-indigo-700 text-[10px] font-semibold">
                          {person.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-gray-700 flex-1 truncate">{person.name}</span>
                    <span
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        checked ? 'bg-[#0D1B2A] border-[#0D1B2A]' : 'border-gray-300'
                      }`}
                    >
                      {checked && <Check size={11} className="text-white" strokeWidth={3} />}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
