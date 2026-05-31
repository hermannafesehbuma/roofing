'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import {
  Search, Filter, Plus, MoreHorizontal, Package, AlertTriangle,
  TrendingDown, DollarSign, LayoutGrid, List, ChevronLeft, ChevronRight,
  X, Check, Pencil, Eye, Trash2, ShoppingCart, History,
} from 'lucide-react'
import type { InventoryItemRow, UsageLogRow, DbInventoryStatus, CreateInventoryInput, LogUsageInput } from './actions'
import { createInventoryItem, updateInventoryItem, deleteInventoryItem, logUsage } from './actions'

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

const STATUS_THEMES: Record<DbInventoryStatus, { border: string; bg: string; text: string; dot: string; progress: string; label: string }> = {
  in_stock:     { border: 'border-emerald-100', bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-500', progress: 'bg-emerald-500', label: 'In Stock' },
  low_stock:    { border: 'border-amber-100',   bg: 'bg-amber-50',   text: 'text-amber-600',   dot: 'bg-amber-500',   progress: 'bg-amber-500',   label: 'Low Stock' },
  out_of_stock: { border: 'border-red-100',     bg: 'bg-red-50',     text: 'text-red-600',     dot: 'bg-red-500',     progress: 'bg-red-500',     label: 'Out of Stock' },
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
  | { type: 'success'; message: string }

// ─── Sub-components ───────────────────────────────────────────────────────────
function ActionMenu({ onView, onEdit, onLogUsage, onDelete }: { onView: () => void; onEdit: () => void; onLogUsage: () => void; onDelete: () => void }) {
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
          <button onClick={() => { setOpen(false); onView() }} className="w-full text-left px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2"><Eye size={14} className="text-gray-400" /> View Detail</button>
          <button onClick={() => { setOpen(false); onEdit() }} className="w-full text-left px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2"><Pencil size={14} className="text-gray-400" /> Edit</button>
          <button onClick={() => { setOpen(false); onLogUsage() }} className="w-full text-left px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2"><History size={14} className="text-gray-400" /> Log Usage</button>
          <div className="border-t border-gray-50 my-1" />
          <button onClick={() => { setOpen(false); onDelete() }} className="w-full text-left px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 size={14} /> Delete</button>
        </div>
      )}
    </div>
  )
}

