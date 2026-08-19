/**
 * Display formatting shared by the desktop table and the mobile card list, so
 * a file reads the same size and date on both.
 */

export function formatFileSize(bytes: number | null) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function formatShortDate(value: string | null | undefined) {
  if (!value) return '—'
  const date = new Date(value)
  return isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
