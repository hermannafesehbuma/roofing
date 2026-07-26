'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Project } from '../data';
import { EditProjectModal } from '@/app/components/ui/EditProjectModal';
import { ProjectDetailHeader } from '@/app/components/ui/projects/ProjectDetailHeader';
import { OverviewTab } from '@/app/components/ui/projects/OverviewTab';
import { TimelineTab } from '@/app/components/ui/projects/TimelineTab';
import { WorkOrdersTab } from '@/app/components/ui/projects/WorkOrdersTab';
import { TeamTab } from '@/app/components/ui/projects/TeamTab';
import { DocumentsTab } from '@/app/components/ui/projects/DocumentsTab';
import { InvoicesTab } from '@/app/components/ui/projects/InvoicesTab';
import { MobileHeader } from '@/app/components/ui/mobile/MobileHeader';

interface ProjectDetailClientProps {
  project: Project;
}

type TabType = 'Overview' | 'Timeline' | 'Team' | 'Work Orders' | 'Documents' | 'Invoices';

const tabs: TabType[] = ['Overview', 'Timeline', 'Team', 'Work Orders', 'Documents', 'Invoices'];

export function ProjectDetailClient({ project }: ProjectDetailClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('Overview');
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#F4F6F9]">
      <EditProjectModal
        project={isEditing ? project : null}
        onClose={() => setIsEditing(false)}
        onSave={() => {
          // The modal has already written to the DB; refetch on the server so
          // the manager / client joins match the new ids rather than showing
          // the previous names.
          setIsEditing(false);
          router.refresh();
        }}
      />

      <MobileHeader title={project.name} backHref="/admin/projects" />

      <div className="hidden md:flex items-center justify-between px-8 py-4 bg-white border-b border-gray-100 flex-none">
         {/* Minimal Top Header if required, though the screenshot has standard dashboard topbar. We'll skip here since the layout should inject the topbar. */}
         <div className="w-full h-10"></div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <ProjectDetailHeader project={project} onEdit={() => setIsEditing(true)} />

        {/* Tab Navigation — scrolls sideways on phones rather than wrapping. */}
        <div className="px-4 md:px-8 border-b border-gray-100 bg-white sticky top-0 z-40 shadow-sm">
          <div className="flex items-center gap-6 md:gap-8 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 text-xs md:text-sm font-semibold whitespace-nowrap transition-colors border-b-2 ${
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
          {activeTab === 'Timeline' && <TimelineTab project={project} />}
          {activeTab === 'Work Orders' && <WorkOrdersTab project={project} />}
          {activeTab === 'Team' && <TeamTab project={project} />}
          {activeTab === 'Documents' && <DocumentsTab project={project} />}
          {activeTab === 'Invoices' && <InvoicesTab project={project} />}
        </div>
      </div>
    </div>
  );
}
