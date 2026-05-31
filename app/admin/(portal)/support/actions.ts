'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type TicketStatus = 'opened' | 'pending' | 'resolved'
export type TicketPriority = 'low' | 'medium' | 'high'

export type ChatMessage = {
  id: string
  sender: 'client' | 'agent'
  senderName: string
  senderAvatar?: string
  text: string
  timestamp: string
  hasSupportIcon?: boolean
}

export type SupportTicket = {
  id: string
  code: string
  clientName: string
  clientAvatar?: string
  complaint: string
  type: string
  status: TicketStatus
  priority: TicketPriority
  agentName: string
  agentAvatar?: string
  location: string
  dateSubmitted: string
  notes?: string
  messages: ChatMessage[]
}

function formatDate(isoString: string) {
  const d = new Date(isoString)
  return d.toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  }) + ', ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

export async function getSupportTickets(): Promise<SupportTicket[]> {
  const supabase = createAdminClient()
  
  const { data, error } = await supabase
    .from('support_tickets')
    .select(`
      *,
      client:users!support_tickets_client_id_fkey(first_name, last_name, avatar_url),
      agent:users!support_tickets_agent_id_fkey(first_name, last_name, avatar_url),
      messages:support_messages(
        id,
        sender_id,
        text,
        created_at,
        sender:users!support_messages_sender_id_fkey(first_name, last_name, avatar_url, role)
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching support tickets:', error)
    return []
  }

  return (data || []).map((row: any) => {
    const clientName = row.client ? `${row.client.first_name} ${row.client.last_name}` : 'Unknown Client'
    const agentName = row.agent ? `${row.agent.first_name} ${row.agent.last_name}` : 'Unassigned'
    
    const mappedMessages = (row.messages || []).map((m: any) => {
      const isClient = m.sender?.role === 'client'
      return {
        id: m.id,
        sender: isClient ? 'client' : 'agent',
        senderName: m.sender ? `${m.sender.first_name} ${m.sender.last_name}` : 'Unknown',
        senderAvatar: m.sender?.avatar_url,
        text: m.text,
        timestamp: formatDate(m.created_at),
        hasSupportIcon: !isClient
      }
    }).sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    return {
      id: row.id,
      code: row.code,
      clientName,
      clientAvatar: row.client?.avatar_url,
      complaint: row.complaint,
      type: row.type,
      status: row.status,
      priority: row.priority,
      agentName,
      agentAvatar: row.agent?.avatar_url,
      location: row.location,
      dateSubmitted: formatDate(row.created_at),
      notes: row.notes,
      messages: mappedMessages
    }
  })
}

export async function saveTicketDetails(
  ticketId: string,
  updates: {
    agentName: string
    agentAvatar?: string
    type: string
    status: TicketStatus
    priority: TicketPriority
    notes?: string
  }
): Promise<{ success: boolean; ticket?: SupportTicket; error?: string }> {
  const supabase = createAdminClient()

  // Find agent_id from agentName if needed (skip for now or implement user lookup)
  // Since UI only sends agentName string and not ID, we just update the text fields
  // Actually, UI updates status, priority, type, notes.
  
  const { data, error } = await supabase
    .from('support_tickets')
    .update({
      status: updates.status,
      priority: updates.priority,
      type: updates.type,
      notes: updates.notes,
    })
    .eq('id', ticketId)
    .select()
    .single()

  if (error) {
    console.error('saveTicketDetails error:', error)
    return { success: false, error: error.message }
  }

  // Refetch the fully joined ticket
  const allTickets = await getSupportTickets()
  const updatedTicket = allTickets.find(t => t.id === ticketId)

  return { success: true, ticket: updatedTicket }
}

export async function addChatMessage(
  ticketId: string,
  message: {
    sender: 'client' | 'agent'
    senderName: string
    senderAvatar?: string
    text: string
  }
): Promise<{ success: boolean; chatMessage?: ChatMessage; error?: string }> {
  const supabase = createAdminClient()

  // We need to resolve sender_id. This should normally use auth.uid() in client context.
  // Since this is a server action, let's look up the user ID by name or just use a fallback.
  // Actually, for this implementation, we will look up the sender_id from the users table.
  const nameParts = message.senderName.split(' ')
  const firstName = nameParts[0] || ''
  
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('first_name', firstName)
    .limit(1)
    .single()

  if (!user) {
    return { success: false, error: 'Sender user not found in database' }
  }

  const { data, error } = await supabase
    .from('support_messages')
    .insert({
      ticket_id: ticketId,
      sender_id: user.id,
      text: message.text,
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  const newMsg: ChatMessage = {
    id: data.id,
    sender: message.sender,
    senderName: message.senderName,
    senderAvatar: message.senderAvatar,
    text: message.text,
    timestamp: formatDate(data.created_at),
    hasSupportIcon: message.sender === 'agent'
  }

  return { success: true, chatMessage: newMsg }
}

export type CreateSupportTicketInput = {
  type: string
  priority: TicketPriority
  location: string
  complaint: string
}

export async function createSupportTicket(input: CreateSupportTicketInput) {
  const supabaseServer = await createClient()
  const { data: { user } } = await supabaseServer.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const supabaseAdmin = createAdminClient()

  // Generate a random ticket code, e.g., #TI4921
  const code = '#TI' + Math.floor(1000 + Math.random() * 9000)

  const { data, error } = await supabaseAdmin
    .from('support_tickets')
    .insert({
      code,
      client_id: user.id,
      type: input.type,
      priority: input.priority,
      location: input.location,
      complaint: input.complaint,
      status: 'opened',
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error creating ticket:', error)
    return { error: error.message }
  }

  revalidatePath('/admin/support')
  return { id: data.id }
}
