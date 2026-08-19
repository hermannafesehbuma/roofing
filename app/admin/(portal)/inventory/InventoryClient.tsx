'use client'

import { useEntry } from '@/app/components/ui/animations'
import { useState, useRef, useEffect, useTransition } from 'react'
import {
  Filter, Plus, MoreHorizontal, Package, AlertTriangle, AlertCircle,
  TrendingDown, CircleDollarSign, LayoutGrid, List, ChevronLeft, ChevronRight,
  X, Check, Pencil, Eye, Trash2, ShoppingCart, History,
} from 'lucide-react'
import type {
  InventoryItemRow, UsageLogRow, PurchaseOrderRow, DbInventoryStatus, DbPoStatus,
  CreateInventoryInput, CreatePurchaseOrderInput, LogUsageInput,
} from './actions'
import {
  createInventoryItem, updateInventoryItem, deleteInventoryItem, logUsage,
  createPurchaseOrder, updatePurchaseOrderStatus,
} from './actions'
import { ConfirmDeleteModal as SharedConfirmDeleteModal } from '@/app/components/ui/ConfirmDeleteModal'
import { FilterButton } from '@/app/components/ui/ToolbarButtons'
import { useDismiss } from '@/app/components/ui/useDismiss'
import { SuccessModal } from '@/app/components/ui/SuccessModal'
import { useSlideOver } from '@/app/components/ui/useSlideOver'
import { CONTENT_GAP } from '@/app/components/ui/spacing'
import { ViewToggle } from '@/app/components/ui/ViewToggle'
import { SearchInput } from '@/app/components/ui/SearchInput'
import { StatCard, StatCardGrid } from '@/app/components/ui/StatCard'
import { SegmentedTabs } from '@/app/components/ui/SegmentedTabs'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function computeStatus(qty: number, min: number): DbInventoryStatus {
  if (qty === 0) return 'out_of_stock'
  if (qty < min) return 'low_stock'
  return 'in_stock'
}
function fmtCurrency(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })
}

function fmtDateTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Low stock is orange rather than amber so the board, the card tiles and the
// "Needs reorder" stat all carry the one warning hue.
const STATUS_THEMES: Record<DbInventoryStatus, { border: string; bg: string; text: string; dot: string; progress: string; label: string }> = {
  in_stock:     { border: 'border-emerald-100', bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-500', progress: 'bg-emerald-500', label: 'In Stock' },
  low_stock:    { border: 'border-orange-100',  bg: 'bg-orange-50',  text: 'text-orange-600',  dot: 'bg-orange-500',  progress: 'bg-orange-500',  label: 'Low Stock' },
  out_of_stock: { border: 'border-red-100',     bg: 'bg-red-50',     text: 'text-red-600',     dot: 'bg-red-500',     progress: 'bg-red-500',     label: 'Out of Stock' },
}

const PO_THEMES: Record<DbPoStatus, { bg: string; text: string; dot: string; label: string }> = {
  draft:    { bg: 'bg-gray-50',    text: 'text-gray-600',    dot: 'bg-gray-400',    label: 'Draft' },
  sent:     { bg: 'bg-blue-50',    text: 'text-blue-600',    dot: 'bg-blue-500',    label: 'Sent' },
  received: { bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-500', label: 'Received' },
}

const CATEGORIES = ['Membranes', 'Flashings', 'Fasteners', 'Tools', 'Sealants', 'Insulation', 'Other']
const UNITS      = ['Roll', 'Sheets', 'Box', 'Tube', 'Each', 'Bundle', 'Pallet']

const inputCls  = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all'
const selectCls = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all'

// ─── Types ────────────────────────────────────────────────────────────────────
type ModalState =
  | { type: 'none' }
  | { type: 'addItem'; item?: InventoryItemRow }
  | { type: 'viewDetail'; item: InventoryItemRow }
  | { type: 'deleteConfirm'; item: InventoryItemRow }
  | { type: 'logUsage'; item: InventoryItemRow }
  | { type: 'createPO'; item: InventoryItemRow }
  | { type: 'success'; message: string }

// ─── Sub-components ───────────────────────────────────────────────────────────
/** One labelled row of toggle chips in the filter dropdown. */
function FilterGroup<T extends string>({ label, options, selected, onToggle }: {
  label:    string
  options:  { value: T; label: string }[]
  selected: T[]
  onToggle: (value: T) => void
}) {
  if (options.length === 0) return null
  return (
    <div>
      <label className="text-xs font-semibold text-gray-700 block mb-2">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map(o => {
          const active = selected.includes(o.value)
          return (
            <button
              key={o.value}
              onClick={() => onToggle(o.value)}
              className={`px-3 py-1.5 text-[11px] font-medium rounded-full border transition-colors ${active ? 'bg-[#0D1B2A] text-white border-[#0D1B2A]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
            >
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface ItemActions {
  onView:     () => void
  onEdit:     () => void
  onCreatePO: () => void
  onLogUsage: () => void
  onDelete:   () => void
}

function ActionMenu({ onView, onEdit, onCreatePO, onLogUsage, onDelete }: ItemActions) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  return (
    <div ref={ref} className="relative">
      <button onClick={(e) => { e.stopPropagation(); setOpen(!open) }} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-400">
        <MoreHorizontal size={14} />
      </button>
      {open && (
        <div className="absolute right-0 top-8 w-44 bg-white border border-gray-100 rounded-xl shadow-xl z-30 py-1">
          <button onClick={() => { setOpen(false); onView() }} className="w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2"><Eye size={14} className="text-gray-400" /> View Detail</button>
          <button onClick={() => { setOpen(false); onEdit() }} className="w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2"><Pencil size={14} className="text-gray-400" /> Edit</button>
          <button onClick={() => { setOpen(false); onCreatePO() }} className="w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2"><ShoppingCart size={14} className="text-gray-400" /> Create PO</button>
          <button onClick={() => { setOpen(false); onLogUsage() }} className="w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2"><History size={14} className="text-gray-400" /> Log Usage</button>
          <div className="border-t border-gray-50 my-1" />
          <button onClick={() => { setOpen(false); onDelete() }} className="w-full text-left px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 size={14} /> Delete</button>
        </div>
      )}
    </div>
  )
}

/**
 * Board card. The glyph tile and overflow menu sit on their own row above the
 * name, the facts read as label/value pairs, and the stock meter closes the
 * card with its caption underneath — the order the board design uses.
 */
function KanbanCard({ item, index, ...actions }: { item: InventoryItemRow; index: number } & ItemActions) {
  const status = computeStatus(item.qty_on_hand, item.min_threshold)
  const theme  = STATUS_THEMES[status]
  const ratio  = Math.min(100, (item.qty_on_hand / (item.min_threshold * 2 || 1)) * 100)
  const enter = useEntry()
  return (
    <div {...enter.item(index, 'bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-all')}>
      <div className="flex items-start justify-between mb-3">
        {/* Glyph tile carries the status tint too, so a card reads at a glance
            even once it is dragged away from its column. */}
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${theme.bg}`}>
          <Package size={15} className={theme.text} strokeWidth={1.8} />
        </div>
        <ActionMenu {...actions} />
      </div>

      <h4 className="text-sm font-semibold text-gray-900 leading-tight">{item.name}</h4>
      <p className="text-xs text-gray-400 mt-0.5 mb-4">{item.sku}</p>

      <div className="space-y-2.5 text-xs mb-4">
        <div className="flex justify-between items-center gap-2">
          <span className="text-gray-400">Status:</span>
          <span className={`font-semibold flex items-center gap-1.5 px-2 py-0.5 rounded ${theme.bg} ${theme.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${theme.dot}`} />
            {theme.label}
          </span>
        </div>
        <div className="flex justify-between items-center gap-2">
          <span className="text-gray-400">Category:</span>
          <span className="text-gray-800 font-medium">{item.category}</span>
        </div>
        <div className="flex justify-between items-center gap-2">
          <span className="text-gray-400">Qty on Hand:</span>
          <span className="text-gray-800 font-medium">{item.qty_on_hand} {item.unit_of_measure}s</span>
        </div>
        <div className="flex justify-between items-center gap-2">
          <span className="text-gray-400">Unit Cost:</span>
          <span className="text-gray-800 font-medium">{fmtCurrency(item.unit_cost)}</span>
        </div>
        <div className="flex justify-between items-center gap-2">
          <span className="text-gray-400 shrink-0">Supplier:</span>
          <span className="text-gray-800 font-medium truncate">{item.supplier}</span>
        </div>
      </div>

      <div className="h-1 w-full rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full rounded-full ${theme.progress} transition-all`} style={{ width: `${ratio}%` }} />
      </div>
      <div className="pt-2.5 flex items-center justify-between text-[11px]">
        <span className="text-gray-400">Stock level</span>
        <span className="text-gray-400">Min: {item.min_threshold}</span>
      </div>
    </div>
  )
}

interface ItemFormValues {
  name:            string
  sku:             string
  category:        string
  unit_of_measure: string
  qty_on_hand:     string
  min_threshold:   string
  unit_cost:       string
  supplier:        string
  project_id:      string
  note:            string
}

function ItemFormSidebar({
  item, onClose, onSave, projects,
}: {
  item?: InventoryItemRow
  onClose: () => void
  onSave: (v: ItemFormValues) => void
  projects: { id: string; name: string }[]
}) {
  const { close, backdropCls, panelCls } = useSlideOver(onClose)

  const [v, setV] = useState<ItemFormValues>({
    name:            item?.name            ?? '',
    sku:             item?.sku             ?? '',
    category:        item?.category        ?? CATEGORIES[0],
    unit_of_measure: item?.unit_of_measure ?? UNITS[0],
    qty_on_hand:     item?.qty_on_hand.toString()  ?? '0',
    min_threshold:   item?.min_threshold.toString() ?? '5',
    unit_cost:       item?.unit_cost.toString()    ?? '0',
    supplier:        item?.supplier        ?? '',
    project_id:      item?.project_id      ?? '',
    note:            item?.note            ?? '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k: keyof ItemFormValues, val: string) => setV(prev => ({ ...prev, [k]: val }))

  async function submit() {
    if (!v.name.trim() || !v.sku.trim()) return
    setSaving(true)
    await onSave(v)
    setSaving(false)
  }

  return (
    <>
      <div className={`fixed inset-0 bg-black/40 z-[100] backdrop-blur-[1px] ${backdropCls}`} onClick={close} />
      <div className="fixed inset-y-0 right-0 z-[101] flex">
        <div className={`bg-white w-[640px] max-w-full h-full flex flex-col shadow-2xl ${panelCls}`}>
          <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100 shrink-0">
            <h2 className="text-lg font-semibold text-gray-900">{item ? 'Edit Item' : 'Add Item'}</h2>
            <button onClick={close} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"><X size={18} /></button>
          </div>

          <div className="overflow-y-auto flex-1 px-8 py-8 bg-[#FCFCFD] space-y-7">
            <section>
              <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Item Details</h3>
              <div className="grid grid-cols-2 gap-4 bg-white p-5 border border-gray-100 rounded-xl shadow-sm">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Item Name</label>
                  <input className={inputCls} placeholder="e.g. TPO Membrane 60-mil" value={v.name} onChange={e => set('name', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">SKU / Code</label>
                  <input className={inputCls} placeholder="e.g. TPO-60-4X100" value={v.sku} onChange={e => set('sku', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Category</label>
                  <select className={selectCls} value={v.category} onChange={e => set('category', e.target.value)}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Unit of Measure</label>
                  <select className={selectCls} value={v.unit_of_measure} onChange={e => set('unit_of_measure', e.target.value)}>
                    {UNITS.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Unit Cost ($)</label>
                  <input type="number" className={inputCls} placeholder="0.00" value={v.unit_cost} onChange={e => set('unit_cost', e.target.value)} />
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Stock</h3>
              <div className="grid grid-cols-2 gap-4 bg-white p-5 border border-gray-100 rounded-xl shadow-sm">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Qty on Hand</label>
                  <input type="number" className={inputCls} value={v.qty_on_hand} onChange={e => set('qty_on_hand', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Min Threshold</label>
                  <input type="number" className={inputCls} value={v.min_threshold} onChange={e => set('min_threshold', e.target.value)} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Supplier</label>
                  <input className={inputCls} placeholder="e.g. ABC Roofing Supply" value={v.supplier} onChange={e => set('supplier', e.target.value)} />
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Linked Project</h3>
              <div className="bg-white p-5 border border-gray-100 rounded-xl shadow-sm">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Project Assignment</label>
                <select className={selectCls} value={v.project_id} onChange={e => set('project_id', e.target.value)}>
                  <option value="">All Projects</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </section>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notes</label>
              <textarea className={`${inputCls} h-24 resize-none`} placeholder="Enter notes..." value={v.note} onChange={e => set('note', e.target.value)} />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-7 py-5 border-t border-gray-100 bg-white">
            <button onClick={close} className="px-6 py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-50 rounded-xl">Close</button>
            <button onClick={submit} disabled={saving || !v.name.trim()} className="px-6 py-2.5 text-sm font-semibold text-white bg-[#0D1B2A] rounded-xl shadow-sm hover:bg-[#162437] disabled:opacity-50">
              {saving ? 'Saving…' : 'Save Item'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function LogUsageSidebar({
  item, onClose, onSave, projects,
}: {
  item: InventoryItemRow
  onClose: () => void
  onSave: (input: LogUsageInput) => void
  projects: { id: string; name: string }[]
}) {
  const { close, backdropCls, panelCls } = useSlideOver(onClose)

  const [action,    setAction]    = useState<'used' | 'restocked'>('used')
  const [qty,       setQty]       = useState('1')
  const [projectId, setProjectId] = useState(item.project_id ?? '')
  const [saving,    setSaving]    = useState(false)

  async function submit() {
    const n = parseInt(qty)
    if (!n || n <= 0) return
    setSaving(true)
    await onSave({
      item_id:    item.id,
      action,
      qty_change: action === 'used' ? -n : n,
      project_id: projectId || null,
      user_id:    null,
    })
    setSaving(false)
  }

  return (
    <>
      <div className={`fixed inset-0 bg-black/40 z-[100] backdrop-blur-[1px] ${backdropCls}`} onClick={close} />
      <div className="fixed inset-y-0 right-0 z-[101] flex">
        <div className={`bg-white w-[640px] max-w-full h-full flex flex-col shadow-2xl ${panelCls}`}>
          <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100 shrink-0">
            <h2 className="text-lg font-semibold text-gray-900">Log Usage</h2>
            <button onClick={close} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"><X size={18} /></button>
          </div>

          <div className="overflow-y-auto flex-1 px-7 py-7 bg-[#FCFCFD] space-y-6">
            <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400 border border-gray-100"><Package size={20} /></div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                <p className="text-xs font-semibold text-gray-400">{item.sku} • {item.qty_on_hand} {item.unit_of_measure}s on hand</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Action</label>
              <div className="flex gap-3">
                <button
                  onClick={() => setAction('used')}
                  className={`flex-1 py-3 rounded-xl border text-sm font-semibold transition-colors ${action === 'used' ? 'bg-[#0D1B2A] text-white border-[#0D1B2A]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                >
                  Used / Consumed
                </button>
                <button
                  onClick={() => setAction('restocked')}
                  className={`flex-1 py-3 rounded-xl border text-sm font-semibold transition-colors ${action === 'restocked' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                >
                  Restocked
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Quantity ({item.unit_of_measure}s)</label>
              <input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} className={inputCls} />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Project</label>
              <select className={selectCls} value={projectId} onChange={e => setProjectId(e.target.value)}>
                <option value="">Select Project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-7 py-5 border-t border-gray-100 bg-white">
            <button onClick={close} className="px-6 py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-50 rounded-xl">Cancel</button>
            <button onClick={submit} disabled={saving || !qty || parseInt(qty) <= 0} className="px-6 py-2.5 text-sm font-semibold text-white bg-[#0D1B2A] rounded-xl shadow-sm hover:bg-[#162437] disabled:opacity-50">
              {saving ? 'Saving…' : 'Log Entry'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function CreatePOSidebar({
  item, onClose, onSave,
}: {
  item: InventoryItemRow
  onClose: () => void
  onSave: (input: CreatePurchaseOrderInput) => void
}) {
  const { close, backdropCls, panelCls } = useSlideOver(onClose)

  // Reordering back to twice the minimum is the default the buyer can override.
  const suggested = Math.max(item.min_threshold * 2 - item.qty_on_hand, 1)

  const [qty,      setQty]      = useState(String(suggested))
  const [supplier, setSupplier] = useState(item.supplier ?? '')
  const [unitCost, setUnitCost] = useState(String(item.unit_cost))
  const [status,   setStatus]   = useState<DbPoStatus>('draft')
  const [saving,   setSaving]   = useState(false)

  const qtyNum   = parseInt(qty) || 0
  const costNum  = parseFloat(unitCost) || 0
  const total    = qtyNum * costNum

  async function submit() {
    if (qtyNum <= 0) return
    setSaving(true)
    await onSave({
      inventory_item_id: item.id,
      quantity:          qtyNum,
      supplier:          supplier.trim() || null,
      unit_cost:         costNum,
      status,
    })
    setSaving(false)
  }

  return (
    <>
      <div className={`fixed inset-0 bg-black/40 z-[100] backdrop-blur-[1px] ${backdropCls}`} onClick={close} />
      <div className="fixed inset-y-0 right-0 z-[101] flex">
        <div className={`bg-white w-[640px] max-w-full h-full flex flex-col shadow-2xl ${panelCls}`}>
          <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100 shrink-0">
            <h2 className="text-lg font-semibold text-gray-900">Create Purchase Order</h2>
            <button onClick={close} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"><X size={18} /></button>
          </div>

          <div className="overflow-y-auto flex-1 px-7 py-7 bg-[#FCFCFD] space-y-6">
            <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400 border border-gray-100"><Package size={20} /></div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                <p className="text-xs font-semibold text-gray-400">{item.sku} • {item.qty_on_hand} {item.unit_of_measure}s on hand • min {item.min_threshold}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Quantity ({item.unit_of_measure}s)</label>
                <input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Unit Cost ($)</label>
                <input type="number" min="0" step="0.01" value={unitCost} onChange={e => setUnitCost(e.target.value)} className={inputCls} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Supplier</label>
              <input value={supplier} onChange={e => setSupplier(e.target.value)} placeholder="e.g. ABC Roofing Supply" className={inputCls} />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Status</label>
              <div className="flex gap-3">
                {(['draft', 'sent'] as DbPoStatus[]).map(s => (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className={`flex-1 py-3 rounded-xl border text-sm font-semibold transition-colors ${status === s ? 'bg-[#0D1B2A] text-white border-[#0D1B2A]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                  >
                    {s === 'draft' ? 'Save as Draft' : 'Send to Supplier'}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">Order Total</span>
              <span className="text-lg font-semibold text-gray-900">{fmtCurrency(total)}</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-7 py-5 border-t border-gray-100 bg-white">
            <button onClick={close} className="px-6 py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-50 rounded-xl">Cancel</button>
            <button onClick={submit} disabled={saving || qtyNum <= 0} className="px-6 py-2.5 text-sm font-semibold text-white bg-[#0D1B2A] rounded-xl shadow-sm hover:bg-[#162437] disabled:opacity-50">
              {saving ? 'Saving…' : 'Create PO'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function ItemDetailSidebar({ item, usage, onClose, onEdit, onReorder }: { item: InventoryItemRow; usage: UsageLogRow[]; onClose: () => void; onEdit: () => void; onReorder: () => void }) {
  const { close, backdropCls, panelCls } = useSlideOver(onClose)

  const status = computeStatus(item.qty_on_hand, item.min_threshold)
  const theme  = STATUS_THEMES[status]
  const ratio  = Math.min(100, (item.qty_on_hand / (item.min_threshold * 2 || 1)) * 100)
  const itemUsage = usage.filter(u => u.item_id === item.id).slice(0, 5)

  return (
    <>
      <div className={`fixed inset-0 bg-black/40 z-[100] backdrop-blur-[1px] ${backdropCls}`} onClick={close} />
      <div className="fixed inset-y-0 right-0 z-[101] flex">
        <div className={`bg-white w-[640px] max-w-full h-full flex flex-col shadow-2xl ${panelCls}`}>
          <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100 shrink-0">
            <h2 className="text-lg font-semibold text-gray-900">Item Details</h2>
            <button onClick={close} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"><X size={18} /></button>
          </div>

          <div className="overflow-y-auto flex-1 px-8 py-7 bg-[#FCFCFD] space-y-8">
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 border border-gray-100"><Package size={24} /></div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">{item.name}</h3>
                  <p className="text-xs font-semibold text-gray-400">{item.sku}</p>
                </div>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-1 rounded flex items-center gap-1.5 uppercase tracking-wider ${theme.bg} ${theme.text}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${theme.dot}`} /> {theme.label}
              </span>
            </div>

            <div>
              <div className="flex justify-between text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
                <span>Current Stock Level</span>
                <span>Threshold: {item.min_threshold} {item.unit_of_measure}s</span>
              </div>
              <div className="bg-white p-4 border border-gray-100 rounded-xl shadow-sm">
                <div className="flex justify-between items-end mb-3">
                  <p className="text-2xl font-semibold text-gray-900">{item.qty_on_hand} <span className="text-sm font-semibold text-gray-400">{item.unit_of_measure}s</span></p>
                  <span className="text-xs font-semibold text-gray-500">Total Value: {fmtCurrency(item.qty_on_hand * item.unit_cost)}</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${theme.progress}`} style={{ width: `${ratio}%` }} />
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Item Information</h4>
              <div className="bg-white border border-gray-100 rounded-xl divide-y divide-gray-50 shadow-sm overflow-hidden">
                {[
                  { label: 'Category',    val: item.category },
                  { label: 'Unit',        val: item.unit_of_measure },
                  { label: 'Unit Cost',   val: fmtCurrency(item.unit_cost) },
                  { label: 'Supplier',    val: item.supplier },
                  { label: 'Project',     val: item.project_name ?? 'All Projects' },
                ].map(r => (
                  <div key={r.label} className="flex justify-between items-center px-5 py-3 text-sm">
                    <span className="text-gray-500 font-medium">{r.label}</span>
                    <span className="text-gray-900 font-semibold">{r.val}</span>
                  </div>
                ))}
              </div>
            </div>

            {itemUsage.length > 0 && (
              <div>
                <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Recent Usage</h4>
                <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                  {itemUsage.map(u => (
                    <div key={u.id} className="flex justify-between items-center px-5 py-4 border-b last:border-0 border-gray-50">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{u.project_name ?? 'No Project'}</p>
                        <p className="text-xs font-medium text-gray-400 mt-0.5">{fmtDate(u.created_at)} • {u.user_name ?? 'System'}</p>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-1 rounded ${u.action === 'used' ? 'text-red-600 bg-red-50' : 'text-emerald-600 bg-emerald-50'}`}>
                        {u.action === 'used' ? '-' : '+'}{Math.abs(u.qty_change)} {item.unit_of_measure}s
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="px-7 py-5 border-t border-gray-100 bg-white flex justify-end gap-3">
            <button onClick={onEdit} className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 border border-gray-200 rounded-xl flex items-center gap-2"><Pencil size={14} /> Edit</button>
            <button onClick={onReorder} className="px-6 py-2.5 text-sm font-semibold text-white bg-[#0D1B2A] rounded-xl shadow-sm flex items-center gap-2"><ShoppingCart size={16} /> Reorder PO</button>
          </div>
        </div>
      </div>
    </>
  )
}

function ConfirmDeleteModal({ item, onClose, onConfirm }: { item: InventoryItemRow; onClose: () => void; onConfirm: () => void }) {
  return (
    <SharedConfirmDeleteModal
      title="Delete Item"
      message={`Deleting this item (${item.name}) will remove it from inventory permanently. Stock history is kept for audit.`}
      onCancel={onClose}
      onConfirm={onConfirm}
    />
  )
}

// ─── Main Client Component ─────────────────────────────────────────────────────
interface Props {
  initialItems:          InventoryItemRow[]
  initialUsage:          UsageLogRow[]
  initialPurchaseOrders: PurchaseOrderRow[]
  projects:              { id: string; name: string }[]
}

export function InventoryClient({ initialItems, initialUsage, initialPurchaseOrders, projects }: Props) {
  const enter = useEntry()
  const [items,      setItems]      = useState(initialItems)
  const [usage,      setUsage]      = useState(initialUsage)
  const [pos,        setPos]        = useState(initialPurchaseOrders)
  const [view,       setView]       = useState<'kanban' | 'list'>('kanban')
  const [tab,        setTab]        = useState<'items' | 'pos' | 'usage'>('items')
  const [modal,      setModal]      = useState<ModalState>({ type: 'none' })
  const [filterOpen, setFilterOpen] = useState(false)
  const filterRef = useDismiss<HTMLDivElement>(filterOpen, () => setFilterOpen(false))
  const [search,     setSearch]     = useState('')
  const [filterStatus, setFilterStatus] = useState<DbInventoryStatus[]>([])
  const [filterCat, setFilterCat]   = useState<string[]>([])
  const [filterSupplier, setFilterSupplier] = useState<string[]>([])
  const [isPending,  startTransition] = useTransition()

  // Stats
  const totalSKUs     = items.length
  const lowStockCount = items.filter(i => computeStatus(i.qty_on_hand, i.min_threshold) === 'low_stock').length
  const outOfStock    = items.filter(i => computeStatus(i.qty_on_hand, i.min_threshold) === 'out_of_stock').length
  const totalValue    = items.reduce((s, i) => s + i.qty_on_hand * i.unit_cost, 0)

  const filteredItems = items.filter(item => {
    const s = computeStatus(item.qty_on_hand, item.min_threshold)
    if (filterStatus.length > 0 && !filterStatus.includes(s)) return false
    if (filterCat.length > 0 && !filterCat.includes(item.category)) return false
    if (filterSupplier.length > 0 && !filterSupplier.includes(item.supplier)) return false
    if (search && !item.name.toLowerCase().includes(search.toLowerCase()) && !item.sku.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  // The search box sits above every tab, so each tab's rows answer to it.
  const q = search.trim().toLowerCase()
  const filteredPos = pos.filter(p => !q
    || p.item_name.toLowerCase().includes(q)
    || p.item_sku.toLowerCase().includes(q)
    || (p.supplier ?? '').toLowerCase().includes(q))
  const filteredUsage = usage.filter(u => !q
    || u.item_name.toLowerCase().includes(q)
    || u.item_sku.toLowerCase().includes(q))

  const categories = [...new Set(items.map(i => i.category))]
  const suppliers  = [...new Set(items.map(i => i.supplier).filter(Boolean))]
  const activeFilters = filterStatus.length + filterCat.length + filterSupplier.length

  function clearFilters() {
    setFilterStatus([])
    setFilterCat([])
    setFilterSupplier([])
  }

  /** Builds the per-item handler set the card and table row both hang off. */
  const itemActions = (item: InventoryItemRow): ItemActions => ({
    onView:     () => setModal({ type: 'viewDetail', item }),
    onEdit:     () => setModal({ type: 'addItem', item }),
    onCreatePO: () => setModal({ type: 'createPO', item }),
    onLogUsage: () => setModal({ type: 'logUsage', item }),
    onDelete:   () => setModal({ type: 'deleteConfirm', item }),
  })

  async function handleSaveItem(v: ItemFormValues) {
    const input: CreateInventoryInput = {
      name:            v.name.trim(),
      sku:             v.sku.trim(),
      category:        v.category,
      unit_of_measure: v.unit_of_measure,
      qty_on_hand:     parseInt(v.qty_on_hand) || 0,
      min_threshold:   parseInt(v.min_threshold) || 5,
      unit_cost:       parseFloat(v.unit_cost) || 0,
      supplier:        v.supplier.trim(),
      project_id:      v.project_id || null,
      note:            v.note.trim() || null,
    }

    const editing = modal.type === 'addItem' ? modal.item : undefined
    if (editing) {
      startTransition(async () => {
        try {
          const res = await updateInventoryItem(editing.id, input)
          if (!('error' in res)) {
            setItems(prev => prev.map(i => i.id === editing.id
              ? { ...i, ...input, project_name: projects.find(p => p.id === input.project_id)?.name ?? null }
              : i))
            setModal({ type: 'success', message: 'Item updated successfully' })
          } else {
            console.error('Update err:', res.error)
            alert(`Error: ${res.error}`)
          }
        } catch (err: any) {
          console.error(err)
          alert('Update failed: ' + err.message)
        }
      })
    } else {
      startTransition(async () => {
        try {
          const res = await createInventoryItem(input)
          if ('id' in res) {
            const newItem: InventoryItemRow = {
              ...input,
              id: res.id,
              code: res.code ?? '',
              project_name: projects.find(p => p.id === input.project_id)?.name ?? null,
              created_at: new Date().toISOString(),
            }
            setItems(prev => [newItem, ...prev])
            setModal({ type: 'success', message: 'Item added successfully' })
          } else {
            console.error('Create err:', res.error)
            alert(`Error: ${res.error}`)
          }
        } catch (err: any) {
          console.error(err)
          alert('Create failed: ' + err.message)
        }
      })
    }
  }

  async function handleLogUsage(input: LogUsageInput) {
    startTransition(async () => {
      const res = await logUsage(input)
      if ('newQty' in res) {
        const newQty = res.newQty ?? 0
        setItems(prev => prev.map(i => i.id === input.item_id ? { ...i, qty_on_hand: newQty } : i))
        const item = items.find(i => i.id === input.item_id)
        if (item) {
          setUsage(prev => [{
            id: Math.random().toString(36).slice(2),
            item_id: input.item_id,
            item_name: item.name,
            item_sku: item.sku,
            action: input.action,
            qty_change: input.qty_change,
            project_id: input.project_id,
            project_name: projects.find(p => p.id === input.project_id)?.name ?? null,
            user_id: null,
            user_name: null,
            created_at: new Date().toISOString(),
          }, ...prev])
        }
        setModal({ type: 'success', message: `${input.action === 'used' ? 'Usage' : 'Restock'} logged successfully` })
      }
    })
  }

  async function handleCreatePO(input: CreatePurchaseOrderInput) {
    const item = items.find(i => i.id === input.inventory_item_id)
    startTransition(async () => {
      const res = await createPurchaseOrder(input)
      if ('error' in res) {
        console.error('Create PO err:', res.error)
        alert(`Error: ${res.error}`)
        return
      }
      setPos(prev => [{
        id:                res.id,
        inventory_item_id: input.inventory_item_id,
        item_name:         item?.name ?? 'Unknown',
        item_sku:          item?.sku ?? '',
        quantity:          input.quantity,
        supplier:          input.supplier,
        unit_cost:         input.unit_cost,
        total_cost:        res.total_cost,
        status:            input.status,
        ordered_at:        res.ordered_at,
        received_at:       null,
        created_at:        res.created_at,
      }, ...prev])
      setModal({ type: 'success', message: 'Purchase order created' })
    })
  }

  function handleAdvancePO(po: PurchaseOrderRow, status: DbPoStatus) {
    startTransition(async () => {
      const res = await updatePurchaseOrderStatus(po.id, status)
      if ('error' in res) {
        console.error('PO status err:', res.error)
        return
      }
      setPos(prev => prev.map(p => p.id === po.id
        ? {
            ...p,
            status,
            ordered_at:  status === 'sent'     ? res.at : p.ordered_at,
            received_at: status === 'received' ? res.at : p.received_at,
          }
        : p))
    })
  }

  function handleDelete() {
    if (modal.type !== 'deleteConfirm') return
    const { item } = modal
    startTransition(async () => {
      const res = await deleteInventoryItem(item.id)
      if (!('error' in res)) setItems(prev => prev.filter(i => i.id !== item.id))
    })
    setModal({ type: 'none' })
  }

  // Group usage by date for the usage log
  const usageByDate = filteredUsage.reduce<Record<string, UsageLogRow[]>>((acc, u) => {
    const date = fmtDate(u.created_at)
    if (!acc[date]) acc[date] = []
    acc[date].push(u)
    return acc
  }, {})

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      {/* Header */}
      <div className="flex-1 overflow-y-auto pb-10">
        <div className="px-8 pt-6">
          {/* Stats */}
          <StatCardGrid>
            {/* Tinted -50 tile under a -500 glyph, the same weighting the
                Time Tracking tiles use, so the two screens read as one set. */}
            <StatCard
              label="Total SKUs" value={String(totalSKUs)}
              sub="Items tracked" subColor="text-emerald-600"
              iconBg="bg-emerald-50" icon={<Package size={16} className="text-emerald-500" strokeWidth={1.9} />}
            />
            <StatCard
              label="Low Stock" value={String(lowStockCount)}
              sub="Needs reorder" subColor="text-orange-500"
              iconBg="bg-orange-50" icon={<AlertCircle size={16} className="text-orange-500" strokeWidth={1.9} />}
            />
            <StatCard
              label="Critical / Out" value={String(outOfStock)}
              sub="Immediate action" subColor="text-red-500"
              iconBg="bg-red-50" icon={<AlertCircle size={16} className="text-red-500" strokeWidth={1.9} />}
            />
            <StatCard
              label="Inventory Value" value={fmtCurrency(totalValue)}
              sub="Total stock value" subColor="text-emerald-600"
              iconBg="bg-emerald-50" icon={<CircleDollarSign size={16} className="text-emerald-500" strokeWidth={1.9} />}
            />
          </StatCardGrid>

          <SegmentedTabs
            value={tab}
            onChange={setTab}
            className={CONTENT_GAP}
            options={[
              { value: 'items', label: 'Items',           count: totalSKUs },
              { value: 'pos',   label: 'Purchase Orders', count: pos.length },
              { value: 'usage', label: 'Usage Log',       count: null },
            ] as const}
          />

          {/* Toolbar */}
          <div className={`flex items-center justify-between ${CONTENT_GAP}`}>
            <div className="flex items-center gap-6">
              {/* Only the item board has two shapes — the PO and usage tabs
                  are always tables, so the switch belongs to Items alone. */}
              {tab === 'items' && (
                <ViewToggle
                  value={view}
                  onChange={setView}
                  options={[
                    { value: 'kanban', label: 'Kanban', icon: LayoutGrid },
                    { value: 'list',   label: 'List',   icon: List },
                  ]}
                />
              )}
              <SearchInput value={search} onChange={setSearch} />
            </div>
            <div className="flex items-center gap-3">
              {/* Chips filter item attributes, so the control belongs to that tab. */}
              <div className={`relative ${tab === 'items' ? '' : 'hidden'}`} ref={filterRef}>
                <FilterButton onClick={() => setFilterOpen(!filterOpen)} active={filterOpen} count={activeFilters} />
                {filterOpen && (
                  <div className="absolute right-0 top-11 w-80 bg-white border border-gray-100 rounded-xl shadow-xl z-20 p-5">
                    <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-4">Filter</h4>
                    <div className="space-y-4">
                      <FilterGroup
                        label="Stock Status"
                        options={(['in_stock', 'low_stock', 'out_of_stock'] as DbInventoryStatus[]).map(s => ({ value: s, label: STATUS_THEMES[s].label }))}
                        selected={filterStatus}
                        onToggle={v => setFilterStatus(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])}
                      />
                      <FilterGroup
                        label="Category"
                        options={categories.map(c => ({ value: c, label: c }))}
                        selected={filterCat}
                        onToggle={v => setFilterCat(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])}
                      />
                      <FilterGroup
                        label="Supplier"
                        options={suppliers.map(s => ({ value: s, label: s }))}
                        selected={filterSupplier}
                        onToggle={v => setFilterSupplier(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])}
                      />
                    </div>
                    <div className="flex gap-3 border-t border-gray-100 mt-5 pt-4">
                      <button onClick={clearFilters} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors">Clear All</button>
                      <button onClick={() => setFilterOpen(false)} className="flex-1 py-2.5 bg-[#0D1B2A] text-white text-xs font-semibold rounded-lg shadow-sm hover:bg-[#162437] transition-colors">Apply</button>
                    </div>
                  </div>
                )}
              </div>
              <button onClick={() => setModal({ type: 'addItem' })} className="flex items-center gap-2 px-4 py-2.5 bg-[#0D1B2A] text-white text-xs font-semibold rounded-xl shadow-sm hover:bg-[#162437] active:scale-95 transition-all">
                <Plus size={16} /> Add Item
              </button>
            </div>
          </div>

          {/* Items Tab */}
          {tab === 'items' && (
            <>
              {/* The board carries its own empty states per column, so it stays
                  up even with nothing in stock; only the table falls back. */}
              {view === 'list' && filteredItems.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 flex flex-col items-center text-center">
                  <Package size={40} className="text-gray-200 mb-4" />
                  <p className="text-sm font-semibold text-gray-500">No inventory items found</p>
                  <p className="text-xs text-gray-400 mt-1">Add items to start tracking stock</p>
                </div>
              ) : view === 'kanban' ? (
                <div className="grid grid-cols-3 gap-6">
                  {(['in_stock', 'low_stock', 'out_of_stock'] as DbInventoryStatus[]).map(colStatus => {
                    const colItems = filteredItems.filter(i => computeStatus(i.qty_on_hand, i.min_threshold) === colStatus)
                    const theme = STATUS_THEMES[colStatus]
                    return (
                      <div key={colStatus} className="flex flex-col">
                        {/* Neutral header — only the dot carries the status
                            colour, as on the Projects board. */}
                        <div className="flex items-center gap-2.5 mb-4 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                          <div className={`w-2.5 h-2.5 rounded-full ${theme.dot}`} />
                          <h3 className="text-sm font-semibold text-gray-900">{theme.label}</h3>
                          <span className="ml-auto w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 text-xs font-semibold">{colItems.length}</span>
                        </div>
                        <div className="space-y-4">
                          {colItems.map((item, i) => (
                            <KanbanCard key={item.id} index={i} item={item} {...itemActions(item)} />
                          ))}
                          {colItems.length === 0 && (
                            <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center text-gray-400 text-xs">
                              No {theme.label.toLowerCase()} items
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[#F8F9FB] border-b border-gray-100">
                      <tr className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                        <th className="px-6 py-4">Item</th>
                        <th className="px-6 py-4">SKU</th>
                        <th className="px-6 py-4">Category</th>
                        <th className="px-6 py-4">Qty on Hand</th>
                        <th className="px-6 py-4">Min Threshold</th>
                        <th className="px-6 py-4">Unit Cost</th>
                        <th className="px-6 py-4">Total Value</th>
                        <th className="px-6 py-4">Supplier</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-xs font-medium text-gray-600">
                      {filteredItems.map((item, i) => {
                        const status = computeStatus(item.qty_on_hand, item.min_threshold)
                        const theme  = STATUS_THEMES[status]
                        return (
                          <tr key={item.id} onClick={() => setModal({ type: 'viewDetail', item })} {...enter.item(i, 'hover:bg-gray-50/50 cursor-pointer', 25)}>
                            <td className="px-6 py-4 font-semibold text-gray-900">{item.name}</td>
                            <td className="px-6 py-4">{item.sku}</td>
                            <td className="px-6 py-4">{item.category}</td>
                            <td className="px-6 py-4 font-semibold text-gray-900">{item.qty_on_hand}</td>
                            <td className="px-6 py-4">{item.min_threshold}</td>
                            <td className="px-6 py-4">{fmtCurrency(item.unit_cost)}</td>
                            <td className="px-6 py-4 font-semibold text-gray-900">{fmtCurrency(item.qty_on_hand * item.unit_cost)}</td>
                            <td className="px-6 py-4 truncate max-w-[120px]">{item.supplier}</td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded border uppercase ${theme.bg} ${theme.text} ${theme.border}`}>
                                {theme.label}
                              </span>
                            </td>
                            <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                              <ActionMenu {...itemActions(item)} />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {filteredItems.length > 10 && (
                    <div className="flex items-center justify-between border-t border-gray-50 px-6 py-4 bg-white">
                      <button className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-500 hover:bg-gray-50"><ChevronLeft size={14} /> Previous</button>
                      <span className="text-xs font-semibold text-gray-500">Page 1</span>
                      <button className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-500 hover:bg-gray-50">Next <ChevronRight size={14} /></button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Purchase Orders Tab */}
          {tab === 'pos' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {filteredPos.length === 0 ? (
                <div className="p-16 flex flex-col items-center text-center">
                  <ShoppingCart size={40} className="text-gray-200 mb-4" />
                  <p className="text-sm font-semibold text-gray-500">No purchase orders yet</p>
                  <p className="text-xs text-gray-400 mt-1">Raise one from an item&rsquo;s Create PO action</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#F8F9FB] border-b border-gray-100">
                    <tr className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                      <th className="px-6 py-4">Created</th>
                      <th className="px-6 py-4">Item</th>
                      <th className="px-6 py-4">SKU</th>
                      <th className="px-6 py-4">Supplier</th>
                      <th className="px-6 py-4">Qty</th>
                      <th className="px-6 py-4">Unit Cost</th>
                      <th className="px-6 py-4">Total</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-xs font-medium text-gray-600">
                    {filteredPos.map((po, i) => {
                      const theme = PO_THEMES[po.status]
                      const next: DbPoStatus | null =
                        po.status === 'draft' ? 'sent' : po.status === 'sent' ? 'received' : null
                      return (
                        <tr key={po.id} {...enter.item(i, 'hover:bg-gray-50/50', 25)}>
                          <td className="px-6 py-4">{fmtDate(po.created_at)}</td>
                          <td className="px-6 py-4 font-semibold text-gray-900">{po.item_name}</td>
                          <td className="px-6 py-4 text-gray-400">{po.item_sku}</td>
                          <td className="px-6 py-4">{po.supplier ?? '–'}</td>
                          <td className="px-6 py-4 font-semibold text-gray-900">{po.quantity}</td>
                          <td className="px-6 py-4">{fmtCurrency(po.unit_cost)}</td>
                          <td className="px-6 py-4 font-semibold text-gray-900">{fmtCurrency(po.total_cost)}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-semibold text-[10px] ${theme.bg} ${theme.text}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${theme.dot}`} />
                              {theme.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {next && (
                              <button
                                onClick={() => handleAdvancePO(po, next)}
                                disabled={isPending}
                                className="px-3 py-1.5 border border-gray-200 rounded-lg text-[11px] font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                              >
                                Mark {PO_THEMES[next].label}
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Usage Log Tab */}
          {tab === 'usage' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {filteredUsage.length === 0 ? (
                <div className="p-16 flex flex-col items-center text-center">
                  <History size={40} className="text-gray-200 mb-4" />
                  <p className="text-sm font-semibold text-gray-500">No usage logged yet</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#F8F9FB] border-b border-gray-100">
                    <tr className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                      <th className="px-6 py-4">Date &amp; Time</th>
                      <th className="px-6 py-4">Item</th>
                      <th className="px-6 py-4">SKU</th>
                      <th className="px-6 py-4">Action</th>
                      <th className="px-6 py-4">Qty Change</th>
                      <th className="px-6 py-4">Project</th>
                      <th className="px-6 py-4">Logged By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-xs font-medium text-gray-600">
                    {Object.entries(usageByDate).map(([date, dateRows]) => (
                      <>
                        <tr key={`hdr-${date}`} className="bg-[#F0F2F5]">
                          <td colSpan={7} className="px-6 py-2.5 font-semibold text-gray-500 text-[10px] tracking-wider uppercase">{date}</td>
                        </tr>
                        {dateRows.map(u => (
                          <tr key={u.id} className="hover:bg-gray-50/50">
                            <td className="px-6 py-4">{new Date(u.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</td>
                            <td className="px-6 py-4 font-semibold text-gray-900">{u.item_name}</td>
                            <td className="px-6 py-4 text-gray-400">{u.item_sku}</td>
                            <td className="px-6 py-4">
                              <span className={`px-1.5 py-0.5 rounded font-semibold text-[9px] border uppercase ${u.action === 'used' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                {u.action === 'used' ? 'Used' : 'Restocked'}
                              </span>
                            </td>
                            <td className={`px-6 py-4 font-semibold ${u.qty_change < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                              {u.qty_change > 0 ? '+' : ''}{u.qty_change}
                            </td>
                            <td className="px-6 py-4">{u.project_name ?? '–'}</td>
                            <td className="px-6 py-4">{u.user_name ?? 'System'}</td>
                          </tr>
                        ))}
                      </>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {modal.type === 'addItem' && (
        <ItemFormSidebar
          item={modal.item}
          onClose={() => setModal({ type: 'none' })}
          onSave={handleSaveItem}
          projects={projects}
        />
      )}
      {modal.type === 'viewDetail' && (
        <ItemDetailSidebar
          item={modal.item}
          usage={usage}
          onClose={() => setModal({ type: 'none' })}
          onEdit={() => setModal({ type: 'addItem', item: modal.item })}
          onReorder={() => setModal({ type: 'none' })}
        />
      )}
      {modal.type === 'createPO' && (
        <CreatePOSidebar
          item={modal.item}
          onClose={() => setModal({ type: 'none' })}
          onSave={handleCreatePO}
        />
      )}
      {modal.type === 'logUsage' && (
        <LogUsageSidebar
          item={modal.item}
          onClose={() => setModal({ type: 'none' })}
          onSave={handleLogUsage}
          projects={projects}
        />
      )}
      {modal.type === 'deleteConfirm' && (
        <ConfirmDeleteModal
          item={modal.item}
          onClose={() => setModal({ type: 'none' })}
          onConfirm={handleDelete}
        />
      )}
      {modal.type === 'success' && (
        <SuccessModal
          title={modal.message}
          subtitle="Inventory has been updated."
          onClose={() => setModal({ type: 'none' })}
        />
      )}
    </div>
  )
}
