'use client';

import React from 'react';
import { Project } from '@/app/admin/(portal)/projects/data';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Edit2, MessageSquare } from 'lucide-react';

interface ProjectDetailHeaderProps {
  project: Project;
}

export function ProjectDetailHeader({ project }: ProjectDetailHeaderProps) {
  
  let badgeColor = '';
  if (project.status === 'Completed') {
    badgeColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
  } else if (project.status === 'In Progress') {
    badgeColor = 'text-amber-700 bg-amber-50 border-amber-200';
  } else {
    badgeColor = 'text-red-700 bg-red-50 border-red-200';
  }

  return (
    <div className="bg-white px-8 pt-6 pb-0 border-b border-gray-100 flex-none">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/admin/projects" className="text-gray-400 hover:text-gray-900 transition-colors">
          <ArrowLeft className="w-4 h-4" /> 
        </Link>
        <span className="text-sm font-medium text-gray-500">Project</span>
        <span className="text-sm text-gray-400">›</span>
        <span className="text-sm font-semibold text-gray-900">{project.name}</span>
      </div>

      <div className="w-full h-80 relative rounded-2xl overflow-hidden mb-6 bg-gray-200 border border-gray-100 shadow-sm">
        <Image 
          src={project.image} 
          alt={project.name}
          fill
          className="object-cover"
          priority
        />
      </div>

      <div className="flex items-start justify-between pb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{project.name}</h2>
          <p className="text-sm text-gray-500">{project.type} • {project.location}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold border ${badgeColor}`}>
            ● {project.status}
          </span>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm bg-white">
            <Edit2 className="w-4 h-4" /> Edit
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-[#0A1629] text-white rounded-xl text-sm font-medium hover:bg-[#152844] transition-colors shadow-sm">
            <MessageSquare className="w-4 h-4" /> Message
          </button>
        </div>
      </div>
    </div>
  );
}
