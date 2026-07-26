import type { Project, ProjectStatus, ProjectType } from './data'

export const CSV_COLUMNS = [
  'Code', 'Name', 'Location', 'Type', 'Status',
  'Manager', 'Client', 'Start Date', 'Due Date', 'Progress', 'Budget',
] as const

export type ProjectImportRow = {
  name: string
  location: string
  type: ProjectType
  status: ProjectStatus
  managerName: string
  clientName: string
  start_date: string | null
  due_date: string | null
  progress: number
  budget: number | null
}

export type ImportSummary = {
  added: number
  skipped: string[]
  failed: { row: string; reason: string }[]
}

function csvCell(value: string | number | null | undefined) {
  const s = value == null ? '' : String(value)
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(rows: Project[]) {
  const lines = [CSV_COLUMNS.join(',')]
  for (const p of rows) {
    lines.push([
      p.code,
      p.name,
      p.location,
      p.type,
      p.status,
      p.manager ? `${p.manager.first_name} ${p.manager.last_name}`.trim() : '',
      p.client?.name ?? '',
      p.start_date,
      p.due_date,
      p.progress,
      p.budget,
    ].map(csvCell).join(','))
  }
  return lines.join('\r\n')
}

export function downloadCsv(filename: string, csv: string) {
  // BOM keeps Excel from mangling non-ASCII names
  const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

/** Minimal RFC-4180 reader — handles quoted fields, escaped quotes and CRLF. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c !== '"') field += c
      else if (text[i + 1] === '"') { field += '"'; i++ }
      else quoted = false
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else if (c !== '\r') field += c
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row) }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ''))
}

const normalize = (s: string) => s.trim().toLowerCase().replace(/[\s_-]+/g, '')

function matchEnum<T extends string>(raw: string, allowed: readonly T[], fallback: T): T {
  return allowed.find((a) => normalize(a) === normalize(raw)) ?? fallback
}

/** Accepts ISO or a parseable date string, normalising to YYYY-MM-DD. */
function toIsoDate(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
  const parsed = new Date(trimmed)
  return isNaN(parsed.getTime()) ? null : parsed.toLocaleDateString('en-CA')
}

/** Turns raw CSV text into import rows, collecting per-row problems instead of throwing. */
export function parseProjectCsv(text: string): { rows: ProjectImportRow[]; failed: ImportSummary['failed'] } {
  const table = parseCsv(text.replace(/^﻿/, ''))
  const rows: ProjectImportRow[] = []
  const failed: ImportSummary['failed'] = []
  if (table.length < 2) return { rows, failed }

  const header = table[0].map(normalize)
  const col = (name: string) => header.indexOf(normalize(name))
  const idx = {
    name: col('Name'), location: col('Location'), type: col('Type'), status: col('Status'),
    manager: col('Manager'), client: col('Client'), startDate: col('Start Date'),
    dueDate: col('Due Date'), progress: col('Progress'), budget: col('Budget'),
  }

  if (idx.name === -1) {
    return { rows, failed: [{ row: 'Header', reason: 'CSV needs at least a "Name" column' }] }
  }

  for (const cells of table.slice(1)) {
    const at = (i: number) => (i === -1 ? '' : (cells[i] ?? '').trim())
    const name = at(idx.name)
    if (!name) { failed.push({ row: 'Unnamed row', reason: 'Missing project name' }); continue }

    const progress = parseFloat(at(idx.progress).replace(/[^0-9.]/g, ''))
    const budget = parseFloat(at(idx.budget).replace(/[^0-9.]/g, ''))

    rows.push({
      name,
      location: at(idx.location),
      type: matchEnum(at(idx.type), ['residential', 'commercial', 'industrial'] as const, 'residential'),
      status: matchEnum(at(idx.status), ['in_progress', 'completed', 'on_hold'] as const, 'in_progress'),
      managerName: at(idx.manager),
      clientName: at(idx.client),
      start_date: toIsoDate(at(idx.startDate)),
      due_date: toIsoDate(at(idx.dueDate)),
      progress: isNaN(progress) ? 0 : Math.max(0, Math.min(100, progress)),
      budget: isNaN(budget) ? null : budget,
    })
  }

  return { rows, failed }
}
