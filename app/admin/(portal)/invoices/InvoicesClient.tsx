'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import {
  Search, Filter as FilterIcon, Plus, X, Check, MoreHorizontal, Trash2,
  Eye, Pencil, FileText, Download, Share2, Mail, ArrowUpRight,
  DollarSign, History, TrendingUp, CreditCard, ChevronDown,
} from 'lucide-react'
import {
  type InvoiceRow, type RecurringRow, type PaymentRow,
  type ClientOption, type ProjectOption,
  type DbInvoiceStatus, type DbFrequency, type DbPayMethod,
  type InvoiceItemInput,
  createInvoice, updateInvoice, deleteInvoice, markInvoicePaid,
  createRecurring, updateRecurring,
} from './actions'

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

const inputCls  = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all'
const selectCls = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all'

// ─── Types ─────────────────────────────────────────────────────────────────────
type ModalState =
  | { type: 'none' }
  | { type: 'newInvoice'; invoice?: InvoiceRow }
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
function StatCard({ label, value, sub, subColor, icon, subText }: {
  label: string; value: string; sub?: string; subColor?: string; icon: React.ReactNode; subText?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col min-h-[115px]">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 font-medium">{label}</span>
        {icon}
      </div>
      <div className="mt-auto pt-3">
        <p className="text-2xl font-extrabold text-gray-900">{value}</p>
        <div className="flex items-center gap-1.5 mt-1">
          {sub     && <span className={`text-[11px] font-bold ${subColor}`}>{sub}</span>}
          {subText && <span className="text-[11px] text-gray-400 font-medium">{subText}</span>}
        </div>
      </div>
    </div>
  )
}

