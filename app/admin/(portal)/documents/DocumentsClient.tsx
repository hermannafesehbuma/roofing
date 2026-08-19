'use client'

import { useEffect, useState, useTransition } from 'react'
import { Upload, Download, Trash2, FileText, X } from 'lucide-react'
import { MobileHeader } from '@/app/components/ui/mobile/MobileHeader'
import { MobileDocumentList } from '@/app/components/ui/mobile/MobileDocumentList'
import { SearchInput } from '@/app/components/ui/SearchInput'
import { Skeleton } from '@/app/components/ui/Skeleton'
import { readSession } from '@/lib/session'
import { formatFileSize, formatShortDate } from '@/lib/format'
import {
  getDocuments, getDocumentProjects, uploadDocument, deleteDocument,
  type DocumentRow,
} from './actions'

type ProjectOption = { id: string; name: string; code: string }

const statusStyles: Record<string, string> = {
  approved: 'text-emerald-600 bg-emerald-50',
  pending:  'text-amber-600 bg-amber-50',
  rejected: 'text-red-500 bg-red-50',
}

export function DocumentsClient() {
  const [documents, setDocuments] = useState<DocumentRow[]>([])
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const load = () => {
      const session = readSession()
      Promise.all([getDocuments(session?.id), getDocumentProjects(session?.id)]).then(
        ([docs, projectList]) => {
          setDocuments(docs)
          setProjects(projectList)
          setLoading(false)
        }
      )
    }
    load()
  }, [])

  const filtered = documents.filter((d) => {
    const q = search.toLowerCase()
    return (
      d.name.toLowerCase().includes(q) ||
      d.projectName.toLowerCase().includes(q) ||
      d.uploadedBy.toLowerCase().includes(q)
    )
  })

  function handleUpload(file: File, projectId: string) {
    setError(null)
    const session = readSession()
    startTransition(async () => {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('projectId', projectId)
      fd.append('supabaseId', session?.id ?? '')
      const result = await uploadDocument(fd)
      if ('error' in result) { setError(result.error); return }
      setDocuments(await getDocuments(session?.id))
      setShowUpload(false)
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteDocument(id)
      if ('error' in result) { setError(result.error); return }
      setDocuments((prev) => prev.filter((d) => d.id !== id))
    })
  }

  return (
    <>
      <MobileHeader
        title="Documents"
        action={
          <button
            onClick={() => setShowUpload(true)}
            aria-label="Upload document"
            className="w-9 h-9 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <Upload className="w-[18px] h-[18px]" />
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        {error && (
          <p className="mb-4 rounded-lg border border-[#FDA29B] bg-[#FEF3F2] px-4 py-3 text-[13px] text-[#B42318]">
            {error}
          </p>
        )}

        {/* Phones get the client portal's card list; the table is desktop-only. */}
        <div className="md:hidden">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-gray-100 overflow-hidden">
                  <Skeleton className="h-28 w-full rounded-none" />
                  <div className="px-3.5 py-3 space-y-2">
                    <Skeleton className="h-3.5 w-40" />
                    <Skeleton className="h-2.5 w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <MobileDocumentList documents={documents} />
          )}
        </div>

        <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm">
          {/* Toolbar */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <h2 className="text-xl font-semibold text-gray-900">Documents</h2>
              <span className="px-2.5 py-1 rounded-full bg-[#F4F3FF] text-[#5B4BC4] text-[11px] font-semibold">
                {documents.length}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <SearchInput value={search} onChange={setSearch} className="w-56" />
              <button
                onClick={() => setShowUpload(true)}
                className="h-10 px-4 shrink-0 rounded-lg bg-[#0A1629] text-white text-sm font-medium hover:bg-[#152844] transition-colors flex items-center gap-2"
              >
                <Upload className="w-4 h-4" /> Upload
              </button>
            </div>
          </div>

          {loading ? (
            // Row placeholders rather than a bare card: this table already sits
            // inside one, so TableSkeleton's own frame would double up.
            <div className="px-6 py-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 py-4 border-b border-gray-50 last:border-0">
                  <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
                  <Skeleton className="h-3.5 flex-1 max-w-[180px]" />
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-3.5 w-16" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <FileText className="w-8 h-8 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">
                {documents.length === 0 ? 'No documents yet.' : 'No documents match your search.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-[13px] text-gray-500">
                  <th className="pl-6 pr-4 py-3 font-medium">Document</th>
                  <th className="px-4 py-3 font-medium">Project</th>
                  <th className="px-4 py-3 font-medium">Uploaded by</th>
                  <th className="px-4 py-3 font-medium">Size</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 pr-6 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60 transition-colors">
                    <td className="pl-6 pr-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4 text-gray-500" />
                        </div>
                        <span className="text-[14px] text-gray-900 truncate max-w-[280px]">{d.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-[14px] text-gray-700">{d.projectName}</td>
                    <td className="px-4 py-4 text-[14px] text-gray-700">{d.uploadedBy}</td>
                    <td className="px-4 py-4 text-[14px] text-gray-500">{formatFileSize(d.sizeBytes)}</td>
                    <td className="px-4 py-4 text-[14px] text-gray-500 whitespace-nowrap">{formatShortDate(d.createdAt)}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-md text-[12px] font-medium capitalize ${statusStyles[d.status] ?? statusStyles.pending}`}>
                        {d.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 pr-6">
                      <div className="flex items-center justify-end gap-1">
                        <a href={d.url} target="_blank" rel="noreferrer" download
                          className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                          <Download className="w-4 h-4" />
                        </a>
                        <button onClick={() => handleDelete(d.id)} disabled={isPending}
                          className="p-2 rounded-lg text-gray-400 hover:text-[#F04438] hover:bg-red-50 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showUpload && (
        <UploadPanel
          projects={projects}
          loading={isPending}
          onCancel={() => setShowUpload(false)}
          onUpload={handleUpload}
        />
      )}
    </>
  )
}

function UploadPanel({ projects, loading, onCancel, onUpload }: {
  projects: ProjectOption[]
  loading: boolean
  onCancel: () => void
  onUpload: (file: File, projectId: string) => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [projectId, setProjectId] = useState(projects[0]?.id ?? '')

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-[1px]" onClick={onCancel} />
      <div className="fixed inset-x-0 bottom-0 md:inset-y-0 md:right-0 md:left-auto md:bottom-auto z-50 flex">
        <div className="bg-white w-full md:w-[640px] md:h-full rounded-t-2xl md:rounded-none flex flex-col shadow-2xl max-h-[90vh] md:max-h-none">
          <div className="flex items-center justify-between px-6 md:px-8 py-5 shrink-0">
            <h2 className="text-[17px] font-semibold text-[#101828]">Upload Document</h2>
            <button onClick={onCancel} aria-label="Close"
              className="w-8 h-8 flex items-center justify-center rounded-full text-[#667085] hover:bg-gray-100">
              <X size={18} strokeWidth={1.8} />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 px-6 md:px-8 pb-6 space-y-5">
            <div>
              <label className="block text-[13px] font-medium text-[#344054] mb-2">Project</label>
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)}
                className="w-full h-11 rounded-lg border border-[#E4E7EC] px-3.5 text-[14px] bg-white">
                {projects.length === 0 && <option value="">No projects available</option>}
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.code ? `${p.code} — ${p.name}` : p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-[#344054] mb-2">File</label>
              <label className="rounded-xl border border-dashed border-[#D0D5DD] bg-[#F9FAFB] px-4 py-4 flex items-center gap-3.5 cursor-pointer">
                <div className="w-10 h-10 rounded-lg bg-white border border-[#E4E7EC] flex items-center justify-center shrink-0">
                  <Upload size={17} className="text-[#475467]" strokeWidth={1.8} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium text-[#101828] truncate">{file ? file.name : 'Choose a file'}</p>
                  <p className="text-[12px] text-[#98A2B3] mt-0.5">PDF, image or document &bull; Max. 10MB</p>
                </div>
                <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-6 md:px-8 py-5 shrink-0">
            <button onClick={onCancel}
              className="h-10 px-7 rounded-lg border border-[#E4E7EC] text-[14px] font-medium text-[#344054] hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={() => file && projectId && onUpload(file, projectId)}
              disabled={!file || !projectId || loading}
              className="h-10 px-9 rounded-lg bg-[#0A1629] text-[14px] font-medium text-white hover:bg-[#152844] disabled:opacity-60"
            >
              {loading ? 'Uploading…' : 'Upload'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
