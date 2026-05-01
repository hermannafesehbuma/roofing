'use client';

import { Project } from '@/app/admin/(portal)/projects/data';
import { CheckCircle2, Circle, MinusCircle } from 'lucide-react';
import { ActionsDropdown } from './ActionsDropdown';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface KanbanViewProps {
  projects: Project[];
  onDeleteClick: (project: Project) => void;
  onEditClick: (project: Project) => void;
}

export function KanbanView({ projects, onDeleteClick, onEditClick }: KanbanViewProps) {
  const completedProjects = projects.filter(p => p.status === 'Completed');
  const inProgressProjects = projects.filter(p => p.status === 'In Progress');
  const onHoldProjects = projects.filter(p => p.status === 'On Hold');

  return (
    <div className="flex gap-6 overflow-x-auto pb-4 h-full">
      <KanbanColumn title="Completed" count={completedProjects.length} projects={completedProjects}
        icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />}
        onDeleteClick={onDeleteClick} onEditClick={onEditClick} badgeColor="text-emerald-700 bg-emerald-50" />
      <KanbanColumn title="In Progress" count={inProgressProjects.length} projects={inProgressProjects}
        icon={<Circle className="w-5 h-5 text-amber-500 fill-amber-500/20" />}
        onDeleteClick={onDeleteClick} onEditClick={onEditClick} badgeColor="text-amber-700 bg-amber-50" />
      <KanbanColumn title="On Hold" count={onHoldProjects.length} projects={onHoldProjects}
        icon={<MinusCircle className="w-5 h-5 text-red-500" />}
        onDeleteClick={onDeleteClick} onEditClick={onEditClick} badgeColor="text-red-700 bg-red-50" />
    </div>
  );
}

function KanbanColumn({
  title,
  count,
  projects,
  icon,
  onDeleteClick,
  onEditClick,
  badgeColor
}: {
  title: string;
  count: number;
  projects: Project[];
  icon: React.ReactNode;
  onDeleteClick: (project: Project) => void;
  onEditClick: (project: Project) => void;
  badgeColor: string;
}) {
  const router = useRouter();

  return (
    <div className="min-w-[320px] w-full flex flex-col flex-1 bg-white rounded-xl border border-gray-100 shadow-sm p-4 h-max">
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-semibold text-gray-800">{title}</h3>
        </div>
        <span className="text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 text-gray-500">
          {count}
        </span>
      </div>

      <div className="flex flex-col gap-4">
        {projects.map(project => (
          <div key={project.id} className="bg-white border text-left border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
            <div className="h-32 w-full relative bg-gray-200">
              <Image 
                src={project.image} 
                alt={project.name}
                fill
                className="object-cover"
                sizes="320px"
              />
            </div>
            
            <div className="p-4">
              <div className="flex justify-between items-start mb-1 gap-2">
                <h4 className="font-semibold text-gray-900 text-sm leading-tight">{project.name}</h4>
                <ActionsDropdown
                  onDelete={() => onDeleteClick(project)}
                  onEdit={() => onEditClick(project)}
                  onView={() => router.push(`/admin/projects/${project.id}`)}
                />
              </div>
              <p className="text-xs text-gray-500 mb-4">{project.type} • {project.location}</p>
              
              <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs mb-4">
                <div className="text-gray-500">Status:</div>
                <div className="text-right">
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${badgeColor}`}>
                    ● {project.status}
                  </span>
                </div>
                
                <div className="text-gray-500">Manager:</div>
                <div className="text-right text-gray-900 font-medium">{project.manager}</div>
                
                <div className="text-gray-500">Client:</div>
                <div className="text-right text-gray-900 font-medium truncate" title={project.client}>{project.client}</div>
                
                <div className="text-gray-500">Due Date:</div>
                <div className="text-right text-gray-900 font-medium">{project.dueDate}</div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>Progress</span>
                <span>{project.progress}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div 
                  className="bg-[#0A1629] h-1.5 rounded-full" 
                  style={{ width: `${project.progress}%` }}
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
