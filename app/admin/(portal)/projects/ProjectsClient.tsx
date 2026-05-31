'use client';

import { useState, useMemo } from 'react';
import { Project, ProjectStatus, ProjectType } from './data';
import { KanbanView } from '@/app/components/ui/KanbanView';
import { ListView } from '@/app/components/ui/ListView';
import { FilterPopover } from '@/app/components/ui/FilterPopover';
import { DeleteModal } from '@/app/components/ui/DeleteModal';
import { NewProjectModal } from '@/app/components/ui/NewProjectModal';
import { EditProjectModal } from '@/app/components/ui/EditProjectModal';
import { KanbanSquare, List, Search, Download, Plus, Loader2 } from 'lucide-react'
import UserHeaderBadge from '@/app/components/ui/UserHeaderBadge';
import Image from 'next/image';
import { getProjects, deleteProject } from './actions';

type ViewMode = 'kanban' | 'list';

export function ProjectsClient({ initialProjects }: { initialProjects: Project[] }) {
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [projectsData, setProjectsData] = useState<Project[]>(initialProjects);
  const [loading, setLoading] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [showNewProject, setShowNewProject] = useState(false);

  const fetchProjects = async () => {
    setLoading(true);
    const data = await getProjects();
    setProjectsData(data);
    setLoading(false);
  };
  
  const [activeFilters, setActiveFilters] = useState<{
    status: ProjectStatus[];
    type: ProjectType[];
    manager: string;
  }>({
    status: [],
    type: [],
    manager: ''
  });

  const filteredProjects = useMemo(() => {
    return projectsData.filter((p) => {
      // Search
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (p.client?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            p.code.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Filters
      const matchesStatus = activeFilters.status.length === 0 || activeFilters.status.includes(p.status);
      const matchesType = activeFilters.type.length === 0 || activeFilters.type.includes(p.type);
      const matchesManager = !activeFilters.manager || 
        `${p.manager?.first_name} ${p.manager?.last_name}`.toLowerCase().includes(activeFilters.manager.toLowerCase());

      return matchesSearch && matchesStatus && matchesType && matchesManager;
    });
  }, [projectsData, searchQuery, activeFilters]);

  const handleDeleteConfirm = async () => {
    if (projectToDelete) {
      const res = await deleteProject(projectToDelete.id);
      if ('error' in res) {
        alert(res.error);
      } else {
        setProjectsData(prev => prev.filter(p => p.id !== projectToDelete.id));
        setProjectToDelete(null);
      }
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#F4F6F9]">
      {/* Header section */}
      <div className="flex-none px-8 py-6 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
            <p className="text-gray-500 text-sm mt-1">Manage all your projects, timelines, and team assignments in one place.</p>
          </div>
          <div className="flex items-center gap-4">
            <UserHeaderBadge />
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* View Toggle */}
            <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
              <button
                onClick={() => setViewMode('kanban')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'kanban' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <KanbanSquare className="w-4 h-4" /> Kanban
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <List className="w-4 h-4" /> List
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-white hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0A1629]/20 focus:border-[#0A1629] w-64 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <FilterPopover onFilterChange={setActiveFilters} />
            
            <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 bg-white shadow-sm font-medium">
              <Download className="w-4 h-4" /> Import/Export
            </button>

            <button
              onClick={() => setShowNewProject(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#0A1629] text-white rounded-lg text-sm font-medium hover:bg-[#152844] shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" /> New Projects
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden p-8">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-[#0A1629]" />
          </div>
        ) : (
          viewMode === 'kanban' ? (
            <KanbanView projects={filteredProjects} onDeleteClick={setProjectToDelete} onEditClick={setProjectToEdit} />
          ) : (
            <ListView projects={filteredProjects} onDeleteClick={setProjectToDelete} onEditClick={setProjectToEdit} />
          )
        )}
      </div>

      {/* Modals */}
      <NewProjectModal
        isOpen={showNewProject}
        onClose={() => setShowNewProject(false)}
        onSave={fetchProjects}
      />
      <EditProjectModal
        project={projectToEdit}
        onClose={() => setProjectToEdit(null)}
        onSave={(updated) => {
          setProjectsData(prev => prev.map(p => p.id === updated.id ? updated : p));
          setProjectToEdit(null);
        }}
      />
      <DeleteModal
        isOpen={!!projectToDelete} 
        onClose={() => setProjectToDelete(null)}
        onConfirm={handleDeleteConfirm}
        projectName={projectToDelete?.name || ''}
      />
    </div>
  );
}
