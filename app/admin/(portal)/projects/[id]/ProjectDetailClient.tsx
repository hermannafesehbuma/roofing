'use client';

import React, { useState } from 'react';
import { Project } from '../data';
import { ProjectDetailHeader } from '@/app/components/ui/projects/ProjectDetailHeader';
import { OverviewTab } from '@/app/components/ui/projects/OverviewTab';
import { TimelineTab } from '@/app/components/ui/projects/TimelineTab';
import { WorkOrdersTab } from '@/app/components/ui/projects/WorkOrdersTab';
import { TeamTab } from '@/app/components/ui/projects/TeamTab';

interface ProjectDetailClientProps {
  project: Project;
}

type TabType = 'Overview' | 'Timeline' | 'Team' | 'Work Orders' | 'Documents' | 'Invoices';

const tabs: TabType[] = ['Overview', 'Timeline', 'Team', 'Work Orders', 'Documents', 'Invoices'];

export function ProjectDetailClient({ project }: ProjectDetailClientProps) {
  const [activeTab, setActiveTab] = useState<TabType>('Overview');

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#F4F6F9]">
      <div className="flex items-center justify-between px-8 py-4 bg-white border-b border-gray-100 flex-none">
         {/* Minimal Top Header if required, though the screenshot has standard dashboard topbar. We'll skip here since the layout should inject the topbar. */}
         <div className="w-full h-10"></div> 
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <ProjectDetailHeader project={project} />

        {/* Tab Navigation */}
        <div className="px-8 border-b border-gray-100 bg-white sticky top-0 z-40 shadow-sm">
          <div className="flex items-center gap-8">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 text-sm font-semibold transition-colors border-b-2 ${
                  activeTab === tab
                    ? 'border-[#0A1629] text-[#0A1629]'
                    : 'border-transparent text-gray-400 hover:text-gray-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="pb-12 max-w-7xl mx-auto w-full">
          {activeTab === 'Overview' && <OverviewTab project={project} />}
          {activeTab === 'Timeline' && <TimelineTab />}
          {activeTab === 'Work Orders' && <WorkOrdersTab project={project} />}
          {activeTab === 'Team' && <TeamTab project={project} />}
          {(activeTab === 'Documents' || activeTab === 'Invoices') && (
            <div className="p-12 text-center text-gray-500 bg-white rounded-2xl border border-gray-100 m-6 border-dashed">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Coming Soon</h3>
              <p>The {activeTab} section is currently under construction.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