// ─── Action Menu ───────────────────────────────────────────────────────────────
function InvoiceActionMenu({ onView, onEdit, onDelete }: { onView: () => void; onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  return (
    <div ref={ref} className="relative flex justify-center">
      <button onClick={e => { e.stopPropagation(); setOpen(!open) }} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors">
        <MoreHorizontal size={15} />
      </button>
      {open && (
        <div className="absolute right-0 top-8 w-44 bg-white border border-gray-100 rounded-xl shadow-xl z-30 py-1 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
          <button onClick={() => { setOpen(false); onView() }} className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"><Eye size={13}/> View Detail</button>
          <button onClick={() => { setOpen(false); onEdit() }} className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"><Pencil size={13}/> Edit</button>
          <button className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"><Download size={13}/> Download PDF</button>
          <button className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"><Mail size={13}/> Send Reminder</button>
          <div className="border-t border-gray-100 my-1" />
          <button onClick={() => { setOpen(false); onDelete() }} className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 size={13}/> Delete</button>
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
    <>
      <div className="fixed inset-0 bg-black/40 z-[110] backdrop-blur-[1px]" onClick={onCancel} />
      <div className="fixed inset-0 z-[111] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center text-center relative">
          <button onClick={onCancel} className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"><X size={16}/></button>
          <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mb-5">
            <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center"><Trash2 size={18} className="text-red-500"/></div>
          </div>
          <h2 className="text-base font-bold text-gray-900 mb-2">Delete Invoice</h2>
          <p className="text-sm text-gray-500 mb-7">
            Permanently delete <span className="font-semibold text-gray-800">{invoice.code}</span>? This cannot be undone.
          </p>
          <div className="flex gap-3 w-full">
            <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button onClick={onConfirm} disabled={loading} className="flex-1 py-2.5 rounded-xl bg-red-600 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60">
              {loading ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Mark Paid Modal ───────────────────────────────────────────────────────────
function MarkPaidModal({ invoice, onConfirm, onCancel, loading }: {
  invoice: InvoiceRow; onConfirm: (method: DbPayMethod, amount: number) => void; onCancel: () => void; loading: boolean
}) {
  const total = invoiceTotal(invoice)
  const [method, setMethod] = useState<DbPayMethod>('bank_transfer')
  const [amount, setAmount] = useState(total.toString())
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[110] backdrop-blur-[1px]" onClick={onCancel} />
      <div className="fixed inset-0 z-[111] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 relative">
          <button onClick={onCancel} className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"><X size={16}/></button>
          <h2 className="text-base font-bold text-gray-900 mb-1">Mark as Paid</h2>
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
            <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
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
function InvoiceFormSidebar({ invoice, clients, projects, onClose, onSave, loading }: {
  invoice?: InvoiceRow; clients: ClientOption[]; projects: ProjectOption[]
  onClose: () => void; onSave: (v: InvoiceFormValues, asDraft: boolean) => void; loading: boolean
}) {
  const [v, setV] = useState<InvoiceFormValues>({
    invoiceId:   invoice?.id,
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
      <div className="fixed inset-0 bg-black/40 z-[100] backdrop-blur-[1px]" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-[101] flex">
        <div className="bg-white w-[600px] max-w-full h-full flex flex-col shadow-2xl">
          <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100 shrink-0">
            <h2 className="text-lg font-bold text-gray-900">{invoice ? 'Edit Invoice' : 'New Invoice'}</h2>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"><X size={18}/></button>
          </div>

          <div className="overflow-y-auto flex-1 px-7 py-7 space-y-7 bg-[#FCFCFD]">
            {/* Invoice Details */}
            <div className="space-y-5 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-gray-800">Invoice Details</h3>
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
                <h3 className="text-sm font-bold text-gray-800">Line Items</h3>
                <button onClick={addItem} className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700">
                  <Plus size={13}/> Add Line
                </button>
              </div>
              <div className="space-y-3">
                {v.items.map((item, idx) => (
                  <div key={item._key} className="flex gap-3 items-start bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex-1">
                      {idx === 0 && <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Description</label>}
                      <input placeholder="Description of work" value={item.description} onChange={e => setItem(item._key, 'description', e.target.value)} className={inputCls}/>
                    </div>
                    <div className="w-20">
                      {idx === 0 && <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Qty</label>}
                      <input type="number" value={item.qty} onChange={e => setItem(item._key, 'qty', parseFloat(e.target.value) || 0)} className={inputCls}/>
                    </div>
                    <div className="w-32">
                      {idx === 0 && <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Rate ($)</label>}
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
                <span className="font-bold text-gray-900">{fmtCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center text-sm text-gray-600 font-medium">
                <span>Tax (%)</span>
                <input type="number" className="w-16 text-right px-2 py-1 border border-gray-200 rounded-lg text-sm bg-white" value={v.tax} onChange={e => setV(p => ({ ...p, tax: parseFloat(e.target.value) || 0 }))}/>
              </div>
              <div className="border-t border-gray-200 pt-2 flex justify-between text-base font-black text-gray-900">
                <span>Total</span>
                <span>{fmtCurrency(total)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-7 py-5 border-t border-gray-100 shrink-0 bg-white">
            <button onClick={onClose} className="px-6 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 rounded-xl transition-colors">Close</button>
            <div className="flex gap-2 ml-auto">
              <button onClick={() => onSave(v, true)} disabled={loading} className="px-6 py-2.5 text-sm font-bold text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-60">
                Save as Draft
              </button>
              <button onClick={() => onSave(v, false)} disabled={loading || !v.client_id || !v.due_date}
                className="px-6 py-2.5 text-sm font-bold text-white bg-[#0D1B2A] hover:bg-[#162437] rounded-xl transition-colors disabled:opacity-60"
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
      <div className="fixed inset-0 bg-black/40 z-[100] backdrop-blur-[1px]" onClick={onClose}/>
      <div className="fixed inset-y-0 right-0 z-[101] flex">
        <div className="bg-white w-[520px] max-w-full h-full flex flex-col shadow-2xl">
          <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100 shrink-0">
            <h2 className="text-lg font-bold text-gray-900">{recurring ? 'Edit Recurring' : 'New Recurring'}</h2>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"><X size={18}/></button>
          </div>

          <div className="overflow-y-auto flex-1 px-7 py-7 bg-[#FCFCFD]">
            <div className="space-y-5 bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Recurring Details</h3>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Client</label>
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
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">Amount ($)</label>
                  <div className="relative">
                    <DollarSign size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                    <input type="number" className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-2.5 text-sm" placeholder="0.00" value={v.amount} onChange={e => setV(p => ({ ...p, amount: e.target.value }))}/>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">Status</label>
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
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Description</label>
                <input className={inputCls} placeholder="e.g. Monthly roof maintenance" value={v.description} onChange={e => setV(p => ({ ...p, description: e.target.value }))}/>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">Frequency</label>
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
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">Next Date</label>
                  <input type="date" value={v.next_date} onChange={e => setV(p => ({ ...p, next_date: e.target.value }))} className={inputCls}/>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-7 py-5 border-t border-gray-100 shrink-0 bg-white">
            <button onClick={onClose} className="px-6 py-2 text-sm font-bold text-gray-500 hover:bg-gray-50 rounded-xl">Close</button>
            <button onClick={() => onSave(v)} disabled={loading || !v.client_id || !v.amount}
              className="px-6 py-2 text-sm font-bold text-white bg-[#0D1B2A] hover:bg-[#162437] rounded-xl disabled:opacity-60 transition-colors"
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
  const subtotal = invoice.items.reduce((s, i) => s + i.qty * i.rate, 0)
  const taxAmt   = subtotal * (invoice.tax / 100)
  const total    = subtotal + taxAmt
  const s        = STATUS_CONFIG[invoice.status]

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[100] backdrop-blur-[1px]" onClick={onClose}/>
      <div className="fixed inset-y-0 right-0 z-[101] flex">
        <div className="bg-white w-[620px] max-w-full h-full flex flex-col shadow-2xl">
          <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100 shrink-0">
            <h2 className="text-lg font-bold text-gray-900">{invoice.code}</h2>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"><X size={18}/></button>
          </div>

          <div className="overflow-y-auto flex-1 px-8 py-8 bg-[#F4F6F9] space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              {/* Header */}
              <div className="flex justify-between items-start mb-8">
                <div>
                  <div className="w-10 h-10 bg-gray-900 text-white rounded-lg flex items-center justify-center font-black tracking-widest text-xs mb-2">PEAK</div>
                  <h3 className="font-bold text-gray-900 text-base tracking-tight">PEAK</h3>
                  <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">ROOFING CO.</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Invoice</span>
                  <h4 className="text-lg font-extrabold text-gray-900">{invoice.code}</h4>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 ${s.bg} ${s.text}`}>
                    <div className={`w-1 h-1 rounded-full ${s.dot}`}/> {STATUS_LABEL[invoice.status]}
                  </span>
                </div>
              </div>

              {/* From / To */}
              <div className="grid grid-cols-2 gap-8 border-y border-gray-100 py-6 mb-8">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">From</p>
                  <h5 className="font-bold text-gray-800 text-sm">Peak Roofing Co.</h5>
                  <p className="text-xs text-gray-500 leading-relaxed mt-1">
                    123 Roofing Ave, Las Vegas, NV 89101<br/>admin@peakroofing.com · (702) 555-0100
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Bill To</p>
                  <h5 className="font-bold text-gray-800 text-sm">{invoice.client_company ?? invoice.client_name}</h5>
                  <p className="text-xs text-gray-500 leading-relaxed mt-1">
                    {invoice.client_name}<br/>{invoice.client_email}
                  </p>
                </div>
              </div>

              {/* Meta */}
              <div className="grid grid-cols-3 gap-4 mb-10">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Issue Date</p>
                  <p className="text-sm font-bold text-gray-800">{fmtDate(invoice.issued_date)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Due Date</p>
                  <p className={`text-sm font-bold ${invoice.status === 'overdue' ? 'text-red-600' : 'text-gray-800'}`}>{fmtDate(invoice.due_date)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Project</p>
                  <p className="text-sm font-bold text-gray-800">{invoice.project_name ?? '—'}</p>
                </div>
              </div>

              {/* Items table */}
              <div className="mb-8">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-left">
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
                        <td className="py-4 text-right font-bold text-gray-900">{fmtCurrency(item.qty * item.rate)}</td>
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
                <div className="flex justify-between w-48 font-bold text-base text-gray-900 pt-2">
                  <span>Total</span><span>{fmtCurrency(total)}</span>
                </div>
              </div>

              {/* Activity */}
              <div>
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Activity</h4>
                <div className="space-y-4 relative pl-4 text-xs">
                  <div className="absolute left-[3.5px] top-2 bottom-2 w-px border-l border-dashed border-gray-200"/>
                  <div className="relative">
                    <div className="absolute left-[-17.5px] top-1 w-2.5 h-2.5 bg-gray-300 rounded-full border-2 border-white"/>
                    <span className="font-bold text-gray-800 block">Invoice created</span>
                    <span className="text-gray-400 mt-0.5 block">{fmtDate(invoice.issued_date)} · Admin</span>
                  </div>
                  {invoice.status !== 'draft' && (
                    <div className="relative">
                      <div className="absolute left-[-17.5px] top-1 w-2.5 h-2.5 bg-blue-400 rounded-full border-2 border-white"/>
                      <span className="font-bold text-gray-800 block">Invoice sent to {invoice.client_company ?? invoice.client_name}</span>
                      <span className="text-gray-400 mt-0.5 block">{fmtDate(invoice.issued_date)} · System</span>
                    </div>
                  )}
                  {invoice.status === 'overdue' && (
                    <div className="relative">
                      <div className="absolute left-[-17.5px] top-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"/>
                      <span className="font-bold text-red-600 block">Payment overdue — reminder sent</span>
                      <span className="text-gray-400 mt-0.5 block">{fmtDate(invoice.due_date)} · System</span>
                    </div>
                  )}
                  {invoice.status === 'paid' && (
                    <div className="relative">
                      <div className="absolute left-[-17.5px] top-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white"/>
                      <span className="font-bold text-emerald-700 block">Payment received</span>
                      <span className="text-gray-400 mt-0.5 block">System</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 px-7 py-5 border-t border-gray-100 shrink-0 bg-white">
            <button onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Close</button>
            <div className="flex gap-2 ml-auto">
              <button onClick={() => { onClose(); onEdit() }} className="px-5 py-2.5 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-xl flex items-center gap-2 hover:bg-gray-50">
                <Pencil size={13}/> Edit
              </button>
              <button className="px-5 py-2.5 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-xl flex items-center gap-2 hover:bg-gray-50">
                <Download size={13}/> Download PDF
              </button>
              {invoice.status !== 'paid' && (
                <button onClick={onMarkPaid} className="px-6 py-2.5 text-sm font-bold text-white bg-[#0D1B2A] rounded-xl hover:bg-[#162437] transition-colors">
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
function SuccessModal({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[110] backdrop-blur-[1px]" onClick={onClose}/>
      <div className="fixed inset-0 z-[111] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center text-center relative">
          <button onClick={onClose} className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"><X size={16}/></button>
          <div className="w-14 h-14 bg-emerald-500 rounded-xl flex items-center justify-center mb-5 shadow-md shadow-emerald-200">
            <Check size={28} className="text-white" strokeWidth={3}/>
          </div>
          <h2 className="text-lg font-black text-gray-900 mb-2">{title}</h2>
          <p className="text-xs text-gray-500 font-medium mb-6 px-4">The action was completed successfully.</p>
          <button onClick={onClose} className="w-full py-2.5 bg-[#0D1B2A] text-white rounded-xl text-sm font-bold hover:bg-[#162437]">Okay</button>
        </div>
      </div>
    </>
  )
}

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
  initialInvoices, initialRecurring, initialPayments, clients, projects,
}: {
  initialInvoices:  InvoiceRow[]
  initialRecurring: RecurringRow[]
  initialPayments:  PaymentRow[]
  clients:          ClientOption[]
  projects:         ProjectOption[]
}) {
  const [isPending, startTransition] = useTransition()
  const [invoices,  setInvoices]  = useState(initialInvoices)
  const [recurring, setRecurring] = useState(initialRecurring)
  const [payments,  setPayments]  = useState(initialPayments)
  const [tab, setTab]             = useState<'invoices' | 'recurring' | 'payments'>('invoices')
  const [search, setSearch]       = useState('')
  const [modal, setModal]         = useState<ModalState>({ type: 'none' })
  const [showFilters, setShowFilters]   = useState(false)
  const [statusFilter, setStatusFilter] = useState<DbInvoiceStatus[]>([])
  const [toast, setToast]         = useState<string | null>(null)

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3000) }

  // ─── Stats ──────────────────────────────────────────────────────────────────
  const revenueThisMonth = invoices
    .filter(i => i.status === 'paid' && thisMonth(i.due_date))
    .reduce((s, i) => s + invoiceTotal(i), 0)
  const outstanding = invoices
    .filter(i => i.status === 'sent' || i.status === 'partial')
    .reduce((s, i) => s + invoiceTotal(i), 0)
  const overdueInvs  = invoices.filter(i => i.status === 'overdue')
  const overdueSum   = overdueInvs.reduce((s, i) => s + invoiceTotal(i), 0)
  const paidCount    = invoices.filter(i => i.status === 'paid').length
  const closedCount  = invoices.filter(i => i.status === 'paid' || i.status === 'overdue' || i.status === 'partial').length
  const collectionRate = closedCount > 0 ? Math.round(paidCount / closedCount * 100) : 0

  // ─── Filters ────────────────────────────────────────────────────────────────
  const filteredInvoices = invoices.filter(inv => {
    const q = search.toLowerCase()
    const matchSearch = inv.code.toLowerCase().includes(q) || inv.client_name.toLowerCase().includes(q) || (inv.client_company ?? '').toLowerCase().includes(q)
    if (!matchSearch) return false
    if (statusFilter.length > 0 && !statusFilter.includes(inv.status)) return false
    return true
  })

  // ─── Invoice save ────────────────────────────────────────────────────────────
  function handleSaveInvoice(v: InvoiceFormValues, asDraft: boolean) {
    startTransition(async () => {
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
          id: res.id, code: res.code,
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
      showToast(`${inv.code} deleted`)
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
      <div className="flex-none bg-white border-b border-gray-100 px-8 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Invoice & Billing</h1>
            <p className="text-gray-400 text-xs mt-0.5 font-medium">Create, send, and track all invoices and payments in one place.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-bold text-gray-900">Admin</p>
              <p className="text-[11px] text-gray-400">Peak Roofing Co.</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center shadow-sm">
              <span className="text-white text-xs font-bold">PR</span>
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[200] bg-[#0D1B2A] text-white text-sm font-medium px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 animate-in slide-in-from-top-2">
          <Check size={14} className="text-emerald-400"/> {toast}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-5 px-8 pt-6 pb-2">
          <StatCard label="Revenue This Month" value={fmtCurrency(revenueThisMonth)} sub="Paid invoices" subColor="text-emerald-600"
            icon={<div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center"><TrendingUp size={16}/></div>}/>
          <StatCard label="Outstanding" value={fmtCurrency(outstanding)} subText="Awaiting payment"
            icon={<div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center"><CreditCard size={16}/></div>}/>
          <StatCard label="Overdue" value={fmtCurrency(overdueSum)} subText={`${overdueInvs.length} invoice${overdueInvs.length !== 1 ? 's' : ''}`}
            icon={<div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center"><History size={16}/></div>}/>
          <StatCard label="Collection Rate" value={`${collectionRate}%`} subText={`${paidCount} of ${closedCount} paid`}
            icon={<div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center"><ArrowUpRight size={16}/></div>}/>
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
                className={`pb-3 text-sm font-bold transition-colors border-b-2 -mb-px flex items-center gap-2 ${tab === t.k ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                {t.label} <span className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px]">{t.count}</span>
              </button>
            ))}
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${tab}…`}
                  className="pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-400 w-64"/>
              </div>
              {tab === 'invoices' && (
                <div className="relative">
                  <button onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-xs font-bold transition-colors ${statusFilter.length > 0 || showFilters ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                    <FilterIcon size={13}/> Filter
                  </button>
                  {showFilters && (
                    <div className="absolute left-0 top-11 z-20 bg-white border border-gray-100 shadow-xl rounded-xl w-56 p-3 animate-in fade-in slide-in-from-top-2 duration-150">
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Filter by status</p>
                      <div className="space-y-1">
                        {DB_STATUSES.map(s => (
                          <label key={s} className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded-lg cursor-pointer text-xs font-medium text-gray-700">
                            <input type="checkbox" checked={statusFilter.includes(s)} onChange={e => {
                              setStatusFilter(prev => e.target.checked ? [...prev, s] : prev.filter(f => f !== s))
                            }} className="rounded text-blue-600 focus:ring-blue-500 border-gray-300"/>
                            {STATUS_LABEL[s]}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
                <Share2 size={13}/> Export
              </button>
              {tab === 'invoices' && (
                <button onClick={() => setModal({ type: 'newInvoice' })}
                  className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-[#0D1B2A] rounded-xl shadow-sm hover:bg-[#162437] active:scale-95 transition-all">
                  <Plus size={15}/> New Invoice
                </button>
              )}
              {tab === 'recurring' && (
                <button onClick={() => setModal({ type: 'newRecurring' })}
                  className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-[#0D1B2A] rounded-xl shadow-sm hover:bg-[#162437] active:scale-95 transition-all">
                  <Plus size={15}/> New Recurring
                </button>
              )}
            </div>
          </div>

          {/* ─── Invoices table ────────────────────────────────────────────── */}
          {tab === 'invoices' && (
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden mb-10">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8F9FB] text-[10px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">
                    <th className="px-6 py-4 flex items-center gap-3"><input type="checkbox" className="rounded border-gray-300"/> Invoice</th>
                    <th className="px-6 py-4">Client</th>
                    <th className="px-6 py-4">Issued</th>
                    <th className="px-6 py-4">Due Date</th>
                    <th className="px-6 py-4">Total</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-sm">
                  {filteredInvoices.map(inv => {
                    const total = invoiceTotal(inv)
                    const s     = STATUS_CONFIG[inv.status]
                    return (
                      <tr key={inv.id} onClick={() => setModal({ type: 'viewInvoice', invoice: inv })} className="hover:bg-gray-50/50 transition-colors cursor-pointer">
                        <td className="px-6 py-4 font-bold text-gray-900 flex items-center gap-3">
                          <input type="checkbox" onClick={e => e.stopPropagation()} className="rounded border-gray-300"/>
                          {inv.code}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 shadow-sm" style={{ backgroundColor: avatarColor(inv.client_id) }}>
                              {inv.client_name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 text-xs">{inv.client_name}</p>
                              <p className="text-[11px] text-gray-500">{inv.client_company}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-500 font-medium text-xs">{fmtDate(inv.issued_date)}</td>
                        <td className="px-6 py-4 text-xs">
                          <span className={`font-bold ${inv.status === 'overdue' ? 'text-red-600' : 'text-gray-800'}`}>{fmtDate(inv.due_date)}</span>
                        </td>
                        <td className="px-6 py-4 text-gray-900 font-extrabold text-xs">{fmtCurrency(total)}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-full ${s.bg} ${s.text}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${s.dot}`}/> {STATUS_LABEL[inv.status]}
                          </span>
                        </td>
                        <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                          <InvoiceActionMenu
                            onView={() => setModal({ type: 'viewInvoice', invoice: inv })}
                            onEdit={() => setModal({ type: 'newInvoice', invoice: inv })}
                            onDelete={() => setModal({ type: 'deleteInvoice', invoice: inv })}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {filteredInvoices.length === 0 && <EmptyState label="invoices"/>}
            </div>
          )}

          {/* ─── Recurring table ───────────────────────────────────────────── */}
          {tab === 'recurring' && (
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden mb-10">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8F9FB] text-[10px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">
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
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ backgroundColor: avatarColor(r.client_id) }}>
                            {r.client_name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div className="font-bold text-gray-900 text-xs">{r.client_name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-xs font-medium">{r.description}</td>
                      <td className="px-6 py-4 font-bold text-gray-900 text-xs">{fmtCurrency(r.amount)}</td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${FREQ_BADGE[r.frequency]}`}>{FREQ_LABEL[r.frequency]}</span>
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-800 text-xs">{fmtDate(r.next_date)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase ${r.status === 'active' ? 'text-emerald-600' : 'text-gray-400'}`}>
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
                  <tr className="bg-[#F8F9FB] text-[10px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">
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
                      <td className="px-6 py-4 font-bold text-gray-900 text-xs">{p.invoice_code}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold" style={{ backgroundColor: avatarColor(p.invoice_id) }}>
                            {p.client_name[0]}
                          </div>
                          <span className="font-bold text-gray-900 text-xs">{p.client_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-xs">{PAY_LABEL[p.method]}</td>
                      <td className="px-6 py-4 font-black text-gray-900 text-xs">{fmtCurrency(p.amount)}</td>
                      <td className="px-6 py-4 font-mono text-gray-400 text-[10px] uppercase tracking-wider">{p.reference}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${p.status === 'cleared' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
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

      {/* ─── Modal layer ──────────────────────────────────────────────────────── */}
      {modal.type === 'newInvoice' && (
        <InvoiceFormSidebar
          invoice={modal.invoice} clients={clients} projects={projects}
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
        <SuccessModal title={modal.title} onClose={() => setModal({ type: 'none' })}/>
      )}
    </div>
  )
}
