'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Search, Filter as FilterIcon, Plus, X, Check, MoreHorizontal, Trash2,
  Eye, Pencil, List as ListIcon, ChevronDown, FileText,
  Download, Printer, Share2, Copy, Mail, ArrowUpRight,
  Calendar, DollarSign, Building, User, CreditCard, History, TrendingUp
} from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────────
type InvoiceStatus = 'Paid' | 'Overdue' | 'Draft' | 'Sent' | 'Partial'
type RecurringFreq = 'Monthly' | 'Quarterly' | 'Annual'
type PaymentMethod = 'Bank Transfer' | 'Check' | 'Card'

interface InvoiceItem {
  id: number
  description: string
  qty: number
  rate: number
}

interface Invoice {
  id: string
  clientName: string
  clientCompany: string
  clientEmail: string
  project: string
  issuedDate: string
  dueDate: string
  status: InvoiceStatus
  items: InvoiceItem[]
  tax: number
  avatarColor: string
  notes?: string
  amount?: number
}

interface RecurringPlan {
  id: string
  clientName: string
  clientCompany: string
  description: string
  amount: number
  frequency: RecurringFreq
  nextDate: string
  status: 'Active' | 'Stopped'
  avatarColor: string
}

interface PaymentRecord {
  id: string
  date: string
  invoiceId: string
  clientName: string
  clientCompany: string
  method: PaymentMethod
  amount: number
  reference: string
  status: 'Cleared' | 'Pending'
  avatarColor: string
}

type ModalState = 
  | { type: 'none' }
  | { type: 'newInvoice'; invoice?: Invoice }
  | { type: 'viewInvoice'; invoice: Invoice }
  | { type: 'newRecurring'; recurring?: RecurringPlan }
  | { type: 'success'; title: string }

// ─── Constants & Mock Data ───────────────────────────────────────────────────
const STATUSES: InvoiceStatus[] = ['Draft', 'Sent', 'Paid', 'Overdue', 'Partial']

const mockInvoices: Invoice[] = [
  {
    id: 'INV-2038',
    clientName: 'Metro Corp',
    clientCompany: 'Metro Commercial Flat',
    clientEmail: 'finance@metrocorp.com',
    project: 'Highland Tearoff',
    issuedDate: 'Dec 29, 2025',
    dueDate: 'Mar 19, 2026',
    status: 'Overdue',
    avatarColor: '#3B82F6',
    tax: 8,
    items: [
      { id: 1, description: 'Full tearoff & overlay', qty: 1, rate: 45000 },
      { id: 2, description: 'Cleanup & disposal', qty: 1, rate: 8000 },
    ]
  },
  {
    id: 'INV-2039',
    clientName: 'Johnson Family',
    clientCompany: 'Johnson Residential',
    clientEmail: 'rjohnson@gmail.com',
    project: 'Roof Replacement',
    issuedDate: 'Dec 29, 2025',
    dueDate: 'May 3, 2026',
    status: 'Partial',
    avatarColor: '#8B5CF6',
    tax: 8,
    items: [
      { id: 1, description: 'Shingle replacement', qty: 1, rate: 14000 },
    ]
  },
  {
    id: 'INV-2040',
    clientName: 'GV Properties',
    clientCompany: 'Green Valley Office',
    clientEmail: 'ap@gvprops.com',
    project: 'Gutters Installation',
    issuedDate: 'Dec 29, 2025',
    dueDate: 'May 3, 2026',
    status: 'Paid',
    avatarColor: '#10B981',
    tax: 8,
    items: [
      { id: 1, description: 'Gutters & Downspouts', qty: 1, rate: 6500 },
    ]
  },
  {
    id: 'INV-2041',
    clientName: 'Summerlin Dev',
    clientCompany: 'Summerlin Dev',
    clientEmail: 'billing@summerlin.com',
    project: 'Phase 2 Construction',
    issuedDate: 'Dec 29, 2025',
    dueDate: 'May 3, 2026',
    status: 'Overdue',
    avatarColor: '#EF4444',
    tax: 8,
    items: [
      { id: 1, description: 'Underlayment & waterproofing', qty: 1, rate: 22000 },
    ]
  },
  {
    id: 'INV-2042',
    clientName: 'Rivera LLC',
    clientCompany: 'Rivera Building',
    clientEmail: 'support@riverallc.com',
    project: 'Skylight Install',
    issuedDate: 'Dec 12, 2025',
    dueDate: 'Mar 3, 2026',
    status: 'Sent',
    avatarColor: '#F59E0B',
    tax: 8,
    items: [
      { id: 1, description: 'Standard Skylights x4', qty: 4, rate: 1200 },
    ]
  },
  {
    id: 'INV-2043',
    clientName: 'Johnson Family',
    clientCompany: 'Johnson Residential',
    clientEmail: 'rjohnson@gmail.com',
    project: 'Emergency Repair',
    issuedDate: 'Aug 21, 2025',
    dueDate: 'May 3, 2026',
    status: 'Draft',
    avatarColor: '#6B7280',
    tax: 8,
    items: [
      { id: 1, description: 'Patching & Sealant', qty: 1, rate: 1200 },
    ]
  },
]

