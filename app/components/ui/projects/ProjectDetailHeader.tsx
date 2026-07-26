'use client';

import React from 'react';
import { Project } from '@/app/admin/(portal)/projects/data';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Edit2, MessageSquare, Image as ImageIcon } from 'lucide-react';

interface ProjectDetailHeaderProps {
  project: Project;
  onEdit: () => void;
}

export function ProjectDetailHeader({ project, onEdit }: ProjectDetailHeaderProps) {
  
  let badgeColor = '';
  if (project.status === 'completed') {
    badgeColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
  } else if (project.status === 'in_progress') {
    badgeColor = 'text-amber-700 bg-amber-50 border-amber-200';
  } else {
    badgeColor = 'text-red-700 bg-red-50 border-red-200';
  }

  return (
    <div className="bg-white px-4 md:px-8 pt-4 md:pt-6 pb-0 border-b border-gray-100 flex-none">
      {/* The mobile header already shows a back arrow and the project name. */}
      <div className="hidden md:flex items-center gap-2 mb-6">
        <Link href="/admin/projects" className="text-gray-400 hover:text-gray-900 transition-colors">
          <ArrowLeft className="w-4 h-4" /> 
        </Link>
        <span className="text-sm font-medium text-gray-500">Project</span>
        <span className="text-sm text-gray-400">›</span>
        <span className="text-sm font-semibold text-gray-900">{project.name}</span>
      </div>

      <div className="w-full h-40 md:h-80 relative rounded-2xl overflow-hidden mb-4 md:mb-6 bg-gray-100 border border-gray-100 shadow-sm">
        {project.image_url ? (
          <Image
            src={project.image_url}
            alt={project.name}
            fill
            sizes="(max-width: 1280px) 100vw, 1200px"
            className="object-cover"
            priority
          />
        ) : (
          // next/image throws on an empty src, so projects without a photo get a placeholder.
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-400">
            <ImageIcon className="w-8 h-8" />
            <span className="text-xs">No project image</span>
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 pb-4 md:pb-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base md:text-2xl font-semibold text-gray-900 md:mb-2">{project.name}</h2>
            <p className="text-xs md:text-sm text-gray-500 capitalize">{project.type} • {project.location}</p>
          </div>
          {/* On phones the status sits beside the title; buttons drop below. */}
          <span className={`md:hidden shrink-0 inline-flex items-center px-2 py-1 rounded-full text-[10px] font-semibold border ${badgeColor}`}>
            ● {project.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </span>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <span className={`hidden md:inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border ${badgeColor}`}>
            ● {project.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </span>
          <button
            onClick={onEdit}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-xs md:text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm bg-white"
          >
            <Edit2 className="w-4 h-4" /> Edit
          </button>
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-[#0A1629] text-white rounded-xl text-xs md:text-sm font-medium hover:bg-[#152844] transition-colors shadow-sm">
            <MessageSquare className="w-4 h-4" /> Message
          </button>
        </div>
      </div>
    </div>
  );
}
