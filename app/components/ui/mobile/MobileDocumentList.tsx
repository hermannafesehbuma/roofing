'use client'

import { useState } from 'react'
import {
  Download, FileText, FileImage, FileSpreadsheet, File as FileIcon, type LucideIcon,
} from 'lucide-react'
import type { DocumentRow } from '@/app/admin/(portal)/documents/actions'
import { formatFileSize, formatShortDate } from '@/lib/format'
import { MobilePills } from './MobilePills'

/**
 * The client portal's Documents screen on phones.
 *
 * Clients scan for a file by what it *is*, not by a row of columns, so each
 * document gets a card led by a tinted preview tile carrying its file-type
 * glyph — the desktop table stays as-is for staff.
 */

type Filter = 'all' | 'pending' | 'approved' | 'rejected'

type FileKind = {
  /** Shown in the meta line: "IMG · 3.4 MB · Mar 22, 2026". */
  label: string
  icon: LucideIcon
  fg: string
  tint: string
  badge: string
}

const KINDS: Record<string, FileKind> = {
  pdf:   { label: 'PDF', icon: FileText,        fg: 'text-[#D92D20]', tint: 'bg-[#FEF6F5]', badge: 'bg-[#D92D20]' },
  image: { label: 'IMG', icon: FileImage,       fg: 'text-[#079455]', tint: 'bg-[#F4FBF7]', badge: 'bg-[#079455]' },
  sheet: { label: 'XLS', icon: FileSpreadsheet, fg: 'text-[#067A6F]', tint: 'bg-[#F2FAF9]', badge: 'bg-[#067A6F]' },
  doc:   { label: 'DOC', icon: FileText,        fg: 'text-[#2E67D1]', tint: 'bg-[#F4F8FE]', badge: 'bg-[#2E67D1]' },
  other: { label: 'FILE', icon: FileIcon,       fg: 'text-[#667085]', tint: 'bg-[#F8F9FB]', badge: 'bg-[#667085]' },
}

const STATUS_STYLES: Record<string, string> = {
  approved: 'text-emerald-700 bg-emerald-50',
  pending:  'text-amber-700 bg-amber-50',
  rejected: 'text-red-600 bg-red-50',
}

/** The extension drives the look; mime type is the fallback for unnamed files. */
function extensionOf(doc: DocumentRow) {
  const fromName = doc.name.includes('.') ? doc.name.split('.').pop()! : ''
  if (fromName) return fromName.toLowerCase()
  return doc.mimeType?.split('/').pop()?.toLowerCase() ?? ''
}

function kindOf(extension: string): FileKind {
  if (extension === 'pdf') return KINDS.pdf
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'svg'].includes(extension)) return KINDS.image
  if (['xls', 'xlsx', 'csv', 'numbers'].includes(extension)) return KINDS.sheet
  if (['doc', 'docx', 'txt', 'rtf', 'pages'].includes(extension)) return KINDS.doc
  return KINDS.other
}

export function MobileDocumentList({ documents }: { documents: DocumentRow[] }) {
  const [filter, setFilter] = useState<Filter>('all')

  const visible = filter === 'all' ? documents : documents.filter((d) => d.status === filter)

  const options: { value: Filter; label: string }[] = [
    { value: 'all',      label: `All (${documents.length})` },
    { value: 'pending',  label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
  ]

  return (
    <div className="space-y-3">
      <MobilePills options={options} value={filter} onChange={setFilter} />

      {visible.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400">
          {documents.length === 0 ? 'No documents yet.' : 'Nothing here.'}
        </p>
      ) : (
        visible.map((doc) => {
          const extension = extensionOf(doc)
          const kind = kindOf(extension)
          const Icon = kind.icon
          return (
            <article
              key={doc.id}
              className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
            >
              <a
                href={doc.url}
                target="_blank"
                rel="noreferrer"
                className={`relative h-28 flex items-center justify-center ${kind.tint}`}
              >
                <span className="relative">
                  <Icon size={34} className={kind.fg} strokeWidth={1.4} />
                  <span
                    className={`absolute -bottom-1.5 -right-3 px-1.5 py-px rounded text-[8px] font-bold tracking-wide text-white ${kind.badge}`}
                  >
                    .{(extension || kind.label).toUpperCase()}
                  </span>
                </span>

                {/* Approval state matters to a client, and the tile is the only
                    spare surface once the card leads with a preview. */}
                <span
                  className={`absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md text-[10px] font-medium capitalize ${
                    STATUS_STYLES[doc.status] ?? STATUS_STYLES.pending
                  }`}
                >
                  {doc.status}
                </span>
              </a>

              <div className="px-3.5 py-3">
                <div className="flex items-start gap-2">
                  <p className="flex-1 min-w-0 text-sm text-gray-900 truncate">{doc.name}</p>
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noreferrer"
                    download
                    aria-label={`Download ${doc.name}`}
                    className="-mr-1 -mt-0.5 p-1 rounded-lg text-gray-400 hover:text-gray-700 shrink-0"
                  >
                    <Download size={15} />
                  </a>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  {kind.label} · {formatFileSize(doc.sizeBytes)} · {formatShortDate(doc.createdAt)}
                </p>
              </div>
            </article>
          )
        })
      )}
    </div>
  )
}