const mockRecurring: RecurringPlan[] = [
  { id: 'REC-01', clientName: 'Johnson Family', clientCompany: 'Maintenance Plan', description: 'Monthly roof maintenance', amount: 450, frequency: 'Monthly', nextDate: 'May 3, 2026', status: 'Active', avatarColor: '#8B5CF6' },
  { id: 'REC-02', clientName: 'Metro Corp', clientCompany: 'Commercial Flat', description: 'Quarterly inspection', amount: 1200, frequency: 'Quarterly', nextDate: 'Jun 3, 2026', status: 'Active', avatarColor: '#3B82F6' },
  { id: 'REC-03', clientName: 'Highland HOA', clientCompany: 'Annual maintenance', description: 'Annual roof maintenance contract', amount: 2800, frequency: 'Annual', nextDate: 'May 3, 2026', status: 'Active', avatarColor: '#10B981' },
]

const mockPayments: PaymentRecord[] = [
  { id: 'PAY-01', date: 'May 3, 2026', invoiceId: 'INV-2040', clientName: 'Johnson Family', clientCompany: 'Johnson Family', method: 'Bank Transfer', amount: 12000, reference: 'TXN-8912-AA', status: 'Cleared', avatarColor: '#8B5CF6' },
  { id: 'PAY-02', date: 'May 2, 2026', invoiceId: 'INV-2041', clientName: 'Highland HOA', clientCompany: 'Highland HOA', method: 'Check', amount: 42000, reference: 'TXN-8914-AC', status: 'Cleared', avatarColor: '#10B981' },
  { id: 'PAY-03', date: 'May 2, 2026', invoiceId: 'INV-2039', clientName: 'Summerlin Dev', clientCompany: 'Summerlin Dev', method: 'Card', amount: 45750, reference: 'TXN-8915-AD', status: 'Cleared', avatarColor: '#EF4444' },
  { id: 'PAY-04', date: 'May 1, 2026', invoiceId: 'INV-2038', clientName: 'Rivera LLC', clientCompany: 'Rivera LLC', method: 'Bank Transfer', amount: 18500, reference: 'TXN-8915-AD', status: 'Cleared', avatarColor: '#F59E0B' },
]

const clientsList = [
  { name: 'Metro Corp', company: 'Metro Commercial Flat', email: 'finance@metrocorp.com' },
  { name: 'Johnson Family', company: 'Johnson Residential', email: 'rjohnson@gmail.com' },
  { name: 'GV Properties', company: 'Green Valley Office', email: 'ap@gvprops.com' },
  { name: 'Summerlin Dev', company: 'Summerlin Dev', email: 'billing@summerlin.com' },
  { name: 'Rivera LLC', company: 'Rivera Building', email: 'support@riverallc.com' },
]

const statusConfig: Record<InvoiceStatus, { bg: string; text: string; dot: string }> = {
  Paid: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  Overdue: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  Draft: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
  Sent: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  Partial: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
}

const inputCls = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
const selectCls = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all"

function formatCurrency(val: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val)
}

function getInvoiceTotal(inv: Invoice) {
  const sub = inv.items.reduce((acc, cur) => acc + (cur.qty * cur.rate), 0)
  return sub + (sub * (inv.tax / 100))
}

// ─── Shared Components ───────────────────────────────────────────────────────────

function StatCard({ label, value, sub, subColor, icon, subText }: { 
  label: string; value: string; sub?: string; subColor?: string; icon: React.ReactNode; subText?: string 
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col min-h-[115px] relative overflow-hidden">
      <div className="flex items-center justify-between">
         <span className="text-xs text-gray-500 font-medium">{label}</span>
         {icon}
      </div>
      <div className="mt-auto pt-3">
         <p className="text-2xl font-extrabold text-gray-900">{value}</p>
         <div className="flex items-center gap-1.5 mt-1">
            {sub && <span className={`text-[11px] font-bold ${subColor}`}>{sub}</span>}
            {subText && <span className="text-[11px] text-gray-400 font-medium">{subText}</span>}
         </div>
      </div>
    </div>
  )
}

