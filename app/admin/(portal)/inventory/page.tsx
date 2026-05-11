'use client'

import { useState, useRef, useEffect } from 'react'
import { 
   Search, Filter, Plus, MoreHorizontal, Package, AlertTriangle, 
   TrendingDown, DollarSign, LayoutGrid, List, ChevronLeft, ChevronRight,
   X, Check, Pencil, Eye, Trash2, FileText, ShoppingCart, History, AlertCircle
} from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────────
type InventoryStatus = 'In Stock' | 'Low Stock' | 'Out of Stock'

interface InventoryItem {
   id: string
   name: string
   sku: string
   category: string
   unitOfMeasure: string
   qtyOnHand: number
   minThreshold: number
   unitCost: number
   supplier: string
   status: InventoryStatus
   note?: string
}

type ModalState = 
   | { type: 'none' }
   | { type: 'addItem'; item?: InventoryItem }
   | { type: 'viewDetail'; item: InventoryItem }
   | { type: 'deleteConfirm'; item: InventoryItem }
   | { type: 'success'; message: string }

// ─── Mock Data ────────────────────────────────────────────────────────────────
const mockInventory: InventoryItem[] = [
   { id: '1', name: 'TPO Membrane 60-mil', sku: 'TPO-60-4X100', category: 'Membranes', unitOfMeasure: 'Roll', qtyOnHand: 22, minThreshold: 10, unitCost: 285, supplier: 'ABC Roofing Supply', status: 'In Stock' },
   { id: '2', name: 'EPDM Rubber Sheet', sku: 'EPDM-45-10', category: 'Membranes', unitOfMeasure: 'Roll', qtyOnHand: 4, minThreshold: 8, unitCost: 195, supplier: 'ABC Roofing Supply', status: 'Low Stock' },
   { id: '3', name: 'Step Flashing Galv', sku: 'FL-STEP-100', category: 'Flashings', unitOfMeasure: 'Box', qtyOnHand: 150, minThreshold: 50, unitCost: 4, supplier: 'BuildPro Materials', status: 'In Stock' },
   { id: '4', name: 'Valley Flashing W-Metal', sku: 'FL-VALLEY-10', category: 'Flashings', unitOfMeasure: 'Sheets', qtyOnHand: 5, minThreshold: 15, unitCost: 22, supplier: 'FastenerMaster', status: 'Low Stock' },
   { id: '5', name: 'Roofing Nails 1.25"', sku: 'FT-NAIL-125', category: 'Fasteners', unitOfMeasure: 'Box', qtyOnHand: 35, minThreshold: 20, unitCost: 18, supplier: 'SafeWork Pro', status: 'In Stock' },
   { id: '6', name: 'Screw Cap Fasteners', sku: 'FT-CAP-1', category: 'Fasteners', unitOfMeasure: 'Box', qtyOnHand: 0, minThreshold: 10, unitCost: 24, supplier: 'ABC Roofing Supply', status: 'Out of Stock' },
   { id: '7', name: 'TPO Bonding Adhesive', sku: 'ADH-TPO-5G', category: 'Tools', unitOfMeasure: 'Tube', qtyOnHand: 11, minThreshold: 8, unitCost: 145, supplier: 'BuildPro Materials', status: 'In Stock' },
]

