'use client';

import React from 'react';
import { Project } from '@/app/admin/(portal)/projects/data';

interface OverviewTabProps {
  project: Project;
}

export function OverviewTab({ project }: OverviewTabProps) {
  const details = project.details;

  if (!details) {
    return <div className="p-8 text-gray-500">More detailed information is not available for this project.</div>;
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6 p-6">
      
      {/* Budget Circle Chart */}
      <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm flex items-center justify-between">
        <div className="relative w-48 h-48 flex items-center justify-center">
          <div 
            className="absolute inset-0 rounded-full"
            style={{ 
              background: `conic-gradient(#0A1629 ${details.budgetUsedPercent}%, #F3F4F6 0)` 
            }}
          ></div>
          <div className="absolute inset-4 rounded-full bg-white flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-gray-900">{details.budgetUsedPercent}%</span>
            <span className="text-xs text-gray-500">Budget Used</span>
          </div>
        </div>
        
        <div className="pl-8 space-y-6">
          <div>
            <div className="text-sm text-gray-500 mb-1">Total Budget</div>
            <div className="text-xl font-bold text-gray-900">${details.totalBudget.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">Spent</div>
            <div className="text-xl font-bold text-gray-900">${details.spent.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">Remaining</div>
            <div className="text-xl font-bold text-gray-900">${details.remaining.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Project Info Table/List */}
      <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 mb-6">Project Info</h3>
        
        <div className="space-y-4">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">Project ID</span>
            <span className="font-medium text-gray-900">{project.id}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">Type</span>
            <span className="font-medium text-gray-900">{project.type}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">Status</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border text-amber-700 bg-amber-50 border-amber-200">
              ● {project.status}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">Client</span>
            <span className="font-medium text-gray-900">{project.client}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">Manager</span>
            <span className="font-medium text-gray-900">{project.manager}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">Location</span>
            <span className="font-medium text-gray-900">{project.location}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">Start</span>
            <span className="font-medium text-gray-900">{details.startDate}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">End</span>
            <span className="font-medium text-gray-900">{project.dueDate}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">Crew Size</span>
            <span className="font-medium text-gray-900">{details.crewSize} members</span>
          </div>
        </div>
      </div>

    </div>
  );
}