function KanbanCard({ item, onView, onEdit, onLogUsage, onDelete }: { item: InventoryItemRow; onView: () => void; onEdit: () => void; onLogUsage: () => void; onDelete: () => void }) {
  const status = computeStatus(item.qty_on_hand, item.min_threshold)
  const theme  = STATUS_THEMES[status]
  const ratio  = Math.min(100, (item.qty_on_hand / (item.min_threshold * 2 || 1)) * 100)
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="text-sm font-black text-gray-900 leading-tight">{item.name}</h4>
          <p className="text-[10px] font-bold text-gray-400 mt-0.5">{item.sku}</p>
        </div>
        <ActionMenu onView={onView} onEdit={onEdit} onLogUsage={onLogUsage} onDelete={onDelete} />
      </div>
      <div className="mb-3">
        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded flex items-center gap-1 w-fit ${theme.bg} ${theme.text} uppercase`}>
          <div className={`w-1 h-1 rounded-full ${theme.dot}`} /> {theme.label}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-y-2 text-[11px] font-medium text-gray-500 mb-4">
        <div>Category:</div><div className="text-gray-900 font-bold text-right">{item.category}</div>
        <div>Qty on Hand:</div><div className="text-gray-900 font-bold text-right">{item.qty_on_hand} {item.unit_of_measure}s</div>
        <div>Unit Cost:</div><div className="text-gray-900 font-bold text-right">{fmtCurrency(item.unit_cost)}</div>
        <div>Supplier:</div><div className="text-gray-900 font-bold text-right truncate">{item.supplier}</div>
      </div>
      <div className="pt-3 border-t border-gray-50">
        <div className="flex justify-between text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1.5">
          <span>Stock Level</span><span>Min: {item.min_threshold}</span>
        </div>
        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full ${theme.progress} transition-all`} style={{ width: `${ratio}%` }} />
        </div>
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
      <div className="fixed inset-0 bg-black/40 z-[100] backdrop-blur-[1px]" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-[101] flex">
        <div className="bg-white w-[600px] max-w-full h-full flex flex-col shadow-2xl">
          <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100 shrink-0">
            <h2 className="text-lg font-black text-gray-900">{item ? 'Edit Item' : 'Add Item'}</h2>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"><X size={18} /></button>
          </div>

          <div className="overflow-y-auto flex-1 px-8 py-8 bg-[#FCFCFD] space-y-7">
            <section>
              <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Item Details</h3>
              <div className="grid grid-cols-2 gap-4 bg-white p-5 border border-gray-100 rounded-xl shadow-sm">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">Item Name</label>
                  <input className={inputCls} placeholder="e.g. TPO Membrane 60-mil" value={v.name} onChange={e => set('name', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">SKU / Code</label>
                  <input className={inputCls} placeholder="e.g. TPO-60-4X100" value={v.sku} onChange={e => set('sku', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">Category</label>
                  <select className={selectCls} value={v.category} onChange={e => set('category', e.target.value)}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">Unit of Measure</label>
                  <select className={selectCls} value={v.unit_of_measure} onChange={e => set('unit_of_measure', e.target.value)}>
                    {UNITS.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">Unit Cost ($)</label>
                  <input type="number" className={inputCls} placeholder="0.00" value={v.unit_cost} onChange={e => set('unit_cost', e.target.value)} />
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Stock</h3>
              <div className="grid grid-cols-2 gap-4 bg-white p-5 border border-gray-100 rounded-xl shadow-sm">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">Qty on Hand</label>
                  <input type="number" className={inputCls} value={v.qty_on_hand} onChange={e => set('qty_on_hand', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">Min Threshold</label>
                  <input type="number" className={inputCls} value={v.min_threshold} onChange={e => set('min_threshold', e.target.value)} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">Supplier</label>
                  <input className={inputCls} placeholder="e.g. ABC Roofing Supply" value={v.supplier} onChange={e => set('supplier', e.target.value)} />
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Linked Project</h3>
              <div className="bg-white p-5 border border-gray-100 rounded-xl shadow-sm">
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Project Assignment</label>
                <select className={selectCls} value={v.project_id} onChange={e => set('project_id', e.target.value)}>
                  <option value="">All Projects</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </section>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">Notes</label>
              <textarea className={`${inputCls} h-24 resize-none`} placeholder="Enter notes..." value={v.note} onChange={e => set('note', e.target.value)} />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-7 py-5 border-t border-gray-100 bg-white">
            <button onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-50 rounded-xl">Close</button>
            <button onClick={submit} disabled={saving || !v.name.trim()} className="px-6 py-2.5 text-sm font-bold text-white bg-[#0D1B2A] rounded-xl shadow-sm hover:bg-[#162437] disabled:opacity-50">
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
      <div className="fixed inset-0 bg-black/40 z-[100] backdrop-blur-[1px]" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-[101] flex">
        <div className="bg-white w-[480px] max-w-full h-full flex flex-col shadow-2xl">
          <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100 shrink-0">
            <h2 className="text-lg font-black text-gray-900">Log Usage</h2>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"><X size={18} /></button>
          </div>

          <div className="overflow-y-auto flex-1 px-7 py-7 bg-[#FCFCFD] space-y-6">
            <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400 border border-gray-100"><Package size={20} /></div>
              <div>
                <p className="text-sm font-black text-gray-900">{item.name}</p>
                <p className="text-xs font-bold text-gray-400">{item.sku} • {item.qty_on_hand} {item.unit_of_measure}s on hand</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-2">Action</label>
              <div className="flex gap-3">
                <button
                  onClick={() => setAction('used')}
                  className={`flex-1 py-3 rounded-xl border text-sm font-bold transition-colors ${action === 'used' ? 'bg-[#0D1B2A] text-white border-[#0D1B2A]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                >
                  Used / Consumed
                </button>
                <button
                  onClick={() => setAction('restocked')}
                  className={`flex-1 py-3 rounded-xl border text-sm font-bold transition-colors ${action === 'restocked' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                >
                  Restocked
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">Quantity ({item.unit_of_measure}s)</label>
              <input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} className={inputCls} />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">Project</label>
              <select className={selectCls} value={projectId} onChange={e => setProjectId(e.target.value)}>
                <option value="">Select Project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-7 py-5 border-t border-gray-100 bg-white">
            <button onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-50 rounded-xl">Cancel</button>
            <button onClick={submit} disabled={saving || !qty || parseInt(qty) <= 0} className="px-6 py-2.5 text-sm font-bold text-white bg-[#0D1B2A] rounded-xl shadow-sm hover:bg-[#162437] disabled:opacity-50">
              {saving ? 'Saving…' : 'Log Entry'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function ItemDetailSidebar({ item, usage, onClose, onEdit, onReorder }: { item: InventoryItemRow; usage: UsageLogRow[]; onClose: () => void; onEdit: () => void; onReorder: () => void }) {
  const status = computeStatus(item.qty_on_hand, item.min_threshold)
  const theme  = STATUS_THEMES[status]
  const ratio  = Math.min(100, (item.qty_on_hand / (item.min_threshold * 2 || 1)) * 100)
  const itemUsage = usage.filter(u => u.item_id === item.id).slice(0, 5)

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[100] backdrop-blur-[1px]" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-[101] flex">
        <div className="bg-white w-[540px] max-w-full h-full flex flex-col shadow-2xl">
          <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100 shrink-0">
            <h2 className="text-lg font-black text-gray-900">Item Details</h2>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"><X size={18} /></button>
          </div>

          <div className="overflow-y-auto flex-1 px-8 py-7 bg-[#FCFCFD] space-y-8">
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 border border-gray-100"><Package size={24} /></div>
                <div>
                  <h3 className="text-base font-black text-gray-900">{item.name}</h3>
                  <p className="text-xs font-bold text-gray-400">{item.sku}</p>
                </div>
              </div>
              <span className={`text-[10px] font-black px-2 py-1 rounded flex items-center gap-1.5 uppercase tracking-wider ${theme.bg} ${theme.text}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${theme.dot}`} /> {theme.label}
              </span>
            </div>

            <div>
              <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                <span>Current Stock Level</span>
                <span>Threshold: {item.min_threshold} {item.unit_of_measure}s</span>
              </div>
              <div className="bg-white p-4 border border-gray-100 rounded-xl shadow-sm">
                <div className="flex justify-between items-end mb-3">
                  <p className="text-2xl font-black text-gray-900">{item.qty_on_hand} <span className="text-sm font-bold text-gray-400">{item.unit_of_measure}s</span></p>
                  <span className="text-xs font-bold text-gray-500">Total Value: {fmtCurrency(item.qty_on_hand * item.unit_cost)}</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${theme.progress}`} style={{ width: `${ratio}%` }} />
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Item Information</h4>
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
                    <span className="text-gray-900 font-bold">{r.val}</span>
                  </div>
                ))}
              </div>
            </div>

            {itemUsage.length > 0 && (
              <div>
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Recent Usage</h4>
                <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                  {itemUsage.map(u => (
                    <div key={u.id} className="flex justify-between items-center px-5 py-4 border-b last:border-0 border-gray-50">
                      <div>
                        <p className="text-sm font-bold text-gray-900">{u.project_name ?? 'No Project'}</p>
                        <p className="text-xs font-medium text-gray-400 mt-0.5">{fmtDate(u.created_at)} • {u.user_name ?? 'System'}</p>
                      </div>
                      <span className={`text-xs font-black px-2 py-1 rounded ${u.action === 'used' ? 'text-red-600 bg-red-50' : 'text-emerald-600 bg-emerald-50'}`}>
                        {u.action === 'used' ? '-' : '+'}{Math.abs(u.qty_change)} {item.unit_of_measure}s
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="px-7 py-5 border-t border-gray-100 bg-white flex justify-end gap-3">
            <button onClick={onEdit} className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50 border border-gray-200 rounded-xl flex items-center gap-2"><Pencil size={14} /> Edit</button>
            <button onClick={onReorder} className="px-6 py-2.5 text-sm font-bold text-white bg-[#0D1B2A] rounded-xl shadow-sm flex items-center gap-2"><ShoppingCart size={16} /> Reorder PO</button>
          </div>
        </div>
      </div>
    </>
  )
}

function ConfirmDeleteModal({ item, onClose, onConfirm }: { item: InventoryItemRow; onClose: () => void; onConfirm: () => void }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[110]" onClick={onClose} />
      <div className="fixed inset-0 z-[111] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
          <div className="w-14 h-14 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-5 border border-red-100"><Trash2 size={24} /></div>
          <h3 className="text-lg font-black text-gray-900 mb-2">Delete Item</h3>
          <p className="text-sm text-gray-500 mb-8">Are you sure you want to delete <span className="font-bold text-gray-800">{item.name}</span>?<br />Stock history will be preserved for audit.</p>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={onConfirm} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-red-700">Delete</button>
          </div>
        </div>
      </div>
    </>
  )
}

function SuccessPopup({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[120]" onClick={onClose} />
      <div className="fixed inset-0 z-[121] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
          <div className="w-14 h-14 bg-emerald-500 rounded-xl flex items-center justify-center text-white mx-auto mb-5 shadow-md shadow-emerald-100"><Check size={30} strokeWidth={3} /></div>
          <h3 className="text-lg font-black text-gray-900 mb-1">{message}</h3>
          <p className="text-xs font-medium text-gray-400 mb-6">Inventory has been updated.</p>
          <button onClick={onClose} className="w-full py-2.5 bg-[#0D1B2A] text-white text-sm font-bold rounded-xl shadow-sm hover:bg-[#162437]">Done</button>
        </div>
      </div>
    </>
  )
}

// ─── Main Client Component ─────────────────────────────────────────────────────
interface Props {
  initialItems:  InventoryItemRow[]
  initialUsage:  UsageLogRow[]
  projects:      { id: string; name: string }[]
}

export function InventoryClient({ initialItems, initialUsage, projects }: Props) {
  const [items,      setItems]      = useState(initialItems)
  const [usage,      setUsage]      = useState(initialUsage)
  const [view,       setView]       = useState<'kanban' | 'list'>('kanban')
  const [tab,        setTab]        = useState<'items' | 'usage'>('items')
  const [modal,      setModal]      = useState<ModalState>({ type: 'none' })
  const [filterOpen, setFilterOpen] = useState(false)
  const [search,     setSearch]     = useState('')
  const [filterStatus, setFilterStatus] = useState<DbInventoryStatus[]>([])
  const [filterCat, setFilterCat]   = useState<string[]>([])
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
    if (search && !item.name.toLowerCase().includes(search.toLowerCase()) && !item.sku.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const categories = [...new Set(items.map(i => i.category))]

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
        const res = await updateInventoryItem(editing.id, input)
        if (!('error' in res)) {
          setItems(prev => prev.map(i => i.id === editing.id
            ? { ...i, ...input, project_name: projects.find(p => p.id === input.project_id)?.name ?? null }
            : i))
          setModal({ type: 'success', message: 'Item updated successfully' })
        }
      })
    } else {
      startTransition(async () => {
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
  const usageByDate = usage.reduce<Record<string, UsageLogRow[]>>((acc, u) => {
    const date = fmtDate(u.created_at)
    if (!acc[date]) acc[date] = []
    acc[date].push(u)
    return acc
  }, {})

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#F4F6F9]">
      {/* Header */}
      <div className="flex-none bg-white border-b border-gray-100 px-8 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight">Inventory</h1>
            <p className="text-gray-400 text-xs mt-0.5 font-medium">Track materials, stock levels, and purchase orders for all projects.</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-10">
        <div className="px-8 pt-6">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-5 mb-8">
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Total SKUs</span>
                <div className="w-7 h-7 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600"><Package size={14} /></div>
              </div>
              <p className="text-3xl font-black text-gray-900 mb-1">{totalSKUs}</p>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Items tracked</span>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Low Stock</span>
                <div className="w-7 h-7 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600"><TrendingDown size={14} /></div>
              </div>
              <p className="text-3xl font-black text-gray-900 mb-1">{lowStockCount}</p>
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Needs reorder</span>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Critical / Out</span>
                <div className="w-7 h-7 bg-red-50 rounded-lg flex items-center justify-center text-red-600"><AlertTriangle size={14} /></div>
              </div>
              <p className="text-3xl font-black text-gray-900 mb-1">{outOfStock}</p>
              <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">Immediate action</span>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Inventory Value</span>
                <div className="w-7 h-7 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600"><DollarSign size={14} /></div>
              </div>
              <p className="text-3xl font-black text-gray-900 mb-1">{fmtCurrency(totalValue)}</p>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">Total stock value</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 gap-6 mb-6">
            <button onClick={() => setTab('items')} className={`pb-3 text-sm font-bold border-b-2 -mb-px transition-colors ${tab === 'items' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
              Items <span className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px] ml-1">{totalSKUs}</span>
            </button>
            <button onClick={() => setTab('usage')} className={`pb-3 text-sm font-bold border-b-2 -mb-px transition-colors ${tab === 'usage' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
              Usage Log <span className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px] ml-1">{usage.length}</span>
            </button>
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="flex bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
                <button onClick={() => setView('kanban')} className={`p-1.5 rounded-md transition-colors ${view === 'kanban' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}><LayoutGrid size={16} /></button>
                <button onClick={() => setView('list')} className={`p-1.5 rounded-md transition-colors ${view === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}><List size={16} /></button>
              </div>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search inventory..." className="pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-xl bg-white w-64 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <button onClick={() => setFilterOpen(!filterOpen)} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 shadow-sm">
                  <Filter size={14} /> Filter {(filterStatus.length + filterCat.length) > 0 && <span className="w-4 h-4 bg-[#0D1B2A] text-white text-[9px] font-black rounded-full flex items-center justify-center">{filterStatus.length + filterCat.length}</span>}
                </button>
                {filterOpen && (
                  <div className="absolute right-0 top-11 w-72 bg-white border border-gray-100 rounded-xl shadow-xl z-20 p-5">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase mb-3">Filter By</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-bold text-gray-700 block mb-2">Stock Status</label>
                        <div className="flex flex-wrap gap-2">
                          {(['in_stock', 'low_stock', 'out_of_stock'] as DbInventoryStatus[]).map(s => {
                            const active = filterStatus.includes(s)
                            return (
                              <button
                                key={s}
                                onClick={() => setFilterStatus(prev => active ? prev.filter(x => x !== s) : [...prev, s])}
                                className={`px-2.5 py-1 text-[10px] font-bold rounded-full border transition-colors ${active ? 'bg-[#0D1B2A] text-white border-[#0D1B2A]' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                              >
                                {STATUS_THEMES[s].label}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-700 block mb-2">Category</label>
                        <div className="flex flex-wrap gap-2">
                          {categories.map(c => {
                            const active = filterCat.includes(c)
                            return (
                              <button
                                key={c}
                                onClick={() => setFilterCat(prev => active ? prev.filter(x => x !== c) : [...prev, c])}
                                className={`px-2.5 py-1 text-[10px] font-bold rounded-full border transition-colors ${active ? 'bg-[#0D1B2A] text-white border-[#0D1B2A]' : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-gray-100'}`}
                              >
                                {c}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 border-t border-gray-100 mt-4 pt-3">
                      <button onClick={() => { setFilterStatus([]); setFilterCat([]) }} className="px-3 py-1.5 text-xs font-bold text-gray-500">Clear</button>
                      <button onClick={() => setFilterOpen(false)} className="px-4 py-1.5 bg-[#0D1B2A] text-white text-xs font-bold rounded-lg shadow-sm">Apply</button>
                    </div>
                  </div>
                )}
              </div>
              <button onClick={() => setModal({ type: 'addItem' })} className="flex items-center gap-2 px-4 py-2 bg-[#0D1B2A] text-white text-xs font-bold rounded-xl shadow-sm hover:bg-[#162437] active:scale-95 transition-all">
                <Plus size={16} /> Add Item
              </button>
            </div>
          </div>

          {/* Items Tab */}
          {tab === 'items' && (
            <>
              {filteredItems.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 flex flex-col items-center text-center">
                  <Package size={40} className="text-gray-200 mb-4" />
                  <p className="text-sm font-bold text-gray-500">No inventory items found</p>
                  <p className="text-xs text-gray-400 mt-1">Add items to start tracking stock</p>
                </div>
              ) : view === 'kanban' ? (
                <div className="grid grid-cols-3 gap-6">
                  {(['in_stock', 'low_stock', 'out_of_stock'] as DbInventoryStatus[]).map(colStatus => {
                    const colItems = filteredItems.filter(i => computeStatus(i.qty_on_hand, i.min_threshold) === colStatus)
                    const theme = STATUS_THEMES[colStatus]
                    return (
                      <div key={colStatus} className="flex flex-col min-h-[400px]">
                        <div className={`flex items-center gap-2 mb-4 pb-2 border-b-2 ${theme.border}`}>
                          <div className={`w-2 h-2 rounded-full ${theme.dot}`} />
                          <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">{theme.label}</h3>
                          <span className="ml-auto bg-white border border-gray-100 px-1.5 py-0.5 rounded text-[10px] font-bold text-gray-500">{colItems.length}</span>
                        </div>
                        <div className="space-y-4">
                          {colItems.map(item => (
                            <KanbanCard
                              key={item.id}
                              item={item}
                              onView={() => setModal({ type: 'viewDetail', item })}
                              onEdit={() => setModal({ type: 'addItem', item })}
                              onLogUsage={() => setModal({ type: 'logUsage', item })}
                              onDelete={() => setModal({ type: 'deleteConfirm', item })}
                            />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[#F8F9FB] border-b border-gray-100">
                      <tr className="text-[10px] font-black uppercase tracking-wider text-gray-500">
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
                      {filteredItems.map(item => {
                        const status = computeStatus(item.qty_on_hand, item.min_threshold)
                        const theme  = STATUS_THEMES[status]
                        return (
                          <tr key={item.id} onClick={() => setModal({ type: 'viewDetail', item })} className="hover:bg-gray-50/50 cursor-pointer">
                            <td className="px-6 py-4 font-black text-gray-900">{item.name}</td>
                            <td className="px-6 py-4">{item.sku}</td>
                            <td className="px-6 py-4">{item.category}</td>
                            <td className="px-6 py-4 font-bold text-gray-900">{item.qty_on_hand}</td>
                            <td className="px-6 py-4">{item.min_threshold}</td>
                            <td className="px-6 py-4">{fmtCurrency(item.unit_cost)}</td>
                            <td className="px-6 py-4 font-bold text-gray-900">{fmtCurrency(item.qty_on_hand * item.unit_cost)}</td>
                            <td className="px-6 py-4 truncate max-w-[120px]">{item.supplier}</td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded border uppercase ${theme.bg} ${theme.text} ${theme.border}`}>
                                {theme.label}
                              </span>
                            </td>
                            <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                              <ActionMenu
                                onView={() => setModal({ type: 'viewDetail', item })}
                                onEdit={() => setModal({ type: 'addItem', item })}
                                onLogUsage={() => setModal({ type: 'logUsage', item })}
                                onDelete={() => setModal({ type: 'deleteConfirm', item })}
                              />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {filteredItems.length > 10 && (
                    <div className="flex items-center justify-between border-t border-gray-50 px-6 py-4 bg-white">
                      <button className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-bold text-gray-500 hover:bg-gray-50"><ChevronLeft size={14} /> Previous</button>
                      <span className="text-xs font-bold text-gray-500">Page 1</span>
                      <button className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-bold text-gray-500 hover:bg-gray-50">Next <ChevronRight size={14} /></button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Usage Log Tab */}
          {tab === 'usage' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {usage.length === 0 ? (
                <div className="p-16 flex flex-col items-center text-center">
                  <History size={40} className="text-gray-200 mb-4" />
                  <p className="text-sm font-bold text-gray-500">No usage logged yet</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#F8F9FB] border-b border-gray-100">
                    <tr className="text-[10px] font-black uppercase tracking-wider text-gray-500">
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
                          <td colSpan={7} className="px-6 py-2.5 font-black text-gray-500 text-[10px] tracking-wider uppercase">{date}</td>
                        </tr>
                        {dateRows.map(u => (
                          <tr key={u.id} className="hover:bg-gray-50/50">
                            <td className="px-6 py-4">{new Date(u.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</td>
                            <td className="px-6 py-4 font-black text-gray-900">{u.item_name}</td>
                            <td className="px-6 py-4 text-gray-400">{u.item_sku}</td>
                            <td className="px-6 py-4">
                              <span className={`px-1.5 py-0.5 rounded font-bold text-[9px] border uppercase ${u.action === 'used' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                {u.action === 'used' ? 'Used' : 'Restocked'}
                              </span>
                            </td>
                            <td className={`px-6 py-4 font-black ${u.qty_change < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
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
        <SuccessPopup message={modal.message} onClose={() => setModal({ type: 'none' })} />
      )}
    </div>
  )
}
