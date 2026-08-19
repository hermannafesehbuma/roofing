'use client';

import { useState, useMemo, useRef, useEffect, useTransition } from 'react';
import { Project, ProjectStatus, ProjectType } from './data';
import { KanbanView } from '@/app/components/ui/KanbanView';
import { ListView } from '@/app/components/ui/ListView';
import { FilterPopover, type ProjectFilters, type FilterManager } from '@/app/components/ui/FilterPopover';
import { ImportExportButton } from '@/app/components/ui/ToolbarButtons';
import { DeleteModal } from '@/app/components/ui/DeleteModal';
import { NewProjectModal } from '@/app/components/ui/NewProjectModal';
import { EditProjectModal } from '@/app/components/ui/EditProjectModal';
import { KanbanSquare, List, Download, Plus, Upload, FileDown, FileText, X } from 'lucide-react'
import Image from 'next/image';
import { KanbanSkeleton, TableSkeleton, CardGridSkeleton } from '@/app/components/ui/Skeleton';
import { useEntry } from '@/app/components/ui/animations';
import { CONTENT_GAP } from '@/app/components/ui/spacing';
import { getProjects, deleteProject, importProjects } from './actions';
import { ViewToggle } from '@/app/components/ui/ViewToggle';
import { MobileHeader } from '@/app/components/ui/mobile/MobileHeader';
import { MobileProjectList } from '@/app/components/ui/mobile/MobileProjectList';
import { SearchInput } from '@/app/components/ui/SearchInput'
import {
  CSV_COLUMNS, toCsv, downloadCsv, parseProjectCsv, type ImportSummary,
} from './csv';

type ViewMode = 'kanban' | 'list';

// ─── Import / Export Menu ─────────────────────────────────────────────────────
function ImportExportMenu({ exportCount, onClose, onImport, onExport, onTemplate }: {
  exportCount: number
  onClose: () => void
  onImport: () => void
  onExport: () => void
  onTemplate: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const item = 'w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent'
  return (
    <div ref={ref} className="absolute right-0 top-11 z-30 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 w-52">
      <button onClick={() => { onImport(); onClose() }} className={item}>
        <Upload size={13} className="text-gray-400" />
        Import from CSV
      </button>
      <button onClick={() => { onExport(); onClose() }} disabled={exportCount === 0} className={item}>
        <FileDown size={13} className="text-gray-400" />
        Export CSV{exportCount > 0 ? ` (${exportCount})` : ''}
      </button>
      <button onClick={() => { onTemplate(); onClose() }} className={item}>
        <FileText size={13} className="text-gray-400" />
        Download template
      </button>
    </div>
  )
}

// ─── Import Summary Modal ─────────────────────────────────────────────────────
function ImportSummaryModal({ summary, onClose }: { summary: ImportSummary; onClose: () => void }) {
  const clean = summary.failed.length === 0 && summary.skipped.length === 0
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-[1px]" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-7 relative">
          <button onClick={onClose} className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">
            <X size={16} />
          </button>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Import complete</h2>
          <p className="text-sm text-gray-500 mb-5">
            {summary.added} project{summary.added === 1 ? '' : 's'} added
            {clean ? '.' : ', with some rows needing attention.'}
          </p>

          {summary.skipped.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-700 mb-1.5">Skipped — already exist ({summary.skipped.length})</p>
              <div className="max-h-28 overflow-y-auto rounded-lg bg-gray-50 border border-gray-100 p-2.5 space-y-1">
                {summary.skipped.map((name) => (
                  <p key={name} className="text-[11px] text-gray-500">{name}</p>
                ))}
              </div>
            </div>
          )}

          {summary.failed.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-700 mb-1.5">Failed ({summary.failed.length})</p>
              <div className="max-h-32 overflow-y-auto rounded-lg bg-red-50/60 border border-red-100 p-2.5 space-y-1">
                {summary.failed.map((f, i) => (
                  <p key={i} className="text-[11px] text-gray-600">
                    <span className="font-medium text-gray-800">{f.row}</span> — {f.reason}
                  </p>
                ))}
              </div>
            </div>
          )}

          <button onClick={onClose} className="w-full py-2.5 rounded-lg bg-[#0D1B2A] text-sm text-white hover:bg-[#162437] transition-colors">
            Done
          </button>
        </div>
      </div>
    </>
  )
}

