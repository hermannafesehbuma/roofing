'use client'

import { CalendarDays, MoreVertical, Receipt, CheckCircle2, AlertCircle, SlidersHorizontal } from 'lucide-react'
import type { InvoiceRow } from '@/app/admin/(portal)/invoices/actions'
import {
  STATUS_LABEL, STATUS_CONFIG, fmtCurrency, fmtDate, invoiceTotal,
} from '@/app/admin/(portal)/invoices/display'
import { SearchInput } from '@/app/components/ui/SearchInput'

/** Issue dates read without the year — the due date carries it instead. */
function fmtShortDate(iso: string) {
  if (!iso) return '—'
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** Summary tile: icon, label, figure — one per row on a phone. */
function MobileStatRow({ label, value, icon, iconBg }: {
  label: string
  value: string
  icon: React.ReactNode
  iconBg: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3.5 flex items-center gap-3">
      <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>{icon}</span>
      <p className="text-sm text-gray-600 flex-1 truncate">{label}</p>
      <p className="text-base font-semibold text-gray-900">{value}</p>
    </div>
  )
}

/**
 * The invoices screen on phones: three summary tiles, a search row with the
 * filter trigger, then one card per invoice. The desktop table is hidden below
 * `md`, so this is the whole screen there.
 */
export function MobileInvoiceList({
  invoices,
  totalInvoiced,
  totalPaid,
  outstanding,
  search,
  onSearchChange,
  onOpenFilter,
  filterCount,
  onSelect,
}: {
  invoices: InvoiceRow[]
  totalInvoiced: number
  totalPaid: number
  outstanding: number
  search: string
  onSearchChange: (value: string) => void
  onOpenFilter: () => void
  /** Applied filters, shown as a badge on the filter button. */
  filterCount: number
  onSelect: (invoice: InvoiceRow) => void
}) {
  return (
    <div className="space-y-3">
      <MobileStatRow
        label="Total Invoiced" value={fmtCurrency(totalInvoiced)} iconBg="bg-blue-50"
        icon={<Receipt size={16} className="text-blue-500" strokeWidth={1.9} />}
      />
      <MobileStatRow
        label="Total Paid" value={fmtCurrency(totalPaid)} iconBg="bg-emerald-50"
        icon={<CheckCircle2 size={16} className="text-emerald-500" strokeWidth={1.9} />}
      />
      <MobileStatRow
        label="Outstanding" value={fmtCurrency(outstanding)} iconBg="bg-red-50"
        icon={<AlertCircle size={16} className="text-red-500" strokeWidth={1.9} />}
      />

      <div className="flex items-center gap-3 pt-1">
        <SearchInput value={search} onChange={onSearchChange} placeholder="Search" className="flex-1" />
        <button
          onClick={onOpenFilter}
          aria-label="Filter invoices"
          className="relative w-10 h-9 shrink-0 flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 active:bg-gray-50 transition-colors"
        >
          <SlidersHorizontal size={15} />
          {filterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-[#0D1B2A] text-white text-[9px] font-semibold flex items-center justify-center">
              {filterCount}
            </span>
          )}
        </button>
      </div>

      {invoices.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400">No invoices here.</p>
      ) : (
        invoices.map(inv => {
          const status = STATUS_CONFIG[inv.status]
          // The first line item names the work; the project is the fallback.
          const summary = inv.items[0]?.description || inv.project_name || inv.client_name
          const unpaid = inv.status !== 'paid'
          return (
            <button
              key={inv.id}
              onClick={() => onSelect(inv)}
              className="w-full text-left bg-white rounded-xl border border-gray-100 shadow-sm p-3.5 active:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-gray-500">
                  {inv.code}: <span className="font-semibold text-gray-900">{fmtCurrency(invoiceTotal(inv))}</span>
                </p>
                <MoreVertical size={16} className="text-gray-400 shrink-0" />
              </div>

              <p className="text-xs text-gray-500 mt-1.5 line-clamp-1">{summary}</p>

              <div className="flex flex-wrap items-center gap-2 mt-2.5">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${status.bg} ${status.text}`}>
                  {STATUS_LABEL[inv.status]}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
                  <CalendarDays size={11} /> {fmtShortDate(inv.issued_date)}
                </span>
                <span className={`inline-flex items-center gap-1 text-[11px] ${
                  inv.status === 'overdue' ? 'text-red-500' : 'text-gray-400'
                }`}>
                  <CalendarDays size={11} className={unpaid ? 'text-red-400' : ''} /> {fmtDate(inv.due_date)}
                </span>
              </div>
            </button>
          )
        })
      )}
    </div>
  )
}