const statusThemes: Record<InventoryStatus, { border: string; bg: string; text: string; dot: string; progress: string }> = {
   'In Stock': { border: 'border-emerald-100', bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-500', progress: 'bg-emerald-500' },
   'Low Stock': { border: 'border-amber-100', bg: 'bg-amber-50', text: 'text-amber-600', dot: 'bg-amber-500', progress: 'bg-amber-500' },
   'Out of Stock': { border: 'border-red-100', bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-500', progress: 'bg-red-500' },
}

const inputCls = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
const selectCls = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all"

// ─── Components ────────────────────────────────────────────────────────────────
function StatDeck() {
   return (
      <div className="grid grid-cols-4 gap-5 mb-8">
         <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
            <div className="flex justify-between items-start mb-3">
               <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Total SKUs</span>
               <div className="w-7 h-7 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600"><Package size={14} /></div>
            </div>
            <p className="text-3xl font-black text-gray-900 mb-1">14</p>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Items tracked</span>
         </div>
         <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
            <div className="flex justify-between items-start mb-3">
               <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Low Stock</span>
               <div className="w-7 h-7 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600"><TrendingDown size={14} /></div>
            </div>
            <p className="text-3xl font-black text-gray-900 mb-1">5</p>
            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Needs reorder</span>
         </div>
         <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
            <div className="flex justify-between items-start mb-3">
               <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Critical / Out</span>
               <div className="w-7 h-7 bg-red-50 rounded-lg flex items-center justify-center text-red-600"><AlertTriangle size={14} /></div>
            </div>
            <p className="text-3xl font-black text-gray-900 mb-1">1</p>
            <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">Immediate action</span>
         </div>
         <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
            <div className="flex justify-between items-start mb-3">
               <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Inventory Value</span>
               <div className="w-7 h-7 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600"><DollarSign size={14} /></div>
            </div>
            <p className="text-3xl font-black text-gray-900 mb-1">$18,804</p>
            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">Total stock value</span>
         </div>
      </div>
   )
}

function ActionMenu({ onView, onEdit, onCreatePO, onLogUsage, onDelete }: any) {
   const [open, setOpen] = useState(false)
   const ref = useRef<HTMLDivElement>(null)
   useEffect(() => {
      const h = (e: MouseEvent) => { if(ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
      document.addEventListener('mousedown', h)
      return () => document.removeEventListener('mousedown', h)
   }, [])
   return (
      <div ref={ref} className="relative">
         <button onClick={(e) => {e.stopPropagation(); setOpen(!open)}} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-400 transition-colors">
            <MoreHorizontal size={14} />
         </button>
         {open && (
            <div className="absolute right-0 top-8 w-40 bg-white border border-gray-100 rounded-xl shadow-xl z-30 py-1 animate-in fade-in zoom-in-95 duration-100">
               <button onClick={(e) => { e.stopPropagation(); setOpen(false); onView() }} className="w-full text-left px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2"><Eye size={14} className="text-gray-400"/> View Detail</button>
               <button onClick={(e) => { e.stopPropagation(); setOpen(false); onEdit() }} className="w-full text-left px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2"><Pencil size={14} className="text-gray-400"/> Edit</button>
               <button onClick={(e) => { e.stopPropagation(); setOpen(false); onCreatePO() }} className="w-full text-left px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2"><ShoppingCart size={14} className="text-gray-400"/> Create PO</button>
               <button onClick={(e) => { e.stopPropagation(); setOpen(false); onLogUsage() }} className="w-full text-left px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2"><History size={14} className="text-gray-400"/> Log Usage</button>
               <div className="border-t border-gray-50 my-1"/>
               <button onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete() }} className="w-full text-left px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 size={14} /> Delete</button>
            </div>
         )}
      </div>
   )
}

function KanbanCard({ item, theme, actions }: { item: InventoryItem, theme: any, actions: any }) {
   const ratio = Math.min(100, (item.qtyOnHand / (item.minThreshold * 2)) * 100)
   return (
      <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-all group">
         <div className="flex items-start justify-between mb-3">
            <div>
               <h4 className="text-sm font-black text-gray-900 leading-tight">{item.name}</h4>
               <p className="text-[10px] font-bold text-gray-400 mt-0.5">{item.sku}</p>
            </div>
            <ActionMenu {...actions} />
         </div>
         <div className="flex items-center justify-between mb-3">
            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded flex items-center gap-1 ${theme.bg} ${theme.text} uppercase`}>
               <div className={`w-1 h-1 rounded-full ${theme.dot}`} /> {item.status}
            </span>
         </div>
         <div className="grid grid-cols-2 gap-y-2 text-[11px] font-medium text-gray-500 mb-4">
            <div>Category:</div><div className="text-gray-900 font-bold text-right">{item.category}</div>
            <div>Qty on Hand:</div><div className="text-gray-900 font-bold text-right">{item.qtyOnHand} {item.unitOfMeasure}s</div>
            <div>Unit Cost:</div><div className="text-gray-900 font-bold text-right">${item.unitCost}</div>
            <div>Supplier:</div><div className="text-gray-900 font-bold text-right truncate">{item.supplier}</div>
         </div>
         <div className="pt-3 border-t border-gray-50">
            <div className="flex justify-between items-center text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1.5">
               <span>Stock level</span>
               <span>Min: {item.minThreshold}</span>
            </div>
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
               <div className={`h-full ${theme.progress}`} style={{ width: `${ratio}%` }} />
            </div>
         </div>
      </div>
   )
}

// ─── Drawer Modules ──────────────────────────────────────────────────────────
function ItemFormSidebar({ item, onClose, onSave }: { item?: InventoryItem; onClose: () => void; onSave: () => void }) {
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
                           <input className={inputCls} placeholder="eg TPO Membrane 60-mil" defaultValue={item?.name} />
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-gray-600 mb-1.5">SKU / Code</label>
                           <input className={inputCls} placeholder="eg TPO-60-4X100" defaultValue={item?.sku} />
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-gray-600 mb-1.5">Category</label>
                           <select className={selectCls} defaultValue={item?.category}>
                              <option>Membranes</option>
                              <option>Flashings</option>
                              <option>Fasteners</option>
                              <option>Tools</option>
                           </select>
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-gray-600 mb-1.5">Unit of Measure</label>
                           <select className={selectCls} defaultValue={item?.unitOfMeasure}>
                              <option>Roll</option>
                              <option>Sheets</option>
                              <option>Box</option>
                              <option>Tube</option>
                           </select>
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-gray-600 mb-1.5">Unit Cost ($)</label>
                           <input type="number" className={inputCls} placeholder="0.00" defaultValue={item?.unitCost} />
                        </div>
                     </div>
                  </section>
                  
                  <section>
                     <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Stock</h3>
                     <div className="grid grid-cols-2 gap-4 bg-white p-5 border border-gray-100 rounded-xl shadow-sm">
                        <div>
                           <label className="block text-xs font-bold text-gray-600 mb-1.5">Qty on Hand</label>
                           <input type="number" className={inputCls} defaultValue={item?.qtyOnHand} />
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-gray-600 mb-1.5">Min Threshold</label>
                           <input type="number" className={inputCls} defaultValue={item?.minThreshold} />
                        </div>
                        <div className="col-span-2">
                           <label className="block text-xs font-bold text-gray-600 mb-1.5">Supplier</label>
                           <input className={inputCls} placeholder="e.g. ABC Roofing Supply" defaultValue={item?.supplier} />
                        </div>
                     </div>
                  </section>

                  <section>
                     <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Linked Project</h3>
                     <div className="bg-white p-5 border border-gray-100 rounded-xl shadow-sm">
                        <label className="block text-xs font-bold text-gray-600 mb-1.5">Project Assignment</label>
                        <select className={selectCls}>
                           <option>All Projects</option>
                           <option>Metro Commercial Flat</option>
                           <option>Oakdale Residential</option>
                        </select>
                     </div>
                  </section>

                  <div>
                     <label className="block text-xs font-bold text-gray-600 mb-1.5">Notes</label>
                     <textarea className={`${inputCls} h-24 resize-none`} placeholder="Enter text..." defaultValue={item?.note} />
                  </div>
               </div>
               <div className="flex items-center justify-end gap-3 px-7 py-5 border-t border-gray-100 bg-white">
                  <button onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-50 rounded-xl">Close</button>
                  <button onClick={onSave} className="px-6 py-2.5 text-sm font-bold text-white bg-[#0D1B2A] rounded-xl shadow-sm hover:bg-[#162437]">Save Item</button>
               </div>
            </div>
         </div>
      </>
   )
}

function ItemDetailSidebar({ item, onClose }: { item: InventoryItem; onClose: () => void }) {
   const theme = statusThemes[item.status]
   const ratio = Math.min(100, (item.qtyOnHand / (item.minThreshold * 2)) * 100)

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
                        <div className={`w-1.5 h-1.5 rounded-full ${theme.dot}`} /> {item.status}
                     </span>
                  </div>

                  <div>
                     <div className="flex justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                        <span>Current Stock Level</span>
                        <span>Threshold: {item.minThreshold} {item.unitOfMeasure}s</span>
                     </div>
                     <div className="bg-white p-4 border border-gray-100 rounded-xl shadow-sm">
                        <div className="flex justify-between items-end mb-3">
                           <p className="text-2xl font-black text-gray-900">{item.qtyOnHand} <span className="text-sm font-bold text-gray-400">{item.unitOfMeasure}s</span></p>
                           <span className="text-xs font-bold text-gray-500">Total Value: ${(item.qtyOnHand * item.unitCost).toLocaleString()}</span>
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
                           { label: 'Category', val: item.category },
                           { label: 'Unit', val: item.unitOfMeasure },
                           { label: 'Unit Cost', val: `$${item.unitCost}` },
                           { label: 'Supplier', val: item.supplier },
                           { label: 'Linked Project', val: 'Metro Commercial Flat' },
                        ].map(r => (
                           <div key={r.label} className="flex justify-between items-center px-5 py-3 text-sm">
                              <span className="text-gray-500 font-medium">{r.label}</span>
                              <span className="text-gray-900 font-bold">{r.val}</span>
                           </div>
                        ))}
                     </div>
                  </div>

                  <div>
                     <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Recent Usage</h4>
                     <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                        {[
                           { proj: 'Metro Commercial Flat', date: 'Apr 15, 2026', log: 'John Doe', chg: '1 Used' },
                           { proj: 'Metro Commercial Flat', date: 'Apr 15, 2026', log: 'John Doe', chg: '1 Used' },
                           { proj: 'Metro Commercial Flat', date: 'Apr 14, 2026', log: 'John Doe', chg: '6 Used' },
                        ].map((u, i) => (
                           <div key={i} className="flex justify-between items-center px-5 py-4 border-b last:border-0 border-gray-50">
                              <div>
                                 <p className="text-sm font-bold text-gray-900">{u.proj}</p>
                                 <p className="text-xs font-medium text-gray-400 mt-0.5">{u.date} • {u.log}</p>
                              </div>
                              <span className="text-xs font-black text-gray-700 bg-gray-50 px-2 py-1 rounded">{u.chg}</span>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
               <div className="px-7 py-5 border-t border-gray-100 bg-white flex justify-end gap-3">
                  <button onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-50 rounded-xl">Close</button>
                  <button className="px-6 py-2.5 text-sm font-bold text-white bg-[#0D1B2A] rounded-xl shadow-sm flex items-center gap-2"><ShoppingCart size={16}/> Reorder PO</button>
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
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center animate-in zoom-in-95 duration-200">
               <div className="w-14 h-14 bg-emerald-500 rounded-xl flex items-center justify-center text-white mx-auto mb-5 shadow-md shadow-emerald-100"><Check size={30} strokeWidth={3} /></div>
               <h3 className="text-lg font-black text-gray-900 mb-1">{message}</h3>
               <p className="text-xs font-medium text-gray-400 mb-6">The item inventory has been registered.</p>
               <button onClick={onClose} className="w-full py-2.5 bg-[#0D1B2A] text-white text-sm font-bold rounded-xl shadow-sm hover:bg-[#162437]">Dismiss</button>
            </div>
         </div>
      </>
   )
}

function ConfirmDeleteModal({ item, onClose, onConfirm }: any) {
   return (
      <>
         <div className="fixed inset-0 bg-black/50 z-[110]" onClick={onClose} />
         <div className="fixed inset-0 z-[111] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
               <div className="w-14 h-14 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-5 border border-red-100"><Trash2 size={24} /></div>
               <h3 className="text-lg font-black text-gray-900 mb-2">Delete Item</h3>
               <p className="text-sm text-gray-500 mb-8">Are you sure you want to delete <span className="font-bold text-gray-800">{item.name}</span>?<br/>Stock history will be preserved for audit.</p>
               <div className="flex gap-3">
                  <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50">Cancel</button>
                  <button onClick={onConfirm} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-red-700">Delete</button>
               </div>
            </div>
         </div>
      </>
   )
}

// ─── Main View Component ────────────────────────────────────────────────────
export default function InventoryPage() {
   const [view, setView] = useState<'kanban' | 'list'>('kanban')
   const [tab, setTab] = useState<'items' | 'po' | 'usage'>('items')
   const [modal, setModal] = useState<ModalState>({ type: 'none' })
   const [filterOpen, setFilterOpen] = useState(false)

   const handleSave = () => {
      setModal({ type: 'success', message: 'Item added successfully' })
   }

   return (
      <div className="flex flex-col h-full overflow-hidden bg-[#F4F6F9]">
         {/* Header */}
         <div className="flex-none bg-white border-b border-gray-100 px-8 py-5">
            <div className="flex items-center justify-between">
               <div>
                  <h1 className="text-xl font-black text-gray-900 tracking-tight">Inventory</h1>
                  <p className="text-gray-400 text-xs mt-0.5 font-medium">Track materials, stock levels, and purchase orders for all projects.</p>
               </div>
               <div className="flex items-center gap-3">
                  <div className="text-right">
                     <p className="text-sm font-extrabold text-gray-900">John Doe</p>
                     <p className="text-[11px] text-gray-400">john.doe@peakroofing.com</p>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xs font-black ring-2 ring-white shadow-sm">JD</div>
               </div>
            </div>
         </div>

         <div className="flex-1 overflow-y-auto pb-10">
            <div className="px-8 pt-6">
               <StatDeck />

               {/* View Selector Tab Line */}
               <div className="flex border-b border-gray-200 gap-6 mb-6">
                  <button onClick={() => setTab('items')} className={`pb-3 text-sm font-bold border-b-2 -mb-px transition-colors ${tab === 'items' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>Items <span className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px] ml-1">14</span></button>
                  <button onClick={() => setTab('po')} className={`pb-3 text-sm font-bold border-b-2 -mb-px transition-colors ${tab === 'po' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>Purchase Orders <span className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px] ml-1">4</span></button>
                  <button onClick={() => setTab('usage')} className={`pb-3 text-sm font-bold border-b-2 -mb-px transition-colors ${tab === 'usage' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>Usage Log</button>
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
                        <input placeholder="Search inventory..." className="pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-xl bg-white w-64 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10" />
                     </div>
                  </div>
                  <div className="flex items-center gap-3">
                     <div className="relative">
                        <button onClick={() => setFilterOpen(!filterOpen)} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 shadow-sm">
                           <Filter size={14} /> Filter
                        </button>
                        {filterOpen && (
                           <div className="absolute right-0 top-11 w-72 bg-white border border-gray-100 rounded-xl shadow-xl z-20 p-5 animate-in fade-in slide-in-from-top-2">
                              <h4 className="text-[10px] font-black text-gray-400 uppercase mb-3">Filter By</h4>
                              <div className="space-y-4">
                                 <div>
                                    <label className="text-xs font-bold text-gray-700 block mb-2">Stock Status</label>
                                    <div className="flex flex-wrap gap-2">
                                       {['In Stock', 'Low Stock', 'Out of Stock'].map(s => (
                                          <button key={s} className="px-2.5 py-1 text-[10px] font-bold rounded-full border border-gray-200 bg-white hover:border-blue-500">{s}</button>
                                       ))}
                                    </div>
                                 </div>
                                 <div>
                                    <label className="text-xs font-bold text-gray-700 block mb-2">Category</label>
                                    <div className="flex flex-wrap gap-2">
                                       {['Membranes', 'Flashings', 'Fasteners', 'Tools'].map(c => (
                                          <button key={c} className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-gray-50 text-gray-600 hover:bg-gray-100">{c}</button>
                                       ))}
                                    </div>
                                 </div>
                              </div>
                              <div className="flex justify-end gap-2 border-t border-gray-100 mt-4 pt-3">
                                 <button onClick={() => setFilterOpen(false)} className="px-3 py-1.5 text-xs font-bold text-gray-500">Clear</button>
                                 <button onClick={() => setFilterOpen(false)} className="px-4 py-1.5 bg-[#0D1B2A] text-white text-xs font-bold rounded-lg shadow-sm">Apply</button>
                              </div>
                           </div>
                        )}
                     </div>
                     <button onClick={() => setModal({ type: 'addItem' })} className="flex items-center gap-2 px-4 py-2 bg-[#0D1B2A] text-white text-xs font-bold rounded-xl shadow-sm hover:bg-[#162437] transition-all active:scale-95">
                        <Plus size={16} /> Add Item
                     </button>
                  </div>
               </div>

               {/* Main Layout Viewports */}
               {tab === 'items' && (
                  <>
                     {view === 'kanban' ? (
                        <div className="grid grid-cols-3 gap-6">
                           {(['In Stock', 'Low Stock', 'Out of Stock'] as InventoryStatus[]).map(colStatus => {
                              const colTheme = statusThemes[colStatus]
                              const colItems = mockInventory.filter(i => i.status === colStatus)
                              return (
                                 <div key={colStatus} className="flex flex-col min-h-[400px]">
                                    <div className={`flex items-center gap-2 mb-4 pb-2 border-b-2 ${colTheme.border}`}>
                                       <div className={`w-2 h-2 rounded-full ${colTheme.dot}`} />
                                       <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">{colStatus}</h3>
                                       <span className="ml-auto bg-white border border-gray-100 px-1.5 py-0.5 rounded text-[10px] font-bold text-gray-500">{colItems.length}</span>
                                    </div>
                                    <div className="space-y-4">
                                       {colItems.map(item => (
                                          <KanbanCard 
                                             key={item.id} 
                                             item={item} 
                                             theme={colTheme} 
                                             actions={{
                                                onView: () => setModal({ type: 'viewDetail', item }),
                                                onEdit: () => setModal({ type: 'addItem', item }),
                                                onCreatePO: () => console.log('PO'),
                                                onLogUsage: () => console.log('Log'),
                                                onDelete: () => setModal({ type: 'deleteConfirm', item })
                                             }} 
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
                                 {mockInventory.map(item => {
                                    const theme = statusThemes[item.status]
                                    return (
                                       <tr key={item.id} onClick={() => setModal({ type: 'viewDetail', item })} className="hover:bg-gray-50/50 transition-colors cursor-pointer group">
                                          <td className="px-6 py-4 font-black text-gray-900">{item.name}</td>
                                          <td className="px-6 py-4">{item.sku}</td>
                                          <td className="px-6 py-4">{item.category}</td>
                                          <td className="px-6 py-4 font-bold text-gray-900">{item.qtyOnHand}</td>
                                          <td className="px-6 py-4">{item.minThreshold}</td>
                                          <td className="px-6 py-4">${item.unitCost}</td>
                                          <td className="px-6 py-4 font-bold text-gray-900">${(item.qtyOnHand * item.unitCost).toLocaleString()}</td>
                                          <td className="px-6 py-4 truncate max-w-[120px]">{item.supplier}</td>
                                          <td className="px-6 py-4">
                                             <span className={`inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded border uppercase ${theme.bg} ${theme.text} ${theme.border}`}>
                                                {item.status}
                                             </span>
                                          </td>
                                          <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                                             <ActionMenu 
                                                onView={() => setModal({ type: 'viewDetail', item })}
                                                onEdit={() => setModal({ type: 'addItem', item })}
                                                onCreatePO={() => console.log('PO')}
                                                onLogUsage={() => console.log('Log')}
                                                onDelete={() => setModal({ type: 'deleteConfirm', item })}
                                             />
                                          </td>
                                       </tr>
                                    )
                                 })}
                              </tbody>
                           </table>
                           {/* Pagination */}
                           <div className="flex items-center justify-between border-t border-gray-50 px-6 py-4 bg-white">
                              <button className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-bold text-gray-500 hover:bg-gray-50 transition-colors"><ChevronLeft size={14}/> Previous</button>
                              <div className="flex items-center gap-1 text-xs font-bold text-gray-500">
                                 <span className="w-7 h-7 flex items-center justify-center bg-[#0D1B2A] text-white rounded-lg">1</span>
                                 <span className="w-7 h-7 flex items-center justify-center hover:bg-gray-50 rounded-lg cursor-pointer">2</span>
                                 <span className="px-1">...</span>
                                 <span className="w-7 h-7 flex items-center justify-center hover:bg-gray-50 rounded-lg cursor-pointer">10</span>
                              </div>
                              <button className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-bold text-gray-500 hover:bg-gray-50 transition-colors">Next <ChevronRight size={14}/></button>
                           </div>
                        </div>
                     )}
                  </>
               )}

               {tab === 'po' && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                     <table className="w-full text-left border-collapse">
                        <thead className="bg-[#F8F9FB] border-b border-gray-100">
                           <tr className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                              <th className="px-6 py-4">PO #</th>
                              <th className="px-6 py-4">Supplier</th>
                              <th className="px-6 py-4">Linked Project</th>
                              <th className="px-6 py-4">Items</th>
                              <th className="px-6 py-4">Total</th>
                              <th className="px-6 py-4">Ordered By</th>
                              <th className="px-6 py-4">Order Date</th>
                              <th className="px-6 py-4">Expected</th>
                              <th className="px-6 py-4">Status</th>
                              <th className="px-6 py-4 text-center">Actions</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-xs font-medium text-gray-600">
                           {[
                              { no: 'PO-2026-141', sup: 'ABC Roofing Supply', proj: 'PRJ-2026-88', items: '5 Items', tot: '$4,125', by: 'John Doe', date: 'Apr 9, 2026', exp: 'Apr 12, 2026', stat: 'Sent' },
                              { no: 'PO-2026-139', sup: 'SafeWork Pro', proj: 'PRJ-2026-86', items: '1 Item', tot: '$1,712', by: 'Jane Smith', date: 'Apr 8, 2026', exp: 'Apr 10, 2026', stat: 'Partial' },
                              { no: 'PO-2026-134', sup: 'ABC Roofing Supply', proj: 'PRJ-2026-85', items: '4 Items', tot: '$8,268', by: 'John Doe', date: 'Apr 5, 2026', exp: 'Apr 8, 2026', stat: 'Received' },
                              { no: 'PO-2026-142', sup: 'SafeWork Pro', proj: 'PRJ-2026-88', items: '2 Items', tot: '$780', by: 'Carlos Rivera', date: 'Apr 9, 2026', exp: 'Apr 12, 2026', stat: 'Sent' },
                           ].map((po, i) => {
                              let badge = 'bg-blue-50 text-blue-600 border-blue-100'
                              if (po.stat === 'Partial') badge = 'bg-amber-50 text-amber-600 border-amber-100'
                              if (po.stat === 'Received') badge = 'bg-emerald-50 text-emerald-600 border-emerald-100'
                              return (
                                 <tr key={i} className="hover:bg-gray-50/50 transition-colors cursor-pointer">
                                    <td className="px-6 py-4 font-black text-gray-900">{po.no}</td>
                                    <td className="px-6 py-4 font-bold text-gray-700">{po.sup}</td>
                                    <td className="px-6 py-4">{po.proj}</td>
                                    <td className="px-6 py-4">{po.items}</td>
                                    <td className="px-6 py-4 font-bold text-gray-900">{po.tot}</td>
                                    <td className="px-6 py-4">{po.by}</td>
                                    <td className="px-6 py-4 text-gray-400">{po.date}</td>
                                    <td className="px-6 py-4 text-gray-400">{po.exp}</td>
                                    <td className="px-6 py-4">
                                       <span className={`inline-flex items-center text-[9px] font-black px-1.5 py-0.5 rounded border uppercase ${badge}`}>{po.stat}</span>
                                    </td>
                                    <td className="px-6 py-4 text-center text-gray-400"><MoreHorizontal size={14} className="inline" /></td>
                                 </tr>
                              )
                           })}
                        </tbody>
                     </table>
                  </div>
               )}

               {tab === 'usage' && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                     <table className="w-full text-left border-collapse">
                        <thead className="bg-[#F8F9FB] border-b border-gray-100">
                           <tr className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                              <th className="px-6 py-4">Date & Time</th>
                              <th className="px-6 py-4">Item</th>
                              <th className="px-6 py-4">SKU</th>
                              <th className="px-6 py-4">Action</th>
                              <th className="px-6 py-4">Qty Change</th>
                              <th className="px-6 py-4">Project</th>
                              <th className="px-6 py-4">Logged By</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-xs font-medium text-gray-600">
                           {/* Header Group 1 */}
                           <tr className="bg-gray-50/80">
                              <td colSpan={7} className="px-6 py-2.5 font-black text-gray-500 text-[10px] tracking-wider uppercase bg-[#F0F2F5]">Today — Apr 9, 2026</td>
                           </tr>
                           <tr className="hover:bg-gray-50/50">
                              <td className="px-6 py-4">10:14 AM</td>
                              <td className="px-6 py-4 font-black text-gray-900">TPO Membrane 60-mil</td>
                              <td className="px-6 py-4 text-gray-400">TPO-60-4X100</td>
                              <td className="px-6 py-4"><span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-bold text-[9px] border border-emerald-100">Used</span></td>
                              <td className="px-6 py-4 font-black text-red-500">-4 Rolls</td>
                              <td className="px-6 py-4">PRJ-2026-88</td>
                              <td className="px-6 py-4">John Doe</td>
                           </tr>
                           <tr className="hover:bg-gray-50/50">
                              <td className="px-6 py-4">09:00 AM</td>
                              <td className="px-6 py-4 font-black text-gray-900">Screw Cap Fasteners</td>
                              <td className="px-6 py-4 text-gray-400">FT-CAP-1</td>
                              <td className="px-6 py-4"><span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold text-[9px] border border-blue-100">Restocked</span></td>
                              <td className="px-6 py-4 font-black text-emerald-600">+8 Boxes</td>
                              <td className="px-6 py-4">PRJ-2026-88</td>
                              <td className="px-6 py-4">Jane Smith</td>
                           </tr>
                           {/* Header Group 2 */}
                           <tr className="bg-gray-50/80">
                              <td colSpan={7} className="px-6 py-2.5 font-black text-gray-500 text-[10px] tracking-wider uppercase bg-[#F0F2F5]">Yesterday — Apr 8, 2026</td>
                           </tr>
                           <tr className="hover:bg-gray-50/50">
                              <td className="px-6 py-4">02:45 PM</td>
                              <td className="px-6 py-4 font-black text-gray-900">EPDM Rubber Sheet</td>
                              <td className="px-6 py-4 text-gray-400">EPDM-45-10</td>
                              <td className="px-6 py-4"><span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-bold text-[9px] border border-emerald-100">Used</span></td>
                              <td className="px-6 py-4 font-black text-red-500">-2 Rolls</td>
                              <td className="px-6 py-4">PRJ-2026-86</td>
                              <td className="px-6 py-4">John Doe</td>
                           </tr>
                           <tr className="hover:bg-gray-50/50">
                              <td className="px-6 py-4">11:30 AM</td>
                              <td className="px-6 py-4 font-black text-gray-900">Roofing Nails 1.25"</td>
                              <td className="px-6 py-4 text-gray-400">FT-NAIL-125</td>
                              <td className="px-6 py-4"><span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-bold text-[9px] border border-emerald-100">Used</span></td>
                              <td className="px-6 py-4 font-black text-red-500">-8 Boxes</td>
                              <td className="px-6 py-4">PRJ-2026-85</td>
                              <td className="px-6 py-4">Jane Smith</td>
                           </tr>
                        </tbody>
                     </table>
                  </div>
               )}
            </div>
         </div>

         {/* Overlay Modal Stack */}
         {(modal.type === 'addItem') && (
            <ItemFormSidebar 
               item={modal.item}
               onClose={() => setModal({ type: 'none' })}
               onSave={handleSave}
            />
         )}
         {(modal.type === 'viewDetail') && (
            <ItemDetailSidebar 
               item={modal.item}
               onClose={() => setModal({ type: 'none' })}
            />
         )}
         {(modal.type === 'deleteConfirm') && (
            <ConfirmDeleteModal 
               item={modal.item}
               onClose={() => setModal({ type: 'none' })}
               onConfirm={() => setModal({ type: 'none' })}
            />
         )}
         {(modal.type === 'success') && (
            <SuccessPopup 
               message={modal.message}
               onClose={() => setModal({ type: 'none' })}
            />
         )}
      </div>
   )
}
