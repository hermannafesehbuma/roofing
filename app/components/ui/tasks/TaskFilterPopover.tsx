'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Filter, Search } from 'lucide-react';
import { TaskStatus, TaskPriority } from '@/app/admin/(portal)/tasks/data';

interface TaskFilterPopoverProps {
  onFilterChange?: (filters: { status: TaskStatus[], priority: TaskPriority[], manager: string }) => void;
}

export function TaskFilterPopover({ onFilterChange }: TaskFilterPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const [selectedStatus, setSelectedStatus] = useState<TaskStatus[]>([]);
  const [selectedPriority, setSelectedPriority] = useState<TaskPriority[]>([]);
  const [managerSearch, setManagerSearch] = useState('');
  const [dueDateMode, setDueDateMode] = useState<string>('Today');

  const managers = ['Karen Brooks', 'Michael Chen', 'Aisha Patel', 'Liam O\'Sullivan', 'Nina Rodriguez'];
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

  const toggleStatus = (status: TaskStatus) => {
    setSelectedStatus(prev => 
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const togglePriority = (priority: TaskPriority) => {
    setSelectedPriority(prev => 
      prev.includes(priority) ? prev.filter(p => p !== priority) : [...prev, priority]
    );
  };

  return (
    <div className="relative" ref={popoverRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 bg-white shadow-sm font-medium"
      >
        <Filter className="w-4 h-4" /> Filter
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 p-5 z-50">
          <div className="mb-5">
            <h4 className="text-xs font-semibold text-gray-500 mb-2">Priority</h4>
            <div className="flex gap-2">
              {['High', 'Medium', 'Low'].map((p) => (
                <button
                  key={p}
                  onClick={() => togglePriority(p as TaskPriority)}
                  className={`flex-1 py-1.5 text-xs rounded-full border transition-colors ${
                    selectedPriority.includes(p as TaskPriority) 
                      ? 'bg-navy/5 border-navy/20 text-[#0A1629] font-medium' 
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <h4 className="text-xs font-semibold text-gray-500 mb-2">Status</h4>
            <div className="flex flex-wrap gap-2">
              {['To Do', 'In Progress', 'In Review', 'Completed'].map((s) => (
                <button
                  key={s}
                  onClick={() => toggleStatus(s as TaskStatus)}
                  className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                    selectedStatus.includes(s as TaskStatus) 
                      ? 'bg-navy/5 border-navy/20 text-[#0A1629] font-medium' 
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <h4 className="text-xs font-semibold text-gray-500 mb-2">Due Date</h4>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <select 
                value={dueDateMode}
                onChange={(e) => setDueDateMode(e.target.value)}
                className="w-full text-sm text-gray-700 bg-white px-3 py-2 border-none focus:ring-0 outline-none appearance-none"
              >
                <option value="Today">Today</option>
                <option value="Overdue">Overdue</option>
                <option value="Tomorrow">Tomorrow</option>
                <option value="Next 7 Days">Next 7 Days</option>
              </select>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-gray-500 mb-2">Manager</h4>
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
