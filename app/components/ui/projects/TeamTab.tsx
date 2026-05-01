'use client';

import React from 'react';
import { Project } from '@/app/admin/(portal)/projects/data';
import Image from 'next/image';

interface TeamTabProps {
  project: Project;
}

export function TeamTab({ project }: TeamTabProps) {
  const team = project.details?.team || [];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 m-6 shadow-sm">
      <h3 className="text-sm font-bold text-gray-900 mb-6">Team Members ({team.length})</h3>
      
      {team.length === 0 ? (
        <div className="py-8 text-center text-gray-500 text-sm">No team members assigned.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {team.map((member) => (
            <div key={member.id} className="border border-gray-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
              <div className="relative h-40 w-full bg-gray-200">
                <Image 
                  src={member.avatar} 
                  alt={member.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-4 flex items-center justify-between bg-white relative z-10">
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">{member.name}</h4>
                  <p className="text-xs text-gray-500 mt-1">{member.role}</p>
                </div>
                <div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Assigned
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
