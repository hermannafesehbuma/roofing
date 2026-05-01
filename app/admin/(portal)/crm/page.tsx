'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Search, Filter, Plus, X, Check, MoreHorizontal, Trash2,
  Eye, Pencil, KanbanSquare, List, ChevronDown, ArrowUpRight,
  ArrowUpCircle, TrendingUp, CheckCircle2, AlertCircle,
} from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────────
type LeadStage = 'New Lead' | 'Contacted' | 'Proposal Sent' | 'Lost' | 'Won' | 'Closed'
type LeadSource = 'Referral' | 'Website' | 'Cold Call' | 'Mobile' | 'Social'
type ClientStatus = 'Active' | 'Invited' | 'Inactive'

interface Lead {
  id: number
  name: string
  company: string
  email: string
  address: string
  manager: string
  daysInStage: number
  source: LeadSource
  stage: LeadStage
  avatarColor: string
  notes: string
  phone: string
  expectedValue: string
  assignedRep: string
}

interface Client {
  id: number
  name: string
  email: string
  company: string
  manager: string
  projects: number
  totalBilled: string
  outstanding: string
  portalStatus: ClientStatus
  phone: string
  avatarColor: string
}

interface AddLeadForm {
  firstName: string
  lastName: string
  company: string
  email: string
  phone: string
  address: string
  stage: LeadStage | ''
  source: LeadSource | ''
  expectedValue: string
  assignedRep: string
  notes: string
}

type Modal =
  | { type: 'deleteLead'; lead: Lead }
  | { type: 'addLead' }
  | { type: 'leadAdded' }
  | { type: 'viewLead'; lead: Lead }
  | { type: 'viewClient'; client: Client }

// ─── Mock data ─────────────────────────────────────────────────────────────────
const LEAD_COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#6366F1', '#EC4899']

const mockLeads: Lead[] = [
  { id: 1, name: 'John Smith', company: 'Web Contracting', email: 'j.smith@gmail.com', address: 'Rivera LLC', manager: 'Karen Brooks', daysInStage: 2, source: 'Referral', stage: 'New Lead', avatarColor: '#3B82F6', notes: 'Call scheduled for next Wednesday. Very warm lead.', phone: '(702)555-0240', expectedValue: '$38K', assignedRep: 'Karen Brooks' },
  { id: 2, name: 'John Smith', company: 'Web Contracting', email: 'j.smith@gmail.com', address: 'Rivera LLC', manager: 'Karen Brooks', daysInStage: 2, source: 'Mobile', stage: 'New Lead', avatarColor: '#8B5CF6', notes: '', phone: '(702)555-0241', expectedValue: '$25K', assignedRep: 'Karen Brooks' },
  { id: 3, name: 'John Smith', company: 'Web Contracting', email: 'j.smith@gmail.com', address: 'Rivera LLC', manager: 'Karen Brooks', daysInStage: 2, source: 'Referral', stage: 'Contacted', avatarColor: '#10B981', notes: '', phone: '(702)555-0242', expectedValue: '$45K', assignedRep: 'Derek Owens' },
  { id: 4, name: 'John Smith', company: 'Web Contracting', email: 'j.smith@gmail.com', address: 'Rivera LLC', manager: 'Karen Brooks', daysInStage: 2, source: 'Cold Call', stage: 'Contacted', avatarColor: '#F59E0B', notes: '', phone: '(702)555-0243', expectedValue: '$18K', assignedRep: 'Karen Brooks' },
  { id: 5, name: 'John Smith', company: 'Web Contracting', email: 'j.smith@gmail.com', address: 'Rivera LLC', manager: 'Karen Brooks', daysInStage: 2, source: 'Referral', stage: 'Proposal Sent', avatarColor: '#EF4444', notes: '', phone: '(702)555-0244', expectedValue: '$62K', assignedRep: 'David Park' },
  { id: 6, name: 'John Smith', company: 'Web Contracting', email: 'j.smith@gmail.com', address: 'Rivera LLC', manager: 'Karen Brooks', daysInStage: 3, source: 'Cold Call', stage: 'Proposal Sent', avatarColor: '#06B6D4', notes: '', phone: '(702)555-0245', expectedValue: '$31K', assignedRep: 'Karen Brooks' },
  { id: 7, name: 'John Smith', company: 'Web Contracting', email: 'j.smith@gmail.com', address: 'Rivera LLC', manager: 'Karen Brooks', daysInStage: 2, source: 'Referral', stage: 'Lost', avatarColor: '#6366F1', notes: '', phone: '(702)555-0246', expectedValue: '$28K', assignedRep: 'Karen Brooks' },
  { id: 8, name: 'John Smith', company: 'Web Contracting', email: 'j.smith@gmail.com', address: 'Rivera LLC', manager: 'Karen Brooks', daysInStage: 3, source: 'Cold Call', stage: 'Lost', avatarColor: '#EC4899', notes: '', phone: '(702)555-0247', expectedValue: '$15K', assignedRep: 'Sarah Mitchell' },
  { id: 9, name: 'John Smith', company: 'Web Contracting', email: 'j.smith@gmail.com', address: 'Rivera LLC', manager: 'Karen Brooks', daysInStage: 2, source: 'Referral', stage: 'Won', avatarColor: '#3B82F6', notes: '', phone: '(702)555-0248', expectedValue: '$95K', assignedRep: 'Karen Brooks' },
  { id: 10, name: 'John Smith', company: 'Web Contracting', email: 'j.smith@gmail.com', address: 'Rivera LLC', manager: 'Karen Brooks', daysInStage: 2, source: 'Cold Call', stage: 'Won', avatarColor: '#8B5CF6', notes: '', phone: '(702)555-0249', expectedValue: '$47K', assignedRep: 'Derek Owens' },
]

