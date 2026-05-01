'use client';

import React from 'react';
import { KanbanTask } from '@/app/admin/(portal)/tasks/data';
import { ActionsDropdown } from '@/app/components/ui/ActionsDropdown';
import Image from 'next/image';

interface TasksListViewProps {
  tasks: KanbanTask[];
  onDeleteClick: (task: KanbanTask) => void;
}

export function TasksListView({ tasks, onDeleteClick }: TasksListViewProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead>
            <tr className="border-b border-gray-100 text-xs font-semibold text-gray-500 bg-gray-50/50">
              <th className="p-4 w-12"><input type="checkbox" className="rounded border-gray-300" /></th>
              <th className="p-4 w-[25%]">Task</th>
              <th className="p-4">Project</th>
              <th className="p-4">Assignee</th>
              <th className="p-4">Priority</th>
              <th className="p-4">Due Date</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tasks.map((t) => {
              
              let statusColor = '';
              if (t.status === 'Completed') statusColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
              else if (t.status === 'In Progress') statusColor = 'text-blue-700 bg-blue-50 border-blue-200';
              else if (t.status === 'In Review') statusColor = 'text-amber-700 bg-amber-50 border-amber-200';
              else statusColor = 'text-gray-700 bg-gray-50 border-gray-200'; // To Do

              return (
                <tr key={t.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="p-4">
                    <input type="checkbox" className="rounded border-gray-300" defaultChecked={t.status === 'Completed'} />
                  </td>
                  <td className="p-4">
                    <div className={`font-medium text-sm text-gray-900 group-hover:text-[#0A1629] transition-colors ${t.status === 'Completed' ? 'line-through text-gray-400' : ''}`}>
                      {t.name}
                    </div>
                    <div className="text-xs text-gray-400 truncate max-w-[250px]">{t.description}</div>
                  </td>
                  <td className="p-4 text-sm text-gray-500">{t.projectName}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                       <div className="w-6 h-6 rounded-full overflow-hidden relative bg-gray-200">
                          <Image src={t.assignee.avatar} alt={t.assignee.name} fill sizes="24px" className="object-cover" />
                       </div>
                       <span className="text-sm font-medium text-gray-900">{t.assignee.name}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border
                       ${t.priority === 'High' ? 'text-red-600 bg-red-50 border-red-200' : 
                         t.priority === 'Medium' ? 'text-amber-600 bg-amber-50 border-amber-200' : 
                         'text-blue-600 bg-blue-50 border-blue-200'}`}>
                       {t.priority}
                     </span>
                  </td>
                  <td className="p-4 text-sm text-gray-600">{t.dueDate}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold border ${statusColor}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <ActionsDropdown onDelete={() => onDeleteClick(t)} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      
      {/* Pagination Footer */}
      <div className="mt-auto p-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
        <button className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50">
          ← Previous
        </button>
        <div className="flex gap-1">
          <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 text-gray-900 font-medium">1</button>
          <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-50">2</button>
          <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-50">3</button>
          <span className="w-8 h-8 flex items-center justify-center">...</span>
          <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-50">8</button>
          <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-50">9</button>
          <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-50">10</button>
        </div>
        <button className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
           Next →
        </button>
      </div>
    </div>
  );
}
