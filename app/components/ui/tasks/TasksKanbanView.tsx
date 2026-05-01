'use client';

import React from 'react';
import { KanbanTask } from '@/app/admin/(portal)/tasks/data';
import { ActionsDropdown } from '@/app/components/ui/ActionsDropdown';
import Image from 'next/image';

interface TasksKanbanViewProps {
  tasks: KanbanTask[];
  onDeleteClick: (task: KanbanTask) => void;
}

export function TasksKanbanView({ tasks, onDeleteClick }: TasksKanbanViewProps) {
  const todoTasks = tasks.filter(t => t.status === 'To Do');
  const inProgressTasks = tasks.filter(t => t.status === 'In Progress');
  const inReviewTasks = tasks.filter(t => t.status === 'In Review');
  const completedTasks = tasks.filter(t => t.status === 'Completed');

  return (
    <div className="flex gap-6 overflow-x-auto pb-4 h-full">
      <TaskColumn 
        title="To Do" 
        count={todoTasks.length} 
        tasks={todoTasks} 
        onDeleteClick={onDeleteClick} 
        dotColor="bg-gray-400"
      />
      <TaskColumn 
        title="In Progress" 
        count={inProgressTasks.length} 
        tasks={inProgressTasks} 
        onDeleteClick={onDeleteClick} 
        dotColor="bg-blue-500"
      />
      <TaskColumn 
        title="In Review" 
        count={inReviewTasks.length} 
        tasks={inReviewTasks} 
        onDeleteClick={onDeleteClick} 
        dotColor="bg-amber-500"
      />
      <TaskColumn 
        title="Completed" 
        count={completedTasks.length} 
        tasks={completedTasks} 
        onDeleteClick={onDeleteClick} 
        dotColor="bg-emerald-500"
      />
    </div>
  );
}

function TaskColumn({ 
  title, 
  count, 
  tasks, 
  onDeleteClick, 
  dotColor 
}: { 
  title: string; 
  count: number; 
  tasks: KanbanTask[]; 
  onDeleteClick: (task: KanbanTask) => void;
  dotColor: string;
}) {
  return (
    <div className="min-w-[320px] w-full flex flex-col flex-1">
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200 border-dashed">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${dotColor}`}></div>
          <h3 className="font-semibold text-gray-900">{title}</h3>
        </div>
        <span className="text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 text-gray-500">
          {count}
        </span>
      </div>

      <div className="flex flex-col gap-4">
        {tasks.map(task => (
          <div key={task.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
            
            <div className="flex items-start justify-between mb-2">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  className="mt-1 rounded border-gray-300 text-[#0A1629] focus:ring-[#0A1629]" 
                  defaultChecked={task.status === 'Completed'}
                />
                <span className={`text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors ${task.status === 'Completed' ? 'line-through text-gray-400' : ''}`}>
                  {task.name}
                </span>
              </label>
              <ActionsDropdown onDelete={() => onDeleteClick(task)} />
            </div>

            <p className="text-xs text-gray-500 mb-4 ml-7">{task.description}</p>
            
            <div className="flex items-center justify-between ml-7">
              <div className="flex items-center gap-2">
                 <span className={`text-[10px] font-bold px-2 py-0.5 rounded border
                   ${task.priority === 'High' ? 'text-red-600 bg-red-50 border-red-200' : 
                     task.priority === 'Medium' ? 'text-amber-600 bg-amber-50 border-amber-200' : 
                     'text-blue-600 bg-blue-50 border-blue-200'}`}
                 >
                   {task.priority}
                 </span>
                 <span className={`text-[10px] font-medium flex items-center gap-1
                   ${task.dueStatus === 'overdue' ? 'text-red-500' : 
                     task.dueStatus === 'tomorrow' || task.dueStatus === 'today' ? 'text-amber-500' : 
                     'text-gray-400'}`}
                 >
                   📅 {task.dueDate}
                 </span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 truncate max-w-[100px]">{task.projectName}</span>
                <div className="w-6 h-6 rounded-full overflow-hidden relative bg-gray-200 border border-white">
                  <Image src={task.assignee.avatar} alt={task.assignee.name} fill sizes="24px" className="object-cover" />
                </div>
              </div>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}
