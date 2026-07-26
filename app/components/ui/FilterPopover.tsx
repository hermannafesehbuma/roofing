'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ListFilter, Search, ChevronDown } from 'lucide-react';
import { ProjectStatus, ProjectType } from '@/app/admin/(portal)/projects/data';

export type ProjectFilters = {
  status: ProjectStatus[];
  type: ProjectType[];
  managerIds: string[];
};

export type FilterManager = { id: string; name: string; avatarUrl?: string };

interface FilterPopoverProps {
  managers: FilterManager[];
  filters: ProjectFilters;
  onFilterChange: (filters: ProjectFilters) => void;
}

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'in_progress', label: 'In Progress' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
];

const TYPE_OPTIONS: { value: ProjectType; label: string }[] = [
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'industrial', label: 'Industrial' },
];

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function Pill({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1 text-[11px] rounded-full border transition-colors ${
        selected
          ? 'bg-[#0D1B2A]/5 border-[#0D1B2A]/25 text-[#0D1B2A] font-medium'
          : 'border-gray-200 text-gray-600 hover:border-gray-300'
      }`}
    >
      {label}
    </button>
  );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{children}</p>;
}

export function FilterPopover({ managers, filters, onFilterChange }: FilterPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [managerListOpen, setManagerListOpen] = useState(false);
  const [managerSearch, setManagerSearch] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  const activeCount = filters.status.length + filters.type.length + filters.managerIds.length;

  const filteredManagers = useMemo(
    () => managers.filter((m) => m.name.toLowerCase().includes(managerSearch.trim().toLowerCase())),
    [managers, managerSearch]
  );

  const selectedManagerLabel = useMemo(() => {
    const picked = managers.filter((m) => filters.managerIds.includes(m.id));
    if (picked.length === 0) return null;
    if (picked.length === 1) return picked[0].name;
    return `${picked[0].name} +${picked.length - 1}`;
  }, [managers, filters.managerIds]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setManagerListOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') { setIsOpen(false); setManagerListOpen(false); }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => setIsOpen((v) => !v)}
        className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg text-xs transition-colors ${
          isOpen || activeCount > 0 ? 'border-gray-300 bg-gray-50 text-gray-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
        }`}
      >
        <ListFilter size={13} /> Filter
        {activeCount > 0 && (
          <span className="ml-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#0D1B2A] text-white text-[10px] font-semibold flex items-center justify-center">
            {activeCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-10 w-72 max-w-[calc(100vw-3rem)] bg-white rounded-xl border border-gray-100 shadow-xl p-4 z-50">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-gray-800">Filter</h4>
            <button
              onClick={() => { onFilterChange({ status: [], type: [], managerIds: [] }); setManagerSearch(''); }}
              disabled={activeCount === 0}
              className="text-[11px] text-gray-500 hover:text-gray-800 disabled:opacity-40 disabled:hover:text-gray-500"
            >
              Clear all
            </button>
          </div>

          {/* Status */}
          <div className="mb-3.5">
            <GroupLabel>Status</GroupLabel>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_OPTIONS.map((o) => (
                <Pill
                  key={o.value}
                  label={o.label}
                  selected={filters.status.includes(o.value)}
                  onClick={() => onFilterChange({ ...filters, status: toggle(filters.status, o.value) })}
                />
              ))}
            </div>
          </div>

          {/* Type */}
          <div className="mb-3.5">
            <GroupLabel>Type</GroupLabel>
            <div className="flex flex-wrap gap-1.5">
              {TYPE_OPTIONS.map((o) => (
                <Pill
                  key={o.value}
                  label={o.label}
                  selected={filters.type.includes(o.value)}
                  onClick={() => onFilterChange({ ...filters, type: toggle(filters.type, o.value) })}
                />
              ))}
            </div>
          </div>

          {/* Manager */}
          <GroupLabel>Manager</GroupLabel>
          <button
            type="button"
            onClick={() => setManagerListOpen((v) => !v)}
            className="w-full px-2.5 py-2 rounded-lg border border-gray-200 flex items-center justify-between text-[11px] hover:border-gray-300 transition-colors"
          >
            <span className={selectedManagerLabel ? 'text-gray-900' : 'text-gray-400'}>
              {selectedManagerLabel ?? 'Select'}
            </span>
            <ChevronDown size={12} className={`text-gray-400 shrink-0 transition-transform ${managerListOpen ? 'rotate-180' : ''}`} />
          </button>

          {managerListOpen && (
            <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden">
              <div className="flex items-center px-2.5 py-2 border-b border-gray-100 bg-gray-50/50">
                <Search size={12} className="text-gray-400 mr-2 shrink-0" />
                <input
                  type="text"
                  placeholder="Search"
                  value={managerSearch}
                  onChange={(e) => setManagerSearch(e.target.value)}
                  className="bg-transparent outline-none text-[11px] w-full text-gray-700 placeholder-gray-400"
                />
              </div>

              <div className="max-h-32 overflow-y-auto p-1">
                {filteredManagers.length === 0 && (
                  <p className="px-2 py-1.5 text-[11px] text-gray-400">No match.</p>
                )}
                {filteredManagers.map((m) => {
                  const checked = filters.managerIds.includes(m.id);
                  return (
                    <label
                      key={m.id}
                      className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      {m.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.avatarUrl} alt={m.name} className="w-5 h-5 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[8px] font-semibold text-gray-500 shrink-0">
                          {m.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span className="text-[11px] text-gray-700 flex-1 truncate">{m.name}</span>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onFilterChange({ ...filters, managerIds: toggle(filters.managerIds, m.id) })}
                        className="rounded border-gray-300 text-[#0D1B2A] focus:ring-[#0D1B2A] shrink-0"
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