const mockClients: Client[] = [
  { id: 1, name: 'Johnson Family', email: 'jfamily@gmail.com', company: 'Johnson Family', manager: 'Karen Brooks', projects: 2, totalBilled: '$185,000', outstanding: '$12,000', portalStatus: 'Active', phone: '(702)555-0100', avatarColor: '#3B82F6' },
  { id: 2, name: 'Highland HOA', email: 'hoa@highland.com', company: 'Johnson Family', manager: 'David Park', projects: 1, totalBilled: '$54,000', outstanding: '$0', portalStatus: 'Invited', phone: '(702)555-0240', avatarColor: '#8B5CF6' },
  { id: 3, name: 'GV Props', email: 'gv@props.com', company: 'GV Props', manager: 'Karen Brooks', projects: 2, totalBilled: '$185,000', outstanding: '$12,000', portalStatus: 'Inactive', phone: '(702)555-0241', avatarColor: '#10B981' },
  { id: 4, name: 'Metro Corp', email: 'mc@gmail.com', company: 'Metro Corp', manager: 'Karen Brooks', projects: 2, totalBilled: '$185,000', outstanding: '$12,000', portalStatus: 'Active', phone: '(702)555-0101', avatarColor: '#F59E0B' },
  { id: 5, name: 'Summerlin Dev', email: 'dev@summerlin.com', company: 'Johnson Family', manager: 'Karen Brooks', projects: 2, totalBilled: '$185,000', outstanding: '$12,000', portalStatus: 'Invited', phone: '(702)555-0102', avatarColor: '#EF4444' },
  { id: 6, name: 'Hirosi Limited', email: 'hi@gmail.com', company: 'Hirosi Limited', manager: 'Karen Brooks', projects: 2, totalBilled: '$185,000', outstanding: '$12,000', portalStatus: 'Inactive', phone: '(702)555-0242', avatarColor: '#06B6D4' },
  { id: 7, name: 'Rivera LLC', email: 'r.llc@email.com', company: 'Rivera LLC', manager: 'Karen Brooks', projects: 2, totalBilled: '$185,000', outstanding: '$12,000', portalStatus: 'Active', phone: '(702)555-0103', avatarColor: '#6366F1' },
  { id: 8, name: 'Kenji Inc', email: 'ki@gmail.com', company: 'Kenji Inc', manager: 'Karen Brooks', projects: 2, totalBilled: '$185,000', outstanding: '$12,000', portalStatus: 'Active', phone: '(702)555-0104', avatarColor: '#EC4899' },
]

// ─── Constants ─────────────────────────────────────────────────────────────────
const LEAD_STAGES: LeadStage[] = ['New Lead', 'Contacted', 'Proposal Sent', 'Lost', 'Won', 'Closed']
const REPS = ['Karen Brooks', 'Derek Owens', 'David Park', 'Sarah Mitchell']

