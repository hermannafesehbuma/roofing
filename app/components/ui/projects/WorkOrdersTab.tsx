'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Project, WorkOrder, PriorityLevel, WorkOrderStatus } from '@/app/admin/(portal)/projects/data';
import { MoreHorizontal, Plus } from 'lucide-react';
import Image from 'next/image';

interface WorkOrdersTabProps {
  project: Project;
}

export function WorkOrdersTab({ project }: WorkOrdersTabProps) {
  const workOrders = project.details?.workOrders || [];
  
  const [activePopover, setActivePopover] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setActivePopover(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 m-6 shadow-sm">
      <h3 className="text-sm font-bold text-gray-900 mb-6">Work Orders</h3>
      
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
              
              let priorityColor = '';
              if (wo.priority === 'High') priorityColor = 'text-red-500';
              if (wo.priority === 'Mid') priorityColor = 'text-amber-500';
              if (wo.priority === 'Low') priorityColor = 'text-blue-500';

              let statusColor = '';
              if (wo.status === 'Open') statusColor = 'text-blue-700 bg-blue-50 border-blue-200';
              if (wo.status === 'Closed') statusColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';

              return (
                <tr key={wo.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="py-4 text-sm text-gray-600">{wo.id}</td>
                  <td className="py-4 text-sm font-medium text-gray-900">{wo.name}</td>
                  <td className="py-4 text-sm text-center font-medium">
                    <span className={priorityColor}>{wo.priority}</span>
                  </td>
                  <td className="py-4 text-center relative">
                     <button className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border transition-colors hover:shadow-sm ${statusColor}`}>
                      {wo.status}
                     </button>
                  </td>
                  <td className="py-4 text-center">
                    <div className="flex justify-center items-center relative">
                      {wo.technician ? (
                        <div 
                          className="flex items-center gap-2 px-3 py-1 rounded-full border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => setActivePopover(activePopover === `tech-${wo.id}` ? null : `tech-${wo.id}`)}
                        >
                          <div className="w-5 h-5 rounded-full overflow-hidden relative bg-gray-200">
                             {wo.technician.avatar && (
                               <Image src={wo.technician.avatar} alt={wo.technician.name} fill sizes="20px" className="object-cover" />
                             )}
                          </div>
                          <span className="text-xs font-medium text-gray-900">{wo.technician.name}</span>
                        </div>
                      ) : (
                        <button className="flex items-center gap-1 px-3 py-1 text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors">
                           <Plus className="w-3 h-3" /> Assign Staff
                        </button>
                      )}

                      {/* Mockup Popover for Change Status/Priority/Tech */}
                      {activePopover === `tech-${wo.id}` && (
                        <div 
                          ref={popoverRef}
                          className="absolute top-10 right-0 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-3 z-50 text-left"
                        >
                           <div className="px-4 pb-2 border-b border-gray-100">
                             <div className="text-xs font-semibold text-gray-500 flex items-center gap-2 mb-2">
                               <span className="w-2 h-2 rounded-full bg-emerald-500 block"></span> Change Status
                             </div>
                             <div className="space-y-1">
                               <label className="flex items-center justify-between py-1 text-sm text-gray-700 hover:text-gray-900 cursor-pointer">
                                  Approved <input type="radio" name={`status-${wo.id}`} className="accent-[#0A1629]" />
                               </label>
                               <label className="flex items-center justify-between py-1 text-sm text-gray-700 hover:text-gray-900 cursor-pointer">
                                  In Review <input type="radio" name={`status-${wo.id}`} className="accent-[#0A1629]" />
                               </label>
                               <label className="flex items-center justify-between py-1 text-sm text-gray-700 hover:text-gray-900 cursor-pointer">
                                  Opened <input type="radio" name={`status-${wo.id}`} defaultChecked className="accent-[#0A1629]" />
                               </label>
                             </div>
                           </div>

                           <div className="px-4 pt-3">
                             <div className="text-xs font-semibold text-gray-500 mb-2">Priority</div>
                             <div className="space-y-1">
                               <label className="flex items-center justify-between py-1 text-sm text-gray-700 hover:text-gray-900 cursor-pointer">
                                  <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-red-500 block relative"><span className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-50"></span></span> High</span> 
                                  <input type="radio" name={`pri-${wo.id}`} className="accent-[#0A1629]" defaultChecked={wo.priority === 'High'} />
                               </label>
                               <label className="flex items-center justify-between py-1 text-sm text-gray-700 hover:text-gray-900 cursor-pointer">
                                  <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 block"></span> Mid</span> 
                                  <input type="radio" name={`pri-${wo.id}`} className="accent-[#0A1629]" defaultChecked={wo.priority === 'Mid'} />
                               </label>
                               <label className="flex items-center justify-between py-1 text-sm text-gray-700 hover:text-gray-900 cursor-pointer">
                                  <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 block"></span> Low</span> 
                                  <input type="radio" name={`pri-${wo.id}`} className="accent-[#0A1629]" defaultChecked={wo.priority === 'Low'} />
                               </label>
                             </div>
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
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