export function ProjectsClient({ initialProjects }: { initialProjects: Project[] }) {
  const enter = useEntry();
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [projectsData, setProjectsData] = useState<Project[]>(initialProjects);
  const [loading, setLoading] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [ioOpen, setIoOpen] = useState(false);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [importing, startImport] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchProjects = async () => {
    setLoading(true);
    const data = await getProjects();
    setProjectsData(data);
    setLoading(false);
  };
  
  const [activeFilters, setActiveFilters] = useState<ProjectFilters>({
    status: [],
    type: [],
    managerIds: [],
  });

  // Manager options come from the projects themselves — no hardcoded names.
  const managers = useMemo<FilterManager[]>(() => {
    const byId = new Map<string, FilterManager>();
    for (const p of projectsData) {
      if (!p.manager_id || !p.manager || byId.has(p.manager_id)) continue;
      byId.set(p.manager_id, {
        id: p.manager_id,
        name: `${p.manager.first_name} ${p.manager.last_name}`.trim(),
        avatarUrl: p.manager.avatar_url,
      });
    }
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [projectsData]);

  const filteredProjects = useMemo(() => {
    return projectsData.filter((p) => {
      // Search
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (p.client?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            p.code.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Filters
      const matchesStatus = activeFilters.status.length === 0 || activeFilters.status.includes(p.status);
      const matchesType = activeFilters.type.length === 0 || activeFilters.type.includes(p.type);
      const matchesManager = activeFilters.managerIds.length === 0 || activeFilters.managerIds.includes(p.manager_id);

      return matchesSearch && matchesStatus && matchesType && matchesManager;
    });
  }, [projectsData, searchQuery, activeFilters]);

  /** Exports what's on screen — search and filters carry through to the file. */
  function handleExport() {
    const stamp = new Date().toISOString().slice(0, 10)
    downloadCsv(`projects-${stamp}.csv`, toCsv(filteredProjects))
  }

  function handleTemplate() {
    downloadCsv('projects-template.csv', [
      CSV_COLUMNS.join(','),
      'PRJ-000,Oakdale Residential Reroofing,"Oakdale, NV",residential,in_progress,Karen Brooks,Johnson Family,2026-02-01,2026-04-15,50,85000',
    ].join('\r\n'))
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // let the same file be picked again after a fix
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const { rows, failed } = parseProjectCsv(String(reader.result ?? ''))
      const existing = new Set(projectsData.map((p) => p.name.trim().toLowerCase()))
      const skipped = rows.filter((r) => existing.has(r.name.trim().toLowerCase())).map((r) => r.name)
      const toCreate = rows.filter((r) => !existing.has(r.name.trim().toLowerCase()))

      if (toCreate.length === 0) {
        setImportSummary({ added: 0, skipped, failed })
        return
      }

      startImport(async () => {
        const results = await importProjects(toCreate)
        const allFailed = [...failed]
        let added = 0

        results.forEach((result, i) => {
          if (result.id) added += 1
          else allFailed.push({ row: toCreate[i].name, reason: result.error ?? 'Unknown error' })
        })

        // Re-read from the server so the new rows arrive with manager/client joined.
        if (added > 0) await fetchProjects()
        setImportSummary({ added, skipped, failed: allFailed })
      })
    }
    reader.readAsText(file)
  }

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
    <div className="flex flex-col h-full overflow-hidden bg-white">
      {/* Phones get the field view: status pills over a stack of project cards. */}
      <div className="md:hidden flex flex-col h-full overflow-hidden">
        <MobileHeader title="Projects" />
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <CardGridSkeleton count={4} />
          ) : (
            <MobileProjectList projects={filteredProjects} />
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div {...enter.fade(`hidden md:flex flex-none px-8 pt-3 ${CONTENT_GAP} bg-white items-center gap-3`)}>
        <ViewToggle
          value={viewMode}
          onChange={setViewMode}
          options={[
            { value: 'kanban', label: 'Kanban', icon: KanbanSquare },
            { value: 'list', label: 'List', icon: List },
          ]}
        />

        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          className="flex-1 max-w-xs"
        />

        <div className="flex-1" />

        <FilterPopover managers={managers} filters={activeFilters} onFilterChange={setActiveFilters} />

        <div className="relative">
          <ImportExportButton onClick={() => setIoOpen((o) => !o)} active={ioOpen} loading={importing} />
          {ioOpen && (
            <ImportExportMenu
              exportCount={filteredProjects.length}
              onClose={() => setIoOpen(false)}
              onImport={() => fileRef.current?.click()}
              onExport={handleExport}
              onTemplate={handleTemplate}
            />
          )}
        </div>
        <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleImportFile} className="hidden" />

        <button
          onClick={() => setShowNewProject(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-[#0D1B2A] text-white rounded-lg text-xs hover:bg-[#162437] transition-colors"
        >
          <Plus size={13} /> New Projects
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-8 pb-8">
        {loading ? (
          // Shaped like whichever view is about to appear, so nothing shifts.
          viewMode === 'kanban'
            ? <KanbanSkeleton columns={3} cardsPerColumn={2} withImage />
            : <TableSkeleton rows={8} columns={6} />
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
      {importSummary && (
        <ImportSummaryModal summary={importSummary} onClose={() => setImportSummary(null)} />
      )}
    </div>
  );
}
