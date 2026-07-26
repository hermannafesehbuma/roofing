'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Project, PriorityLevel } from '@/app/admin/(portal)/projects/data';
import { MoreHorizontal, Plus, ChevronUp } from 'lucide-react';
import Image from 'next/image';

interface WorkOrdersTabProps {
  project: Project;
}

type MenuStatus = 'Approved' | 'In Review' | 'Opened';

const STATUS_OPTIONS: { value: MenuStatus; dot: string }[] = [
  { value: 'Approved', dot: 'bg-emerald-500' },
  { value: 'In Review', dot: 'bg-amber-500' },
  { value: 'Opened', dot: 'bg-blue-500' },
];

const PRIORITY_OPTIONS: { value: PriorityLevel; dot: string }[] = [
  { value: 'High', dot: 'bg-red-500' },
  { value: 'Mid', dot: 'bg-amber-500' },
  { value: 'Low', dot: 'bg-blue-500' },
];

const STATUS_BADGE: Record<MenuStatus, string> = {
  Approved: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  'In Review': 'text-amber-700 bg-amber-50 border-amber-200',
  Opened: 'text-blue-700 bg-blue-50 border-blue-200',
};

const PRIORITY_TEXT: Record<PriorityLevel, string> = {
  High: 'text-red-500',
  Mid: 'text-amber-500',
  Low: 'text-blue-500',
};

function Radio({ checked }: { checked: boolean }) {
  return (
    <span
      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
        checked ? 'border-[#0A1629]' : 'border-gray-300'
      }`}
    >
      {checked && <span className="w-2 h-2 rounded-full bg-[#0A1629] block" />}
    </span>
  );
}

export function WorkOrdersTab({ project }: WorkOrdersTabProps) {
  const workOrders = project.details?.workOrders || [];

  const [activePopover, setActivePopover] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Record<string, MenuStatus>>({});
  const [priorities, setPriorities] = useState<Record<string, PriorityLevel>>({});
  const [collapsed, setCollapsed] = useState<{ status: boolean; priority: boolean }>({ status: false, priority: false });
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setActivePopover(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 md:p-6 m-4 md:m-6 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900 mb-6">Work Orders</h3>

      <div className="overflow-x-auto relative min-h-[400px]">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="border-b border-gray-100 text-xs font-semibold text-gray-400">
              <th className="pb-4 font-semibold w-32">Work ID</th>
              <th className="pb-4 font-semibold">Name</th>
              <th className="pb-4 font-semibold w-32 text-center">Priority</th>
              <th className="pb-4 font-semibold w-32 text-center">Status</th>
              <th className="pb-4 font-semibold w-48 text-center">Technician</th>
              <th className="pb-4 font-semibold w-16 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {workOrders.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-500 text-sm">No work orders recorded.</td>
              </tr>
            )}

            {workOrders.map((wo) => {
              const status = statuses[wo.id] ?? (wo.status === 'Closed' ? 'Approved' : 'Opened');
              const priority = priorities[wo.id] ?? wo.priority;
              const isOpen = activePopover === wo.id;

              return (
                <tr key={wo.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="py-4 text-sm text-gray-600">{wo.code ?? wo.id}</td>
                  <td className="py-4 text-sm font-medium text-gray-900">{wo.name}</td>
                  <td className="py-4 text-sm text-center font-medium">
                    <span className={PRIORITY_TEXT[priority]}>{priority}</span>
                  </td>
                  <td className="py-4 text-center relative">
                    <button
                      onClick={() => setActivePopover(isOpen ? null : wo.id)}
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border transition-colors hover:shadow-sm ${STATUS_BADGE[status]}`}
                    >
                      {status}
                    </button>
                  </td>
                  <td className="py-4 text-center">
                    <div className="flex justify-center items-center relative">
                      {wo.technician ? (
                        <button
                          className="flex items-center gap-2 px-3 py-1 rounded-full border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => setActivePopover(isOpen ? null : wo.id)}
                        >
                          <div className="w-5 h-5 rounded-full overflow-hidden relative bg-gray-200">
                            {wo.technician.avatar && (
                              <Image src={wo.technician.avatar} alt={wo.technician.name} fill sizes="20px" className="object-cover" />
                            )}
                          </div>
                          <span className="text-xs font-medium text-gray-900">{wo.technician.name}</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => setActivePopover(isOpen ? null : wo.id)}
                          className="flex items-center gap-1 px-3 py-1 text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                        >
                          <Plus className="w-3 h-3" /> Assign Staff
                        </button>
                      )}

                      {isOpen && (
                        <div
                          ref={popoverRef}
                          className="absolute top-9 right-0 w-60 bg-white rounded-xl shadow-xl border border-gray-100 py-3 z-50 text-left"
                        >
                          {/* Change Status */}
                          <div className="px-4 pb-3 border-b border-gray-100">
                            <button
                              onClick={() => setCollapsed((c) => ({ ...c, status: !c.status }))}
                              className="w-full flex items-center justify-between mb-2"
                            >
                              <span className="text-xs font-semibold text-gray-700 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 block" /> Change Status
                              </span>
                              <ChevronUp
                                className={`w-4 h-4 text-gray-400 transition-transform ${collapsed.status ? 'rotate-180' : ''}`}
                              />
                            </button>
                            {!collapsed.status && (
                              <div className="space-y-1">
                                {STATUS_OPTIONS.map((option) => (
                                  <button
                                    key={option.value}
                                    onClick={() => setStatuses((s) => ({ ...s, [wo.id]: option.value }))}
                                    className="w-full flex items-center justify-between py-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
                                  >
                                    <span className="flex items-center gap-2">
                                      <span className={`w-1.5 h-1.5 rounded-full block ${option.dot}`} /> {option.value}
                                    </span>
                                    <Radio checked={status === option.value} />
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Priority */}
                          <div className="px-4 pt-3">
                            <button
                              onClick={() => setCollapsed((c) => ({ ...c, priority: !c.priority }))}
                              className="w-full flex items-center justify-between mb-2"
                            >
                              <span className="text-xs font-semibold text-gray-700 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-red-500 block" /> Priority
                              </span>
                              <ChevronUp
                                className={`w-4 h-4 text-gray-400 transition-transform ${collapsed.priority ? 'rotate-180' : ''}`}
                              />
                            </button>
                            {!collapsed.priority && (
                              <div className="space-y-1">
                                {PRIORITY_OPTIONS.map((option) => (
                                  <button
                                    key={option.value}
                                    onClick={() => setPriorities((p) => ({ ...p, [wo.id]: option.value }))}
                                    className="w-full flex items-center justify-between py-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
                                  >
                                    <span className="flex items-center gap-2">
                                      <span className={`w-1.5 h-1.5 rounded-full block ${option.dot}`} /> {option.value}
                                    </span>
                                    <Radio checked={priority === option.value} />
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-4 text-right">
                    <button className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