const sourceBadge: Record<LeadSource, string> = {
  Referral: 'text-emerald-700 bg-emerald-50',
  Website: 'text-blue-700 bg-blue-50',
  'Cold Call': 'text-orange-700 bg-orange-50',
  Mobile: 'text-purple-700 bg-purple-50',
  Social: 'text-pink-700 bg-pink-50',
}

const clientBadge: Record<ClientStatus, string> = {
  Active: 'text-emerald-700 bg-emerald-50',
  Invited: 'text-orange-600 bg-orange-50',
  Inactive: 'text-gray-600 bg-gray-100',
}

const stageColumnColor: Record<LeadStage, string> = {
  'New Lead': 'bg-blue-400',
  Contacted: 'bg-amber-400',
  'Proposal Sent': 'bg-purple-400',
  Lost: 'bg-red-400',
  Won: 'bg-emerald-500',
  Closed: 'bg-gray-400',
}

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0D1B2A]/10 focus:border-[#0D1B2A] transition-colors'
const selectCls = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-[#0D1B2A]/10 focus:border-[#0D1B2A] transition-colors'

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

// ─── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, subColor, icon }: {
  label: string; value: number | string; sub: string; subColor: string
  icon: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-4">
      <div className="shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
        <p className={`text-[11px] font-medium ${subColor}`}>{sub}</p>
      </div>
    </div>
  )
}

// ─── Action Menu ───────────────────────────────────────────────────────────────

