'use client'

import { useEntry } from '@/app/components/ui/animations'
import { useState, useEffect, useRef, useTransition } from 'react'
import {
  Filter as FilterIcon, Plus, X, Check, Mail, MoreHorizontal, Trash2,
  Eye, Pencil, FileText, Download, Upload, Bell, Copy, ArrowLeftRight,
  DollarSign, CreditCard, ChevronDown, ChevronLeft, ChevronRight,
  AlertCircle, BarChart3,
} from 'lucide-react'
import { ActionsDropdown } from '@/app/components/ui/ActionsDropdown'
import { SearchableSelect } from '@/app/components/ui/SearchableSelect'
import { DateField } from '@/app/components/ui/DateField'
import { FilterButton, ImportExportButton, filterChipCls } from '@/app/components/ui/ToolbarButtons'
import { SuccessModal } from '@/app/components/ui/SuccessModal'
import { ConfirmDeleteModal } from '@/app/components/ui/ConfirmDeleteModal'
import { Toast } from '@/app/components/ui/Toast'
import {
  type InvoiceRow, type RecurringRow, type PaymentRow,
  type ClientOption, type ProjectOption,
  type DbInvoiceStatus, type DbFrequency, type DbPayMethod,
  type InvoiceItemInput,
  createInvoice, updateInvoice, deleteInvoice, markInvoicePaid,
  createRecurring, updateRecurring,
} from './actions'
import { useSlideOver } from '@/app/components/ui/useSlideOver'
import { CONTENT_GAP } from '@/app/components/ui/spacing'
import { SearchInput } from '@/app/components/ui/SearchInput'
import { StatCard, StatCardGrid } from '@/app/components/ui/StatCard'
import { MobileHeader } from '@/app/components/ui/mobile/MobileHeader'
import { MobileInvoiceList } from '@/app/components/ui/mobile/MobileInvoiceList'
import { STATUS_LABEL, STATUS_CONFIG, fmtCurrency, fmtDate, invoiceTotal } from './display'

// ─── Display maps ──────────────────────────────────────────────────────────────
const FREQ_LABEL: Record<DbFrequency, string> = {
  monthly: 'Monthly', quarterly: 'Quarterly', annual: 'Annual',
}
const FREQ_BADGE: Record<DbFrequency, string> = {
  monthly:   'bg-purple-100 text-purple-700',
  quarterly: 'bg-blue-100 text-blue-700',
  annual:    'bg-orange-100 text-orange-700',
}
const PAY_LABEL: Record<DbPayMethod, string> = {
  bank_transfer: 'Bank Transfer', check: 'Check', card: 'Card',
}

const DB_STATUSES: DbInvoiceStatus[] = ['draft', 'sent', 'paid', 'overdue', 'partial']

