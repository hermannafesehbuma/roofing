'use client'

import React, { useState, useRef, useEffect, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Send,
  Smile,
  X,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Check,
  User,
  MapPin,
  Calendar,
  AlertTriangle,
  FolderOpen,
  Plus
} from 'lucide-react'
import UserHeaderBadge from '@/app/components/ui/UserHeaderBadge'
import {
  SupportTicket,
  TicketStatus,
  TicketPriority,
  ChatMessage,
  saveTicketDetails,
  addChatMessage,
  createSupportTicket,
  CreateSupportTicketInput
} from './actions'

type SupportClientProps = {
  initialTickets: SupportTicket[]
}

const agentsList = [
  { name: 'Karen Brooks', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150' },
  { name: 'Michael Chen', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150' },
  { name: 'Aisha Patel', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' },
  { name: 'Liam O\'Sullivan', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150' },
  { name: 'Nina Rodriguez', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150' },
  { name: 'Mohamed Al-Farsi', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150' },
  { name: 'Emily Johnson', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150' }
]

const ticketTypes = ['Technical Bug', 'Payment Issue', 'Service Issue', 'Misconduct', 'Other']

export default function SupportClient({ initialTickets }: SupportClientProps) {
  const router = useRouter()
  const [tickets, setTickets] = useState<SupportTicket[]>(initialTickets)
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)

  // Search & Filters state
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<TicketStatus | null>(null)
  const [filterPriority, setFilterPriority] = useState<TicketPriority | null>(null)
  const [showFilterPopover, setShowFilterPopover] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  // New Ticket state
  const [showNewTicketModal, setShowNewTicketModal] = useState(false)
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false)
  const [newTicketData, setNewTicketData] = useState<CreateSupportTicketInput>({
    type: 'General Inquiry',
    priority: 'medium',
    location: '',
    complaint: ''
  })

  // Chat message input state
  const [newMessageText, setNewMessageText] = useState('')
  const chatBottomRef = useRef<HTMLDivElement>(null)

  // Drawer / Modal state
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false)
  const [drawerAgent, setDrawerAgent] = useState('')
  const [drawerType, setDrawerType] = useState('')
  const [drawerStatus, setDrawerStatus] = useState<TicketStatus>('opened')
  const [drawerPriority, setDrawerPriority] = useState<TicketPriority>('medium')
  const [drawerNotes, setDrawerNotes] = useState('')
  const [showAgentSearch, setShowAgentSearch] = useState(false)
  const [agentQuery, setAgentQuery] = useState('')

  // Inline action menu state
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null)
  const [activeStatusPopoverId, setActiveStatusPopoverId] = useState<string | null>(null)

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  // Scroll to bottom of chat when message history changes or details drawer changes
  useEffect(() => {
    if (selectedTicket) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [selectedTicket?.messages, selectedTicket?.id])

  // Click outside to close menus
  const actionMenuRef = useRef<HTMLTableCellElement>(null)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setActiveActionMenuId(null)
        setActiveStatusPopoverId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filtered tickets
  const filteredTickets = tickets.filter((t) => {
    const matchesSearch =
      t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.complaint.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = filterStatus ? t.status === filterStatus : true
    const matchesPriority = filterPriority ? t.priority === filterPriority : true

    return matchesSearch && matchesStatus && matchesPriority
  })

  // Pagination (8 items per page)
  const itemsPerPage = 8
  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage) || 1
  const paginatedTickets = filteredTickets.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Stats calculation
  const totalTicketsCount = tickets.length
  const openedTicketsCount = tickets.filter((t) => t.status === 'opened').length
  const pendingTicketsCount = tickets.filter((t) => t.status === 'pending').length
  const resolvedTicketsCount = tickets.filter((t) => t.status === 'resolved').length

  // Select a ticket for chat
  const handleSelectTicket = (ticket: SupportTicket) => {
    setSelectedTicket(ticket)
    // Sync drawer inputs with ticket properties
    setDrawerAgent(ticket.agentName)
    setDrawerType(ticket.type)
    setDrawerStatus(ticket.status)
    setDrawerPriority(ticket.priority)
    setDrawerNotes(ticket.notes || '')
  }

  // Handle drawer save
  const handleSaveDrawerDetails = async () => {
    if (!selectedTicket) return

    const selectedAgent = agentsList.find((a) => a.name === drawerAgent)

    try {
      const response = await saveTicketDetails(selectedTicket.id, {
        agentName: drawerAgent,
        agentAvatar: selectedAgent?.avatar,
        type: drawerType,
        status: drawerStatus,
        priority: drawerPriority,
        notes: drawerNotes
      })

      if (response.success && response.ticket) {
        // Update both the list and the active selection
        setTickets((prev) =>
          prev.map((t) => (t.id === selectedTicket.id ? response.ticket! : t))
        )
        setSelectedTicket(response.ticket)
        setShowDetailsDrawer(false)
        showToast('Ticket details updated successfully')
      }
    } catch (e) {
      console.error(e)
      showToast('Failed to update ticket details', 'error')
    }
  }

  // Handle sending message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTicket || !newMessageText.trim()) return

    const textToSend = newMessageText.trim()
    setNewMessageText('')

    try {
      const response = await addChatMessage(selectedTicket.id, {
        sender: 'agent',
        senderName: 'Karen Brooks',
        senderAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
        text: textToSend
      })

      if (response.success && response.chatMessage) {
        const updatedTicket = {
          ...selectedTicket,
          messages: [...selectedTicket.messages, response.chatMessage]
        } as SupportTicket
        setTickets((prev) =>
          prev.map((t) => (t.id === selectedTicket.id ? updatedTicket : t))
        )
        setSelectedTicket(updatedTicket)
      }
    } catch (e) {
      console.error(e)
      showToast('Failed to send message', 'error')
    }
  }

  // Inline status switch (from actions menu)
  const handleInlineStatusChange = async (ticketId: string, status: TicketStatus) => {
    const ticket = tickets.find((t) => t.id === ticketId)
    if (!ticket) return

    try {
      const response = await saveTicketDetails(ticketId, {
        agentName: ticket.agentName,
        agentAvatar: ticket.agentAvatar,
        type: ticket.type,
        status: status,
        priority: ticket.priority,
        notes: ticket.notes
      })

      if (response.success && response.ticket) {
        setTickets((prev) => prev.map((t) => (t.id === ticketId ? response.ticket! : t)))
        if (selectedTicket && selectedTicket.id === ticketId) {
          setSelectedTicket(response.ticket)
        }
        setActiveStatusPopoverId(null)
        setActiveActionMenuId(null)
        showToast(`Status updated to ${status}`)
      }
    } catch (e) {
      console.error(e)
      showToast('Failed to update status', 'error')
    }
  }

  // Handle Create Ticket
  const handleCreateTicket = async () => {
    if (!newTicketData.complaint.trim() || !newTicketData.location.trim()) {
      showToast('Please fill out all required fields', 'error')
      return
    }

    setIsSubmittingTicket(true)
    try {
      const response = await createSupportTicket(newTicketData)
      if (response.error) {
        showToast(response.error, 'error')
      } else {
        showToast('Ticket created successfully!', 'success')
        setShowNewTicketModal(false)
        setNewTicketData({ type: 'General Inquiry', priority: 'medium', location: '', complaint: '' })
        // A full page refresh or server action revalidatePath will handle appending the ticket.
      }
    } catch (e) {
      showToast('Failed to create ticket', 'error')
    } finally {
      setIsSubmittingTicket(true) // will be reset when component unmounts or modal closes
    }
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#F4F6F9] h-full overflow-hidden relative">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-[#E8F8F0] border border-[#B3E8CE] rounded-lg px-4 py-3 flex items-center gap-3 shadow-lg animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="w-5 h-5 rounded-full bg-[#2E7D32] flex items-center justify-center shrink-0">
            <Check size={12} className="text-white" strokeWidth={3} />
          </div>
          <span className="text-xs font-semibold text-[#1B5E20]">{toast.message}</span>
        </div>
      )}

      {/* Main Header */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-white px-8 py-5 shrink-0">
        <div>
          {selectedTicket ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedTicket(null)}
                className="p-1.5 rounded-lg hover:bg-gray-50 text-gray-500 hover:text-gray-800 transition-colors border border-gray-100"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <h1 className="text-lg font-bold text-gray-900 leading-tight">
                  {selectedTicket.code}
                </h1>
                <p className="text-[10px] text-gray-400 font-semibold mt-0.5">
                  Assignee: {selectedTicket.agentName}
                </p>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-4">
                <h1 className="text-xl font-bold text-gray-900">Support Tickets</h1>
                <button 
                  onClick={() => setShowNewTicketModal(true)}
                  className="bg-[#0D1B2A] text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-[#162437] transition-colors flex items-center gap-1.5"
                >
                  <Plus size={14} /> New Ticket
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">Manage and respond to user support requests.</p>
            </div>
          )}
        </div>

        {/* Global user section */}
        <div className="flex items-center gap-4">
          <button className="relative w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors border border-gray-100">
            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border border-white" />
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </button>
            <UserHeaderBadge />
        </div>
      </div>

      {selectedTicket === null ? (
        /* --- VIEW 1: TICKETS DASHBOARD LIST --- */
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {/* Stats Cards Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { label: 'Total Ticket', value: totalTicketsCount, icon: FolderOpen, color: 'text-blue-500 bg-blue-50 border-blue-100' },
              { label: 'Opened Ticket', value: openedTicketsCount, icon: AlertCircle, color: 'text-amber-500 bg-amber-50 border-amber-100' },
              { label: 'Pending Ticket', value: pendingTicketsCount, icon: Clock, color: 'text-orange-500 bg-orange-50 border-orange-100' },
              { label: 'Resolved Ticket', value: resolvedTicketsCount, icon: CheckCircle2, color: 'text-emerald-500 bg-emerald-50 border-emerald-100' }
            ].map((stat, idx) => (
              <div key={idx} className="bg-white p-5 rounded-2xl border border-gray-100/80 shadow-sm flex items-center justify-between">
                <div className="space-y-1.5">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{stat.label}</p>
                  <p className="text-3xl font-extrabold text-gray-900 tracking-tight">{stat.value}</p>
                </div>
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${stat.color}`}>
                  <stat.icon size={20} />
                </div>
              </div>
            ))}
          </div>

          {/* Table Container Card */}
          <div className="bg-white rounded-2xl border border-gray-100/80 shadow-sm overflow-hidden flex flex-col">
            {/* Table Header Filter Row */}
            <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <h2 className="text-sm font-bold text-gray-800">Support Tickets</h2>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                {/* Search */}
                <div className="relative flex-1 sm:flex-initial">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                    <Search size={14} />
                  </span>
                  <input
                    type="text"
                    placeholder="Search complaint, client, ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full sm:w-64 pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-xs placeholder-gray-400 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#0D1B2A]/10 focus:border-[#0D1B2A]"
                  />
                </div>

                {/* Filter Popover Trigger */}
                <div className="relative">
                  <button
                    onClick={() => setShowFilterPopover(!showFilterPopover)}
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-bold border rounded-lg transition-colors bg-white ${
                      filterStatus || filterPriority
                        ? 'border-[#0D1B2A] text-[#0D1B2A]'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Filter size={13} />
                    Filter
                  </button>

                  {/* Popover Card */}
                  {showFilterPopover && (
                    <div className="absolute right-0 mt-2.5 w-64 bg-white border border-gray-100 rounded-xl shadow-2xl p-5 z-40 space-y-4">
                      {/* Status filter */}
                      <div>
                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Status</h4>
                        <div className="flex flex-wrap gap-2">
                          {(['opened', 'pending', 'resolved'] as const).map((st) => (
                            <button
                              key={st}
                              onClick={() => setFilterStatus(filterStatus === st ? null : st)}
                              className={`px-3 py-1.5 text-[10px] font-bold rounded-lg border transition-all uppercase tracking-wide ${
                                filterStatus === st
                                  ? 'bg-[#0D1B2A] border-[#0D1B2A] text-white'
                                  : 'border-gray-200 text-gray-600 bg-white hover:bg-gray-50'
                              }`}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Priority filter */}
                      <div>
                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Priority</h4>
                        <div className="flex flex-wrap gap-2">
                          {(['low', 'medium', 'high'] as const).map((pr) => (
                            <button
                              key={pr}
                              onClick={() => setFilterPriority(filterPriority === pr ? null : pr)}
                              className={`px-3 py-1.5 text-[10px] font-bold rounded-lg border transition-all uppercase tracking-wide ${
                                filterPriority === pr
                                  ? 'bg-[#0D1B2A] border-[#0D1B2A] text-white'
                                  : 'border-gray-200 text-gray-600 bg-white hover:bg-gray-50'
                              }`}
                            >
                              {pr}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                        <button
                          onClick={() => {
                            setFilterStatus(null)
                            setFilterPriority(null)
                            setShowFilterPopover(false)
                          }}
                          className="text-[10px] font-bold text-gray-400 hover:text-gray-600 transition-colors uppercase tracking-wider"
                        >
                          Clear All
                        </button>
                        <button
                          onClick={() => setShowFilterPopover(false)}
                          className="px-4 py-1.5 bg-[#0D1B2A] hover:bg-[#162437] text-white text-[10px] font-bold rounded-lg transition-colors uppercase tracking-wider"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto min-h-[400px]">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                    <th className="text-left px-6 py-4">Ticket ID</th>
                    <th className="text-left px-6 py-4">Client</th>
                    <th className="text-left px-6 py-4 w-1/3">Complaint</th>
                    <th className="text-center px-4 py-4 w-28">Status</th>
                    <th className="text-center px-4 py-4 w-28">Priority</th>
                    <th className="text-left px-6 py-4">Agent</th>
                    <th className="text-left px-6 py-4">Date Submitted</th>
                    <th className="text-center px-4 py-4 w-16">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginatedTickets.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-16 text-gray-400 font-medium">
                        No support tickets found matching current filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedTickets.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50/30 transition-colors">
                        {/* ID */}
                        <td className="px-6 py-4 font-bold text-gray-900">{t.code}</td>

                        {/* Client */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-100 overflow-hidden shrink-0 border border-gray-100">
                              {t.clientAvatar ? (
                                <img src={t.clientAvatar} alt={t.clientName} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500 font-semibold text-xs uppercase">
                                  {t.clientName.charAt(0)}
                                </div>
                              )}
                            </div>
                            <span className="font-semibold text-gray-800">{t.clientName}</span>
                          </div>
                        </td>

                        {/* Complaint */}
                        <td className="px-6 py-4 text-gray-600 font-medium line-clamp-1 mt-3">
                          {t.complaint}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-4 text-center">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                              t.status === 'opened'
                                ? 'bg-blue-50 border-blue-100 text-blue-600'
                                : t.status === 'pending'
                                ? 'bg-amber-50 border-amber-100 text-amber-600'
                                : 'bg-emerald-50 border-emerald-100 text-emerald-600'
                            }`}
                          >
                            {t.status}
                          </span>
                        </td>

                        {/* Priority */}
                        <td className="px-4 py-4 text-center font-semibold uppercase tracking-wider text-[10px]">
                          <div className="flex items-center justify-center gap-1.5">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                t.priority === 'high'
                                  ? 'bg-red-500'
                                  : t.priority === 'medium'
                                  ? 'bg-amber-500'
                                  : 'bg-blue-500'
                              }`}
                            />
                            <span
                              className={
                                t.priority === 'high'
                                  ? 'text-red-500'
                                  : t.priority === 'medium'
                                  ? 'text-amber-500'
                                  : 'text-blue-500'
                              }
                            >
                              {t.priority}
                            </span>
                          </div>
                        </td>

                        {/* Agent */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-6.5 h-6.5 rounded-full bg-gray-100 overflow-hidden shrink-0">
                              {t.agentAvatar ? (
                                <img src={t.agentAvatar} alt={t.agentName} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500 font-semibold text-[10px] uppercase">
                                  {t.agentName.charAt(0)}
                                </div>
                              )}
                            </div>
                            <span className="font-medium text-gray-700">{t.agentName}</span>
                          </div>
                        </td>

                        {/* Date submitted */}
                        <td className="px-6 py-4 text-gray-400 font-medium">{t.dateSubmitted}</td>

                        {/* Actions */}
                        <td className="px-4 py-4 text-center relative" ref={actionMenuRef}>
                          <button
                            onClick={() =>
                              setActiveActionMenuId(activeActionMenuId === t.id ? null : t.id)
                            }
                            className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            <MoreVertical size={16} />
                          </button>

                          {activeActionMenuId === t.id && (
                            <div className="absolute right-6 top-10 w-44 bg-white border border-gray-100 rounded-xl shadow-2xl py-1.5 z-40 text-left animate-in fade-in slide-in-from-top-2 duration-150">
                              <button
                                onClick={() => {
                                  handleSelectTicket(t)
                                  setActiveActionMenuId(null)
                                }}
                                className="w-full px-4 py-2 hover:bg-gray-50 text-xs font-bold text-gray-700 flex items-center gap-2"
                              >
                                View Ticket
                              </button>
                              <button
                                onClick={() => setActiveStatusPopoverId(t.id)}
                                className="w-full px-4 py-2 hover:bg-gray-50 text-xs font-bold text-gray-700 flex items-center gap-2 border-t border-gray-50"
                              >
                                Change Status
                              </button>
                            </div>
                          )}

                          {activeStatusPopoverId === t.id && (
                            <div className="absolute right-6 top-20 w-44 bg-white border border-gray-100 rounded-xl shadow-2xl p-3.5 z-50 text-left animate-in fade-in slide-in-from-top-2 duration-150">
                              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-2">Change Status</p>
                              <div className="space-y-1.5">
                                {(['resolved', 'pending', 'opened'] as const).map((st) => (
                                  <label
                                    key={st}
                                    className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-gray-600 hover:text-gray-800"
                                  >
                                    <input
                                      type="radio"
                                      name={`inline-status-${t.id}`}
                                      checked={t.status === st}
                                      onChange={() => handleInlineStatusChange(t.id, st)}
                                      className="rounded-full border-gray-300 text-[#0D1B2A] focus:ring-[#0D1B2A] w-3 h-3 cursor-pointer"
                                    />
                                    <span className="capitalize">{st}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <div className="p-5 border-t border-gray-100 flex items-center justify-between text-xs shrink-0">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg font-bold text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white transition-colors cursor-pointer"
              >
                <ChevronLeft size={14} />
                Previous
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentPage(idx + 1)}
                    className={`w-8 h-8 rounded-lg font-bold flex items-center justify-center transition-colors cursor-pointer ${
                      currentPage === idx + 1
                        ? 'bg-[#0D1B2A] text-white'
                        : 'border border-gray-100 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg font-bold text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white transition-colors cursor-pointer"
              >
                Next
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* --- VIEW 2: TICKET DETAILED CHAT VIEW --- */
        <div className="flex-1 flex min-h-0 overflow-hidden bg-white">
          {/* Sub-Layout Sidebar: Support tickets list */}
          <div className="w-80 border-r border-gray-100 flex flex-col shrink-0">
            {/* Sidebar Stats & Title */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
              <span className="text-xs font-bold text-gray-800">Total Tickets {tickets.length}</span>
              <span className="text-[10px] font-bold bg-[#0D1B2A]/5 text-[#0D1B2A] px-2 py-0.5 rounded-full uppercase tracking-wider">
                Newest
              </span>
            </div>

            {/* Sidebar Search */}
            <div className="p-4 border-b border-gray-100">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <Search size={13} />
                </span>
                <input
                  type="text"
                  placeholder="Search complaint, client, ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-xs placeholder-gray-400 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#0D1B2A]/10 focus:border-[#0D1B2A]"
                />
              </div>
            </div>

            {/* Sidebar list items */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
              {filteredTickets.map((t) => {
                const isActive = t.id === selectedTicket.id
                return (
                  <button
                    key={t.id}
                    onClick={() => handleSelectTicket(t)}
                    className={`w-full text-left p-5 transition-colors hover:bg-gray-50/50 flex flex-col gap-2 ${
                      isActive ? 'bg-[#0D1B2A]/5 hover:bg-[#0D1B2A]/5' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-800">{t.id}</span>
                      <span className="text-[10px] text-gray-400 font-semibold">{t.dateSubmitted.split(',')[0]}</span>
                    </div>
                    <p className="text-xs font-medium text-gray-500 line-clamp-1 leading-normal">
                      {t.complaint}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${
                          t.status === 'opened'
                            ? 'bg-blue-50 border-blue-100 text-blue-600'
                            : t.status === 'pending'
                            ? 'bg-amber-50 border-amber-100 text-amber-600'
                            : 'bg-emerald-50 border-emerald-100 text-emerald-600'
                        }`}
                      >
                        {t.status}
                      </span>
                      <div className="flex items-center gap-1">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            t.priority === 'high'
                              ? 'bg-red-500'
                              : t.priority === 'medium'
                              ? 'bg-amber-500'
                              : 'bg-blue-500'
                          }`}
                        />
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{t.priority}</span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Sub-Layout Main: Chat panel */}
          <div className="flex-1 flex flex-col min-w-0 h-full bg-gray-50/20 relative">
            {/* Chat header */}
            <div className="px-6 py-4 border-b border-gray-100 bg-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-100 border border-gray-100">
                  {selectedTicket.agentAvatar ? (
                    <img src={selectedTicket.agentAvatar} alt={selectedTicket.agentName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500 font-semibold text-sm">
                      {selectedTicket.agentName.charAt(0)}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-800">{selectedTicket.agentName}</h3>
                  <p className="text-[10px] text-gray-400 font-semibold mt-0.5">{selectedTicket.id}</p>
                </div>
              </div>

              {/* Action details toggle */}
              <button
                onClick={() => setShowDetailsDrawer(true)}
                className="px-4 py-2 bg-gray-50 border border-gray-100 text-gray-600 hover:bg-gray-100 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Ticket Details
              </button>
            </div>

            {/* Messages body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col">
              {selectedTicket.messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                  <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 mb-3">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <h4 className="text-xs font-bold text-gray-700">No Messages Yet</h4>
                  <p className="text-[10px] text-gray-400 max-w-xs mt-1 leading-normal">
                    This support ticket does not have any chat history yet. Type a message below to start chatting.
                  </p>
                </div>
              ) : (
                selectedTicket.messages.map((m) => {
                  const isAgent = m.sender === 'agent'
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col gap-1.5 max-w-[70%] ${
                        isAgent ? 'self-end items-end' : 'self-start items-start'
                      }`}
                    >
                      <span className="text-[10px] text-gray-400 font-bold tracking-wide">
                        {m.timestamp}
                      </span>
                      <div className="flex items-end gap-2.5">
                        {!isAgent && (
                          <div className="w-6.5 h-6.5 rounded-full overflow-hidden bg-gray-100 border border-gray-100 shrink-0 mb-1">
                            {m.senderAvatar ? (
                              <img src={m.senderAvatar} alt={m.senderName} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500 font-semibold text-[9px] uppercase">
                                {m.senderName.charAt(0)}
                              </div>
                            )}
                          </div>
                        )}
                        <div
                          className={`rounded-2xl px-5 py-3.5 text-xs font-medium leading-relaxed ${
                            isAgent
                              ? 'bg-[#0D1B2A] text-white rounded-br-none'
                              : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none shadow-sm'
                          }`}
                        >
                          {m.text}
                        </div>
                        {isAgent && (
                          <div className="w-6.5 h-6.5 rounded-full overflow-hidden bg-[#0D1B2A]/5 border border-[#0D1B2A]/10 flex items-center justify-center text-[#0D1B2A] shrink-0 mb-1">
                            {m.hasSupportIcon ? (
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M3 18v-6a9 9 0 0 1 18 0v6M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3" />
                              </svg>
                            ) : (
                              <span className="text-[9px] font-bold">KB</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Chat footer input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-100 bg-white flex items-center gap-3 shrink-0">
              <button
                type="button"
                className="p-2 rounded-lg hover:bg-gray-50 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <Smile size={18} />
              </button>
              <input
                type="text"
                placeholder="Type your message here..."
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
                className="flex-1 px-4 py-3 border border-gray-200 rounded-lg text-xs placeholder-gray-400 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#0D1B2A]/10 focus:border-[#0D1B2A]"
              />
              <button
                type="submit"
                disabled={!newMessageText.trim()}
                className="p-3 bg-[#0D1B2A] hover:bg-[#162437] disabled:opacity-50 text-white rounded-lg transition-colors cursor-pointer"
              >
                <Send size={15} />
              </button>
            </form>
          </div>

          {/* Side Drawer: Ticket Details (Slide-over overlay) */}
          {showDetailsDrawer && (
            <div className="absolute inset-0 bg-black/30 z-50 flex justify-end animate-in fade-in duration-200">
              <div className="w-[450px] bg-white h-full flex flex-col shadow-2xl border-l border-gray-100 animate-in slide-in-from-right duration-300">
                {/* Drawer header */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
                  <h3 className="text-sm font-bold text-gray-900">Ticket Details</h3>
                  <button
                    onClick={() => {
                      setShowDetailsDrawer(false)
                      setShowAgentSearch(false)
                    }}
                    className="p-1 rounded-lg hover:bg-gray-50 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Drawer scrollable body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-gray-700">
                  {/* Assignee Search & Select */}
                  <div className="space-y-1.5 relative">
                    <label className="block font-bold text-gray-500 uppercase tracking-wider text-[10px]">Assign To</label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowAgentSearch(!showAgentSearch)}
                        className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-left bg-white text-xs font-semibold text-gray-700 flex items-center justify-between cursor-pointer"
                      >
                        <span>{drawerAgent || 'Select Agent'}</span>
                        <ChevronRight size={14} className={`text-gray-400 transform transition-transform ${showAgentSearch ? 'rotate-90' : ''}`} />
                      </button>

                      {showAgentSearch && (
                        <div className="absolute left-0 right-0 mt-1.5 bg-white border border-gray-100 rounded-xl shadow-2xl py-1.5 z-40 max-h-56 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-150">
                          <div className="px-3 py-1 border-b border-gray-50 mb-1.5">
                            <input
                              type="text"
                              placeholder="Search agents..."
                              value={agentQuery}
                              onChange={(e) => setAgentQuery(e.target.value)}
                              className="w-full px-3 py-1.5 border border-gray-100 rounded-lg text-xs placeholder-gray-400 text-gray-700 focus:outline-none"
                            />
                          </div>
                          {agentsList
                            .filter((a) => a.name.toLowerCase().includes(agentQuery.toLowerCase()))
                            .map((a) => (
                              <button
                                key={a.name}
                                type="button"
                                onClick={() => {
                                  setDrawerAgent(a.name)
                                  setShowAgentSearch(false)
                                  setAgentQuery('')
                                }}
                                className="w-full px-4 py-2 hover:bg-gray-50 text-xs font-semibold text-gray-700 text-left flex items-center justify-between"
                              >
                                <div className="flex items-center gap-2.5">
                                  <img src={a.avatar} alt={a.name} className="w-5.5 h-5.5 rounded-full object-cover" />
                                  <span>{a.name}</span>
                                </div>
                                {drawerAgent === a.name && <span className="w-1.5 h-1.5 rounded-full bg-[#0D1B2A]" />}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ticket Type */}
                  <div className="space-y-1.5">
                    <label className="block font-bold text-gray-500 uppercase tracking-wider text-[10px]">Ticket Type</label>
                    <div className="relative">
                      <select
                        value={drawerType}
                        onChange={(e) => setDrawerType(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-xs font-semibold text-gray-700 bg-white focus:outline-none cursor-pointer"
                      >
                        <option value="">Select Type</option>
                        {ticketTypes.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Status Pills */}
                  <div className="space-y-2">
                    <label className="block font-bold text-gray-500 uppercase tracking-wider text-[10px]">Set Status</label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { value: 'resolved', label: 'Resolved', dot: 'bg-emerald-500' },
                        { value: 'pending', label: 'Pending', dot: 'bg-amber-500' },
                        { value: 'opened', label: 'Opened', dot: 'bg-blue-500' }
                      ].map((st) => {
                        const isChecked = drawerStatus === st.value
                        return (
                          <button
                            key={st.value}
                            type="button"
                            onClick={() => setDrawerStatus(st.value as TicketStatus)}
                            className={`flex items-center justify-center gap-2 py-2.5 border rounded-xl font-bold transition-all text-[10px] uppercase tracking-wide cursor-pointer ${
                              isChecked
                                ? 'border-[#0D1B2A] bg-[#0D1B2A]/5 text-[#0D1B2A]'
                                : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                            {st.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Priority Pills */}
                  <div className="space-y-2">
                    <label className="block font-bold text-gray-500 uppercase tracking-wider text-[10px]">Set Priority</label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { value: 'low', label: 'Low', dot: 'bg-blue-500' },
                        { value: 'medium', label: 'Medium', dot: 'bg-amber-500' },
                        { value: 'high', label: 'High', dot: 'bg-red-500' }
                      ].map((pr) => {
                        const isChecked = drawerPriority === pr.value
                        return (
                          <button
                            key={pr.value}
                            type="button"
                            onClick={() => setDrawerPriority(pr.value as TicketPriority)}
                            className={`flex items-center justify-center gap-2 py-2.5 border rounded-xl font-bold transition-all text-[10px] uppercase tracking-wide cursor-pointer ${
                              isChecked
                                ? 'border-[#0D1B2A] bg-[#0D1B2A]/5 text-[#0D1B2A]'
                                : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${pr.dot}`} />
                            {pr.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Notes text area */}
                  <div className="space-y-1.5">
                    <label className="block font-bold text-gray-500 uppercase tracking-wider text-[10px]">Note</label>
                    <textarea
                      placeholder="Enter text..."
                      value={drawerNotes}
                      onChange={(e) => setDrawerNotes(e.target.value)}
                      rows={4}
                      className="w-full border border-gray-200 rounded-lg px-4 py-3 text-xs text-gray-700 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-[#0D1B2A]/10 focus:border-[#0D1B2A]"
                    />
                  </div>

                  {/* Labels Section */}
                  <div className="pt-6 border-t border-gray-100 space-y-4">
                    <h4 className="font-bold text-gray-500 uppercase tracking-wider text-[10px]">Label</h4>

                    <div className="grid grid-cols-3 gap-y-3 gap-x-2 text-xs">
                      {/* ID */}
                      <span className="text-gray-400 font-bold">ID</span>
                      <span className="col-span-2 font-bold text-gray-800">{selectedTicket.id}</span>

                      {/* Customer */}
                      <span className="text-gray-400 font-bold">Customer</span>
                      <div className="col-span-2 flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full overflow-hidden shrink-0">
                          {selectedTicket.clientAvatar ? (
                            <img src={selectedTicket.clientAvatar} alt={selectedTicket.clientName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500 font-semibold text-[8px] uppercase">
                              {selectedTicket.clientName.charAt(0)}
                            </div>
                          )}
                        </div>
                        <span className="font-semibold text-gray-800">{selectedTicket.clientName}</span>
                      </div>

                      {/* Location */}
                      <span className="text-gray-400 font-bold">Location</span>
                      <span className="col-span-2 font-semibold text-gray-800">{selectedTicket.location}</span>

                      {/* Date submitted */}
                      <span className="text-gray-400 font-bold">Date submitted</span>
                      <span className="col-span-2 font-medium text-gray-800">{selectedTicket.dateSubmitted}</span>
                    </div>
                  </div>
                </div>

                {/* Drawer actions footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50/20 flex justify-end gap-3 shrink-0">
                  <button
                    onClick={() => {
                      setShowDetailsDrawer(false)
                      setShowAgentSearch(false)
                    }}
                    className="px-5 py-2 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    onClick={handleSaveDrawerDetails}
                    className="px-5 py-2 bg-[#0D1B2A] hover:bg-[#162437] text-white rounded-lg text-xs font-bold transition-colors shadow-sm cursor-pointer"
                  >
                    Save Information
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* NEW TICKET MODAL */}
      {showNewTicketModal && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-[1px]" onClick={() => setShowNewTicketModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-[#F8FAFC]">
                <div>
                  <h2 className="text-base font-bold text-gray-900">Create Support Ticket</h2>
                  <p className="text-[11px] text-gray-500 mt-0.5">Submit a new request or issue to the support team</p>
                </div>
                <button onClick={() => setShowNewTicketModal(false)} className="p-1.5 rounded-full hover:bg-gray-200 text-gray-400">
                  <X size={16} />
                </button>
              </div>
              <div className="p-6 space-y-5 flex-1 overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Issue Type</label>
                    <select
                      className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-blue-500 bg-white"
                      value={newTicketData.type}
                      onChange={(e) => setNewTicketData({ ...newTicketData, type: e.target.value })}
                    >
                      <option value="General Inquiry">General Inquiry</option>
                      <option value="Technical Issue">Technical Issue</option>
                      <option value="Billing Issue">Billing Issue</option>
                      <option value="Feature Request">Feature Request</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Priority</label>
                    <select
                      className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-blue-500 bg-white"
                      value={newTicketData.priority}
                      onChange={(e) => setNewTicketData({ ...newTicketData, priority: e.target.value as TicketPriority })}
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Location / Context</label>
                  <input
                    type="text"
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-blue-500"
                    placeholder="e.g. Project A, Dashboard, Payment Page"
                    value={newTicketData.location}
                    onChange={(e) => setNewTicketData({ ...newTicketData, location: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Description</label>
                  <textarea
                    rows={4}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-blue-500 resize-none"
                    placeholder="Please describe your issue in detail..."
                    value={newTicketData.complaint}
                    onChange={(e) => setNewTicketData({ ...newTicketData, complaint: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-[#F8FAFC]">
                <button
                  onClick={() => setShowNewTicketModal(false)}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTicket}
                  className="px-4 py-2 rounded-lg bg-[#0D1B2A] text-sm font-medium text-white hover:bg-[#162437] transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmittingTicket && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  Submit Ticket
                </button>
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  )
}