function ActionMenu({ onView, onDelete }: { onView: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
        <MoreHorizontal size={14} />
      </button>
      {open && (
        <div className="absolute right-0 top-7 z-30 w-40 bg-white rounded-xl shadow-lg border border-gray-100 py-1">
          <button onClick={() => { setOpen(false); onView() }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
            <Eye size={13} /> View Detail
          </button>
          <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
            <Pencil size={13} /> Edit
          </button>
          <button onClick={() => { setOpen(false); onDelete() }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
            <Trash2 size={13} /> Delete
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Lead Card ─────────────────────────────────────────────────────────────────
function LeadCard({ lead, onView, onDelete }: { lead: Lead; onView: () => void; onDelete: () => void }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-3.5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0" style={{ backgroundColor: lead.avatarColor }}>
            {initials(lead.name)}
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-900">{lead.name}</p>
            <p className="text-[11px] text-gray-400">{lead.company}</p>
          </div>
        </div>
        <ActionMenu onView={onView} onDelete={onDelete} />
      </div>
      <div className="space-y-1.5 text-[11px]">
        <div className="flex justify-between">
          <span className="text-gray-400">Email:</span>
          <span className="text-gray-600 truncate ml-2 max-w-[130px]">{lead.email}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Address:</span>
          <span className="text-gray-600">{lead.address}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Manager:</span>
          <span className="text-gray-600">{lead.manager}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Days in Stage:</span>
          <span className="text-gray-600">{lead.daysInStage} Days</span>
        </div>
        <div className="flex justify-between items-center pt-0.5">
          <span className="text-gray-400">Source:</span>
          <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${sourceBadge[lead.source]}`}>
            • {lead.source}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Client Card ───────────────────────────────────────────────────────────────
function ClientCard({ client, onView }: { client: Client; onView: () => void }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-3.5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0" style={{ backgroundColor: client.avatarColor }}>
            {initials(client.name)}
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-900">{client.name}</p>
            <p className="text-[11px] text-gray-400">{client.email}</p>
          </div>
        </div>
        <ActionMenu onView={onView} onDelete={() => {}} />
      </div>
      <div className="space-y-1.5 text-[11px]">
        {[['Company', client.company], ['Manager', client.manager], ['Projects', `${client.projects} Projects`], ['Total Billed', client.totalBilled]].map(([k, v]) => (
          <div key={k} className="flex justify-between">
            <span className="text-gray-400">{k}</span>
            <span className="text-gray-600 font-medium">{v}</span>
          </div>
        ))}
        <div className="flex justify-between">
          <span className="text-gray-400">Outstanding</span>
          <span className={`font-medium ${client.outstanding === '$0' ? 'text-gray-600' : 'text-red-500'}`}>{client.outstanding}</span>
        </div>
        <div className="flex justify-between items-center pt-0.5">
          <span className="text-gray-400">Portal</span>
          <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${clientBadge[client.portalStatus]}`}>
            • {client.portalStatus}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Delete Lead Modal ─────────────────────────────────────────────────────────
function DeleteLeadModal({ lead, onConfirm, onCancel }: { lead: Lead; onConfirm: () => void; onCancel: () => void }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-[1px]" onClick={onCancel} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center text-center">
          <button onClick={onCancel} className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">
            <X size={16} />
          </button>
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-5">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <Trash2 size={20} className="text-red-500" />
            </div>
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Delete Lead</h2>
          <p className="text-sm text-gray-500 leading-relaxed mb-7">
            Deleting this lead ({lead.name} {lead.company}) will remove all associated data permanently.
            <br />This action cannot be undone.
          </p>
          <div className="flex gap-3 w-full">
            <button onClick={onCancel} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
            <button onClick={onConfirm} className="flex-1 py-2.5 rounded-lg bg-[#0D1B2A] text-sm font-medium text-white hover:bg-[#162437] transition-colors">Delete</button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Add Lead Modal ────────────────────────────────────────────────────────────
function AddLeadModal({ onClose, onSave }: { onClose: () => void; onSave: (v: AddLeadForm) => void }) {
  const [v, setV] = useState<AddLeadForm>({
    firstName: '', lastName: '', company: '', email: '', phone: '', address: '',
    stage: '', source: '', expectedValue: '', assignedRep: '', notes: '',
  })

  function set<K extends keyof AddLeadForm>(k: K, val: AddLeadForm[K]) {
    setV(prev => ({ ...prev, [k]: val }))
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-[1px]" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
          <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100 shrink-0">
            <h2 className="text-base font-bold text-gray-900">Add New Lead</h2>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"><X size={16} /></button>
          </div>

          <div className="overflow-y-auto flex-1 px-7 py-6 space-y-6">
            {/* Lead Details */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-4">Lead Details</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">First Name</label>
                    <input placeholder="First name" value={v.firstName} onChange={e => set('firstName', e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Last Name</label>
                    <input placeholder="Last name" value={v.lastName} onChange={e => set('lastName', e.target.value)} className={inputCls} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Company</label>
                    <input placeholder="Company" value={v.company} onChange={e => set('company', e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Email</label>
                    <input placeholder="Email" type="email" value={v.email} onChange={e => set('email', e.target.value)} className={inputCls} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Phone</label>
                    <input placeholder="Phone" value={v.phone} onChange={e => set('phone', e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Address</label>
                    <input placeholder="Property address" value={v.address} onChange={e => set('address', e.target.value)} className={inputCls} />
                  </div>
                </div>
              </div>
            </div>

            {/* Pipeline Info */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-4">Pipeline Info</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Stage</label>
                    <div className="relative">
                      <select value={v.stage} onChange={e => set('stage', e.target.value as LeadStage)} className={selectCls}>
                        <option value="">Select Stage</option>
                        {LEAD_STAGES.map(s => <option key={s}>{s}</option>)}
                      </select>
                      <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Source</label>
                    <div className="relative">
                      <select value={v.source} onChange={e => set('source', e.target.value as LeadSource)} className={selectCls}>
                        <option value="">Select Status</option>
                        <option>Referral</option>
                        <option>Website</option>
                        <option>Cold Call</option>
                        <option>Mobile</option>
                        <option>Social</option>
                      </select>
                      <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Expected Value ($)</label>
                    <input placeholder="e.g 7500" value={v.expectedValue} onChange={e => set('expectedValue', e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Assigned Rep</label>
                    <div className="relative">
                      <select value={v.assignedRep} onChange={e => set('assignedRep', e.target.value)} className={selectCls}>
                        <option value="">Select Rep</option>
                        {REPS.map(r => <option key={r}>{r}</option>)}
                      </select>
                      <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Notes</label>
                  <textarea placeholder="Internal Notes" value={v.notes} onChange={e => set('notes', e.target.value)} rows={4} className={`${inputCls} resize-none`} />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-7 py-5 border-t border-gray-100 shrink-0">
            <button onClick={onClose} className="px-6 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
            <button onClick={() => { if (v.firstName.trim()) onSave(v) }} className="px-6 py-2.5 rounded-lg bg-[#0D1B2A] text-sm font-medium text-white hover:bg-[#162437] transition-colors">Save</button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Lead Added Success Modal ──────────────────────────────────────────────────
function LeadAddedModal({ onClose }: { onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-[1px]" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center text-center">
          <button onClick={onClose} className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"><X size={16} /></button>
          <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mb-5 shadow-md">
            <Check size={30} className="text-white" strokeWidth={2.5} />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Lead added successfully</h2>
          <p className="text-sm text-gray-500 leading-relaxed mb-7">The lead has been saved and is ready for follow-up and tracking.</p>
          <button onClick={onClose} className="w-full py-3 bg-[#0D1B2A] text-white rounded-xl text-sm font-semibold hover:bg-[#162437] transition-colors">Okay</button>
        </div>
      </div>
    </>
  )
}

// ─── Lead Details Modal ────────────────────────────────────────────────────────
function LeadDetailsModal({ lead, onClose, onMarkWon }: { lead: Lead; onClose: () => void; onMarkWon: () => void }) {
  const [stage, setStage] = useState(lead.stage)
  const moveStages: LeadStage[] = ['New Lead', 'Contacted', 'Proposal Sent', 'Won']

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-[1px]" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
            <h2 className="text-base font-bold text-gray-900">Lead Details</h2>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"><X size={16} /></button>
          </div>

          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
            {/* Identity */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0" style={{ backgroundColor: lead.avatarColor }}>
                {initials(lead.name)}
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">{lead.name}</h3>
                <p className="text-xs text-gray-500">{lead.email}</p>
              </div>
              <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> Active
              </span>
            </div>

            {/* Contact info */}
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Contact Information</p>
              <div className="space-y-2 text-sm">
                {[['Email', lead.email], ['Phone', lead.phone], ['Manager', lead.manager]].map(([k, v]) => (
                  <div key={k} className="flex justify-between py-1.5 border-b border-gray-50">
                    <span className="text-gray-500">{k}</span>
                    <span className="text-gray-800 font-medium">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Deal info */}
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Deal Info</p>
              <div className="space-y-2 text-sm">
                {[['Expected Value', lead.expectedValue], ['Assigned Rep', lead.assignedRep], ['Days in Stage', `${lead.daysInStage} days`]].map(([k, v]) => (
                  <div key={k} className="flex justify-between py-1.5 border-b border-gray-50">
                    <span className="text-gray-500">{k}</span>
                    <span className="text-gray-800 font-medium">{v}</span>
                  </div>
                ))}
                <div className="flex justify-between py-1.5 border-b border-gray-50">
                  <span className="text-gray-500">Source</span>
                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${sourceBadge[lead.source]}`}>
                    • {lead.source}
                  </span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {lead.notes && (
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Notes</p>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 leading-relaxed">{lead.notes}</p>
              </div>
            )}

            {/* Move Stage */}
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Move Stage</p>
              <div className="flex gap-2 flex-wrap">
                {moveStages.map(s => (
                  <button key={s} onClick={() => setStage(s)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${stage === s ? 'bg-[#0D1B2A] text-white border-[#0D1B2A]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
                    {stage === s && <Check size={10} strokeWidth={2.5} />}
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Recent Activity</p>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-800">Call logged — discussed project scope and timeline</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">7 days ago · Karen Brooks</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-gray-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-800">Lead created and assigned to Karen Brooks</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">8 days ago · System</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
            <button onClick={onClose} className="px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Close</button>
            <button onClick={onMarkWon} className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0D1B2A] text-sm font-medium text-white hover:bg-[#162437] transition-colors">
              Mark as Won <Check size={14} />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Client Details Modal ──────────────────────────────────────────────────────
function ClientDetailsModal({ client, onClose }: { client: Client; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-[1px]" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
            <h2 className="text-base font-bold text-gray-900">Lead Details</h2>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"><X size={16} /></button>
          </div>

          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
            {/* Identity */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0" style={{ backgroundColor: client.avatarColor }}>
                {initials(client.name)}
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">{client.name}</h3>
                <p className="text-xs text-gray-500">{client.email}</p>
              </div>
              <span className={`ml-auto inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full ${clientBadge[client.portalStatus]}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70 inline-block" /> {client.portalStatus}
              </span>
            </div>

            {/* Contact info */}
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Contact Information</p>
              <div className="space-y-2 text-sm">
                {[['Email', client.email], ['Phone', client.phone], ['Manager', client.manager]].map(([k, v]) => (
                  <div key={k} className="flex justify-between py-1.5 border-b border-gray-50">
                    <span className="text-gray-500">{k}</span>
                    <span className="text-gray-800 font-medium">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial */}
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Financial</p>
              <div className="space-y-2 text-sm">
                {[['Total Billed', client.totalBilled], ['Outstanding', client.outstanding], ['Projects', `${client.projects} Project${client.projects !== 1 ? 's' : ''}`]].map(([k, v]) => (
                  <div key={k} className="flex justify-between py-1.5 border-b border-gray-50">
                    <span className="text-gray-500">{k}</span>
                    <span className="text-gray-800 font-medium">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Portal */}
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Portal</p>
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-800">Client Portal</p>
                  <p className="text-xs text-gray-400 mt-0.5">Last login: 2 days ago</p>
                </div>
                <button className="px-4 py-1.5 bg-[#0D1B2A] text-white text-xs font-medium rounded-lg hover:bg-[#162437] transition-colors">Resend</button>
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Recent Activity</p>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-800">Invoice INV-2024 paid — $42,000</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">3 days ago</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-gray-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-800">New project assigned by David Park</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">week ago</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
            <button onClick={onClose} className="px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
            <button className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0D1B2A] text-sm font-medium text-white hover:bg-[#162437] transition-colors">
              Message Client <ArrowUpRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function CRMPage() {
  const [tab, setTab] = useState<'leads' | 'clients'>('leads')
  const [leads, setLeads] = useState<Lead[]>(mockLeads)
  const [clients] = useState<Client[]>(mockClients)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<Modal | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  function confirmDeleteLead() {
    if (modal?.type !== 'deleteLead') return
    const name = `${modal.lead.name} ${modal.lead.company}`
    setLeads(prev => prev.filter(l => l.id !== modal.lead.id))
    setModal(null)
    showToast(`Lead(${name}) deleted successfully`)
  }

  function handleAddLead(values: AddLeadForm) {
    const newId = Math.max(...leads.map(l => l.id)) + 1
    setLeads(prev => [...prev, {
      id: newId,
      name: `${values.firstName} ${values.lastName}`.trim(),
      company: values.company || 'Unknown',
      email: values.email,
      address: values.address,
      manager: values.assignedRep || REPS[0],
      daysInStage: 0,
      source: (values.source || 'Referral') as LeadSource,
      stage: (values.stage || 'New Lead') as LeadStage,
      avatarColor: LEAD_COLORS[newId % LEAD_COLORS.length],
      notes: values.notes,
      phone: values.phone,
      expectedValue: values.expectedValue ? `$${values.expectedValue}` : '$0',
      assignedRep: values.assignedRep || REPS[0],
    }])
    setModal({ type: 'leadAdded' })
  }

  const filteredLeads = leads.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.company.toLowerCase().includes(search.toLowerCase())
  )
  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.company.toLowerCase().includes(search.toLowerCase())
  )

  const inPipeline = leads.filter(l => !['Won', 'Lost', 'Closed'].includes(l.stage)).length
  const wonCount = leads.filter(l => l.stage === 'Won').length
  const activeClients = clients.filter(c => c.portalStatus === 'Active').length

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#F4F6F9]">
      {/* Header */}
      <div className="flex-none bg-white border-b border-gray-100 px-8 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">CRM / Leads</h1>
            <p className="text-gray-500 text-xs mt-0.5">Manage leads, clients, and your sales pipeline in one place.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-900">John Doe</p>
              <p className="text-xs text-gray-400">john.doe@peakroofing.com</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-semibold">JD</span>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {/* Toast */}
        {toast && (
          <div className="mx-8 mt-4 flex items-center gap-2 bg-emerald-500 text-white text-sm px-4 py-2.5 rounded-xl shadow-md">
            <Check size={14} strokeWidth={2.5} /> {toast}
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-4 px-8 pt-5 pb-2">
          <StatCard label="Total Leads" value={leads.length} sub="+6 this month" subColor="text-blue-500"
            icon={<div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center"><ArrowUpCircle size={20} className="text-blue-500" /></div>} />
          <StatCard label="In Pipeline" value={inPipeline} sub="+6 this week" subColor="text-amber-500"
            icon={<div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center"><TrendingUp size={20} className="text-amber-500" /></div>} />
          <StatCard label="Won This Month" value={wonCount} sub="+$142,000 value" subColor="text-emerald-600"
            icon={<div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center"><CheckCircle2 size={20} className="text-emerald-500" /></div>} />
          <StatCard label="Active Client" value={activeClients} sub="$1.5K unpaid" subColor="text-red-500"
            icon={<div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center"><AlertCircle size={20} className="text-red-500" /></div>} />
        </div>

        {/* Tabs */}
        <div className="px-8 pt-5">
          <div className="flex border-b border-gray-200 mb-4">
            {(['leads', 'clients'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${tab === t ? 'border-[#0D1B2A] text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                {t === 'leads' ? 'Leads Pipeline' : 'Clients'}
              </button>
            ))}
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5 gap-0.5">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-white text-gray-800 shadow-sm">
                <KanbanSquare size={13} /> Kanban
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-gray-500 hover:text-gray-700">
                <List size={13} /> List
              </button>
            </div>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search"
                className="pl-8 pr-4 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D1B2A]/10 focus:border-[#0D1B2A] w-52" />
            </div>
            <div className="flex-1" />
            <button className="flex items-center gap-1.5 px-3 py-2 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 bg-white">
              <Filter size={13} /> Filter
            </button>
            <button onClick={() => setModal({ type: 'addLead' })}
              className="flex items-center gap-1.5 px-4 py-2 text-xs text-white bg-[#0D1B2A] rounded-lg hover:bg-[#162437] font-medium">
              <Plus size={13} /> Add Lead
            </button>
          </div>
        </div>

        {/* Kanban board */}
        <div className="px-8 pb-8 overflow-x-auto">
          {tab === 'leads' ? (
            <div className="flex gap-4 min-w-max">
              {LEAD_STAGES.map(stage => {
                const stageLeads = filteredLeads.filter(l => l.stage === stage)
                return (
                  <div key={stage} className="w-[230px] shrink-0">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${stageColumnColor[stage]}`} />
                        <span className="text-xs font-semibold text-gray-700">{stage}</span>
                      </div>
                      <span className="text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full bg-gray-100 text-gray-500">{stageLeads.length}</span>
                    </div>
                    <div className="space-y-3">
                      {stageLeads.length === 0 ? (
                        <div className="text-center py-8 text-xs text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                          No leads at this stage
                        </div>
                      ) : (
                        stageLeads.map(lead => (
                          <LeadCard key={lead.id} lead={lead}
                            onView={() => setModal({ type: 'viewLead', lead })}
                            onDelete={() => setModal({ type: 'deleteLead', lead })} />
                        ))
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex gap-4 min-w-max">
              {(['Active', 'Invited', 'Inactive'] as ClientStatus[]).map(status => {
                const col = filteredClients.filter(c => c.portalStatus === status)
                const dotCls = status === 'Active' ? 'bg-emerald-500' : status === 'Invited' ? 'bg-orange-400' : 'bg-gray-400'
                const txtCls = status === 'Active' ? 'text-emerald-600' : status === 'Invited' ? 'text-orange-500' : 'text-gray-500'
                return (
                  <div key={status} className="w-[280px] shrink-0">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${dotCls}`} />
                        <span className={`text-xs font-semibold ${txtCls}`}>{status}</span>
                      </div>
                      <span className="text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full bg-gray-100 text-gray-500">{col.length}</span>
                    </div>
                    <div className="space-y-3">
                      {col.map(client => (
                        <ClientCard key={client.id} client={client}
                          onView={() => setModal({ type: 'viewClient', client })} />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {modal?.type === 'deleteLead' && <DeleteLeadModal lead={modal.lead} onConfirm={confirmDeleteLead} onCancel={() => setModal(null)} />}
      {modal?.type === 'addLead' && <AddLeadModal onClose={() => setModal(null)} onSave={handleAddLead} />}
      {modal?.type === 'leadAdded' && <LeadAddedModal onClose={() => setModal(null)} />}
      {modal?.type === 'viewLead' && (
        <LeadDetailsModal lead={modal.lead} onClose={() => setModal(null)}
          onMarkWon={() => { setLeads(prev => prev.map(l => l.id === modal.lead.id ? { ...l, stage: 'Won' } : l)); setModal(null) }} />
      )}
      {modal?.type === 'viewClient' && <ClientDetailsModal client={modal.client} onClose={() => setModal(null)} />}
    </div>
  )
}
