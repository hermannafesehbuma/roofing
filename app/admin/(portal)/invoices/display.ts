import type { InvoiceRow, DbInvoiceStatus } from './actions'

/**
 * Presentation shared by the desktop table and the mobile card list. Both
 * surfaces show the same statuses, money, and dates, so the maps and
 * formatters live here rather than being re-typed per view.
 */
export const STATUS_LABEL: Record<DbInvoiceStatus, string> = {
  draft: 'Draft', sent: 'Sent', paid: 'Paid', overdue: 'Overdue', partial: 'Partial',
}

export const STATUS_CONFIG: Record<DbInvoiceStatus, { bg: string; text: string; dot: string }> = {
  paid:    { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  overdue: { bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-500'     },
  draft:   { bg: 'bg-gray-100',   text: 'text-gray-600',    dot: 'bg-gray-400'    },
  sent:    { bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500'    },
  partial: { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500'   },
}

export function fmtCurrency(v: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v)
}

export function fmtDate(iso: string) {
  if (!iso) return '—'
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** Line items plus tax — invoices store no total column. */
export function invoiceTotal(inv: InvoiceRow) {
  const sub = inv.items.reduce((s, i) => s + i.qty * i.rate, 0)
  return sub + sub * (inv.tax / 100)
}
