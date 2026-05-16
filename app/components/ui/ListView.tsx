'use client';

import { Project } from '@/app/admin/(portal)/projects/data';
import { ActionsDropdown } from './ActionsDropdown';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface ListViewProps {
  projects: Project[];
  onDeleteClick: (project: Project) => void;
  onEditClick: (project: Project) => void;
}

export function ListView({ projects, onDeleteClick, onEditClick }: ListViewProps) {
  const router = useRouter();

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wider bg-gray-50/50">
              <th className="p-4 font-semibold w-12"><input type="checkbox" className="rounded border-gray-300" /></th>
              <th className="p-4 font-semibold min-w-[250px]">Project</th>
              <th className="p-4 font-semibold">Type</th>
              <th className="p-4 font-semibold">Manager</th>
              <th className="p-4 font-semibold">Client</th>
              <th className="p-4 font-semibold w-40">Progress</th>
              <th className="p-4 font-semibold">Due Date</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {projects.map((p) => {
              
              let badgeColor = '';
              let badgeText = '';
              if (p.status === 'completed') {
                badgeColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
                badgeText = 'Completed';
              } else if (p.status === 'in_progress') {
                badgeColor = 'text-amber-700 bg-amber-50 border-amber-200';
                badgeText = 'In Progress';
              } else {
                badgeColor = 'text-red-700 bg-red-50 border-red-200';
                badgeText = 'On Hold';
              }

              return (
                <tr key={p.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="p-4">
                    <input type="checkbox" className="rounded border-gray-300" />
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 relative bg-gray-200">
                        <Image src={p.image_url || 'https://images.unsplash.com/photo-1632759145355-6b5d27ffc264?w=500&h=300&fit=crop'} alt={p.name} fill className="object-cover" sizes="40px" />
                      </div>
                      <div>
                        <div className="font-medium text-sm text-gray-900 group-hover:text-[#0A1629] transition-colors">{p.name}</div>
                        <div className="text-xs text-gray-400">{p.code}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-gray-600 capitalize">{p.type}</td>
                  <td className="p-4 text-sm text-gray-900 font-medium">
                    {p.manager ? `${p.manager.first_name} ${p.manager.last_name}` : 'Unassigned'}
                  </td>
                  <td className="p-4 text-sm text-gray-600">{p.client?.name || 'No Client'}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                       <div className="w-full bg-gray-100 rounded-full h-1.5 flex-1">
                          <div 
                            className="bg-[#0A1629] h-1.5 rounded-full" 
                            style={{ width: `${p.progress}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-500 w-8 text-right">{p.progress}%</span>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-gray-600">{p.due_date}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2 py-1 object-fit rounded-md text-[10px] font-bold border ${badgeColor}`}>
                      {badgeText}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <ActionsDropdown
                      onDelete={() => onDeleteClick(p)}
                      onEdit={() => onEditClick(p)}
                      onView={() => router.push(`/admin/projects/${p.id}`)}
                    />
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
