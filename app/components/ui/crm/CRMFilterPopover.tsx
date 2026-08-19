'use client'

import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { FilterButton } from '@/app/components/ui/ToolbarButtons'
import type {
  DbLeadStage, DbLeadSource, DbPortalStatus, RepOption,
} from '@/app/admin/(portal)/crm/actions'

export type CRMFilters = {
  stage: DbLeadStage[]
  source: DbLeadSource[]
  /** Rep id, or '' for any. Leads tab only. */
  rep: string
  portalStatus: DbPortalStatus[]
}

export const EMPTY_CRM_FILTERS: CRMFilters = {
  stage: [], source: [], rep: '', portalStatus: [],
}

const STAGE_OPTIONS: { key: DbLeadStage; label: string }[] = [
  { key: 'new_lead', label: 'New Lead' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'proposal_sent', label: 'Proposal Sent' },
  { key: 'won', label: 'Won' },
  { key: 'lost', label: 'Lost' },
  { key: 'closed', label: 'Closed' },
]

const SOURCE_OPTIONS: { key: DbLeadSource; label: string }[] = [
  { key: 'referral', label: 'Referral' },
  { key: 'website', label: 'Website' },
  { key: 'cold_call', label: 'Cold Call' },
  { key: 'mobile', label: 'Mobile' },
  { key: 'social', label: 'Social' },
]

const PORTAL_OPTIONS: { key: DbPortalStatus; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'invited', label: 'Invited' },
  { key: 'inactive', label: 'Inactive' },
]

/** Count of filters that apply to the tab currently on screen. */
export function activeFilterCount(filters: CRMFilters, tab: 'leads' | 'clients') {
  return tab === 'leads'
    ? filters.stage.length + filters.source.length + (filters.rep ? 1 : 0)
    : filters.portalStatus.length
}

function Chip({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
        active
          ? 'bg-[#0D1B2A]/5 border-[#0D1B2A]/20 text-[#0D1B2A] font-medium'
          : 'border-gray-200 text-gray-600 hover:border-gray-300'
      }`}
    >
      {children}
    </button>
  )
}

/**
 * Filters the CRM board. The panel shows only the fields that apply to the
 * active tab — stage/source/rep for leads, portal status for clients — but
 * both selections are kept in one object so switching tabs does not lose them.
 */
export function CRMFilterPopover({
  tab,
  reps,
  filters,
  onFilterChange,
}: {
  tab: 'leads' | 'clients'
  reps: RepOption[]
  filters: CRMFilters
  onFilterChange: (filters: CRMFilters) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [repSearch, setRepSearch] = useState('')
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

  function toggle<K extends 'stage' | 'source' | 'portalStatus'>(key: K, value: CRMFilters[K][number]) {
    const current = filters[key] as CRMFilters[K][number][]
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value]
    onFilterChange({ ...filters, [key]: next })
  }

  const count = activeFilterCount(filters, tab)
  const filteredReps = reps.filter((r) => r.name.toLowerCase().includes(repSearch.toLowerCase()))

  return (
    <div className="relative" ref={popoverRef}>
      <FilterButton onClick={() => setIsOpen(!isOpen)} active={isOpen} count={count} />

      {isOpen && (
        <div className="absolute right-0 top-11 w-72 bg-white rounded-xl shadow-xl border border-gray-100 p-5 z-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold text-gray-900">
              Filter {tab === 'leads' ? 'Leads' : 'Clients'}
            </h3>
            {count > 0 && (
              <button
                onClick={() => onFilterChange(EMPTY_CRM_FILTERS)}
                className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-700 transition-colors"
              >
                <X size={11} /> Clear
              </button>
            )}
          </div>

          {tab === 'leads' ? (
            <>
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-gray-500 mb-2">Stage</h4>
                <div className="flex flex-wrap gap-2">
                  {STAGE_OPTIONS.map(({ key, label }) => (
                    <Chip key={key} active={filters.stage.includes(key)} onClick={() => toggle('stage', key)}>
                      {label}
                    </Chip>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <h4 className="text-xs font-semibold text-gray-500 mb-2">Source</h4>
                <div className="flex flex-wrap gap-2">
                  {SOURCE_OPTIONS.map(({ key, label }) => (
                    <Chip key={key} active={filters.source.includes(key)} onClick={() => toggle('source', key)}>
                      {label}
                    </Chip>
                  ))}
                </div>
              </div>

              {reps.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 mb-2">Assigned Rep</h4>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="flex items-center px-3 py-2 border-b border-gray-100 bg-gray-50/50">
                      <Search size={13} className="text-gray-400 mr-2 shrink-0" />
                      <input
                        type="text"
                        placeholder="Search"
                        value={repSearch}
                        onChange={(e) => setRepSearch(e.target.value)}
                        className="bg-transparent border-none outline-none text-xs w-full text-gray-700"
                      />
                    </div>
                    <div className="max-h-36 overflow-y-auto p-1">
                      {filteredReps.length === 0 && (
                        <p className="px-2 py-2 text-xs text-gray-400">No reps found</p>
                      )}
                      {filteredReps.map((rep) => (
                        <button
                          key={rep.id}
                          onClick={() => onFilterChange({ ...filters, rep: filters.rep === rep.id ? '' : rep.id })}
                          className={`w-full flex items-center gap-2 px-2 py-2 rounded text-left hover:bg-gray-50 transition-colors ${
                            filters.rep === rep.id ? 'bg-gray-50' : ''
                          }`}
                        >
                          <span className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-[10px] font-semibold shrink-0">
                            {rep.name.charAt(0).toUpperCase()}
                          </span>
                          <span className="text-xs text-gray-700 flex-1 truncate">{rep.name}</span>
                          {filters.rep === rep.id && <span className="w-3 h-3 rounded-full bg-[#0D1B2A] shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 mb-2">Portal Status</h4>
              <div className="flex flex-wrap gap-2">
                {PORTAL_OPTIONS.map(({ key, label }) => (
                  <Chip
                    key={key}
                    active={filters.portalStatus.includes(key)}
                    onClick={() => toggle('portalStatus', key)}
                  >
                    {label}
                  </Chip>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
