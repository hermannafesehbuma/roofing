'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import {
  Search, Filter as FilterIcon, Plus, X, MoreHorizontal, Trash2,
  Eye, Pencil, FileText, Download, Upload, Bell, Copy, ArrowLeftRight,
  DollarSign, TrendingUp, ChevronDown, ChevronLeft, ChevronRight,
  Clock, AlertCircle, Percent,
} from 'lucide-react'
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

// ─── Display maps ──────────────────────────────────────────────────────────────
const STATUS_LABEL: Record<DbInvoiceStatus, string> = {
  draft: 'Draft', sent: 'Sent', paid: 'Paid', overdue: 'Overdue', partial: 'Partial',
}
const STATUS_CONFIG: Record<DbInvoiceStatus, { bg: string; text: string; dot: string }> = {
  paid:    { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  overdue: { bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-500'     },
  draft:   { bg: 'bg-gray-100',   text: 'text-gray-600',    dot: 'bg-gray-400'    },
  sent:    { bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500'    },
  partial: { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500'   },
}
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

function fmtCurrency(v: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v)
}
function fmtDate(iso: string) {
  if (!iso) return '—'
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function invoiceTotal(inv: InvoiceRow) {
  const sub = inv.items.reduce((s, i) => s + i.qty * i.rate, 0)
  return sub + sub * (inv.tax / 100)
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
function chipCls(active: boolean) {
  return `px-3 py-2.5 rounded-lg text-[11px] font-medium border text-center truncate transition-colors ${
    active
      ? 'bg-[#0D1B2A] text-white border-[#0D1B2A]'
      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
  }`
}

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
  frequency:    DbFrequency
  description:  string
  next_date:    string
  status:       'active' | 'stopped'
}

// ─── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, subColor, icon }: {
  label: string; value: string; sub?: string; subColor?: string; icon: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 flex flex-col justify-between gap-3 min-h-[104px]">
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs text-gray-500 font-medium">{label}</span>
        <span className="shrink-0">{icon}</span>
      </div>
      <div className="flex items-end justify-between gap-3">
        <p className="text-[26px] font-semibold text-gray-900 leading-none">{value}</p>
        {sub && <p className={`text-[11px] font-medium leading-none ${subColor}`}>{sub}</p>}
      </div>
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
      <button onClick={toggleOpen}
        className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-xs font-semibold transition-colors ${
          count > 0 ? 'bg-[#0D1B2A]/5 text-[#0D1B2A] border-[#0D1B2A]/20' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
        }`}>
        <FilterIcon size={13}/> Filter
        {count > 0 && (
          <span className="w-4 h-4 flex items-center justify-center rounded-full bg-[#0D1B2A] text-white text-[9px] font-semibold">{count}</span>
        )}
        <ChevronDown size={13} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}/>
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-30 w-[380px] bg-white rounded-2xl shadow-[0_8px_30px_rgba(16,24,40,0.14)] p-5">
          <p className="text-[11px] text-gray-400 mb-4">Filter</p>

          <div className="space-y-5">
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-2.5">Status</label>
              <div className="grid grid-cols-3 gap-2.5">
                {DB_STATUSES.map(s => (
                  <button key={s} onClick={() => toggle('status', s)} className={chipCls(draft.status.includes(s))}>
                    {STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-2.5">Amount</label>
              <div className="grid grid-cols-3 gap-2.5">
                {AMOUNT_OPTIONS.map(({ key, label }) => (
                  <button key={key} onClick={() => toggle('amount', key)} className={chipCls(draft.amount.includes(key))}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-2.5">Date</label>
              <div className="grid grid-cols-3 gap-2.5">
                {DATE_OPTIONS.map(({ key, label }) => (
                  <button key={key} onClick={() => toggle('date', key)} className={chipCls(draft.date.includes(key))}>
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
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition-colors">
        <ArrowLeftRight size={13}/> Import/Export
        <ChevronDown size={13} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}/>
      </button>
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
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const itemCls = 'w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium text-[#1D2939] hover:bg-[#F2F4F7] transition-colors text-left'

  return (
    <div ref={ref} className="relative flex justify-center">
      <button onClick={e => { e.stopPropagation(); setOpen(!open) }} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors">
        <MoreHorizontal size={15} />
      </button>
      {open && (
        <div className="absolute right-0 top-9 w-52 bg-white rounded-2xl shadow-[0_8px_30px_rgba(16,24,40,0.14)] z-30 p-1.5">
          <button onClick={() => { setOpen(false); onView() }} className={itemCls}>
            <Eye size={16} className="shrink-0" strokeWidth={1.6}/> View Detail
          </button>
          <button onClick={() => { setOpen(false); onEdit() }} className={itemCls}>
            <Pencil size={16} className="shrink-0" strokeWidth={1.6}/> Edit
          </button>
          <button onClick={() => { setOpen(false); onUnavailable('Download PDF') }} className={itemCls}>
            <Download size={16} className="shrink-0" strokeWidth={1.6}/> Download PDF
          </button>
          <button onClick={() => { setOpen(false); onUnavailable('Send Reminder') }} className={itemCls}>
            <Bell size={16} className="shrink-0" strokeWidth={1.6}/> Send Reminder
          </button>
          <button onClick={() => { setOpen(false); onDuplicate() }} className={itemCls}>
            <Copy size={16} className="shrink-0" strokeWidth={1.6}/> Duplicate
          </button>
          <button onClick={() => { setOpen(false); onDelete() }} className={`${itemCls} text-[#F04438] hover:bg-red-50`}>
            <Trash2 size={16} className="text-[#F04438] shrink-0" strokeWidth={1.6}/> Delete
          </button>
        </div>
      )}
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
  const { close, backdropCls, panelCls } = useSlideOver(onCancel)

  const total = invoiceTotal(invoice)
  const [method, setMethod] = useState<DbPayMethod>('bank_transfer')
  const [amount, setAmount] = useState(total.toString())
  return (
    <>
      <div className={`fixed inset-0 bg-black/40 z-[110] backdrop-blur-[1px] ${backdropCls}`} onClick={close} />
      <div className="fixed inset-0 z-[111] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 relative">
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
            <div className="space-y-5 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-800">Invoice Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Client</label>
                  <div className="relative">
                    <select value={v.client_id} onChange={e => setV(p => ({ ...p, client_id: e.target.value }))} className={selectCls}>
                      <option value="">Select client</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <ChevronDown size={13} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Project</label>
                  <div className="relative">
                    <select value={v.project_id} onChange={e => setV(p => ({ ...p, project_id: e.target.value }))} className={selectCls}>
                      <option value="">Select project</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <ChevronDown size={13} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Issue Date</label>
                  <input type="date" value={v.issued_date} onChange={e => setV(p => ({ ...p, issued_date: e.target.value }))} className={inputCls}/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Due Date</label>
                  <input type="date" value={v.due_date} onChange={e => setV(p => ({ ...p, due_date: e.target.value }))} className={inputCls}/>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Client Email</label>
                <input type="email" placeholder="client@email.com" value={selectedClient?.email ?? ''} readOnly className={`${inputCls} bg-gray-50 text-gray-400`}/>
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-800">Line Items</h3>
                <button onClick={addItem} className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700">
                  <Plus size={13}/> Add Line
                </button>
              </div>
              <div className="space-y-3">
                {v.items.map((item, idx) => (
                  <div key={item._key} className="flex gap-3 items-start bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex-1">
                      {idx === 0 && <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Description</label>}
                      <input placeholder="Description of work" value={item.description} onChange={e => setItem(item._key, 'description', e.target.value)} className={inputCls}/>
                    </div>
                    <div className="w-20">
                      {idx === 0 && <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Qty</label>}
                      <input type="number" value={item.qty} onChange={e => setItem(item._key, 'qty', parseFloat(e.target.value) || 0)} className={inputCls}/>
                    </div>
                    <div className="w-32">
                      {idx === 0 && <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Rate ($)</label>}
                      <input type="number" value={item.rate} onChange={e => setItem(item._key, 'rate', parseFloat(e.target.value) || 0)} className={inputCls}/>
                    </div>
                    <div className="self-end mb-2 flex h-[42px] items-center">
                      <button onClick={() => removeItem(item._key)} className="text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 size={15}/>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="bg-gray-50 rounded-2xl p-5 space-y-3 border border-gray-100">
              <div className="flex justify-between text-sm text-gray-600 font-medium">
                <span>Subtotal</span>
                <span className="font-semibold text-gray-900">{fmtCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center text-sm text-gray-600 font-medium">
                <span>Tax (%)</span>
                <input type="number" className="w-16 text-right px-2 py-1 border border-gray-200 rounded-lg text-sm bg-white" value={v.tax} onChange={e => setV(p => ({ ...p, tax: parseFloat(e.target.value) || 0 }))}/>
              </div>
              <div className="border-t border-gray-200 pt-2 flex justify-between text-base font-semibold text-gray-900">
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
    frequency:   recurring?.frequency ?? 'monthly',
    description: recurring?.description ?? '',
    next_date:   recurring?.next_date ?? '',
    status:      recurring?.status ?? 'active',
  })

  return (
    <>
      <div className={`fixed inset-0 bg-black/40 z-[100] backdrop-blur-[1px] ${backdropCls}`} onClick={close}/>
      <div className="fixed inset-y-0 right-0 z-[101] flex">
        <div className={`bg-white w-[640px] max-w-full h-full flex flex-col shadow-2xl ${panelCls}`}>
          <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100 shrink-0">
            <h2 className="text-lg font-semibold text-gray-900">{recurring ? 'Edit Recurring' : 'New Recurring'}</h2>
            <button onClick={close} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"><X size={18}/></button>
          </div>

          <div className="overflow-y-auto flex-1 px-7 py-7 bg-[#FCFCFD]">
            <div className="space-y-5 bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Recurring Details</h3>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Client</label>
                <div className="relative">
                  <select value={v.client_id} onChange={e => setV(p => ({ ...p, client_id: e.target.value }))} className={selectCls}>
                    <option value="">Select client</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <ChevronDown size={13} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
                </div>
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
                    <select value={v.frequency} onChange={e => setV(p => ({ ...p, frequency: e.target.value as DbFrequency }))} className={selectCls}>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="annual">Annual</option>
                    </select>
                    <ChevronDown size={13} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Next Date</label>
                  <input type="date" value={v.next_date} onChange={e => setV(p => ({ ...p, next_date: e.target.value }))} className={inputCls}/>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-7 py-5 border-t border-gray-100 shrink-0 bg-white">
            <button onClick={close} className="px-6 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-50 rounded-xl">Close</button>
            <button onClick={() => onSave(v)} disabled={loading || !v.client_id || !v.amount}
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
function InvoiceDetailSidebar({ invoice, onClose, onEdit, onMarkPaid }: {
  invoice: InvoiceRow; onClose: () => void; onEdit: () => void; onMarkPaid: () => void
}) {
  const { close, backdropCls, panelCls } = useSlideOver(onClose)

  const subtotal = invoice.items.reduce((s, i) => s + i.qty * i.rate, 0)
  const taxAmt   = subtotal * (invoice.tax / 100)
  const total    = subtotal + taxAmt
  const s        = STATUS_CONFIG[invoice.status]

  return (
    <>
      <div className={`fixed inset-0 bg-black/40 z-[100] backdrop-blur-[1px] ${backdropCls}`} onClick={close}/>
      <div className="fixed inset-y-0 right-0 z-[101] flex">
        <div className={`bg-white w-[640px] max-w-full h-full flex flex-col shadow-2xl ${panelCls}`}>
          <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100 shrink-0">
            <h2 className="text-lg font-semibold text-gray-900">{invoice.code}</h2>
            <button onClick={close} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"><X size={18}/></button>
          </div>

          <div className="overflow-y-auto flex-1 px-8 py-8 bg-[#F4F6F9] space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              {/* Header */}
              <div className="flex justify-between items-start mb-8">
                <div>
                  <div className="h-10 px-3.5 bg-gray-900 text-white rounded-lg flex items-center justify-center font-semibold tracking-widest text-xs mb-2">PEAK</div>
                  <h3 className="font-semibold text-gray-900 text-base tracking-tight">PEAK</h3>
                  <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider">ROOFING CO.</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Invoice</span>
                  <h4 className="text-lg font-semibold text-gray-900">{invoice.code}</h4>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1 ${s.bg} ${s.text}`}>
                    <div className={`w-1 h-1 rounded-full ${s.dot}`}/> {STATUS_LABEL[invoice.status]}
                  </span>
                </div>
              </div>

              {/* From / To */}
              <div className="grid grid-cols-2 gap-8 border-y border-gray-100 py-6 mb-8">
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">From</p>
                  <h5 className="font-semibold text-gray-800 text-sm">Peak Roofing Co.</h5>
                  <p className="text-xs text-gray-500 leading-relaxed mt-1">
                    123 Roofing Ave, Las Vegas, NV 89101<br/>admin@peakroofing.com · (702) 555-0100
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Bill To</p>
                  <h5 className="font-semibold text-gray-800 text-sm">{invoice.client_company ?? invoice.client_name}</h5>
                  <p className="text-xs text-gray-500 leading-relaxed mt-1">
                    {invoice.client_name}<br/>{invoice.client_email}
                  </p>
                </div>
              </div>

              {/* Meta */}
              <div className="grid grid-cols-3 gap-4 mb-10">
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Issue Date</p>
                  <p className="text-sm font-semibold text-gray-800">{fmtDate(invoice.issued_date)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Due Date</p>
                  <p className={`text-sm font-semibold ${invoice.status === 'overdue' ? 'text-red-600' : 'text-gray-800'}`}>{fmtDate(invoice.due_date)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Project</p>
                  <p className="text-sm font-semibold text-gray-800">{invoice.project_name ?? '—'}</p>
                </div>
              </div>

              {/* Items table */}
              <div className="mb-8">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-left">
                      <th className="pb-3">Description</th>
                      <th className="pb-3 text-center">Qty</th>
                      <th className="pb-3 text-right">Rate</th>
                      <th className="pb-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm text-gray-800">
                    {invoice.items.map(item => (
                      <tr key={item.id} className="border-b border-gray-50">
                        <td className="py-4 font-medium text-gray-900">{item.description}</td>
                        <td className="py-4 text-center text-gray-600">{item.qty}</td>
                        <td className="py-4 text-right text-gray-600">{fmtCurrency(item.rate)}</td>
                        <td className="py-4 text-right font-semibold text-gray-900">{fmtCurrency(item.qty * item.rate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="flex flex-col items-end space-y-2 text-sm border-b border-gray-100 pb-6 mb-6">
                <div className="flex justify-between w-48 text-gray-500 font-medium">
                  <span>Subtotal</span><span className="text-gray-900">{fmtCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between w-48 text-gray-500 font-medium">
                  <span>Tax ({invoice.tax}%)</span><span className="text-gray-900">{fmtCurrency(taxAmt)}</span>
                </div>
                <div className="flex justify-between w-48 font-semibold text-base text-gray-900 pt-2">
                  <span>Total</span><span>{fmtCurrency(total)}</span>
                </div>
              </div>

              {/* Activity */}
              <div>
                <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Activity</h4>
                <div className="space-y-4 relative pl-4 text-xs">
                  <div className="absolute left-[3.5px] top-2 bottom-2 w-px border-l border-dashed border-gray-200"/>
                  <div className="relative">
                    <div className="absolute left-[-17.5px] top-1 w-2.5 h-2.5 bg-gray-300 rounded-full border-2 border-white"/>
                    <span className="font-semibold text-gray-800 block">Invoice created</span>
                    <span className="text-gray-400 mt-0.5 block">{fmtDate(invoice.issued_date)} · Admin</span>
                  </div>
                  {invoice.status !== 'draft' && (
                    <div className="relative">
                      <div className="absolute left-[-17.5px] top-1 w-2.5 h-2.5 bg-blue-400 rounded-full border-2 border-white"/>
                      <span className="font-semibold text-gray-800 block">Invoice sent to {invoice.client_company ?? invoice.client_name}</span>
                      <span className="text-gray-400 mt-0.5 block">{fmtDate(invoice.issued_date)} · System</span>
                    </div>
                  )}
                  {invoice.status === 'overdue' && (
                    <div className="relative">
                      <div className="absolute left-[-17.5px] top-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"/>
                      <span className="font-semibold text-red-600 block">Payment overdue — reminder sent</span>
                      <span className="text-gray-400 mt-0.5 block">{fmtDate(invoice.due_date)} · System</span>
                    </div>
                  )}
                  {invoice.status === 'paid' && (
                    <div className="relative">
                      <div className="absolute left-[-17.5px] top-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white"/>
                      <span className="font-semibold text-emerald-700 block">Payment received</span>
                      <span className="text-gray-400 mt-0.5 block">System</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 px-7 py-5 border-t border-gray-100 shrink-0 bg-white">
            <button onClick={close} className="px-6 py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Close</button>
            <div className="flex gap-2 ml-auto">
              <button onClick={() => { onClose(); onEdit() }} className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl flex items-center gap-2 hover:bg-gray-50">
                <Pencil size={13}/> Edit
              </button>
              <button className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl flex items-center gap-2 hover:bg-gray-50">
                <Download size={13}/> Download PDF
              </button>
              {invoice.status !== 'paid' && (
                <button onClick={onMarkPaid} className="px-6 py-2.5 text-sm font-semibold text-white bg-[#0D1B2A] rounded-xl hover:bg-[#162437] transition-colors">
                  Mark as Paid
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
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
          setModal({ type: 'success', title: asDraft ? 'Invoice saved as draft' : 'Invoice sent successfully' })
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
  function handleSaveRecurring(v: RecurringFormValues) {
    startTransition(async () => {
      const client = clients.find(c => c.id === v.client_id)
      const input = {
        client_id:   v.client_id,
        description: v.description,
        amount:      parseFloat(v.amount) || 0,
        frequency:   v.frequency,
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
    <div className="flex flex-col h-full overflow-hidden bg-[#F4F6F9]">
      {/* Header */}
      {/* Toast */}
      {toast && <Toast message={toast} variant={/^(Error|An unexpected)/.test(toast) ? 'error' : 'success'} />}

      <div className="flex-1 overflow-y-auto">
        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-5 px-8 pt-6 pb-2">
          <StatCard label="Revenue This Month" value={fmtCurrency(revenueThisMonth)}
            sub={`${revenueUp ? '↑' : '↓'} vs last month`} subColor={revenueUp ? 'text-emerald-600' : 'text-red-500'}
            icon={<TrendingUp size={16} className="text-emerald-500" strokeWidth={1.8}/>}/>
          <StatCard label="Outstanding" value={fmtCurrency(outstanding)} sub="Awaiting payment" subColor="text-amber-600"
            icon={<Clock size={16} className="text-amber-500" strokeWidth={1.8}/>}/>
          <StatCard label="Overdue" value={fmtCurrency(overdueSum)} sub="Needs follow-up" subColor="text-red-500"
            icon={<AlertCircle size={16} className="text-red-500" strokeWidth={1.8}/>}/>
          <StatCard label="Collection Rate" value={`${collectionRate}%`}
            icon={<Percent size={16} className="text-blue-500" strokeWidth={1.8}/>}/>
        </div>

        <div className="px-8 pt-6">
          {/* Tab bar */}
          <div className="flex border-b border-gray-200 gap-6 mb-5">
            {[
              { k: 'invoices',  label: 'Invoices',     count: invoices.length  },
              { k: 'recurring', label: 'Recurring',    count: recurring.length },
              { k: 'payments',  label: 'Payment Log',  count: payments.length  },
            ].map(t => (
              <button key={t.k} onClick={() => setTab(t.k as any)}
                className={`pb-3 text-sm font-semibold transition-colors border-b-2 -mb-px ${tab === t.k ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                {t.label} ({t.count})
              </button>
            ))}
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder={`Search ${tab}…`}
                  className="pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-400 w-64"/>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {tab === 'invoices' && (
                <InvoiceFilterPopover filters={filters} clients={clients} onApply={applyFilters}/>
              )}
              <ImportExportMenu
                onImport={() => importInputRef.current?.click()}
                onExport={exportCsv}
              />
              {tab === 'invoices' && (
                <button onClick={() => setModal({ type: 'newInvoice' })}
                  className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-[#0D1B2A] rounded-xl shadow-sm hover:bg-[#162437] active:scale-95 transition-all">
                  <Plus size={15}/> New Invoice
                </button>
              )}
              {tab === 'recurring' && (
                <button onClick={() => setModal({ type: 'newRecurring' })}
                  className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-[#0D1B2A] rounded-xl shadow-sm hover:bg-[#162437] active:scale-95 transition-all">
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
                    <tr className="bg-[#F8F9FB] text-[10px] font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-100">
                      <th className="px-6 py-4 flex items-center gap-3"><input type="checkbox" className="rounded border-gray-300"/> Invoice</th>
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
                    {pagedInvoices.map(inv => {
                      const total = invoiceTotal(inv)
                      const s     = STATUS_CONFIG[inv.status]
                      const overdueDays = inv.status === 'overdue' ? overdueByDays(inv.due_date) : 0
                      return (
                        <tr key={inv.id} onClick={() => setModal({ type: 'viewInvoice', invoice: inv })} className="hover:bg-gray-50/50 transition-colors cursor-pointer">
                          <td className="px-6 py-4 font-semibold text-gray-900 flex items-center gap-3">
                            <input type="checkbox" onClick={e => e.stopPropagation()} className="rounded border-gray-300"/>
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
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8F9FB] text-[10px] font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-100">
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
                  {recurring.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-semibold shrink-0" style={{ backgroundColor: avatarColor(r.client_id) }}>
                            {r.client_name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div className="font-semibold text-gray-900 text-xs">{r.client_name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-xs font-medium">{r.description}</td>
                      <td className="px-6 py-4 font-semibold text-gray-900 text-xs">{fmtCurrency(r.amount)}</td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase ${FREQ_BADGE[r.frequency]}`}>{FREQ_LABEL[r.frequency]}</span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-800 text-xs">{fmtDate(r.next_date)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase ${r.status === 'active' ? 'text-emerald-600' : 'text-gray-400'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${r.status === 'active' ? 'bg-emerald-500' : 'bg-gray-300'}`}/> {r.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button onClick={() => setModal({ type: 'newRecurring', recurring: r })} className="p-1 text-gray-400 hover:text-blue-600 transition-colors">
                          <Pencil size={13}/>
                        </button>
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
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8F9FB] text-[10px] font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-100">
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
                  {payments.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
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