const AVATAR_COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#6366F1', '#EC4899']
function avatarColor(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

/** Days between today and an ISO date; negative once the date has passed. */
function daysUntil(iso: string) {
  if (!iso) return 0
  return Math.ceil((new Date(iso + 'T00:00:00').getTime() - Date.now()) / 86_400_000)
}

function thisMonth(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  const now = new Date()
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
}
/** Whole days a due date is past, or 0 if it is still in the future. */
function overdueByDays(iso: string) {
  if (!iso) return 0
  const due = new Date(iso + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.max(0, Math.floor((today.getTime() - due.getTime()) / 86400000))
}
function lastMonth(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  const ref = new Date()
  ref.setDate(1)
  ref.setMonth(ref.getMonth() - 1)
  return d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear()
}

// ─── Filters ──────────────────────────────────────────────────────────────────
type AmountBand = 'under_10k' | '10k_15k' | 'over_50k'
type DateBand   = 'this_month' | 'last_30' | 'last_quarter'

const AMOUNT_OPTIONS: { key: AmountBand; label: string }[] = [
  { key: 'under_10k', label: 'Under $10K' },
  { key: '10k_15k',   label: '$10K-$15K'  },
  { key: 'over_50k',  label: 'Over $50K'  },
]
const DATE_OPTIONS: { key: DateBand; label: string }[] = [
  { key: 'this_month',   label: 'This Month'   },
  { key: 'last_30',      label: 'Last 30 days' },
  { key: 'last_quarter', label: 'Last Quarter' },
]

export interface InvoiceFilters {
  status:   DbInvoiceStatus[]
  amount:   AmountBand[]
  date:     DateBand[]
  /** Client id, or '' for every client. */
  clientId: string
}
const EMPTY_FILTERS: InvoiceFilters = { status: [], amount: [], date: [], clientId: '' }

function filterCount(f: InvoiceFilters) {
  return f.status.length + f.amount.length + f.date.length + (f.clientId ? 1 : 0)
}

function matchesAmount(total: number, band: AmountBand) {
  if (band === 'under_10k') return total < 10_000
  if (band === '10k_15k')   return total >= 10_000 && total <= 15_000
  return total > 50_000
}

/** Bands are measured against the issue date, counting back from today. */
function matchesDate(iso: string, band: DateBand) {
  if (!iso) return false
  const d = new Date(iso + 'T00:00:00')
  const now = new Date()
  if (band === 'this_month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  const days = Math.floor((now.getTime() - d.getTime()) / 86400000)
  return band === 'last_30' ? days >= 0 && days <= 30 : days >= 0 && days <= 90
}

/** Selectable chip shared by every section of the filter panel. */
const inputCls  = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all'
const selectCls = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all'

// ─── Types ─────────────────────────────────────────────────────────────────────
type ModalState =
  | { type: 'none' }
  /** `duplicate` prefills from an existing invoice but saves as a new one. */
  | { type: 'newInvoice'; invoice?: InvoiceRow; duplicate?: boolean }
  | { type: 'viewInvoice'; invoice: InvoiceRow }
  | { type: 'newRecurring'; recurring?: RecurringRow }
  | { type: 'markPaid'; invoice: InvoiceRow }
  | { type: 'deleteInvoice'; invoice: InvoiceRow }
  | { type: 'success'; title: string }

interface InvoiceFormValues {
  invoiceId?:  string
  client_id:   string
  project_id:  string
  issued_date: string
  due_date:    string
  tax:         number
  items:       (InvoiceItemInput & { _key: string })[]
  status:      DbInvoiceStatus
}

interface RecurringFormValues {
  recurringId?: string
  client_id:    string
  amount:       string
  frequency:    DbFrequency | ''
  description:  string
  next_date:    string
  status:       'active' | 'stopped'
}

/** Card heading with a count chip, as on the Invoice / Recurring / Payment cards. */
function TableCardHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center gap-2 px-6 pt-5 pb-4">
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 text-[10px] font-semibold">
        {count}{count > 0 ? '+' : ''}
      </span>
    </div>
  )
}

// ─── Filter Popover ────────────────────────────────────────────────────────────
/**
 * Status / amount / date / client filters. Selections are staged locally so the
 * table only re-filters once "Apply" is pressed, matching the design.
 */
function InvoiceFilterPopover({ filters, clients, onApply }: {
  filters: InvoiceFilters; clients: ClientOption[]; onApply: (f: InvoiceFilters) => void
}) {
  const [open, setOpen]   = useState(false)
  const [draft, setDraft] = useState<InvoiceFilters>(filters)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // Re-opening always starts from what is currently applied, so an abandoned
  // edit never leaks into the next session.
  function toggleOpen() {
    if (!open) setDraft(filters)
    setOpen(!open)
  }

  function toggle<K extends 'status' | 'amount' | 'date'>(key: K, value: InvoiceFilters[K][number]) {
    const current = draft[key] as InvoiceFilters[K][number][]
    const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value]
    setDraft({ ...draft, [key]: next })
  }

  const count = filterCount(filters)

  return (
    <div className="relative" ref={ref}>
      <FilterButton onClick={toggleOpen} active={open} count={count} />

      {open && (
        <div className="absolute right-0 top-11 z-30 w-[420px] bg-white rounded-2xl shadow-[0_8px_30px_rgba(16,24,40,0.14)] p-5">
          <p className="text-[11px] text-gray-400 mb-4">Filter</p>

          <div className="space-y-5">
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-2.5">Status</label>
              <div className="flex flex-wrap gap-2.5">
                {DB_STATUSES.map(s => (
                  <button key={s} onClick={() => toggle('status', s)} className={filterChipCls(draft.status.includes(s))}>
                    {STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-2.5">Amount</label>
              <div className="flex flex-wrap gap-2.5">
                {AMOUNT_OPTIONS.map(({ key, label }) => (
                  <button key={key} onClick={() => toggle('amount', key)} className={filterChipCls(draft.amount.includes(key))}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-2.5">Date</label>
              <div className="flex flex-wrap gap-2.5">
                {DATE_OPTIONS.map(({ key, label }) => (
                  <button key={key} onClick={() => toggle('date', key)} className={filterChipCls(draft.date.includes(key))}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-2.5">Client</label>
              <div className="relative">
                <select value={draft.clientId} onChange={e => setDraft({ ...draft, clientId: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-xs text-gray-700 bg-white appearance-none focus:outline-none focus:border-[#0D1B2A] transition-colors">
                  <option value="">All Clients</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={() => { setDraft(EMPTY_FILTERS); onApply(EMPTY_FILTERS) }}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                Clear All
              </button>
              <button onClick={() => { onApply(draft); setOpen(false) }}
                className="flex-1 px-4 py-2.5 bg-[#0D1B2A] text-white rounded-lg text-xs font-semibold hover:bg-[#162437] transition-colors">
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Mobile Filter Modal ───────────────────────────────────────────────────────
/**
 * The desktop filter is a popover anchored to its toolbar button; a phone has
 * no toolbar to anchor to, so the same controls become a centred dialog over a
 * blurred backdrop. Selections stage locally and land on Apply, as on desktop.
 */
function MobileFilterModal({ filters, onApply, onClose }: {
  filters: InvoiceFilters; onApply: (f: InvoiceFilters) => void; onClose: () => void
}) {
  const { close, backdropCls, panelCls } = useSlideOver(onClose, 'zoom')
  const [draft, setDraft] = useState<InvoiceFilters>(filters)

  function toggle<K extends 'status' | 'amount' | 'date'>(key: K, value: InvoiceFilters[K][number]) {
    const current = draft[key] as InvoiceFilters[K][number][]
    const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value]
    setDraft({ ...draft, [key]: next })
  }

  const chip = (active: boolean) => `${filterChipCls(active)} w-full text-center px-3 py-2.5 text-xs`

  return (
    <>
      <div className={`md:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] ${backdropCls}`} onClick={close} />
      <div className="md:hidden fixed inset-0 z-[101] flex items-center justify-center p-5 pointer-events-none">
        <div className={`pointer-events-auto w-full max-w-sm max-h-[85vh] overflow-y-auto bg-white rounded-2xl shadow-2xl p-5 ${panelCls}`}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-gray-900">Filter</h2>
            <button onClick={close} aria-label="Close filter" className="w-8 h-8 -mr-1 flex items-center justify-center rounded-full text-gray-400 active:bg-gray-100">
              <X size={18} />
            </button>
          </div>

          <div className="space-y-5">
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-2.5">Status</p>
              <div className="grid grid-cols-2 gap-3">
                {DB_STATUSES.map(s => (
                  <button key={s} onClick={() => toggle('status', s)} className={chip(draft.status.includes(s))}>
                    {STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-700 mb-2.5">Amount</p>
              <div className="grid grid-cols-2 gap-3">
                {AMOUNT_OPTIONS.map(({ key, label }) => (
                  <button key={key} onClick={() => toggle('amount', key)} className={chip(draft.amount.includes(key))}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-700 mb-2.5">Date</p>
              <div className="grid grid-cols-2 gap-3">
                {DATE_OPTIONS.map(({ key, label }) => (
                  <button key={key} onClick={() => toggle('date', key)} className={chip(draft.date.includes(key))}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button onClick={() => { setDraft(EMPTY_FILTERS); onApply(EMPTY_FILTERS); close() }}
                className="px-4 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 active:bg-gray-50 transition-colors">
                Clear All
              </button>
              <button onClick={() => { onApply(draft); close() }}
                className="px-4 py-3 bg-[#0D1B2A] text-white rounded-xl text-sm font-semibold active:bg-[#162437] transition-colors">
                Apply
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Import / Export Menu ──────────────────────────────────────────────────────
function ImportExportMenu({ onImport, onExport }: { onImport: () => void; onExport: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <ImportExportButton onClick={() => setOpen(!open)} active={open} />
      {open && (
        <div className="absolute right-0 top-11 z-30 w-52 bg-white rounded-2xl shadow-[0_8px_30px_rgba(16,24,40,0.14)] p-1.5">
          <button onClick={() => { setOpen(false); onImport() }}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium text-[#1D2939] hover:bg-[#F2F4F7] transition-colors">
            <Upload size={16} className="text-[#1D2939] shrink-0" strokeWidth={1.6}/> Import CSV
          </button>
          <button onClick={() => { setOpen(false); onExport() }}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium text-[#1D2939] hover:bg-[#F2F4F7] transition-colors">
            <Download size={16} className="text-[#1D2939] shrink-0" strokeWidth={1.6}/> Export CSV
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Pagination Bar ────────────────────────────────────────────────────────────
function PaginationBar({ page, pageCount, onPage }: {
  page: number; pageCount: number; onPage: (p: number) => void
}) {
  // Windowed page list: always the first pages, an ellipsis, then the last three.
  const pages: (number | '…')[] = []
  if (pageCount <= 7) {
    for (let i = 1; i <= pageCount; i++) pages.push(i)
  } else {
    for (let i = 1; i <= 3; i++) pages.push(i)
    pages.push('…')
    for (let i = pageCount - 2; i <= pageCount; i++) pages.push(i)
  }

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
      <button onClick={() => onPage(page - 1)} disabled={page === 1}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:hover:bg-transparent">
        <ChevronLeft size={14}/> Previous
      </button>
      <div className="flex items-center gap-1.5">
        {pages.map((p, i) => p === '…' ? (
          <span key={`gap-${i}`} className="w-8 h-8 flex items-center justify-center text-xs text-gray-400">…</span>
        ) : (
          <button key={p} onClick={() => onPage(p)}
            className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
              p === page ? 'bg-[#0D1B2A] text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}>
            {p}
          </button>
        ))}
      </div>
      <button onClick={() => onPage(page + 1)} disabled={page === pageCount}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:hover:bg-transparent">
        Next <ChevronRight size={14}/>
      </button>
    </div>
  )
}

// ─── Action Menu ───────────────────────────────────────────────────────────────
function InvoiceActionMenu({ onView, onEdit, onDuplicate, onDelete, onUnavailable }: {
  onView: () => void; onEdit: () => void; onDuplicate: () => void; onDelete: () => void
  /** Items the design shows but that have no backend yet. */
  onUnavailable: (label: string) => void
}) {
  // Uses the shared dropdown so the menu portals out of the table: the records
  // table scrolls inside `overflow-hidden`, which clipped the old inline menu.
  return (
    <div className="flex justify-center">
      <ActionsDropdown
        items={[
          { label: 'View Detail', icon: <Eye size={19} className="shrink-0" strokeWidth={1.6} />, onClick: onView },
          { label: 'Edit', icon: <Pencil size={19} className="shrink-0" strokeWidth={1.6} />, onClick: onEdit },
          { label: 'Download PDF', icon: <Download size={19} className="shrink-0" strokeWidth={1.6} />, onClick: () => onUnavailable('Download PDF') },
          { label: 'Send Reminder', icon: <Bell size={19} className="shrink-0" strokeWidth={1.6} />, onClick: () => onUnavailable('Send Reminder') },
          { label: 'Duplicate', icon: <Copy size={19} className="shrink-0" strokeWidth={1.6} />, onClick: onDuplicate },
          { label: 'Delete', icon: <Trash2 size={19} className="shrink-0" strokeWidth={1.6} />, onClick: onDelete, danger: true, separated: true },
        ]}
      />
    </div>
  )
}

// ─── Delete Confirm Modal ──────────────────────────────────────────────────────
function DeleteModal({ invoice, onConfirm, onCancel, loading }: {
  invoice: InvoiceRow; onConfirm: () => void; onCancel: () => void; loading: boolean
}) {
  return (
    <ConfirmDeleteModal
      title="Delete Invoice"
      message={`Deleting this invoice (${invoice.code}) will remove all associated data permanently.`}
      onCancel={onCancel}
      onConfirm={onConfirm}
      loading={loading}
    />
  )
}

// ─── Mark Paid Modal ───────────────────────────────────────────────────────────
function MarkPaidModal({ invoice, onConfirm, onCancel, loading }: {
  invoice: InvoiceRow; onConfirm: (method: DbPayMethod, amount: number) => void; onCancel: () => void; loading: boolean
}) {
  const { close, backdropCls, panelCls } = useSlideOver(onCancel, 'zoom')

  const total = invoiceTotal(invoice)
  const [method, setMethod] = useState<DbPayMethod>('bank_transfer')
  const [amount, setAmount] = useState(total.toString())
  return (
    <>
      <div className={`fixed inset-0 bg-black/40 z-[110] backdrop-blur-[1px] ${backdropCls}`} onClick={close} />
      <div className="fixed inset-0 z-[111] flex items-center justify-center p-4">
        <div className={`bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 relative ${panelCls}`}>
          <button onClick={close} className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"><X size={16}/></button>
          <h2 className="text-base font-semibold text-gray-900 mb-1">Mark as Paid</h2>
          <p className="text-xs text-gray-400 mb-6">{invoice.code} · {fmtCurrency(total)}</p>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Payment Method</label>
              <div className="relative">
                <select value={method} onChange={e => setMethod(e.target.value as DbPayMethod)} className={selectCls}>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="check">Check</option>
                  <option value="card">Card</option>
                </select>
                <ChevronDown size={13} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Amount Received ($)</label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div className="flex gap-3 mt-7">
            <button onClick={close} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button
              onClick={() => onConfirm(method, parseFloat(amount) || total)}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-[#0D1B2A] text-sm font-medium text-white hover:bg-[#162437] disabled:opacity-60"
            >
              {loading ? 'Saving…' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Invoice Form Sidebar ──────────────────────────────────────────────────────
function InvoiceFormSidebar({ invoice, duplicate, clients, projects, onClose, onSave, loading }: {
  invoice?: InvoiceRow; duplicate?: boolean; clients: ClientOption[]; projects: ProjectOption[]
  onClose: () => void; onSave: (v: InvoiceFormValues, asDraft: boolean) => void; loading: boolean
}) {
  const { close, backdropCls, panelCls } = useSlideOver(onClose)

  const [v, setV] = useState<InvoiceFormValues>({
    invoiceId:   duplicate ? undefined : invoice?.id,
    client_id:   invoice?.client_id ?? '',
    project_id:  invoice?.project_id ?? '',
    issued_date: invoice?.issued_date ?? '',
    due_date:    invoice?.due_date ?? '',
    tax:         invoice?.tax ?? 8,
    items:       invoice?.items.length
      ? invoice.items.map(i => ({ _key: i.id, description: i.description, qty: i.qty, rate: i.rate }))
      : [{ _key: '1', description: '', qty: 1, rate: 0 }],
    status:      invoice?.status ?? 'sent',
  })

  const subtotal = v.items.reduce((s, i) => s + i.qty * i.rate, 0)
  const taxAmt   = subtotal * (v.tax / 100)
  const total    = subtotal + taxAmt

  function setItem(key: string, field: keyof InvoiceItemInput, val: string | number) {
    setV(prev => ({ ...prev, items: prev.items.map(i => i._key === key ? { ...i, [field]: val } : i) }))
  }
  function addItem() {
    setV(prev => ({ ...prev, items: [...prev.items, { _key: Date.now().toString(), description: '', qty: 1, rate: 0 }] }))
  }
  function removeItem(key: string) {
    if (v.items.length > 1) setV(prev => ({ ...prev, items: prev.items.filter(i => i._key !== key) }))
  }

  // Auto-fill email from selected client
  const selectedClient = clients.find(c => c.id === v.client_id)

  return (
    <>
      <div className={`fixed inset-0 bg-black/40 z-[100] backdrop-blur-[1px] ${backdropCls}`} onClick={close} />
      <div className="fixed inset-y-0 right-0 z-[101] flex">
        <div className={`bg-white w-[640px] max-w-full h-full flex flex-col shadow-2xl ${panelCls}`}>
          <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100 shrink-0">
            <h2 className="text-lg font-semibold text-gray-900">{invoice && !duplicate ? 'Edit Invoice' : 'New Invoice'}</h2>
            <button onClick={close} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"><X size={18}/></button>
          </div>

          <div className="overflow-y-auto flex-1 px-7 py-7 space-y-7 bg-[#FCFCFD]">
            {/* Invoice Details */}
            <div className="space-y-5">
              <h3 className="text-base font-semibold text-gray-900">Invoice Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Client</label>
                  <SearchableSelect
                    options={clients.map(c => ({ id: c.id, label: c.name, sublabel: c.company ?? undefined }))}
                    value={v.client_id}
                    onChange={id => setV(p => ({ ...p, client_id: id }))}
                    placeholder="Select Client"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Project</label>
                  <SearchableSelect
                    options={projects.map(pr => ({ id: pr.id, label: pr.name }))}
                    value={v.project_id}
                    onChange={id => setV(p => ({ ...p, project_id: id }))}
                    placeholder="Select project"
                    showAvatars={false}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Issue Date</label>
                  <DateField value={v.issued_date} onChange={val => setV(p => ({ ...p, issued_date: val }))}/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Due Date</label>
                  <DateField value={v.due_date} onChange={val => setV(p => ({ ...p, due_date: val }))}/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Residential Email</label>
                  <input type="email" placeholder="Email" value={selectedClient?.email ?? ''} readOnly className={`${inputCls} bg-gray-50 text-gray-400`}/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Tax (%)</label>
                  <input type="number" value={v.tax} onChange={e => setV(p => ({ ...p, tax: parseFloat(e.target.value) || 0 }))} className={inputCls}/>
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-gray-900">Line Items</h3>
              <div className="space-y-3">
                {v.items.map((item, idx) => (
                  <div key={item._key} className="flex gap-3 items-start">
                    <div className="flex-1">
                      {idx === 0 && <label className="block text-xs font-semibold text-gray-600 mb-1.5">Description</label>}
                      <input placeholder="Description of work" value={item.description} onChange={e => setItem(item._key, 'description', e.target.value)} className={inputCls}/>
                    </div>
                    <div className="w-20">
                      {idx === 0 && <label className="block text-xs font-semibold text-gray-600 mb-1.5">Qty</label>}
                      <input type="number" value={item.qty} onChange={e => setItem(item._key, 'qty', parseFloat(e.target.value) || 0)} className={inputCls}/>
                    </div>
                    <div className="w-32">
                      {idx === 0 && <label className="block text-xs font-semibold text-gray-600 mb-1.5">Rate ($)</label>}
                      <input type="number" value={item.rate} onChange={e => setItem(item._key, 'rate', parseFloat(e.target.value) || 0)} className={inputCls}/>
                    </div>
                    <div className={idx === 0 ? 'pt-[26px]' : ''}>
                      <button
                        onClick={() => removeItem(item._key)}
                        aria-label="Remove line item"
                        className="w-[42px] h-[42px] rounded-xl border border-red-200 text-red-500 flex items-center justify-center hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={15}/>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={addItem} className="flex items-center gap-2 text-sm font-semibold text-gray-900 hover:text-[#0D1B2A]">
                Add Line Item <Plus size={15}/>
              </button>
            </div>

            {/* Totals */}
            <div className="border border-gray-200 rounded-xl px-5 py-4 space-y-3">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span className="text-gray-900">{fmtCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Tax ({v.tax}%)</span>
                <span className="text-gray-900">{fmtCurrency(subtotal * (v.tax / 100))}</span>
              </div>
              <div className="border-t border-gray-100 pt-3 flex justify-between text-base font-semibold text-gray-900">
                <span>Total</span>
                <span>{fmtCurrency(total)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-7 py-5 border-t border-gray-100 shrink-0 bg-white">
            <button onClick={close} className="px-6 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 rounded-xl transition-colors">Close</button>
            <div className="flex gap-2 ml-auto">
              <button onClick={() => onSave(v, true)} disabled={loading} className="px-6 py-2.5 text-sm font-semibold text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-60">
                Save as Draft
              </button>
              <button onClick={() => onSave(v, false)} disabled={loading || !v.client_id || !v.due_date}
                className="px-6 py-2.5 text-sm font-semibold text-white bg-[#0D1B2A] hover:bg-[#162437] rounded-xl transition-colors disabled:opacity-60"
              >
                {loading ? 'Saving…' : 'Save & Send'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Recurring Form Sidebar ────────────────────────────────────────────────────
function RecurringFormSidebar({ recurring, clients, onClose, onSave, loading }: {
  recurring?: RecurringRow; clients: ClientOption[]; onClose: () => void
  onSave: (v: RecurringFormValues) => void; loading: boolean
}) {
  const { close, backdropCls, panelCls } = useSlideOver(onClose)

  const [v, setV] = useState<RecurringFormValues>({
    recurringId: recurring?.id,
    client_id:   recurring?.client_id ?? '',
    amount:      recurring?.amount.toString() ?? '',
    frequency:   recurring?.frequency ?? '',
    description: recurring?.description ?? '',
    next_date:   recurring?.next_date ?? '',
    status:      recurring?.status ?? 'active',
  })

  return (
    <>
      <div className={`fixed inset-0 bg-black/40 z-[100] backdrop-blur-[1px] ${backdropCls}`} onClick={close}/>
      <div className="fixed inset-y-0 right-0 z-[101] flex">
        <div className={`bg-white w-[640px] max-w-full h-full flex flex-col shadow-2xl ${panelCls}`}>
          <div className="flex items-center justify-between px-7 pt-6 pb-5 shrink-0">
            <h2 className="text-lg font-semibold text-gray-900">{recurring ? 'Edit Recurring' : 'New Recurring'}</h2>
            <button onClick={close} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"><X size={18}/></button>
          </div>

          <div className="overflow-y-auto flex-1 px-7 py-7 bg-white">
            <div className="space-y-5">
              <h3 className="text-base font-semibold text-gray-900">Recurring Details</h3>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Client</label>
                <SearchableSelect
                  options={clients.map(c => ({ id: c.id, label: c.name, sublabel: c.company ?? undefined }))}
                  value={v.client_id}
                  onChange={id => setV(p => ({ ...p, client_id: id }))}
                  placeholder="Select Client"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Amount ($)</label>
                  <div className="relative">
                    <DollarSign size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                    <input type="number" className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-2.5 text-sm" placeholder="0.00" value={v.amount} onChange={e => setV(p => ({ ...p, amount: e.target.value }))}/>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Status</label>
                  <div className="relative">
                    <select value={v.status} onChange={e => setV(p => ({ ...p, status: e.target.value as any }))} className={selectCls}>
                      <option value="active">Active</option>
                      <option value="stopped">Stopped</option>
                    </select>
                    <ChevronDown size={13} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Description</label>
                <input className={inputCls} placeholder="e.g. Monthly roof maintenance" value={v.description} onChange={e => setV(p => ({ ...p, description: e.target.value }))}/>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Frequency</label>
                  <div className="relative">
                    <select value={v.frequency} onChange={e => setV(p => ({ ...p, frequency: e.target.value as DbFrequency }))} className={`${selectCls} ${v.frequency ? '' : 'text-gray-400'}`}>
                      <option value="" disabled>Select frequency</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="annual">Annual</option>
                    </select>
                    <ChevronDown size={13} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Start Date</label>
                  <DateField value={v.next_date} onChange={val => setV(p => ({ ...p, next_date: val }))} placeholder="Start Date"/>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-7 py-5 border-t border-gray-100 shrink-0 bg-white">
            <button onClick={close} className="px-6 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-50 rounded-xl">Close</button>
            <button onClick={() => onSave(v)} disabled={loading || !v.client_id || !v.amount || !v.frequency}
              className="px-6 py-2 text-sm font-semibold text-white bg-[#0D1B2A] hover:bg-[#162437] rounded-xl disabled:opacity-60 transition-colors"
            >
              {loading ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Invoice Detail Sidebar ────────────────────────────────────────────────────
function InvoiceDetailSidebar({ invoice, payments, onClose, onEdit, onMarkPaid }: {
  invoice: InvoiceRow
  /** Payments already recorded against this invoice, for the status bar. */
  payments: PaymentRow[]
  onClose: () => void; onEdit: () => void; onMarkPaid: () => void
}) {
  const { close, backdropCls, panelCls } = useSlideOver(onClose)

  const subtotal = invoice.items.reduce((s, i) => s + i.qty * i.rate, 0)
  const taxAmt   = subtotal * (invoice.tax / 100)
  const total    = subtotal + taxAmt
  const s        = STATUS_CONFIG[invoice.status]

  // Paid-to-date comes from cleared payments, so the bar reflects the ledger
  // rather than the invoice's status flag alone.
  const paid = payments
    .filter(p => p.invoice_id === invoice.id && p.status === 'cleared')
    .reduce((sum, p) => sum + p.amount, 0)
  const settled = invoice.status === 'paid' ? total : paid
  const balance = Math.max(0, total - settled)
  const paidPercent = total > 0 ? Math.min(100, Math.round((settled / total) * 100)) : 0
  const overdue = invoice.status === 'overdue' || (balance > 0 && daysUntil(invoice.due_date) < 0)

  const sectionLabel = 'text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3'

  return (
    <>
      <div className={`fixed inset-0 bg-black/40 z-[100] backdrop-blur-[1px] ${backdropCls}`} onClick={close}/>
      <div className="fixed inset-y-0 right-0 z-[101] flex">
        <div className={`bg-white w-[640px] max-w-full h-full flex flex-col shadow-2xl ${panelCls}`}>
          <div className="flex items-center justify-between px-7 pt-6 pb-5 shrink-0">
            <h2 className="text-lg font-semibold text-gray-900">{invoice.code}</h2>
            <button onClick={close} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"><X size={18}/></button>
          </div>

          <div className="overflow-y-auto flex-1 px-7 pb-6 space-y-6 bg-white">
            {/* The invoice itself, framed like the printed document. */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="flex justify-between items-start gap-4 bg-[#F9FAFB] px-5 py-4">
                <div>
                  <h3 className="font-bold text-gray-900 text-base leading-none">PEAK</h3>
                  <p className="text-[11px] text-gray-500 mt-1">ROOFING CO.</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Invoice</span>
                  <h4 className="text-base font-semibold text-gray-900 leading-tight">{invoice.code}</h4>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1 ${s.bg} ${s.text}`}>
                    <span className={`w-1 h-1 rounded-full ${s.dot}`}/> {STATUS_LABEL[invoice.status]}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 px-5 py-4 border-t border-gray-100">
                <div>
                  <p className="text-[11px] text-gray-400 mb-1">From</p>
                  <h5 className="font-semibold text-gray-900 text-sm">Peak Roofing Co.</h5>
                  <p className="text-[11px] text-gray-500 leading-relaxed mt-1">
                    123 Rooftop Ave, Las Vegas, NV 89101<br/>admin@peakroofing.com · (702) 555-0100
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-gray-400 mb-1">Bill to</p>
                  <h5 className="font-semibold text-gray-900 text-sm">{invoice.client_company ?? invoice.client_name}</h5>
                  <p className="text-[11px] text-gray-500 leading-relaxed mt-1">
                    {invoice.client_name}<br/>{invoice.client_email}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 bg-[#F9FAFB] px-5 py-3 border-y border-gray-100">
                <div>
                  <p className="text-[11px] text-gray-400">Issue Date</p>
                  <p className="text-xs font-semibold text-gray-900 mt-0.5">{fmtDate(invoice.issued_date)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-400">Due Date</p>
                  <p className={`text-xs font-semibold mt-0.5 ${overdue ? 'text-red-600' : 'text-gray-900'}`}>{fmtDate(invoice.due_date)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-400">Project</p>
                  <p className="text-xs font-semibold text-gray-900 mt-0.5">{invoice.project_name ?? '—'}</p>
                </div>
              </div>

              <table className="w-full">
                <thead>
                  <tr className="bg-[#F9FAFB] text-[11px] text-gray-500 text-left border-b border-gray-100">
                    <th className="px-5 py-2.5 font-medium">Description</th>
                    <th className="px-5 py-2.5 font-medium">Qty</th>
                    <th className="px-5 py-2.5 font-medium">Rate</th>
                    <th className="px-5 py-2.5 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  {invoice.items.length === 0 && (
                    <tr><td colSpan={4} className="px-5 py-6 text-center text-gray-400">No line items on this invoice.</td></tr>
                  )}
                  {invoice.items.map(item => (
                    <tr key={item.id} className="border-b border-gray-100">
                      <td className="px-5 py-4 text-gray-900">{item.description}</td>
                      <td className="px-5 py-4 text-gray-600">{item.qty}</td>
                      <td className="px-5 py-4 text-gray-600">{fmtCurrency(item.rate)}</td>
                      <td className="px-5 py-4 text-right text-gray-900">{fmtCurrency(item.qty * item.rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="px-5 py-4 space-y-2 text-xs">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span><span className="text-gray-900">{fmtCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Tax ({invoice.tax}%)</span><span className="text-gray-900">{fmtCurrency(taxAmt)}</span>
                </div>
                <div className="flex justify-between pt-3 mt-1 border-t border-gray-100 text-sm font-semibold text-gray-900">
                  <span>Total</span><span>{fmtCurrency(total)}</span>
                </div>
              </div>
            </div>

            {/* Payment status */}
            <div>
              <h4 className={sectionLabel}>Payment Status</h4>
              <div className="flex justify-between items-center text-[11px] mb-2">
                <span className="text-gray-500">Paid: {fmtCurrency(settled)} of {fmtCurrency(total)}</span>
                <span className="text-gray-500">{paidPercent}%</span>
              </div>
              <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${paidPercent >= 100 ? 'bg-emerald-500' : overdue ? 'bg-orange-500' : 'bg-blue-500'}`}
                  style={{ width: `${paidPercent}%` }}
                />
              </div>
              {balance > 0 && (
                <p className={`text-[11px] mt-2 ${overdue ? 'text-orange-600' : 'text-gray-500'}`}>
                  {overdue ? 'Balance overdue' : 'Balance due'}: ({fmtCurrency(balance)})
                </p>
              )}
            </div>

            {/* Activity */}
            <div>
              <h4 className={sectionLabel}>Activity</h4>
              <div className="space-y-0">
                {activityEntries(invoice, payments, settled).map((entry, i, all) => (
                  <div key={entry.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 ${entry.tone}`}>
                        {entry.icon}
                      </span>
                      {i < all.length - 1 && <span className="w-px flex-1 bg-gray-200 my-1"/>}
                    </div>
                    <div className={i < all.length - 1 ? 'pb-6' : ''}>
                      <p className="text-sm text-gray-900">{entry.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{entry.meta}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 px-7 py-5 shrink-0 bg-white">
            <button onClick={close} className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-[#F5F6F8] rounded-lg hover:bg-gray-200 transition-colors">Close</button>
            <div className="flex gap-2 ml-auto">
              <button onClick={() => { onClose(); onEdit() }} className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg flex items-center gap-2 hover:bg-gray-50 transition-colors">
                <Pencil size={13}/> Edit
              </button>
              <button className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg flex items-center gap-2 hover:bg-gray-50 transition-colors">
                Download PDF <Download size={13}/>
              </button>
              {invoice.status !== 'paid' && (
                <button onClick={onMarkPaid} className="px-6 py-2.5 text-sm font-medium text-white bg-[#0D1B2A] rounded-lg hover:bg-[#162437] flex items-center gap-2 transition-colors">
                  Mark as Paid <Check size={14}/>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

type InvoiceActivity = { id: string; title: string; meta: string; icon: React.ReactNode; tone: string }

/**
 * Timeline built from what the record actually knows — issue date, send state,
 * recorded payments — rather than a stored event feed, which does not exist.
 */
function activityEntries(invoice: InvoiceRow, payments: PaymentRow[], settled: number): InvoiceActivity[] {
  const entries: InvoiceActivity[] = [{
    id: 'created',
    title: 'Invoice created',
    meta: `${fmtDate(invoice.issued_date)} · Admin`,
    icon: <FileText size={13}/>,
    tone: 'bg-gray-50 border-gray-200 text-gray-500',
  }]

  if (invoice.status !== 'draft') {
    entries.push({
      id: 'sent',
      title: `Invoice sent to ${invoice.client_email || invoice.client_name}`,
      meta: `${fmtDate(invoice.issued_date)} · System`,
      icon: <Mail size={13}/>,
      tone: 'bg-gray-50 border-gray-200 text-gray-500',
    })
  }

  for (const payment of payments.filter(p => p.invoice_id === invoice.id)) {
    entries.push({
      id: `pay-${payment.id}`,
      title: `Payment received: ${fmtCurrency(payment.amount)}`,
      meta: `${fmtDate(payment.date)} · System`,
      icon: <Check size={13} strokeWidth={3}/>,
      tone: 'bg-emerald-50 border-emerald-100 text-emerald-600',
    })
  }

  // A paid invoice with no payment row still deserves the closing entry.
  if (invoice.status === 'paid' && !payments.some(p => p.invoice_id === invoice.id)) {
    entries.push({
      id: 'paid',
      title: `Payment received: ${fmtCurrency(settled)}`,
      meta: 'System',
      icon: <Check size={13} strokeWidth={3}/>,
      tone: 'bg-emerald-50 border-emerald-100 text-emerald-600',
    })
  }

  return entries
}

// ─── Success Modal ─────────────────────────────────────────────────────────────
function EmptyState({ label }: { label: string }) {
  return (
    <div className="py-20 text-center flex flex-col items-center text-gray-400">
      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4"><FileText size={32} className="text-gray-200"/></div>
      <p className="text-sm font-medium">No {label} found.</p>
    </div>
  )
}

// ─── Main Client Component ─────────────────────────────────────────────────────
export function InvoicesClient({
  initialInvoices, initialRecurring, initialPayments, clients, projects, openInvoiceId = null,
}: {
  initialInvoices:  InvoiceRow[]
  initialRecurring: RecurringRow[]
  initialPayments:  PaymentRow[]
  clients:          ClientOption[]
  projects:         ProjectOption[]
  /** Invoice to open on arrival, set by `?invoice=` deep links. */
  openInvoiceId?:   string | null
}) {
  const enter = useEntry()
  const [isPending, startTransition] = useTransition()
  const [invoices,  setInvoices]  = useState(initialInvoices)
  const [recurring, setRecurring] = useState(initialRecurring)
  const [payments,  setPayments]  = useState(initialPayments)
  const [tab, setTab]             = useState<'invoices' | 'recurring' | 'payments'>('invoices')
  const [search, setSearch]       = useState('')
  // A `?invoice=` deep link (from a project's Invoices tab) lands with that
  // invoice's details already open. page.tsx keys this component on the id, so
  // following a second link remounts and opens the new one.
  const [modal, setModal]         = useState<ModalState>(() => {
    const deepLinked = openInvoiceId ? initialInvoices.find(i => i.id === openInvoiceId) : undefined
    return deepLinked ? { type: 'viewInvoice', invoice: deepLinked } : { type: 'none' }
  })
  const [filters, setFilters]     = useState<InvoiceFilters>(EMPTY_FILTERS)
  const [page, setPage]           = useState(1)
  const [toast, setToast]         = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  /** The phone filter dialog; desktop uses the toolbar popover instead. */
  const [mobileFilter, setMobileFilter] = useState(false)
  const importInputRef            = useRef<HTMLInputElement>(null)

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3000) }

  // ─── Stats ──────────────────────────────────────────────────────────────────
  const revenueThisMonth = invoices
    .filter(i => i.status === 'paid' && thisMonth(i.due_date))
    .reduce((s, i) => s + invoiceTotal(i), 0)
  const revenueLastMonth = invoices
    .filter(i => i.status === 'paid' && lastMonth(i.due_date))
    .reduce((s, i) => s + invoiceTotal(i), 0)
  const revenueUp = revenueThisMonth >= revenueLastMonth
  const outstanding = invoices
    .filter(i => i.status === 'sent' || i.status === 'partial')
    .reduce((s, i) => s + invoiceTotal(i), 0)
  const overdueInvs  = invoices.filter(i => i.status === 'overdue')
  const overdueSum   = overdueInvs.reduce((s, i) => s + invoiceTotal(i), 0)
  const paidCount    = invoices.filter(i => i.status === 'paid').length
  const closedCount  = invoices.filter(i => i.status === 'paid' || i.status === 'overdue' || i.status === 'partial').length
  const collectionRate = closedCount > 0 ? Math.round(paidCount / closedCount * 100) : 0

  // The phone shows three tiles that must reconcile, so drafts — not yet money
  // owed by anyone — are left out and outstanding is simply what is unpaid.
  const issuedInvoices = invoices.filter(i => i.status !== 'draft')
  const totalInvoiced  = issuedInvoices.reduce((s, i) => s + invoiceTotal(i), 0)
  const totalPaid      = issuedInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + invoiceTotal(i), 0)
  const totalOutstanding = totalInvoiced - totalPaid

  // ─── Filters ────────────────────────────────────────────────────────────────
  // Every section is a union within itself and an intersection across sections:
  // "Draft or Sent" *and* "under $10K" *and* "this month".
  const filteredInvoices = invoices.filter(inv => {
    const q = search.toLowerCase()
    const matchSearch = inv.code.toLowerCase().includes(q) || inv.client_name.toLowerCase().includes(q) || (inv.client_company ?? '').toLowerCase().includes(q)
    if (!matchSearch) return false
    if (filters.status.length > 0 && !filters.status.includes(inv.status)) return false
    if (filters.amount.length > 0 && !filters.amount.some(b => matchesAmount(invoiceTotal(inv), b))) return false
    if (filters.date.length   > 0 && !filters.date.some(b => matchesDate(inv.issued_date, b))) return false
    if (filters.clientId && inv.client_id !== filters.clientId) return false
    return true
  })

  const PAGE_SIZE = 10
  const pageCount = Math.max(1, Math.ceil(filteredInvoices.length / PAGE_SIZE))
  const safePage  = Math.min(page, pageCount)
  const pagedInvoices = filteredInvoices.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  // Row selection. The header box governs the rows on screen: ticking it selects
  // this page, unticking clears it, and it shows a dash while only some are on.
  const pageIds = pagedInvoices.map(i => i.id)
  const allOnPageSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.has(id))
  const someOnPageSelected = pageIds.some(id => selectedIds.has(id)) && !allOnPageSelected

  function togglePageSelection(checked: boolean) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      for (const id of pageIds) {
        if (checked) next.add(id)
        else next.delete(id)
      }
      return next
    })
  }

  function toggleRowSelection(id: string, checked: boolean) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function applyFilters(f: InvoiceFilters) {
    setFilters(f)
    setPage(1)
  }

  // ─── Import / Export ─────────────────────────────────────────────────────────
  /** Downloads whatever the active tab currently shows, filters included. */
  function exportCsv() {
    const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
    let header: string[]
    let rows: (string | number)[][]

    if (tab === 'recurring') {
      header = ['Plan', 'Client', 'Description', 'Amount', 'Frequency', 'Next Date', 'Status']
      rows = recurring.map(r => [r.code, r.client_name, r.description, r.amount.toFixed(2), FREQ_LABEL[r.frequency], r.next_date, r.status])
    } else if (tab === 'payments') {
      header = ['Payment', 'Date', 'Invoice', 'Client', 'Method', 'Amount', 'Reference', 'Status']
      rows = payments.map(p => [p.code, p.date, p.invoice_code, p.client_name, PAY_LABEL[p.method], p.amount.toFixed(2), p.reference, p.status])
    } else {
      header = ['Invoice', 'Client', 'Company', 'Project', 'Issued', 'Due Date', 'Total', 'Status']
      rows = filteredInvoices.map(inv => [
        inv.code, inv.client_name, inv.client_company ?? '', inv.project_name ?? '',
        inv.issued_date, inv.due_date, invoiceTotal(inv).toFixed(2), STATUS_LABEL[inv.status],
      ])
    }

    const csv  = [header, ...rows].map(r => r.map(escape).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `${tab}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    showToast(`Exported ${rows.length} row${rows.length !== 1 ? 's' : ''}`)
  }

  // ─── Invoice save ────────────────────────────────────────────────────────────
  function handleSaveInvoice(v: InvoiceFormValues, asDraft: boolean) {
    startTransition(async () => {
      try {
        const input = {
          client_id:   v.client_id,
          project_id:  v.project_id || null,
          issued_date: v.issued_date || new Date().toISOString().split('T')[0],
          due_date:    v.due_date,
          status:      (asDraft ? 'draft' : 'sent') as DbInvoiceStatus,
          tax:         v.tax,
          notes:       null,
          items:       v.items.map(({ description, qty, rate }) => ({ description, qty, rate })),
        }
        const client  = clients.find(c => c.id === v.client_id)
        const project = projects.find(p => p.id === v.project_id)

        if (v.invoiceId) {
          const res = await updateInvoice(v.invoiceId, input)
          if ('error' in res) { showToast(`Error: ${res.error}`); return }
          setInvoices(prev => prev.map(inv => inv.id !== v.invoiceId ? inv : {
            ...inv, ...input,
            client_name: client?.name ?? inv.client_name,
            client_company: client?.company ?? inv.client_company,
            client_email: client?.email ?? inv.client_email,
            project_name: project?.name ?? inv.project_name,
            items: v.items.map((it, i) => ({ id: it._key, description: it.description, qty: it.qty, rate: it.rate, sort_order: i })),
          }))
          setModal({ type: 'success', title: 'Invoice updated' })
        } else {
          const res = await createInvoice(input)
          if ('error' in res) { showToast(`Error: ${res.error}`); return }
          const newInv: InvoiceRow = {
            id: (res as any).id, code: (res as any).code,
            client_name: client?.name ?? 'Unknown',
            client_company: client?.company ?? null,
            client_email: client?.email ?? '',
            project_name: project?.name ?? null,
            ...input,
            items: v.items.map((it, i) => ({ id: it._key, description: it.description, qty: it.qty, rate: it.rate, sort_order: i })),
            created_at: new Date().toISOString(),
          }
          setInvoices(prev => [newInv, ...prev])
          // A failed send must not read as "sent successfully".
          const warning = (res as { emailWarning?: string }).emailWarning
          if (warning) {
            showToast(`Error: ${warning}`)
            setModal({ type: 'none' })
          } else {
            setModal({ type: 'success', title: asDraft ? 'Invoice saved as draft' : 'Invoice sent successfully' })
          }
        }
      } catch (e: any) {
        console.error('Invoice save error:', e)
        showToast('An unexpected error occurred while saving.')
      }
    })
  }

  // ─── Delete invoice ──────────────────────────────────────────────────────────
  function confirmDeleteInvoice() {
    if (modal.type !== 'deleteInvoice') return
    const inv = modal.invoice
    startTransition(async () => {
      const res = await deleteInvoice(inv.id)
      if ('error' in res) { showToast(`Error: ${res.error}`); return }
      setInvoices(prev => prev.filter(i => i.id !== inv.id))
      // Drop the row from the selection too, so a deleted invoice cannot linger
      // in it and keep the header checkbox out of step with what is on screen.
      setSelectedIds(prev => {
        if (!prev.has(inv.id)) return prev
        const next = new Set(prev)
        next.delete(inv.id)
        return next
      })
      setModal({ type: 'none' })
      showToast(`Invoice(${inv.code}) deleted successfully`)
    })
  }

  // ─── Mark paid ───────────────────────────────────────────────────────────────
  function confirmMarkPaid(method: DbPayMethod, amount: number) {
    if (modal.type !== 'markPaid') return
    const inv = modal.invoice
    startTransition(async () => {
      const res = await markInvoicePaid(inv.id, method, amount)
      if ('error' in res) { showToast(`Error: ${res.error}`); return }
      setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, status: 'paid' } : i))
      const newPayment: PaymentRow = {
        id: res.paymentId, code: res.code,
        invoice_id: inv.id, invoice_code: inv.code,
        client_name: inv.client_name, client_company: inv.client_company,
        date: new Date().toISOString().split('T')[0],
        method, amount, reference: res.reference,
        status: 'cleared', created_at: new Date().toISOString(),
      }
      setPayments(prev => [newPayment, ...prev])
      setModal({ type: 'success', title: 'Payment recorded successfully' })
    })
  }

  // ─── Save recurring ──────────────────────────────────────────────────────────
  /** Stops a plan rather than deleting it, so its past invoices keep their link. */
  function cancelRecurring(plan: RecurringRow) {
    startTransition(async () => {
      const res = await updateRecurring(plan.id, { status: 'stopped' })
      if ('error' in res) { showToast(`Error: ${res.error}`); return }
      setRecurring(prev => prev.map(r => r.id === plan.id ? { ...r, status: 'stopped' } : r))
      showToast(`Recurring plan for ${plan.client_name} cancelled`)
    })
  }

  function handleSaveRecurring(v: RecurringFormValues) {
    // The form starts with no frequency so its placeholder can show; Save stays
    // disabled until one is picked, so this is only a type-level narrowing.
    if (!v.frequency) return
    const frequency = v.frequency
    startTransition(async () => {
      const client = clients.find(c => c.id === v.client_id)
      const input = {
        client_id:   v.client_id,
        description: v.description,
        amount:      parseFloat(v.amount) || 0,
        frequency,
        next_date:   v.next_date,
        status:      v.status,
      }
      if (v.recurringId) {
        const res = await updateRecurring(v.recurringId, input)
        if ('error' in res) { showToast(`Error: ${res.error}`); return }
        setRecurring(prev => prev.map(r => r.id !== v.recurringId ? r : {
          ...r, ...input,
          client_name: client?.name ?? r.client_name,
          client_company: client?.company ?? r.client_company,
        }))
      } else {
        const res = await createRecurring(input)
        if ('error' in res) { showToast(`Error: ${res.error}`); return }
        const newRec: RecurringRow = {
          id: res.id, code: res.code,
          client_name: client?.name ?? 'Unknown',
          client_company: client?.company ?? null,
          ...input,
          created_at: new Date().toISOString(),
        }
        setRecurring(prev => [newRec, ...prev])
      }
      setModal({ type: 'success', title: 'Recurring plan saved' })
    })
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      {/* Phones get no AppHeader, so the screen carries its own title bar. */}
      <MobileHeader title="Invoices" />

      {/* Toast */}
      {toast && <Toast message={toast} variant={/^(Error|An unexpected)/.test(toast) ? 'error' : 'success'} />}

      {/* Phones get a card list — the table below needs 1000px to read. */}
      <div className="md:hidden flex-1 overflow-y-auto p-4 bg-[#FCFCFD]">
        <MobileInvoiceList
          invoices={filteredInvoices}
          totalInvoiced={totalInvoiced}
          totalPaid={totalPaid}
          outstanding={totalOutstanding}
          search={search}
          onSearchChange={v => { setSearch(v); setPage(1) }}
          onOpenFilter={() => setMobileFilter(true)}
          filterCount={filterCount(filters)}
          onSelect={inv => setModal({ type: 'viewInvoice', invoice: inv })}
        />
      </div>

      {mobileFilter && (
        <MobileFilterModal
          filters={filters}
          onApply={applyFilters}
          onClose={() => setMobileFilter(false)}
        />
      )}

      <div className="hidden md:block flex-1 overflow-y-auto">
        {/* Stat cards */}
        <StatCardGrid className="px-8 pt-6">
          <StatCard label="Revenue This Month" value={fmtCurrency(revenueThisMonth)}
            sub={`${revenueUp ? '↑' : '↓'} vs last month`} subColor={revenueUp ? 'text-emerald-600' : 'text-red-500'}
            iconBg="bg-emerald-50" icon={<DollarSign size={16} className="text-emerald-500" strokeWidth={1.8}/>}/>
          <StatCard label="Outstanding" value={fmtCurrency(outstanding)} sub="Awaiting payment" subColor="text-amber-600"
            iconBg="bg-orange-50" icon={<CreditCard size={16} className="text-orange-500" strokeWidth={1.8}/>}/>
          <StatCard label="Overdue" value={fmtCurrency(overdueSum)} sub="Needs follow-up" subColor="text-red-500"
            iconBg="bg-red-50" icon={<AlertCircle size={16} className="text-red-500" strokeWidth={1.8}/>}/>
          <StatCard label="Collection Rate" value={`${collectionRate}%`}
            iconBg="bg-blue-50" icon={<BarChart3 size={16} className="text-blue-500" strokeWidth={1.8}/>}/>
        </StatCardGrid>

        <div className="px-8">
          {/* Tab bar */}
          <div className={`flex border-b border-gray-200 gap-6 ${CONTENT_GAP}`}>
            {[
              { k: 'invoices',  label: 'Invoices',     count: invoices.length  },
              { k: 'recurring', label: 'Recurring',    count: recurring.length },
              { k: 'payments',  label: 'Payment Log',  count: payments.length  },
            ].map(t => (
              <button key={t.k} onClick={() => setTab(t.k as any)}
                className={`pb-3 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === t.k ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                {t.label} ({t.count})
              </button>
            ))}
          </div>

          {/* Toolbar */}
          <div className={`flex items-center justify-between ${CONTENT_GAP}`}>
            <div className="flex items-center gap-3">
              {/* Recurring plans are not searched — the tab explains itself instead. */}
              {tab === 'recurring' ? (
                <p className="text-xs text-gray-500">Auto-generated invoices sent on a schedule</p>
              ) : (
                <SearchInput
                  value={search}
                  onChange={v => { setSearch(v); setPage(1) }}
                  placeholder={`Search ${tab}`}
                />
              )}
            </div>
            <div className="flex items-center gap-3">
              {tab === 'invoices' && (
                <InvoiceFilterPopover filters={filters} clients={clients} onApply={applyFilters}/>
              )}
              {/* Recurring plans are not exported, so that tab shows no menu. */}
              {tab !== 'recurring' && (
                <ImportExportMenu
                  onImport={() => importInputRef.current?.click()}
                  onExport={exportCsv}
                />
              )}
              {tab === 'invoices' && (
                <button onClick={() => setModal({ type: 'newInvoice' })}
                  className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#0D1B2A] rounded-xl shadow-sm hover:bg-[#162437] active:scale-95 transition-all">
                  <Plus size={15}/> New Invoice
                </button>
              )}
              {tab === 'recurring' && (
                <button onClick={() => setModal({ type: 'newRecurring' })}
                  className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#0D1B2A] rounded-xl shadow-sm hover:bg-[#162437] active:scale-95 transition-all">
                  <Plus size={15}/> New Recurring
                </button>
              )}
            </div>
          </div>

          {/* ─── Invoices table ────────────────────────────────────────────── */}
          {tab === 'invoices' && (
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden mb-10">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1000px]">
                  <thead>
                    <tr className="bg-[#F8F9FB] text-xs font-normal text-gray-500 border-b border-gray-100">
                      <th className="px-6 py-4 flex items-center gap-3">
                        <input
                          type="checkbox"
                          aria-label="Select all invoices on this page"
                          checked={allOnPageSelected}
                          ref={el => { if (el) el.indeterminate = someOnPageSelected }}
                          onChange={e => togglePageSelection(e.target.checked)}
                          className="rounded border-gray-300 cursor-pointer"
                        />
                        Invoice
                      </th>
                      <th className="px-6 py-4">Client</th>
                      <th className="px-6 py-4">Project</th>
                      <th className="px-6 py-4">Amount</th>
                      <th className="px-6 py-4">Issued</th>
                      <th className="px-6 py-4">Due Date</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-sm">
                    {pagedInvoices.map((inv, i) => {
                      const total = invoiceTotal(inv)
                      const s     = STATUS_CONFIG[inv.status]
                      const overdueDays = inv.status === 'overdue' ? overdueByDays(inv.due_date) : 0
                      return (
                        <tr key={inv.id} onClick={() => setModal({ type: 'viewInvoice', invoice: inv })} {...enter.item(i, 'hover:bg-gray-50/50 transition-colors cursor-pointer', 25)}>
                          <td className="px-6 py-4 font-semibold text-gray-900 flex items-center gap-3">
                            <input
                              type="checkbox"
                              aria-label={`Select invoice ${inv.code}`}
                              checked={selectedIds.has(inv.id)}
                              onClick={e => e.stopPropagation()}
                              onChange={e => toggleRowSelection(inv.id, e.target.checked)}
                              className="rounded border-gray-300 cursor-pointer"
                            />
                            {inv.code}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-semibold shrink-0 shadow-sm" style={{ backgroundColor: avatarColor(inv.client_id) }}>
                                {inv.client_name.split(' ').map(n => n[0]).join('')}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900 text-xs">{inv.client_name}</p>
                                <p className="text-[11px] text-gray-500">{inv.client_company}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-600 text-xs">{inv.project_name ?? '—'}</td>
                          <td className="px-6 py-4 text-gray-900 font-semibold text-xs">{fmtCurrency(total)}</td>
                          <td className="px-6 py-4 text-gray-500 font-medium text-xs">{fmtDate(inv.issued_date)}</td>
                          <td className="px-6 py-4 text-xs">
                            <span className={`font-semibold ${inv.status === 'overdue' ? 'text-red-600' : 'text-gray-800'}`}>
                              {fmtDate(inv.due_date)}
                              {overdueDays > 0 && <span className="font-medium"> ({overdueDays}d overdue)</span>}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded-full ${s.bg} ${s.text}`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${s.dot}`}/> {STATUS_LABEL[inv.status]}
                            </span>
                          </td>
                          <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                            <InvoiceActionMenu
                              onView={() => setModal({ type: 'viewInvoice', invoice: inv })}
                              onEdit={() => setModal({ type: 'newInvoice', invoice: inv })}
                              onDuplicate={() => setModal({ type: 'newInvoice', invoice: inv, duplicate: true })}
                              onDelete={() => setModal({ type: 'deleteInvoice', invoice: inv })}
                              onUnavailable={label => showToast(`${label} isn't available yet.`)}
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {filteredInvoices.length === 0 && <EmptyState label="invoices"/>}
              {filteredInvoices.length > 0 && (
                <PaginationBar page={safePage} pageCount={pageCount} onPage={p => setPage(Math.min(Math.max(1, p), pageCount))}/>
              )}
            </div>
          )}

          {/* ─── Recurring table ───────────────────────────────────────────── */}
          {tab === 'recurring' && (
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden mb-10">
              <TableCardHeader title="Recurring" count={recurring.length} />
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8F9FB] text-xs font-normal text-gray-500 border-y border-gray-100">
                    <th className="px-6 py-4">Client</th>
                    <th className="px-6 py-4">Description</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Frequency</th>
                    <th className="px-6 py-4">Next Date</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-sm">
                  {recurring.map((r, i) => (
                    <tr key={r.id} {...enter.item(i, 'hover:bg-gray-50/50 transition-colors', 25)}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-semibold shrink-0" style={{ backgroundColor: avatarColor(r.client_id) }}>
                            {r.client_name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-900 text-xs truncate">{r.client_name}</div>
                            {r.client_company && (
                              <div className="text-[11px] text-gray-400 truncate">{r.client_company}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-xs font-medium">{r.description}</td>
                      <td className="px-6 py-4 font-semibold text-gray-900 text-xs">{fmtCurrency(r.amount)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center text-[10px] font-semibold px-2.5 py-1 rounded-full ${FREQ_BADGE[r.frequency]}`}>{FREQ_LABEL[r.frequency]}</span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-800 text-xs">{fmtDate(r.next_date)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold ${r.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                          {r.status === 'active' ? 'Active' : 'Stopped'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          <ActionsDropdown
                            items={[
                              { label: 'View Detail', icon: <Eye size={19} className="shrink-0" strokeWidth={1.6}/>, onClick: () => showToast("View Detail isn't available yet.") },
                              { label: 'Edit', icon: <Pencil size={19} className="shrink-0" strokeWidth={1.6}/>, onClick: () => setModal({ type: 'newRecurring', recurring: r }) },
                              ...(r.status === 'active'
                                ? [{ label: 'Cancel Recurring', icon: <X size={19} className="shrink-0" strokeWidth={1.6}/>, onClick: () => cancelRecurring(r), danger: true }]
                                : []),
                            ]}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {recurring.length === 0 && <EmptyState label="recurring plans"/>}
            </div>
          )}

          {/* ─── Payments table ────────────────────────────────────────────── */}
          {tab === 'payments' && (
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden mb-10">
              <TableCardHeader title="Payment Log" count={payments.length} />
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8F9FB] text-xs font-normal text-gray-500 border-y border-gray-100">
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Invoice</th>
                    <th className="px-6 py-4">Client</th>
                    <th className="px-6 py-4">Method</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Reference</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-sm">
                  {payments.map((p, i) => (
                    <tr key={p.id} {...enter.item(i, 'hover:bg-gray-50/50 transition-colors', 25)}>
                      <td className="px-6 py-4 text-gray-500 font-medium text-xs">{fmtDate(p.date)}</td>
                      <td className="px-6 py-4 font-semibold text-gray-900 text-xs">{p.invoice_code}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-semibold" style={{ backgroundColor: avatarColor(p.invoice_id) }}>
                            {p.client_name[0]}
                          </div>
                          <span className="font-semibold text-gray-900 text-xs">{p.client_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-xs">{PAY_LABEL[p.method]}</td>
                      <td className="px-6 py-4 font-semibold text-gray-900 text-xs">{fmtCurrency(p.amount)}</td>
                      <td className="px-6 py-4 font-mono text-gray-400 text-[10px] uppercase tracking-wider">{p.reference}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${p.status === 'cleared' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                          {p.status === 'cleared' ? 'Cleared' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {payments.length === 0 && <EmptyState label="payment records"/>}
            </div>
          )}
        </div>
      </div>

      {/* Import picker, opened from the Import/Export menu. */}
      <input
        ref={importInputRef} type="file" accept=".csv,text/csv" hidden
        onChange={e => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) showToast(`CSV import isn't wired up yet — "${file.name}" was not processed.`)
        }}
      />

      {/* ─── Modal layer ──────────────────────────────────────────────────────── */}
      {modal.type === 'newInvoice' && (
        <InvoiceFormSidebar
          invoice={modal.invoice} duplicate={modal.duplicate} clients={clients} projects={projects}
          onClose={() => setModal({ type: 'none' })}
          onSave={handleSaveInvoice} loading={isPending}
        />
      )}
      {modal.type === 'viewInvoice' && (
        <InvoiceDetailSidebar
          invoice={modal.invoice}
          payments={payments}
          onClose={() => setModal({ type: 'none' })}
          onEdit={() => setModal({ type: 'newInvoice', invoice: modal.invoice })}
          onMarkPaid={() => setModal({ type: 'markPaid', invoice: modal.invoice })}
        />
      )}
      {modal.type === 'newRecurring' && (
        <RecurringFormSidebar
          recurring={modal.recurring} clients={clients}
          onClose={() => setModal({ type: 'none' })}
          onSave={handleSaveRecurring} loading={isPending}
        />
      )}
      {modal.type === 'markPaid' && (
        <MarkPaidModal
          invoice={modal.invoice}
          onConfirm={confirmMarkPaid} onCancel={() => setModal({ type: 'none' })} loading={isPending}
        />
      )}
      {modal.type === 'deleteInvoice' && (
        <DeleteModal
          invoice={modal.invoice}
          onConfirm={confirmDeleteInvoice} onCancel={() => setModal({ type: 'none' })} loading={isPending}
        />
      )}
      {modal.type === 'success' && (
        <SuccessModal title={modal.title} subtitle="The action was completed successfully." onClose={() => setModal({ type: 'none' })} />
      )}
    </div>
  )
}
