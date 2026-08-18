'use client';

import { Project } from '@/app/admin/(portal)/projects/data';
import { Check, Loader, CirclePause } from 'lucide-react';
import { ActionsDropdown } from './ActionsDropdown';
import { useEntry } from './animations';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface KanbanViewProps {
  projects: Project[];
  onDeleteClick: (project: Project) => void;
  onEditClick: (project: Project) => void;
}

export function KanbanView({ projects, onDeleteClick, onEditClick }: KanbanViewProps) {
  const completedProjects = projects.filter(p => p.status === 'completed');
  const inProgressProjects = projects.filter(p => p.status === 'in_progress');
  const onHoldProjects = projects.filter(p => p.status === 'on_hold');

  return (
    <div className="flex gap-6 overflow-x-auto pb-4 h-full">
      {/* Column icons mirror the design: a filled green check box, an amber
          activity spinner, and a red pause ring. */}
      <KanbanColumn title="Completed" count={completedProjects.length} projects={completedProjects}
        icon={
          // Built from a rounded div rather than lucide's SquareCheck, whose
          // corner radius is too tight to match the design.
          <span className="w-5 h-5 rounded-md bg-emerald-500 flex items-center justify-center shrink-0">
            <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
          </span>
        }
        onDeleteClick={onDeleteClick} onEditClick={onEditClick} badgeColor="text-emerald-700 bg-emerald-50" />
      <KanbanColumn title="In Progress" count={inProgressProjects.length} projects={inProgressProjects}
        icon={<Loader className="w-5 h-5 text-amber-500" strokeWidth={2.5} />}
        onDeleteClick={onDeleteClick} onEditClick={onEditClick} badgeColor="text-amber-700 bg-amber-50" />
      <KanbanColumn title="On Hold" count={onHoldProjects.length} projects={onHoldProjects}
        icon={<CirclePause className="w-5 h-5 text-red-500" strokeWidth={2.5} />}
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
  const enter = useEntry();

  return (
    <div className="min-w-[320px] w-full flex flex-col flex-1 h-max">
      <div className="flex items-center justify-between mb-4 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-semibold text-sm text-gray-800">{title}</h3>
        </div>
        <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${badgeColor}`}>
          {count}
        </span>
      </div>

      <div className="flex flex-col gap-5">
        {projects.map((project, i) => (
          <div
            key={project.id}
            {...enter.item(i, 'relative bg-white border text-left border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow p-3')}
          >
            <div>
              {/* Rounded on all four corners: the image floats inside the card's
                  padding rather than being flush with any edge. */}
              <div className="h-32 w-full relative bg-gray-200 rounded-lg overflow-hidden">
                <Image
                  src={project.image_url || 'https://images.unsplash.com/photo-1632759145355-6b5d27ffc264?w=500&h=300&fit=crop'}
                  alt={project.name}
                  fill
                  className="object-cover"
                  sizes="320px"
                />
              </div>

              <div className="pt-4">
                <div className="flex justify-between items-start mb-1 gap-2">
                  <h4 className="font-semibold text-gray-900 text-sm leading-tight">{project.name}</h4>
                  <ActionsDropdown
                    onDelete={() => onDeleteClick(project)}
                    onEdit={() => onEditClick(project)}
                    onView={() => router.push(`/admin/projects/${project.id}`)}
                  />
                </div>
                <p className="text-xs text-gray-500 pb-3 mb-3 border-b border-gray-100 capitalize">{project.type} • {project.location}</p>

                <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs pb-3 mb-3 border-b border-gray-100">
                  <div className="text-gray-500">Status:</div>
                  <div className="text-right">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium capitalize ${badgeColor}`}>
                      ● {project.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="text-gray-500">Manager:</div>
                  <div className="text-right text-gray-900 font-medium">
                    {project.manager ? `${project.manager.first_name} ${project.manager.last_name}` : 'Unassigned'}
                  </div>

                  <div className="text-gray-500">Client:</div>
                  <div className="text-right text-gray-900 font-medium truncate" title={project.client?.name}>
                    {project.client?.name || 'No Client'}
                  </div>

                  <div className="text-gray-500">Due Date:</div>
                  <div className="text-right text-gray-900 font-medium">{project.due_date}</div>
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
          </div>
        ))}
        {projects.length === 0 && (
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center text-[11px] text-gray-400">No projects</div>
        )}
      </div>
    </div>
  );
}
