'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Filter, Search } from 'lucide-react';
import { ProjectStatus, ProjectType } from '@/app/admin/(portal)/projects/data';

interface FilterPopoverProps {
  onFilterChange: (filters: { status: ProjectStatus[], type: ProjectType[], manager: string }) => void;
}

export function FilterPopover({ onFilterChange }: FilterPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const [selectedStatus, setSelectedStatus] = useState<ProjectStatus[]>([]);
  const [selectedType, setSelectedType] = useState<ProjectType[]>([]);
  const [managerSearch, setManagerSearch] = useState('');

  // Sample managers for the mockup
  const managers = ['Karen Brooks', 'Michael Chen', 'Aisha Patel', 'Liam O\'Sullivan', 'Nina Rodriguez', 'Derek Owens', 'David Park'];
  
  const filteredManagers = managers.filter(m => m.toLowerCase().includes(managerSearch.toLowerCase()));

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleStatus = (status: ProjectStatus) => {
    setSelectedStatus(prev => 
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const toggleType = (type: ProjectType) => {
    setSelectedType(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  // We notify parent when filters change. For full implementation, adding "Apply" button or auto-apply.
  // We'll auto-apply for simplicity.
  useEffect(() => {
    onFilterChange({ status: selectedStatus, type: selectedType, manager: '' }); 
    // Manager single-select could be implemented if needed, but mockup shows a list with checkboxes/radios.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStatus, selectedType]);

  return (
    <div className="relative" ref={popoverRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 bg-white shadow-sm font-medium"
      >
        <Filter className="w-4 h-4" /> Filter
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-100 p-4 z-50">
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2 px-1">Status</h4>
            <div className="flex flex-wrap gap-2">
              {['In Progress', 'On Hold', 'Completed'].map((s) => (
                <button
                  key={s}
                  onClick={() => toggleStatus(s as ProjectStatus)}
                  className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                    selectedStatus.includes(s as ProjectStatus) 
                      ? 'bg-navy/5 border-navy/20 text-[#0A1629] font-medium' 
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2 px-1">Type</h4>
            <div className="flex flex-wrap gap-2">
              {['Residential', 'Commercial'].map((t) => (
                <button
                  key={t}
                  onClick={() => toggleType(t as ProjectType)}
                  className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                    selectedType.includes(t as ProjectType) 
                      ? 'bg-navy/5 border-navy/20 text-[#0A1629] font-medium' 
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2 px-1">Manager</h4>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="flex items-center px-3 py-2 border-b border-gray-100 bg-gray-50/50">
                <Search className="w-4 h-4 text-gray-400 mr-2" />
                <input 
                  type="text" 
                  placeholder="Search" 
                  className="bg-transparent border-none outline-none text-sm w-full text-gray-700"
                  value={managerSearch}
                  onChange={(e) => setManagerSearch(e.target.value)}
                />
              </div>
              <div className="max-h-40 overflow-y-auto p-1">
                {filteredManagers.map(m => (
                  <label key={m} className="flex items-center justify-between px-2 py-2 hover:bg-gray-50 rounded cursor-pointer group">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-bold">
                        {m.charAt(0)}
                      </div>
                      <span className="text-sm text-gray-700">{m}</span>
                    </div>
                    <input type="checkbox" className="rounded border-gray-300 text-[#0A1629] focus:ring-[#0A1629]" />
                  </label>
                ))}
              </div>
            </div>
          </div>
          
        </div>
      )}
    </div>
  );
}