function InvoiceActionMenu({ onView, onEdit, onPDF, onReminder }: { onView: () => void, onEdit: () => void, onPDF: () => void, onReminder: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <div ref={ref} className="relative flex justify-center">
      <button onClick={(e) => { e.stopPropagation(); setOpen(!open) }} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors">
        <MoreHorizontal size={15} />
      </button>
      {open && (
        <div className="absolute right-0 top-8 w-48 bg-white border border-gray-100 rounded-xl shadow-xl z-30 py-1 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
          <button onClick={() => { setOpen(false); onView() }} className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2">
             <Eye size={14} /> View Detail
          </button>
          <button onClick={() => { setOpen(false); onEdit() }} className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2">
             <Pencil size={14} /> Edit
          </button>
          <button onClick={() => { setOpen(false); onPDF() }} className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2">
             <Download size={14} /> Download PDF
          </button>
          <button onClick={() => { setOpen(false); onReminder() }} className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2">
             <Mail size={14} /> Send Reminder
          </button>
          <div className="border-t border-gray-100 my-1" />
          <button className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2">
             <Trash2 size={14} /> Delete
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Invoice Form Sidebar Drawer ───────────────────────────────────────────────────
function InvoiceFormSidebar({ invoice, onClose, onSave }: { invoice?: Invoice; onClose: () => void; onSave: (inv: Partial<Invoice>) => void }) {
   const [selectedClient, setSelectedClient] = useState<string>(invoice?.clientName || '')
   const [project, setProject] = useState(invoice?.project || '')
   const [issueDate, setIssueDate] = useState(invoice?.issuedDate || '')
   const [dueDate, setDueDate] = useState(invoice?.dueDate || '')
   const [email, setEmail] = useState(invoice?.clientEmail || '')
   const [tax, setTax] = useState(invoice?.tax || 0)
   const [items, setItems] = useState<InvoiceItem[]>(invoice?.items || [{ id: 1, description: '', qty: 1, rate: 0 }])

   const handleItemChange = (id: number, key: keyof InvoiceItem, val: any) => {
      setItems(prev => prev.map(item => item.id === id ? { ...item, [key]: val } : item))
   }

   const addItem = () => setItems(prev => [...prev, { id: Math.max(0, ...prev.map(i => i.id)) + 1, description: '', qty: 1, rate: 0 }])
   const removeItem = (id: number) => { if (items.length > 1) setItems(items.filter(i => i.id !== id)) }

   const subtotal = items.reduce((sum, i) => sum + (i.qty * i.rate), 0)
   const taxAmt = subtotal * (tax / 100)
   const total = subtotal + taxAmt

   const onClientPick = (name: string) => {
      setSelectedClient(name)
      const found = clientsList.find(c => c.name === name)
      if (found) setEmail(found.email)
   }

   return (
      <>
         <div className="fixed inset-0 bg-black/40 z-[100] backdrop-blur-[1px]" onClick={onClose} />
         <div className="fixed inset-y-0 right-0 z-[101] flex">
            <div className="bg-white w-[600px] max-w-full h-full flex flex-col shadow-2xl">
               <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100 shrink-0">
                  <h2 className="text-lg font-bold text-gray-900">{invoice ? 'Edit Invoice' : 'New Invoice'}</h2>
                  <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors"><X size={18} /></button>
               </div>

               <div className="overflow-y-auto flex-1 px-7 py-7 space-y-8 bg-[#FCFCFD]">
                  {/* Details */}
                  <div className="space-y-5 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                     <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">Invoice Details</h3>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="block text-xs font-semibold text-gray-600 mb-1.5">Client</label>
                           <div className="relative">
                              <select value={selectedClient} onChange={e => onClientPick(e.target.value)} className={selectCls}>
                                 <option value="">Select client</option>
                                 {clientsList.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                              </select>
                              <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                           </div>
                        </div>
                        <div>
                           <label className="block text-xs font-semibold text-gray-600 mb-1.5">Project</label>
                           <div className="relative">
                              <select value={project} onChange={e => setProject(e.target.value)} className={selectCls}>
                                 <option value="">Select project</option>
                                 <option>Highland Tearoff</option>
                                 <option>Oakdale Residential</option>
                                 <option>Metro Commercial Flat</option>
                                 <option>Riverside Shingle</option>
                              </select>
                              <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                           </div>
                        </div>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="block text-xs font-semibold text-gray-600 mb-1.5">Issue Date</label>
                           <div className="relative">
                              <input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} className={inputCls} />
                           </div>
                        </div>
                        <div>
                           <label className="block text-xs font-semibold text-gray-600 mb-1.5">Due Date</label>
                           <div className="relative">
                              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={inputCls} />
                           </div>
                        </div>
                     </div>
                     <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Residential Email</label>
                        <input type="email" placeholder="client@email.com" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} />
                     </div>
                  </div>

                  {/* Line Items */}
                  <div className="space-y-4">
                     <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-gray-800">Line Items</h3>
                        <button onClick={addItem} className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700">
                           <Plus size={14} /> Add Line Item
                        </button>
                     </div>
                     <div className="space-y-3">
                        {items.map((item, idx) => (
                           <div key={item.id} className="flex gap-3 items-start bg-white p-4 rounded-xl border border-gray-100 shadow-sm group">
                              <div className="flex-1">
                                 {idx === 0 && <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Description</label>}
                                 <input placeholder="Description of work" value={item.description} onChange={e => handleItemChange(item.id, 'description', e.target.value)} className={inputCls} />
                              </div>
                              <div className="w-20">
                                 {idx === 0 && <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Qty</label>}
                                 <input type="number" value={item.qty} onChange={e => handleItemChange(item.id, 'qty', parseFloat(e.target.value) || 0)} className={inputCls} />
                              </div>
                              <div className="w-32">
                                 {idx === 0 && <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Rate ($)</label>}
                                 <input type="number" value={item.rate} onChange={e => handleItemChange(item.id, 'rate', parseFloat(e.target.value) || 0)} className={inputCls} />
                              </div>
                              <div className="pt-0 self-end mb-2 flex h-[42px] items-center">
                                 <button onClick={() => removeItem(item.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                                    <Trash2 size={16} />
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
                        <span className="text-gray-900 font-bold">{formatCurrency(subtotal)}</span>
                     </div>
                     <div className="flex justify-between items-center text-sm text-gray-600 font-medium">
                        <span>Tax (%)</span>
                        <input type="number" className="w-16 text-right px-2 py-1 border border-gray-200 rounded-lg text-sm bg-white" value={tax} onChange={e => setTax(parseFloat(e.target.value) || 0)} />
                     </div>
                     <div className="border-t border-gray-200 my-2 pt-2 flex justify-between text-base text-gray-900 font-black">
                        <span>Total</span>
                        <span>{formatCurrency(total)}</span>
                     </div>
                  </div>
               </div>

               <div className="flex items-center justify-end gap-3 px-7 py-5 border-t border-gray-100 shrink-0 bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.02)]">
                  <button onClick={onClose} className="px-6 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 rounded-xl transition-colors">Close</button>
                  <div className="flex gap-2 ml-auto">
                     <button onClick={() => onSave({ status: 'Draft' })} className="px-6 py-2.5 text-sm font-bold text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">Save as Draft</button>
                     <button 
                        onClick={() => {
                           const clientInfo = clientsList.find(c => c.name === selectedClient)
                           onSave({
                              clientName: selectedClient,
                              clientCompany: clientInfo?.company || '',
                              clientEmail: email,
                              project,
                              issuedDate: issueDate || new Date().toLocaleDateString(),
                              dueDate: dueDate || new Date().toLocaleDateString(),
                              tax,
                              items,
                              status: 'Sent'
                           })
                        }}
                        className="px-6 py-2.5 text-sm font-bold text-white bg-[#0D1B2A] hover:bg-[#162437] rounded-xl shadow-sm transition-colors"
                     >
                        Save & Send
                     </button>
                  </div>
               </div>
            </div>
         </div>
      </>
   )
}

// ─── Recurring Form Sidebar Drawer ───────────────────────────────────────────────
function RecurringFormSidebar({ recurring, onClose, onSave }: { recurring?: RecurringPlan; onClose: () => void; onSave: (p: Partial<RecurringPlan>) => void }) {
   const [client, setClient] = useState(recurring?.clientName || '')
   const [amount, setAmount] = useState(recurring?.amount || '')
   const [freq, setFreq] = useState(recurring?.frequency || 'Monthly')
   const [desc, setDesc] = useState(recurring?.description || '')
   const [startDate, setStartDate] = useState(recurring?.nextDate || '')

   return (
      <>
         <div className="fixed inset-0 bg-black/40 z-[100] backdrop-blur-[1px]" onClick={onClose} />
         <div className="fixed inset-y-0 right-0 z-[101] flex">
            <div className="bg-white w-[520px] max-w-full h-full flex flex-col shadow-2xl">
               <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100 shrink-0">
                  <h2 className="text-lg font-bold text-gray-900">{recurring ? 'Edit Recurring' : 'New Recurring'}</h2>
                  <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors"><X size={18} /></button>
               </div>

               <div className="overflow-y-auto flex-1 px-7 py-7 bg-[#FCFCFD]">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Invoice Details</h3>
                  <div className="space-y-5 bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                     <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1.5">Client</label>
                        <select value={client} onChange={e => setClient(e.target.value)} className={selectCls}>
                           <option value="">Select client</option>
                           {clientsList.map(c => <option key={c.name}>{c.name}</option>)}
                        </select>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="block text-xs font-bold text-gray-600 mb-1.5">Amount</label>
                           <div className="relative">
                              <DollarSign size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                              <input type="number" className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} />
                           </div>
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-gray-600 mb-1.5">Status</label>
                           <select className={selectCls}>
                              <option>Active</option>
                              <option>Paused</option>
                           </select>
                        </div>
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1.5">Description</label>
                        <input className={inputCls} placeholder="E.g Monthly roof maintenance" value={desc} onChange={e => setDesc(e.target.value)} />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="block text-xs font-bold text-gray-600 mb-1.5">Frequency</label>
                           <select value={freq} onChange={e => setFreq(e.target.value as any)} className={selectCls}>
                              <option>Monthly</option>
                              <option>Quarterly</option>
                              <option>Annual</option>
                           </select>
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-gray-600 mb-1.5">Start Date</label>
                           <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputCls} />
                        </div>
                     </div>
                  </div>
               </div>

               <div className="flex items-center justify-end gap-3 px-7 py-5 border-t border-gray-100 shrink-0 bg-white">
                  <button onClick={onClose} className="px-6 py-2 text-sm font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition-colors">Close</button>
                  <button 
                     onClick={() => onSave({ clientName: client, amount: parseFloat(amount as any), frequency: freq as any, description: desc, nextDate: startDate })}
                     className="px-6 py-2 text-sm font-bold text-white bg-[#0D1B2A] hover:bg-[#162437] rounded-xl transition-colors"
                  >
                     Save & Send
                  </button>
               </div>
            </div>
         </div>
      </>
   )
}

// ─── Invoice Detail Sidebar Drawer (The "Print/Bill" Style) ───────────────────────
function InvoiceDetailSidebar({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
   const subtotal = invoice.items.reduce((acc, cur) => acc + (cur.qty * cur.rate), 0)
   const taxAmt = subtotal * (invoice.tax / 100)
   const total = subtotal + taxAmt
   const status = statusConfig[invoice.status]

   return (
      <>
         <div className="fixed inset-0 bg-black/40 z-[100] backdrop-blur-[1px]" onClick={onClose} />
         <div className="fixed inset-y-0 right-0 z-[101] flex">
            <div className="bg-white w-[620px] max-w-full h-full flex flex-col shadow-2xl">
               <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100 shrink-0">
                  <h2 className="text-lg font-bold text-gray-900">{invoice.id}</h2>
                  <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"><X size={18} /></button>
               </div>

               <div className="overflow-y-auto flex-1 px-8 py-8 bg-[#F4F6F9] space-y-6">
                  {/* White Card container for Invoice Page */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 min-h-[700px]">
                     {/* Bill Header */}
                     <div className="flex justify-between items-start mb-8">
                        <div>
                           <div className="w-10 h-10 bg-gray-900 text-white rounded-lg flex items-center justify-center font-black tracking-widest text-xs mb-2">PEAK</div>
                           <h3 className="font-bold text-gray-900 text-base tracking-tight">PEAK</h3>
                           <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">ROOFING CO.</p>
                        </div>
                        <div className="text-right">
                           <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Invoice</span>
                           <h4 className="text-lg font-extrabold text-gray-900 tracking-tight">{invoice.id}</h4>
                           <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 ${status.bg} ${status.text}`}>
                              <div className={`w-1 rounded-full h-1 ${status.dot}`} /> {invoice.status}
                           </span>
                        </div>
                     </div>

                     {/* From/To */}
                     <div className="grid grid-cols-2 gap-8 border-y border-gray-100 py-6 mb-8">
                        <div>
                           <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">From</p>
                           <h5 className="font-bold text-gray-800 text-sm">Peak Roofing Co.</h5>
                           <p className="text-xs text-gray-500 leading-relaxed mt-1">
                              123 Roofing Ave, Las Vegas, NV 89101<br/>
                              admin@peakroofing.com · (702) 555-0100
                           </p>
                        </div>
                        <div className="text-right">
                           <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Bill To</p>
                           <h5 className="font-bold text-gray-800 text-sm">{invoice.clientCompany}</h5>
                           <p className="text-xs text-gray-500 leading-relaxed mt-1">
                              {invoice.clientName}<br/>
                              {invoice.clientEmail}
                           </p>
                        </div>
                     </div>

                     {/* Metadata Horizontal */}
                     <div className="grid grid-cols-3 gap-4 mb-10">
                        <div>
                           <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Issue Date</p>
                           <p className="text-sm font-bold text-gray-800">{invoice.issuedDate}</p>
                        </div>
                        <div>
                           <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Due Date</p>
                           <p className="text-sm font-bold text-gray-800 text-red-600">{invoice.dueDate}</p>
                        </div>
                        <div className="text-right">
                           <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Project</p>
                           <p className="text-sm font-bold text-gray-800">{invoice.project}</p>
                        </div>
                     </div>

                     {/* Table */}
                     <div className="mb-8">
                        <table className="w-full">
                           <thead>
                              <tr className="border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-left">
                                 <th className="pb-3 font-bold">Description</th>
                                 <th className="pb-3 font-bold text-center">Qty</th>
                                 <th className="pb-3 font-bold text-right">Rate</th>
                                 <th className="pb-3 font-bold text-right">Amount</th>
                              </tr>
                           </thead>
                           <tbody className="text-sm text-gray-800">
                              {invoice.items.map(item => (
                                 <tr key={item.id} className="border-b border-gray-50">
                                    <td className="py-4 font-medium text-gray-900">{item.description}</td>
                                    <td className="py-4 text-center text-gray-600">{item.qty}</td>
                                    <td className="py-4 text-right text-gray-600">{formatCurrency(item.rate)}</td>
                                    <td className="py-4 text-right font-bold text-gray-900">{formatCurrency(item.qty * item.rate)}</td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>

                     {/* Sums */}
                     <div className="flex flex-col items-end space-y-2 text-sm border-b border-gray-100 pb-6 mb-6">
                        <div className="flex justify-between w-48 text-gray-500 font-medium">
                           <span>Subtotal</span>
                           <span className="text-gray-900">{formatCurrency(subtotal)}</span>
                        </div>
                        <div className="flex justify-between w-48 text-gray-500 font-medium">
                           <span>Tax ({invoice.tax}%)</span>
                           <span className="text-gray-900">{formatCurrency(taxAmt)}</span>
                        </div>
                        <div className="flex justify-between w-48 text-gray-900 font-bold pt-2 text-base">
                           <span>Total</span>
                           <span>{formatCurrency(total)}</span>
                        </div>
                     </div>

                     {/* Bottom Tracker Tracks Figma style */}
                     <div className="space-y-6">
                        <div>
                           <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Payment Status</h4>
                           <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                              <div className={`h-full transition-all duration-500 rounded-full ${invoice.status === 'Paid' ? 'bg-emerald-500 w-full' : invoice.status === 'Partial' ? 'bg-amber-500 w-[40%]' : 'bg-gray-200 w-0'}`} />
                           </div>
                           <div className="flex justify-between text-[10px] text-gray-500 font-medium mt-1.5">
                              <span>Paid: $0.00 of {formatCurrency(total)}</span>
                              <span className="font-bold text-red-500">{invoice.status === 'Paid' ? '0%' : '0%'} Paid</span>
                           </div>
                        </div>

                        <div>
                           <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Activity</h4>
                           <div className="space-y-4 relative pl-4 text-xs">
                              <div className="absolute left-[3.5px] top-2 bottom-2 w-px border-l border-dashed border-gray-200"/>
                              <div className="relative">
                                 <div className="absolute left-[-17.5px] top-1 w-2.5 h-2.5 bg-gray-300 rounded-full border-2 border-white"/>
                                 <span className="font-bold text-gray-800 block">Invoice created</span>
                                 <span className="text-gray-400 mt-0.5 block">{invoice.issuedDate} · Admin</span>
                              </div>
                              <div className="relative">
                                 <div className="absolute left-[-17.5px] top-1 w-2.5 h-2.5 bg-blue-400 rounded-full border-2 border-white"/>
                                 <span className="font-bold text-gray-800 block">Invoice sent to {invoice.clientCompany}</span>
                                 <span className="text-gray-400 mt-0.5 block">{invoice.issuedDate} · System</span>
                              </div>
                              {invoice.status === 'Overdue' && (
                                 <div className="relative">
                                    <div className="absolute left-[-17.5px] top-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"/>
                                    <span className="font-bold text-red-600 block">Payment overdue — reminder sent</span>
                                    <span className="text-gray-400 mt-0.5 block">Apr 5, 2026 · System</span>
                                 </div>
                              )}
                           </div>
                        </div>
                     </div>
                  </div>
               </div>

               <div className="flex items-center justify-end gap-3 px-7 py-5 border-t border-gray-100 shrink-0 bg-white">
                  <button onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">Close</button>
                  <div className="flex gap-2 ml-auto">
                     <button className="px-5 py-2.5 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-xl flex items-center gap-2 hover:bg-gray-50 transition-colors">
                        <Download size={15} /> Download PDF
                     </button>
                     <button className="px-6 py-2.5 text-sm font-bold text-white bg-[#0D1B2A] rounded-xl hover:bg-[#162437] transition-colors">
                        Mark as Paid
                     </button>
                  </div>
               </div>
            </div>
         </div>
      </>
   )
}

// ─── Success Modal ──────────────────────────────────────────────────────────────
function SuccessModal({ title, onClose }: { title: string; onClose: () => void }) {
   return (
     <>
       <div className="fixed inset-0 bg-black/40 z-[110] backdrop-blur-[1px]" onClick={onClose} />
       <div className="fixed inset-0 z-[111] flex items-center justify-center p-4">
         <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center text-center relative">
            <button onClick={onClose} className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"><X size={16}/></button>
           <div className="w-14 h-14 bg-emerald-500 rounded-xl flex items-center justify-center mb-5 shadow-md shadow-emerald-200">
             <Check size={28} className="text-white" strokeWidth={3} />
           </div>
           <h2 className="text-lg font-black text-gray-900 mb-2">{title}</h2>
           <p className="text-xs text-gray-500 font-medium mb-6 px-4">The invoice has been generated and delivered successfully.</p>
           <button onClick={onClose} className="w-full py-2.5 bg-[#0D1B2A] text-white rounded-xl text-sm font-bold hover:bg-[#162437] transition-colors shadow-sm">Okay</button>
         </div>
       </div>
     </>
   )
}

// ─── Main Page ──────────────────────────────────────────────────────────────────
export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>(mockInvoices)
  const [tab, setTab] = useState<'invoices' | 'recurring' | 'payments'>('invoices')
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<ModalState>({ type: 'none' })
  const [showFilters, setShowFilters] = useState(false)
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus[]>([])

  const handleSaveInvoice = (data: Partial<Invoice>) => {
     const id = data.id || `INV-${Math.floor(Math.random() * 1000) + 2044}`
     const newInv: Invoice = {
        id,
        clientName: data.clientName || 'Unknown Client',
        clientCompany: data.clientCompany || 'Unknown Corp',
        clientEmail: data.clientEmail || '',
        project: data.project || 'Untitled Project',
        issuedDate: data.issuedDate || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        dueDate: data.dueDate || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        status: data.status || 'Sent',
        items: data.items || [],
        tax: data.tax || 8,
        avatarColor: '#6366F1'
     }

     setInvoices(prev => {
        const existing = prev.findIndex(i => i.id === id)
        if (existing > -1) {
           const next = [...prev]
           next[existing] = newInv
           return next
        }
        return [newInv, ...prev]
     })
     
     setModal({ type: 'success', title: data.status === 'Draft' ? 'Invoice saved as draft' : 'Invoice sent successfully' })
  }

  const filtered = invoices.filter(inv => {
     const term = search.toLowerCase()
     const matchesSearch = inv.id.toLowerCase().includes(term) || 
                           inv.clientName.toLowerCase().includes(term) ||
                           inv.clientCompany.toLowerCase().includes(term)
     if (!matchesSearch) return false
     if (statusFilter.length > 0 && !statusFilter.includes(inv.status)) return false
     return true
  })

  const overdueCount = invoices.filter(i => i.status === 'Overdue').length
  const overdueSum = invoices.filter(i => i.status === 'Overdue').reduce((acc, cur) => acc + getInvoiceTotal(cur), 0)

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#F4F6F9]">
      {/* Top Nav */}
      <div className="flex-none bg-white border-b border-gray-100 px-8 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Invoice & Billing</h1>
            <p className="text-gray-400 text-xs mt-0.5 font-medium">Create, send, and track all invoices and payments in one place.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-bold text-gray-900">John Doe</p>
              <p className="text-[11px] text-gray-400">john.doe@peakroofing.com</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center shadow-sm ring-2 ring-white">
              <span className="text-white text-xs font-bold">JD</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
         {/* Stats Row */}
         <div className="grid grid-cols-4 gap-5 px-8 pt-6 pb-2">
            <StatCard 
               label="Revenue This Month" 
               value="$96,000" 
               sub="↑ vs last month" 
               subColor="text-emerald-600" 
               icon={<div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center"><TrendingUp size={16}/></div>} 
            />
            <StatCard 
               label="Outstanding" 
               value="$62,000" 
               subText="Awaiting payment" 
               icon={<div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center"><CreditCard size={16}/></div>} 
            />
            <StatCard 
               label="Overdue" 
               value={formatCurrency(overdueSum)} 
               subText={`${overdueCount} Needs follow-up`} 
               icon={<div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center"><History size={16}/></div>} 
            />
            <StatCard 
               label="Collection Rate" 
               value="49%" 
               icon={<div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center"><ArrowUpRight size={16}/></div>} 
            />
         </div>

         {/* Tab Menu */}
         <div className="px-8 pt-6">
            <div className="flex border-b border-gray-200 gap-6 mb-5">
               {[
                  { k: 'invoices', label: 'Invoices', count: invoices.length },
                  { k: 'recurring', label: 'Recurring', count: 3 },
                  { k: 'payments', label: 'Payment Log', count: 15 },
               ].map(t => (
                  <button key={t.k} onClick={() => setTab(t.k as any)} className={`pb-3 text-sm font-bold transition-colors border-b-2 -mb-px flex items-center gap-2 ${tab === t.k ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                     {t.label} <span className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px]">{t.count}</span>
                  </button>
               ))}
            </div>

            {/* Toolbar */}
            <div className="flex items-center justify-between mb-5">
               <div className="flex items-center gap-3">
                  <div className="relative group">
                     <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                     <input 
                        value={search} 
                        onChange={e => setSearch(e.target.value)} 
                        placeholder={`Search ${tab}...`}
                        className="pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-400 w-64 transition-all" 
                     />
                  </div>
                  {tab === 'invoices' && (
                     <div className="relative">
                        <button 
                           onClick={() => setShowFilters(!showFilters)}
                           className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-xs font-bold transition-colors ${statusFilter.length > 0 || showFilters ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}
                        >
                           <FilterIcon size={14} /> Filter
                        </button>
                        {showFilters && (
                           <div className="absolute left-0 top-11 z-20 bg-white border border-gray-100 shadow-xl rounded-xl w-56 p-3 animate-in fade-in slide-in-from-top-2 duration-150">
                              <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Filter by status</p>
                              <div className="space-y-1">
                                 {STATUSES.map(s => (
                                    <label key={s} className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded-lg cursor-pointer text-xs font-medium text-gray-700">
                                       <input type="checkbox" checked={statusFilter.includes(s)} onChange={(e) => {
                                          if(e.target.checked) setStatusFilter([...statusFilter, s])
                                          else setStatusFilter(statusFilter.filter(f => f !== s))
                                       }} className="rounded text-blue-600 focus:ring-blue-500 border-gray-300" />
                                       {s}
                                    </label>
                                 ))}
                              </div>
                           </div>
                        )}
                     </div>
                  )}
               </div>

               <div className="flex items-center gap-3">
                  <button className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                     <Share2 size={14} /> {tab === 'payments' ? 'Import/Export' : 'Export'}
                  </button>
                  {tab === 'invoices' && (
                     <button 
                        onClick={() => setModal({ type: 'newInvoice' })}
                        className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-[#0D1B2A] rounded-xl shadow-sm hover:bg-[#162437] transition-all active:scale-95"
                     >
                        <Plus size={16} /> New Invoice
                     </button>
                  )}
                  {tab === 'recurring' && (
                     <button 
                        onClick={() => setModal({ type: 'newRecurring' })}
                        className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-[#0D1B2A] rounded-xl shadow-sm hover:bg-[#162437] transition-all active:scale-95"
                     >
                        <Plus size={16} /> New Recurring
                     </button>
                  )}
               </div>
            </div>

            {/* Table Conditional Layout */}
            {tab === 'invoices' && (
               <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden mb-10">
                  <table className="w-full text-left border-collapse">
                     <thead>
                        <tr className="bg-[#F8F9FB] text-[10px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">
                           <th className="px-6 py-4 flex items-center gap-3">
                              <input type="checkbox" className="rounded border-gray-300 text-blue-600" /> Invoice
                           </th>
                           <th className="px-6 py-4">Client</th>
                           <th className="px-6 py-4">Issued</th>
                           <th className="px-6 py-4">Due Date</th>
                           <th className="px-6 py-4">Total</th>
                           <th className="px-6 py-4">Status</th>
                           <th className="px-6 py-4 text-center">Actions</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-50 text-sm">
                        {filtered.map(inv => {
                           const total = getInvoiceTotal(inv)
                           const s = statusConfig[inv.status]
                           return (
                              <tr key={inv.id} onClick={() => setModal({ type: 'viewInvoice', invoice: inv })} className="hover:bg-gray-50/50 transition-colors group cursor-pointer">
                                 <td className="px-6 py-4 font-bold text-gray-900 flex items-center gap-3">
                                    <input type="checkbox" onClick={e => e.stopPropagation()} className="rounded border-gray-300 text-blue-600" />
                                    {inv.id}
                                 </td>
                                 <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                       <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 shadow-sm" style={{ backgroundColor: inv.avatarColor }}>
                                          {inv.clientName.split(' ').map(n => n[0]).join('')}
                                       </div>
                                       <div>
                                          <p className="font-bold text-gray-900 tracking-tight text-xs">{inv.clientName}</p>
                                          <p className="text-[11px] text-gray-500 mt-0.5">{inv.clientCompany}</p>
                                       </div>
                                    </div>
                                 </td>
                                 <td className="px-6 py-4 text-gray-500 font-medium text-xs">{inv.issuedDate}</td>
                                 <td className="px-6 py-4 text-xs">
                                    <span className={`font-bold ${inv.status === 'Overdue' ? 'text-red-600' : 'text-gray-800'}`}>
                                       {inv.dueDate}
                                    </span>
                                 </td>
                                 <td className="px-6 py-4 text-gray-900 font-extrabold text-xs">{formatCurrency(total)}</td>
                                 <td className="px-6 py-4">
                                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-full ${s.bg} ${s.text}`}>
                                       <div className={`w-1.5 h-1.5 rounded-full ${s.dot}`} /> {inv.status}
                                    </span>
                                 </td>
                                 <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                                    <InvoiceActionMenu 
                                       onView={() => setModal({ type: 'viewInvoice', invoice: inv })}
                                       onEdit={() => setModal({ type: 'newInvoice', invoice: inv })}
                                       onPDF={() => {}}
                                       onReminder={() => {}}
                                    />
                                 </td>
                              </tr>
                           )
                        })}
                     </tbody>
                  </table>
                  {filtered.length === 0 && <EmptyState label="invoices" />}
               </div>
            )}

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
                        {mockRecurring.map(r => (
                           <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-6 py-4">
                                 <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ backgroundColor: r.avatarColor }}>
                                       {r.clientName.split(' ').map(n => n[0]).join('')}
                                    </div>
                                    <div className="font-bold text-gray-900 text-xs">{r.clientName}</div>
                                 </div>
                              </td>
                              <td className="px-6 py-4 text-gray-500 text-xs font-medium">{r.description}</td>
                              <td className="px-6 py-4 font-bold text-gray-900 text-xs">{formatCurrency(r.amount)}</td>
                              <td className="px-6 py-4">
                                 <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${r.frequency === 'Monthly' ? 'bg-purple-100 text-purple-700' : r.frequency === 'Quarterly' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                                    {r.frequency}
                                 </span>
                              </td>
                              <td className="px-6 py-4 font-bold text-gray-800 text-xs">{r.nextDate}</td>
                              <td className="px-6 py-4">
                                 <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 uppercase">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {r.status}
                                 </span>
                              </td>
                              <td className="px-6 py-4">
                                 <div className="flex justify-center">
                                    <button onClick={() => setModal({ type: 'newRecurring', recurring: r })} className="p-1 text-gray-400 hover:text-blue-600"><Pencil size={14}/></button>
                                 </div>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            )}

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
                        {mockPayments.map(p => (
                           <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-6 py-4 text-gray-500 font-medium text-xs">{p.date}</td>
                              <td className="px-6 py-4 font-bold text-gray-900 text-xs">{p.invoiceId}</td>
                              <td className="px-6 py-4">
                                 <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold" style={{ backgroundColor: p.avatarColor }}>{p.clientName[0]}</div>
                                    <span className="font-bold text-gray-900 text-xs">{p.clientCompany}</span>
                                 </div>
                              </td>
                              <td className="px-6 py-4 text-gray-500 text-xs">{p.method}</td>
                              <td className="px-6 py-4 font-black text-gray-900 text-xs">{formatCurrency(p.amount)}</td>
                              <td className="px-6 py-4 font-mono text-gray-400 text-[10px] uppercase tracking-wider">{p.reference}</td>
                              <td className="px-6 py-4">
                                 <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold border border-emerald-100">
                                    {p.status}
                                 </span>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            )}
         </div>
      </div>

      {/* Modal Layer Controller */}
      {modal.type === 'newInvoice' && (
         <InvoiceFormSidebar 
            invoice={modal.invoice}
            onClose={() => setModal({ type: 'none' })} 
            onSave={handleSaveInvoice} 
         />
      )}
      {modal.type === 'newRecurring' && (
         <RecurringFormSidebar 
            recurring={modal.recurring}
            onClose={() => setModal({ type: 'none' })}
            onSave={() => setModal({ type: 'success', title: 'Recurring plan configured' })}
         />
      )}
      {modal.type === 'viewInvoice' && (
         <InvoiceDetailSidebar 
            invoice={modal.invoice}
            onClose={() => setModal({ type: 'none' })} 
         />
      )}
      {modal.type === 'success' && (
         <SuccessModal 
            title={modal.title} 
            onClose={() => setModal({ type: 'none' })} 
         />
      )}
    </div>
  )
}

function EmptyState({ label }: { label: string }) {
   return (
      <div className="py-20 text-center flex flex-col items-center text-gray-400">
         <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4"><FileText size={32} className="text-gray-200" /></div>
         <p className="text-sm font-medium">No {label} found matching criteria.</p>
      </div>
   )
}
