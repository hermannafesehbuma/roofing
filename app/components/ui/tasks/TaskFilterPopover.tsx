'use client'

import { useEffect, useRef, useState } from 'react'
import { Filter, Search } from 'lucide-react'
import type { DbTaskStatus, DbTaskPriority, AssigneeOption } from '@/app/admin/(portal)/tasks/actions'

interface TaskFilterPopoverProps {
  assignees: AssigneeOption[]
  onFilterChange?: (filters: { status: DbTaskStatus[]; priority: DbTaskPriority[]; assignee: string }) => void
}

export function TaskFilterPopover({ assignees, onFilterChange }: TaskFilterPopoverProps) {
  const [isOpen, setIsOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  const [selectedStatus, setSelectedStatus] = useState<DbTaskStatus[]>([])
  const [selectedPriority, setSelectedPriority] = useState<DbTaskPriority[]>([])
  const [assigneeSearch, setAssigneeSearch] = useState('')
  const [selectedAssignee, setSelectedAssignee] = useState('')

  const filteredAssignees = assignees.filter(a =>
    a.name.toLowerCase().includes(assigneeSearch.toLowerCase())
  )

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function toggleStatus(status: DbTaskStatus) {
    const next = selectedStatus.includes(status)
      ? selectedStatus.filter(s => s !== status)
      : [...selectedStatus, status]
    setSelectedStatus(next)
    onFilterChange?.({ status: next, priority: selectedPriority, assignee: selectedAssignee })
  }

  function togglePriority(priority: DbTaskPriority) {
    const next = selectedPriority.includes(priority)
      ? selectedPriority.filter(p => p !== priority)
      : [...selectedPriority, priority]
    setSelectedPriority(next)
    onFilterChange?.({ status: selectedStatus, priority: next, assignee: selectedAssignee })
  }

  function selectAssignee(name: string) {
    const next = selectedAssignee === name ? '' : name
    setSelectedAssignee(next)
    onFilterChange?.({ status: selectedStatus, priority: selectedPriority, assignee: next })
  }

  const STATUS_OPTIONS: { key: DbTaskStatus; label: string }[] = [
    { key: 'todo', label: 'To Do' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'in_review', label: 'In Review' },
    { key: 'completed', label: 'Completed' },
  ]

  const PRIORITY_OPTIONS: { key: DbTaskPriority; label: string }[] = [
    { key: 'high', label: 'High' },
    { key: 'medium', label: 'Medium' },
    { key: 'low', label: 'Low' },
  ]

  const activeCount = selectedStatus.length + selectedPriority.length + (selectedAssignee ? 1 : 0)

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-2 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 bg-white font-medium"
      >
        <Filter size={13} />
        Filter
        {activeCount > 0 && (
          <span className="w-4 h-4 flex items-center justify-center rounded-full bg-[#0D1B2A] text-white text-[9px] font-bold">
            {activeCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-100 p-5 z-50">
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-gray-500 mb-2">Priority</h4>
            <div className="flex gap-2">
              {PRIORITY_OPTIONS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => togglePriority(key)}
                  className={`flex-1 py-1.5 text-xs rounded-full border transition-colors ${
                    selectedPriority.includes(key)
                      ? 'bg-[#0D1B2A]/5 border-[#0D1B2A]/20 text-[#0D1B2A] font-medium'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <h4 className="text-xs font-semibold text-gray-500 mb-2">Status</h4>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => toggleStatus(key)}
                  className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                    selectedStatus.includes(key)
                      ? 'bg-[#0D1B2A]/5 border-[#0D1B2A]/20 text-[#0D1B2A] font-medium'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {assignees.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 mb-2">Assignee</h4>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="flex items-center px-3 py-2 border-b border-gray-100 bg-gray-50/50">
                  <Search size={13} className="text-gray-400 mr-2 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search"
                    className="bg-transparent border-none outline-none text-xs w-full text-gray-700"
                    value={assigneeSearch}
                    onChange={e => setAssigneeSearch(e.target.value)}
                  />
                </div>
                <div className="max-h-36 overflow-y-auto p-1">
                  {filteredAssignees.map(a => (
                    <button
                      key={a.id}
                      onClick={() => selectAssignee(a.name)}
                      className={`w-full flex items-center gap-2 px-2 py-2 rounded text-left hover:bg-gray-50 transition-colors ${
                        selectedAssignee === a.name ? 'bg-gray-50' : ''
                      }`}
                    >
                      <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-[10px] font-bold shrink-0">
                        {a.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs text-gray-700 flex-1">{a.name}</span>
                      {selectedAssignee === a.name && (
                        <div className="w-3 h-3 rounded-full bg-[#0D1B2A]" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
