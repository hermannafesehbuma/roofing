'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import {
  Search, Filter, Plus, X, Check, MoreHorizontal, Trash2,
  Eye, Pencil, KanbanSquare, List, ChevronDown, ArrowUpRight,
  ArrowUpCircle, TrendingUp, CheckCircle2, AlertCircle, Bell,
} from 'lucide-react'
import {
  createLead, updateLead, deleteLead, convertLeadToClient,
  type LeadRow, type ClientRow, type RepOption,
  type DbLeadStage, type DbLeadSource, type CreateLeadInput,
} from './actions'

// ─── Display mappings ─────────────────────────────────────────────────────────
const STAGE_COLUMNS: { key: DbLeadStage; label: string; color: string }[] = [
  { key: 'new_lead',       label: 'New Lead',      color: 'bg-blue-400'    },
  { key: 'contacted',      label: 'Contacted',     color: 'bg-amber-400'   },
  { key: 'proposal_sent',  label: 'Proposal Sent', color: 'bg-purple-400'  },
  { key: 'lost',           label: 'Lost',          color: 'bg-red-400'     },
  { key: 'won',            label: 'Won',           color: 'bg-emerald-500' },
  { key: 'closed',         label: 'Closed',        color: 'bg-gray-400'    },
]

const SOURCE_LABELS: Record<DbLeadSource, string> = {
  referral:   'Referral',
  website:    'Website',
  cold_call:  'Cold Call',
  mobile:     'Mobile',
  social:     'Social',
}

const SOURCE_BADGE: Record<DbLeadSource, string> = {
  referral:   'text-emerald-700 bg-emerald-50',
  website:    'text-blue-700 bg-blue-50',
  cold_call:  'text-orange-700 bg-orange-50',
  mobile:     'text-purple-700 bg-purple-50',
  social:     'text-pink-700 bg-pink-50',
}

const PORTAL_BADGE: Record<string, string> = {
  active:   'text-emerald-700 bg-emerald-50',
  invited:  'text-orange-600 bg-orange-50',
  inactive: 'text-gray-600 bg-gray-100',
}

const AVATAR_COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#6366F1', '#EC4899']

