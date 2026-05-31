'use server'

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

let mockTickets: SupportTicket[] = [
  {
    id: '#Ticket 1234',
    clientName: 'Cynthia Whales',
    clientAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    complaint: 'Roof is leaking during rainfall in living room',
    type: 'Service Issue',
    status: 'opened',
    priority: 'medium',
    agentName: 'Karen Brooks',
    agentAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    location: 'Oakdale, NV',
    dateSubmitted: '11 Jan 2026, 14:00 pm',
    notes: 'Customer is very concerned about structural damage. Needs urgent follow-up.',
    messages: [
      {
        id: 'm1',
        sender: 'agent',
        senderName: 'Karen Brooks',
        senderAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
        text: 'Hi there 👋 thanks for reaching out to Peak Roofing support. How can I help you today?',
        timestamp: 'Today at, 12:40 PM',
        hasSupportIcon: true
      },
      {
        id: 'm2',
        sender: 'client',
        senderName: 'Cynthia Whales',
        senderAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
        text: 'Hi, I scheduled a roof inspection but no one showed up.',
        timestamp: 'Today at, 12:40 PM'
      },
      {
        id: 'm3',
        sender: 'agent',
        senderName: 'Karen Brooks',
        senderAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
        text: "I'm really sorry about that, that's not the experience we want for you. Let me quickly check what happened.",
        timestamp: 'Today at, 12:40 PM',
        hasSupportIcon: true
      },
      {
        id: 'm4',
        sender: 'client',
        senderName: 'Cynthia Whales',
        senderAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
        text: 'Can you confirm the address and the scheduled date for the inspection?',
        timestamp: 'Today at, 12:40 PM'
      },
      {
        id: 'm5',
        sender: 'agent',
        senderName: 'Karen Brooks',
        senderAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
        text: 'Yes, it was 12 Palm Street, scheduled for yesterday morning.',
        timestamp: 'Today at, 12:40 PM',
        hasSupportIcon: true
      },
      {
        id: 'm6',
        sender: 'client',
        senderName: 'Cynthia Whales',
        senderAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
        text: "Thanks for confirming, I can see the booking here - it looks like there was a delay on our team's end due to an earlier job running longer than expected.",
        timestamp: 'Today at, 12:40 PM'
      }
    ]
  },
  {
    id: '#TI1236',
    clientName: 'Jose Martinez',
    clientAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    complaint: 'Roof is leaking during rainfall in living room',
    type: 'Service Issue',
    status: 'opened',
    priority: 'high',
    agentName: 'Karen Brooks',
    agentAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    location: 'Las Vegas, NV',
    dateSubmitted: '12 Feb 2026',
    messages: [
      {
        id: 'm2_1',
        sender: 'client',
        senderName: 'Jose Martinez',
        text: 'Roof is leaking during rainfall in living room. Need a technician soon.',
        timestamp: 'Yesterday at, 12:40 PM'
      }
    ]
  },
  {
    id: '#TI1239',
    clientName: 'Jose Martinez',
    clientAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    complaint: 'Shingles blown off after recent storm',
    type: 'Technical Bug',
    status: 'resolved',
    priority: 'low',
    agentName: 'Michael Chen',
    agentAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    location: 'Reno, NV',
    dateSubmitted: '12 Mar 2026',
    messages: []
  },
  {
    id: '#TI1238',
    clientName: 'Jose Martinez',
    clientAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    complaint: 'Snow is on the way!',
    type: 'Service Issue',
    status: 'opened',
    priority: 'medium',
    agentName: 'Aisha Patel',
    agentAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    location: 'Henderson, NV',
    dateSubmitted: '21 Jan 2026',
    messages: []
  },
  {
    id: '#TI1237',
    clientName: 'Jose Martinez',
    clientAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    complaint: 'Hey, I forgot to clock out yesterday. I left at...',
    type: 'Misconduct',
    status: 'pending',
    priority: 'high',
    agentName: 'Liam O\'Sullivan',
    agentAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    location: 'Boulder City, NV',
    dateSubmitted: '26 Feb 2026',
    messages: []
  },
  {
    id: '#TI1235',
    clientName: 'Jose Martinez',
    clientAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    complaint: 'Can we shift the crew start time to 6:30...',
    type: 'Service Issue',
    status: 'resolved',
    priority: 'medium',
    agentName: 'Nina Rodriguez',
    agentAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    location: 'North Las Vegas, NV',
    dateSubmitted: '19 Feb 2026',
    messages: []
  },
  {
    id: '#TI1234',
    clientName: 'Jose Martinez',
    clientAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    complaint: 'Ceiling damage due to suspected roof leak.',
    type: 'Service Issue',
    status: 'opened',
    priority: 'medium',
    agentName: 'Mohamed Al-Farsi',
    agentAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
    location: 'Mohamed Al-Farsi',
    dateSubmitted: '12 Feb 2026',
    messages: []
  },
  {
    id: '#TI1240',
    clientName: 'Jose Martinez',
    clientAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    complaint: 'Water stains appearing after recent repairs.',
    type: 'Service Issue',
    status: 'resolved',
    priority: 'low',
    agentName: 'Emily Johnson',
    agentAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
    location: 'Emily Johnson',
    dateSubmitted: '19 Mar 2026',
    messages: []
  }
]

export async function getSupportTickets(): Promise<SupportTicket[]> {
  return mockTickets
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
): Promise<{ success: boolean; ticket: SupportTicket }> {
  const index = mockTickets.findIndex(t => t.id === ticketId)
  if (index !== -1) {
    mockTickets[index] = {
      ...mockTickets[index],
      ...updates
    }
    return { success: true, ticket: mockTickets[index] }
  }
  throw new Error('Ticket not found')
}

export async function addChatMessage(
  ticketId: string,
  message: {
    sender: 'client' | 'agent'
    senderName: string
    senderAvatar?: string
    text: string
  }
): Promise<{ success: boolean; chatMessage: ChatMessage }> {
  const index = mockTickets.findIndex(t => t.id === ticketId)
  if (index !== -1) {
    const newMsg: ChatMessage = {
      id: crypto.randomUUID(),
      ...message,
      timestamp: 'Today at, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      hasSupportIcon: message.sender === 'agent'
    }
    mockTickets[index].messages.push(newMsg)
    return { success: true, chatMessage: newMsg }
  }
  throw new Error('Ticket not found')
}
