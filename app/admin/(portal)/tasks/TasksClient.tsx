'use client';

import React, { useState, useMemo } from 'react';
import { KanbanTask, mockTasks, TaskStatus, TaskPriority } from './data';
import { TasksHeader } from '@/app/components/ui/tasks/TasksHeader';
import { TasksKanbanView } from '@/app/components/ui/tasks/TasksKanbanView';
import { TasksListView } from '@/app/components/ui/tasks/TasksListView';
import { TaskFilterPopover } from '@/app/components/ui/tasks/TaskFilterPopover';
import { TaskDeleteModal } from '@/app/components/ui/tasks/TaskDeleteModal';
import { KanbanSquare, List, Calendar, Search, Plus } from 'lucide-react';

type ViewMode = 'kanban' | 'list' | 'calendar';

export function TasksClient() {
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [tasksData, setTasksData] = useState<KanbanTask[]>(mockTasks);
  const [taskToDelete, setTaskToDelete] = useState<KanbanTask | null>(null);

  const [activeFilters, setActiveFilters] = useState<{
    status: TaskStatus[];
    priority: TaskPriority[];
    manager: string;
  }>({
    status: [],
    priority: [],
    manager: ''
  });

  const filteredTasks = useMemo(() => {
    return tasksData.filter((t) => {
      // Search
      const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            t.projectName.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Filters
      const matchesStatus = activeFilters.status.length === 0 || activeFilters.status.includes(t.status);
      const matchesPriority = activeFilters.priority.length === 0 || activeFilters.priority.includes(t.priority);
      const matchesManager = !activeFilters.manager || t.assignee.name.toLowerCase().includes(activeFilters.manager.toLowerCase());

      return matchesSearch && matchesStatus && matchesPriority && matchesManager;
    });
  }, [tasksData, searchQuery, activeFilters]);

  const handleDeleteConfirm = () => {
    if (taskToDelete) {
      setTasksData(prev => prev.filter(t => t.id !== taskToDelete.id));
      setTaskToDelete(null);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#F4F6F9]">
      <TasksHeader />

      <div className="flex-none px-8 py-4 bg-white border-b border-gray-100 flex items-center justify-between">
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
              <button
                onClick={() => setViewMode('calendar')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'calendar' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Calendar className="w-4 h-4" /> Calendar
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
           <TaskFilterPopover onFilterChange={setActiveFilters} />
           
           <button className="flex items-center gap-2 px-4 py-2 bg-[#0A1629] text-white rounded-lg text-sm font-medium hover:bg-[#152844] shadow-sm transition-colors">
              <Plus className="w-4 h-4" /> Add Task
           </button>
         </div>
      </div>

      <div className="flex-1 overflow-hidden p-8">
        {viewMode === 'kanban' && <TasksKanbanView tasks={filteredTasks} onDeleteClick={setTaskToDelete} />}
        {viewMode === 'list' && <TasksListView tasks={filteredTasks} onDeleteClick={setTaskToDelete} />}
        {viewMode === 'calendar' && (
           <div className="flex items-center justify-center h-full text-gray-500 bg-white rounded-2xl border border-gray-100 shadow-sm border-dashed">
             <div className="text-center">
               <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
               <h3 className="text-lg font-bold text-gray-900 mb-2">Calendar View</h3>
               <p className="text-sm">This view is currently under construction.</p>
             </div>
           </div>
        )}
      </div>

      <TaskDeleteModal 
        isOpen={!!taskToDelete}
        onClose={() => setTaskToDelete(null)}
        onConfirm={handleDeleteConfirm}
        taskName={taskToDelete?.name || ''}
      />
    </div>
  );
}
