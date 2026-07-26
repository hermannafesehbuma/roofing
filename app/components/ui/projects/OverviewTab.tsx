'use client';

import React from 'react';
import { Project } from '@/app/admin/(portal)/projects/data';

interface OverviewTabProps {
  project: Project;
}

const STATUS_STYLES: Record<Project['status'], string> = {
  in_progress: 'text-amber-700 bg-amber-50 border-amber-200',
  completed: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  on_hold: 'text-gray-600 bg-gray-50 border-gray-200',
};

/** Dates arrive as ISO from Supabase but as display strings from mock data. */
function formatDate(value?: string | null) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function OverviewTab({ project }: OverviewTabProps) {
  const details = project.details;

  if (!details) {
    return <div className="p-8 text-gray-500">More detailed information is not available for this project.</div>;
  }

  return (
    <div className="grid lg:grid-cols-2 gap-4 md:gap-6 p-4 md:p-6">
      
      {/* Budget Circle Chart */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 md:p-8 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="relative w-48 h-48 flex items-center justify-center">
          <div 
            className="absolute inset-0 rounded-full"
            style={{ 
              background: `conic-gradient(#0A1629 ${details.budgetUsedPercent}%, #F3F4F6 0)` 
            }}
          ></div>
          <div className="absolute inset-4 rounded-full bg-white flex flex-col items-center justify-center">
            <span className="text-2xl font-semibold text-gray-900">{details.budgetUsedPercent}%</span>
            <span className="text-xs text-gray-500">Budget Used</span>
          </div>
        </div>
        
        <div className="sm:pl-8 w-full sm:w-auto space-y-4 md:space-y-6">
          <div>
            <div className="text-sm text-gray-500 mb-1">Total Budget</div>
            <div className="text-xl font-semibold text-gray-900">${details.totalBudget.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">Spent</div>
            <div className="text-xl font-semibold text-gray-900">${details.spent.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">Remaining</div>
            <div className="text-xl font-semibold text-gray-900">${details.remaining.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Project Info Table/List */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 md:p-8 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 md:mb-6">Project Info</h3>
        
        <div className="space-y-4">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">Project ID</span>
            <span className="font-medium text-gray-900">{project.code ?? project.id}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">Type</span>
            <span className="font-medium text-gray-900 capitalize">{project.type}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">Status</span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${STATUS_STYLES[project.status]}`}>
              ● {project.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">Client</span>
            <span className="font-medium text-gray-900">{project.client?.name ?? 'Unknown'}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">Manager</span>
            <span className="font-medium text-gray-900">{project.manager ? `${project.manager.first_name} ${project.manager.last_name}` : 'Unassigned'}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">Location</span>
            <span className="font-medium text-gray-900">{project.location}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">Start</span>
            <span className="font-medium text-gray-900">{formatDate(details.startDate)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">End</span>
            <span className="font-medium text-gray-900">{formatDate(project.due_date)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">Crew Size</span>
            <span className="font-medium text-gray-900">
              {details.crewSize} {details.crewSize === 1 ? 'member' : 'members'}
            </span>
          </div>
        </div>
      </div>

    </div>
  );
}
