'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Project } from '@/app/admin/(portal)/projects/data';
import { MoreHorizontal, Eye, Download, FileText } from 'lucide-react';

interface DocumentsTabProps {
  project: Project;
}

function fmtDate(iso: string) {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function DocumentsTab({ project }: DocumentsTabProps) {
  const documents = project.details?.documents ?? [];

  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 md:p-6 m-4 md:m-6 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900 mb-6">Documents</h3>

      <div className="overflow-x-auto relative min-h-[400px]">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="border-b border-gray-100 text-xs font-semibold text-gray-400">
              <th className="pb-4 font-semibold w-32">File Type</th>
              <th className="pb-4 font-semibold">Name</th>
              <th className="pb-4 font-semibold w-48">Date Submitted</th>
              <th className="pb-4 font-semibold w-16 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {documents.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-gray-500 text-sm">
                  No documents uploaded for this project yet.
                </td>
              </tr>
            )}

            {documents.map((doc) => {
              const isOpen = activeMenu === doc.id;

              return (
                <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-4">
                    <span className="inline-flex items-center gap-2 text-xs font-semibold text-gray-600">
                      <FileText className="w-5 h-5 text-red-500" />
                      {doc.fileType}
                    </span>
                  </td>
                  <td className="py-4 text-sm font-medium text-gray-900">
                    {doc.name}
                    {doc.uploadedBy !== '—' && (
                      <span className="block text-xs font-normal text-gray-400">{doc.uploadedBy}</span>
                    )}
                  </td>
                  <td className="py-4 text-sm text-gray-600">{fmtDate(doc.dateSubmitted)}</td>
                  <td className="py-4 text-right relative">
                    <button
                      onClick={() => setActiveMenu(isOpen ? null : doc.id)}
                      className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                      aria-label={`Actions for ${doc.name}`}
                    >
                      <MoreHorizontal className="w-5 h-5" />
                    </button>

                    {isOpen && (
                      <div
                        ref={menuRef}
                        className="absolute top-10 right-0 w-44 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 text-left"
                      >
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setActiveMenu(null)}
                          className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                        >
                          <Eye className="w-4 h-4 text-gray-400" /> View
                        </a>
                        <a
                          href={doc.url}
                          download={doc.name}
                          onClick={() => setActiveMenu(null)}
                          className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                        >
                          <Download className="w-4 h-4 text-gray-400" /> Download
                        </a>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