function avatarColor(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

function initials(first: string, last: string) {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase()
}

function fmtValue(v: number | null) {
  if (!v) return '—'
  return v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${v}`
}

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0D1B2A]/10 focus:border-[#0D1B2A] transition-colors'
const selectCls = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-[#0D1B2A]/10 focus:border-[#0D1B2A] transition-colors'

// ─── Types ─────────────────────────────────────────────────────────────────────
type Modal =
  | { type: 'deleteLead'; lead: LeadRow }
  | { type: 'leadForm'; lead?: LeadRow }
  | { type: 'leadAdded' }
  | { type: 'viewLead'; lead: LeadRow }
  | { type: 'viewClient'; client: ClientRow }

interface LeadFormValues {
  firstName: string; lastName: string; company: string
  email: string; phone: string; address: string
  stage: DbLeadStage; source: DbLeadSource | ''
  expectedValue: string; assignedRepId: string; notes: string
}

// ─── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, subColor, icon }: {
  label: string; value: number | string; sub: string; subColor: string; icon: React.ReactNode
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
function ActionMenu({ onView, onEdit, onDelete }: { onView: () => void; onEdit?: () => void; onDelete: () => void }) {
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
          <button onClick={() => { setOpen(false); onView() }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"><Eye size={13} /> View Detail</button>
          {onEdit && <button onClick={() => { setOpen(false); onEdit() }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"><Pencil size={13} /> Edit</button>}
          <button onClick={() => { setOpen(false); onDelete() }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"><Trash2 size={13} /> Delete</button>
        </div>
      )}
    </div>
  )
}

// ─── Lead Card ─────────────────────────────────────────────────────────────────
function LeadCard({ lead, onView, onEdit, onDelete }: { lead: LeadRow; onView: () => void; onEdit: () => void; onDelete: () => void }) {
  const color = avatarColor(lead.id)
  const srcKey = lead.source
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-3.5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0" style={{ backgroundColor: color }}>
            {initials(lead.first_name, lead.last_name)}
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-900">{lead.first_name} {lead.last_name}</p>
            <p className="text-[11px] text-gray-400">{lead.company ?? '—'}</p>
          </div>
        </div>
        <ActionMenu onView={onView} onEdit={onEdit} onDelete={onDelete} />
      </div>
      <div className="space-y-1.5 text-[11px]">
        <div className="flex justify-between">
          <span className="text-gray-400">Email:</span>
          <span className="text-gray-600 truncate ml-2 max-w-[130px]">{lead.email ?? '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Value:</span>
          <span className="text-gray-600 font-medium">{fmtValue(lead.expected_value)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Rep:</span>
          <span className="text-gray-600">{lead.assigned_rep_name ?? '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Days in Stage:</span>
          <span className="text-gray-600">{lead.days_in_stage} Days</span>
        </div>
        {srcKey && (
          <div className="flex justify-between items-center pt-0.5">
            <span className="text-gray-400">Source:</span>
            <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${SOURCE_BADGE[srcKey]}`}>• {SOURCE_LABELS[srcKey]}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Client Card ───────────────────────────────────────────────────────────────
function ClientCard({ client, onView }: { client: ClientRow; onView: () => void }) {
  const color = avatarColor(client.id)
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-3.5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0" style={{ backgroundColor: color }}>
            {(client.name[0] ?? '').toUpperCase()}
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-900">{client.name}</p>
            <p className="text-[11px] text-gray-400">{client.email}</p>
          </div>
        </div>
        <ActionMenu onView={onView} onDelete={() => {}} />
      </div>
      <div className="space-y-1.5 text-[11px]">
        {[['Company', client.company ?? '—'], ['Manager', client.manager_name ?? '—']].map(([k, v]) => (
          <div key={k} className="flex justify-between"><span className="text-gray-400">{k}</span><span className="text-gray-600 font-medium">{v}</span></div>
        ))}
        <div className="flex justify-between items-center pt-0.5">
          <span className="text-gray-400">Portal</span>
          <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${PORTAL_BADGE[client.portal_status]}`}>
            • {client.portal_status.charAt(0).toUpperCase() + client.portal_status.slice(1)}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Delete Lead Modal ─────────────────────────────────────────────────────────
function DeleteLeadModal({ lead, onConfirm, onCancel, loading }: { lead: LeadRow; onConfirm: () => void; onCancel: () => void; loading: boolean }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-[1px]" onClick={onCancel} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center text-center">
          <button onClick={onCancel} className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"><X size={16} /></button>
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-5">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <Trash2 size={20} className="text-red-500" />
            </div>
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Delete Lead</h2>
          <p className="text-sm text-gray-500 leading-relaxed mb-7">
            Are you sure you want to delete <span className="font-medium text-gray-800">{lead.first_name} {lead.last_name}</span>?
            This action cannot be undone.
          </p>
          <div className="flex gap-3 w-full">
            <button onClick={onCancel} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
            <button onClick={onConfirm} disabled={loading} className="flex-1 py-2.5 rounded-lg bg-[#0D1B2A] text-sm font-medium text-white hover:bg-[#162437] transition-colors disabled:opacity-60">
              {loading ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Lead Form Panel ───────────────────────────────────────────────────────────
function LeadFormPanel({ lead, reps, onClose, onSave, loading, errorMsg }: {
  lead?: LeadRow; reps: RepOption[]; onClose: () => void
  onSave: (v: LeadFormValues) => void; loading: boolean; errorMsg: string | null
}) {
  const [v, setV] = useState<LeadFormValues>({
    firstName:    lead?.first_name ?? '',
    lastName:     lead?.last_name ?? '',
    company:      lead?.company ?? '',
    email:        lead?.email ?? '',
    phone:        lead?.phone ?? '',
    address:      lead?.address ?? '',
    stage:        lead?.stage ?? 'new_lead',
    source:       lead?.source ?? '',
    expectedValue: lead?.expected_value ? String(lead.expected_value) : '',
    assignedRepId: lead?.assigned_rep_id ?? '',
    notes:        lead?.notes ?? '',
  })

  function set<K extends keyof LeadFormValues>(k: K, val: LeadFormValues[K]) {
    setV(prev => ({ ...prev, [k]: val }))
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-[1px]" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 flex">
        <div className="bg-white w-[480px] max-w-full h-full flex flex-col shadow-2xl">
          <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100 shrink-0">
            <h2 className="text-base font-bold text-gray-900">{lead ? 'Edit Lead' : 'Add New Lead'}</h2>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"><X size={16} /></button>
          </div>

          <div className="overflow-y-auto flex-1 px-7 py-6 space-y-6">
            {errorMsg && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{errorMsg}</div>}

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
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Company</label>
                  <input placeholder="Company" value={v.company} onChange={e => set('company', e.target.value)} className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Email</label>
                    <input placeholder="Email" type="email" value={v.email} onChange={e => set('email', e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Phone</label>
                    <input placeholder="Phone" value={v.phone} onChange={e => set('phone', e.target.value)} className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Property Address</label>
                  <input placeholder="Address" value={v.address} onChange={e => set('address', e.target.value)} className={inputCls} />
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
                      <select value={v.stage} onChange={e => set('stage', e.target.value as DbLeadStage)} className={selectCls}>
                        {STAGE_COLUMNS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                      </select>
                      <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Source</label>
                    <div className="relative">
                      <select value={v.source} onChange={e => set('source', e.target.value as DbLeadSource | '')} className={selectCls}>
                        <option value="">Select Source</option>
                        <option value="referral">Referral</option>
                        <option value="website">Website</option>
                        <option value="cold_call">Cold Call</option>
                        <option value="mobile">Mobile</option>
                        <option value="social">Social</option>
                      </select>
                      <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Expected Value ($)</label>
                    <input placeholder="e.g. 7500" type="number" value={v.expectedValue} onChange={e => set('expectedValue', e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Assigned Rep</label>
                    <div className="relative">
                      <select value={v.assignedRepId} onChange={e => set('assignedRepId', e.target.value)} className={selectCls}>
                        <option value="">Select Rep</option>
                        {reps.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                      <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Notes</label>
                  <textarea placeholder="Internal notes…" value={v.notes} onChange={e => set('notes', e.target.value)} rows={4} className={`${inputCls} resize-none`} />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-7 py-5 border-t border-gray-100 shrink-0">
            <button onClick={onClose} className="px-6 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
            <button onClick={() => { if (v.firstName.trim()) onSave(v) }} disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-[#0D1B2A] text-sm font-medium text-white hover:bg-[#162437] transition-colors disabled:opacity-60">
              {loading ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Lead Added Modal ──────────────────────────────────────────────────────────
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
function LeadDetailsModal({ lead, reps, onClose, onStageChange, onMarkWon }: {
  lead: LeadRow; reps: RepOption[]; onClose: () => void
  onStageChange: (stage: DbLeadStage) => void; onMarkWon: () => void
}) {
  const [stage, setStage] = useState<DbLeadStage>(lead.stage)
  const [saving, setSaving] = useState(false)
  const moveStages: DbLeadStage[] = ['new_lead', 'contacted', 'proposal_sent', 'won']
  const color = avatarColor(lead.id)

  async function applyStageChange(s: DbLeadStage) {
    setStage(s)
    setSaving(true)
    await onStageChange(s)
    setSaving(false)
  }

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
              <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0" style={{ backgroundColor: color }}>
                {initials(lead.first_name, lead.last_name)}
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">{lead.first_name} {lead.last_name}</h3>
                <p className="text-xs text-gray-500">{lead.email ?? ''}</p>
              </div>
              <span className={`ml-auto inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full ${STAGE_COLUMNS.find(s => s.key === lead.stage)?.color.replace('bg-', 'text-').replace('-400', '-700').replace('-500', '-700')} bg-opacity-10`}>
                {STAGE_COLUMNS.find(s => s.key === lead.stage)?.label}
              </span>
            </div>

            {/* Contact */}
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Contact Information</p>
              <div className="space-y-2 text-sm">
                {[['Email', lead.email ?? '—'], ['Phone', lead.phone ?? '—'], ['Address', lead.address ?? '—'], ['Company', lead.company ?? '—']].map(([k, v]) => (
                  <div key={k} className="flex justify-between py-1.5 border-b border-gray-50">
                    <span className="text-gray-500">{k}</span>
                    <span className="text-gray-800 font-medium">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Deal Info */}
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Deal Info</p>
              <div className="space-y-2 text-sm">
                {[
                  ['Expected Value', fmtValue(lead.expected_value)],
                  ['Assigned Rep', lead.assigned_rep_name ?? '—'],
                  ['Days in Stage', `${lead.days_in_stage} days`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between py-1.5 border-b border-gray-50">
                    <span className="text-gray-500">{k}</span>
                    <span className="text-gray-800 font-medium">{v}</span>
                  </div>
                ))}
                {lead.source && (
                  <div className="flex justify-between py-1.5 border-b border-gray-50">
                    <span className="text-gray-500">Source</span>
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${SOURCE_BADGE[lead.source]}`}>
                      • {SOURCE_LABELS[lead.source]}
                    </span>
                  </div>
                )}
              </div>
            </div>

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
                {moveStages.map(s => {
                  const col = STAGE_COLUMNS.find(c => c.key === s)!
                  return (
                    <button key={s} onClick={() => applyStageChange(s)} disabled={saving}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${stage === s ? 'bg-[#0D1B2A] text-white border-[#0D1B2A]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
                      {stage === s && <Check size={10} strokeWidth={2.5} />}
                      {col.label}
                    </button>
                  )
                })}
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
function ClientDetailsModal({ client, onClose }: { client: ClientRow; onClose: () => void }) {
  const color = avatarColor(client.id)
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-[1px]" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
            <h2 className="text-base font-bold text-gray-900">Client Details</h2>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"><X size={16} /></button>
          </div>

          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0" style={{ backgroundColor: color }}>
                {(client.name[0] ?? '').toUpperCase()}
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">{client.name}</h3>
                <p className="text-xs text-gray-500">{client.email}</p>
              </div>
              <span className={`ml-auto inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full ${PORTAL_BADGE[client.portal_status]}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70 inline-block" />
                {client.portal_status.charAt(0).toUpperCase() + client.portal_status.slice(1)}
              </span>
            </div>

            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Contact Information</p>
              <div className="space-y-2 text-sm">
                {[['Email', client.email], ['Phone', client.phone ?? '—'], ['Company', client.company ?? '—'], ['Address', client.address ?? '—'], ['Manager', client.manager_name ?? '—']].map(([k, v]) => (
                  <div key={k} className="flex justify-between py-1.5 border-b border-gray-50">
                    <span className="text-gray-500">{k}</span>
                    <span className="text-gray-800 font-medium">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Portal Status</p>
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-800">Client Portal</p>
                  <p className="text-xs text-gray-400 mt-0.5">Status: {client.portal_status}</p>
                </div>
                <button className="px-4 py-1.5 bg-[#0D1B2A] text-white text-xs font-medium rounded-lg hover:bg-[#162437] transition-colors">Resend Invite</button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
            <button onClick={onClose} className="px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Close</button>
            <button className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0D1B2A] text-sm font-medium text-white hover:bg-[#162437] transition-colors">
              Message Client <ArrowUpRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, onDismiss }: { msg: string; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3000)
    return () => clearTimeout(t)
  }, [onDismiss])
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#0D1B2A] text-white text-sm font-medium px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 animate-in slide-in-from-bottom-2">
      <Check size={15} className="text-emerald-400" /> {msg}
    </div>
  )
}

// ─── Main Client ───────────────────────────────────────────────────────────────
export function CRMClient({ initialLeads, initialClients, reps }: {
  initialLeads: LeadRow[]
  initialClients: ClientRow[]
  reps: RepOption[]
}) {
  const [isPending, startTransition] = useTransition()
  const [leads, setLeads] = useState<LeadRow[]>(initialLeads)
  const [clients, setClients] = useState<ClientRow[]>(initialClients)
  const [tab, setTab] = useState<'leads' | 'clients'>('leads')
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<Modal | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) { setToast(msg) }

  // Stats
  const wonCount = leads.filter(l => l.stage === 'won').length
  const lostCount = leads.filter(l => l.stage === 'lost').length
  const winRate = wonCount + lostCount > 0 ? Math.round((wonCount / (wonCount + lostCount)) * 100) : 0
  const pipelineValue = leads
    .filter(l => l.stage !== 'lost' && l.stage !== 'closed')
    .reduce((sum, l) => sum + (l.expected_value ?? 0), 0)

  const filteredLeads = leads.filter(l => {
    const q = search.toLowerCase()
    return (
      l.first_name.toLowerCase().includes(q) ||
      l.last_name.toLowerCase().includes(q) ||
      (l.company ?? '').toLowerCase().includes(q) ||
      (l.email ?? '').toLowerCase().includes(q)
    )
  })

  const filteredClients = clients.filter(c => {
    const q = search.toLowerCase()
    return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || (c.company ?? '').toLowerCase().includes(q)
  })

  // ─── Handlers ────────────────────────────────────────────────────────────────
  function handleSaveLead(v: LeadFormValues) {
    setFormError(null)
    const editing = modal?.type === 'leadForm' && modal.lead

    if (editing) {
      const id = modal!.lead!.id
      startTransition(async () => {
        const result = await updateLead({
          id,
          firstName: v.firstName, lastName: v.lastName,
          company: v.company, email: v.email, phone: v.phone, address: v.address,
          stage: v.stage, source: v.source || null,
          expectedValue: v.expectedValue ? parseFloat(v.expectedValue) : null,
          assignedRepId: v.assignedRepId || null,
          notes: v.notes,
        })
        if (result.error) { setFormError(result.error); return }
        const repName = reps.find(r => r.id === v.assignedRepId)?.name ?? null
        setLeads(prev => prev.map(l => l.id === id ? {
          ...l,
          first_name: v.firstName, last_name: v.lastName,
          company: v.company || null, email: v.email || null,
          phone: v.phone || null, address: v.address || null,
          stage: v.stage, source: v.source || null,
          expected_value: v.expectedValue ? parseFloat(v.expectedValue) : null,
          assigned_rep_id: v.assignedRepId || null,
          assigned_rep_name: repName,
          notes: v.notes || null,
        } : l))
        setModal(null)
        showToast('Lead updated successfully')
      })
    } else {
      startTransition(async () => {
        const result = await createLead({
          firstName: v.firstName, lastName: v.lastName,
          company: v.company, email: v.email, phone: v.phone, address: v.address,
          stage: v.stage, source: v.source || null,
          expectedValue: v.expectedValue ? parseFloat(v.expectedValue) : null,
          assignedRepId: v.assignedRepId || null,
          notes: v.notes,
        })
        if (result.error) { setFormError(result.error); return }
        const repName = reps.find(r => r.id === v.assignedRepId)?.name ?? null
        const newLead: LeadRow = {
          id: result.id!,
          first_name: v.firstName, last_name: v.lastName,
          company: v.company || null, email: v.email || null,
          phone: v.phone || null, address: v.address || null,
          stage: v.stage, source: v.source || null,
          expected_value: v.expectedValue ? parseFloat(v.expectedValue) : null,
          assigned_rep_id: v.assignedRepId || null,
          assigned_rep_name: repName,
          notes: v.notes || null,
          days_in_stage: 0,
          converted_client_id: null,
          created_at: new Date().toISOString(),
        }
        setLeads(prev => [newLead, ...prev])
        setModal({ type: 'leadAdded' })
      })
    }
  }

  function confirmDeleteLead() {
    if (modal?.type !== 'deleteLead') return
    const { lead } = modal
    startTransition(async () => {
      const result = await deleteLead(lead.id)
      if (result.error) { showToast(`Error: ${result.error}`); return }
      setLeads(prev => prev.filter(l => l.id !== lead.id))
      setModal(null)
      showToast(`Lead "${lead.first_name} ${lead.last_name}" deleted`)
    })
  }

  function handleStageChange(leadId: string, stage: DbLeadStage) {
    return updateLead({ id: leadId, stage }).then(result => {
      if (!result.error) {
        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stage } : l))
      }
    })
  }

  function handleMarkWon(lead: LeadRow) {
    startTransition(async () => {
      const result = await convertLeadToClient(lead.id)

      if ('error' in result) {
        showToast(`Error: ${result.error}`)
        return
      }

      // Move lead to Won column
      setLeads(prev => prev.map(l => l.id === lead.id
        ? { ...l, stage: 'won' as DbLeadStage, converted_client_id: result.clientId }
        : l
      ))

      // Add the new client to the clients list
      const newClient: ClientRow = {
        id: result.clientId,
        name: `${lead.first_name} ${lead.last_name}`.trim(),
        email: lead.email ?? '',
        phone: lead.phone ?? null,
        company: lead.company ?? null,
        address: lead.address ?? null,
        manager_id: lead.assigned_rep_id ?? null,
        manager_name: lead.assigned_rep_name ?? null,
        portal_status: 'invited',
        created_at: new Date().toISOString(),
      }
      setClients(prev => [newClient, ...prev])

      setModal(null)
      showToast(`"${lead.first_name} ${lead.last_name}" converted to client!`)
    })
  }

  return (
    <>
      {/* Modals */}
      {modal?.type === 'deleteLead' && (
        <DeleteLeadModal lead={modal.lead} onConfirm={confirmDeleteLead} onCancel={() => setModal(null)} loading={isPending} />
      )}
      {modal?.type === 'leadForm' && (
        <LeadFormPanel lead={modal.lead} reps={reps} onClose={() => setModal(null)} onSave={handleSaveLead} loading={isPending} errorMsg={formError} />
      )}
      {modal?.type === 'leadAdded' && <LeadAddedModal onClose={() => setModal(null)} />}
      {modal?.type === 'viewLead' && (
        <LeadDetailsModal
          lead={modal.lead} reps={reps}
          onClose={() => setModal(null)}
          onStageChange={(stage) => handleStageChange(modal.lead.id, stage)}
          onMarkWon={() => handleMarkWon(modal.lead)}
        />
      )}
      {modal?.type === 'viewClient' && <ClientDetailsModal client={modal.client} onClose={() => setModal(null)} />}

      {toast && <Toast msg={toast} onDismiss={() => setToast(null)} />}

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-100 px-7 py-4 flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-base font-semibold text-gray-900">CRM / Leads</h1>
            <p className="text-xs text-gray-400 mt-0.5">Track leads and manage client relationships.</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50">
              <Bell size={14} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
            </button>
            <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                <span className="text-white text-[10px] font-semibold">JD</span>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-800 leading-none">John Doe</p>
                <p className="text-[10px] text-gray-400">Admin</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Stat Cards */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard label="Total Leads" value={leads.length} sub={`${leads.filter(l => l.stage === 'new_lead').length} new this period`} subColor="text-blue-600" icon={<div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center"><ArrowUpCircle size={18} className="text-blue-500" /></div>} />
            <StatCard label="Active Clients" value={clients.length} sub={`${clients.filter(c => c.portal_status === 'active').length} portal active`} subColor="text-emerald-600" icon={<div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center"><CheckCircle2 size={18} className="text-emerald-500" /></div>} />
            <StatCard label="Win Rate" value={`${winRate}%`} sub={`${wonCount} won · ${lostCount} lost`} subColor="text-purple-600" icon={<div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center"><TrendingUp size={18} className="text-purple-500" /></div>} />
            <StatCard label="Pipeline Value" value={pipelineValue >= 1000 ? `$${(pipelineValue / 1000).toFixed(0)}K` : `$${pipelineValue}`} sub="Excluding lost/closed" subColor="text-orange-600" icon={<div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center"><AlertCircle size={18} className="text-orange-500" /></div>} />
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-3">
            <div className="flex bg-gray-100 p-0.5 rounded-lg gap-0.5">
              <button onClick={() => setTab('leads')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${tab === 'leads' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                <KanbanSquare size={13} /> Leads ({leads.length})
              </button>
              <button onClick={() => setTab('clients')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${tab === 'clients' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                <List size={13} /> Clients ({clients.length})
              </button>
            </div>
            <div className="relative flex-1 max-w-xs">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
                className="w-full pl-8 pr-4 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D1B2A]/10 focus:border-[#0D1B2A]" />
            </div>
            <div className="flex-1" />
            <button className="flex items-center gap-1.5 px-3 py-2 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 bg-white transition-colors">
              <Filter size={13} /> Filter
            </button>
            {tab === 'leads' && (
              <button
                onClick={() => { setFormError(null); setModal({ type: 'leadForm' }) }}
                className="flex items-center gap-1.5 px-4 py-2 text-xs text-white bg-[#0D1B2A] rounded-lg hover:bg-[#162437] transition-colors font-medium"
              >
                <Plus size={13} /> Add Lead
              </button>
            )}
          </div>

          {/* Kanban Columns */}
          {tab === 'leads' && (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {STAGE_COLUMNS.map(col => {
                const colLeads = filteredLeads.filter(l => l.stage === col.key)
                return (
                  <div key={col.key} className="shrink-0 w-[230px]">
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`w-2.5 h-2.5 rounded-full ${col.color}`} />
                      <span className="text-xs font-semibold text-gray-700">{col.label}</span>
                      <span className="ml-auto text-[11px] text-gray-400 bg-gray-100 rounded-full px-1.5 py-0.5 font-medium">{colLeads.length}</span>
                    </div>
                    <div className="space-y-3">
                      {colLeads.map(lead => (
                        <LeadCard
                          key={lead.id}
                          lead={lead}
                          onView={() => setModal({ type: 'viewLead', lead })}
                          onEdit={() => { setFormError(null); setModal({ type: 'leadForm', lead }) }}
                          onDelete={() => setModal({ type: 'deleteLead', lead })}
                        />
                      ))}
                      {colLeads.length === 0 && (
                        <div className="border-2 border-dashed border-gray-100 rounded-xl p-4 text-center text-[11px] text-gray-400">No leads</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Clients Grid */}
          {tab === 'clients' && (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredClients.map(client => (
                <ClientCard
                  key={client.id}
                  client={client}
                  onView={() => setModal({ type: 'viewClient', client })}
                />
              ))}
              {filteredClients.length === 0 && (
                <div className="col-span-4 py-16 text-center text-gray-400 text-sm">No clients found.</div>
              )}
            </div>
          )}
        </main>
      </div>
    </>
  )
}
