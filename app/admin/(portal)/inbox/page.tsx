'use client'

import { useState, useRef, useEffect } from 'react'
import { 
   Search, MoreVertical, Paperclip, Smile, Send, 
   Image as ImageIcon, Camera, MapPin, FileText, 
   X, Phone, Mail, Calendar, DollarSign, Briefcase,
   CheckCheck, Check
} from 'lucide-react'
import UserHeaderBadge from '@/app/components/ui/UserHeaderBadge'

// ─── Types ─────────────────────────────────────────────────────────────────────
interface User {
   id: string
   name: string
   avatar: string
   lastMessage: string
   time: string
   unreadCount: number
   isRead?: boolean
   role: 'client' | 'staff'
   details: {
      email: string
      phone: string
      location?: string
      department?: string
      joined?: string
      spent?: string
      earned?: string
   }
}

interface Message {
   id: string
   text: string
   time: string
   isSender: boolean
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const mockUsers: User[] = [
   {
      id: '1',
      name: 'Karen Brooks',
      avatar: 'https://i.pravatar.cc/150?u=kb',
      lastMessage: 'Can we shift the crew start time to 8:30...',
      time: '12:40 PM',
      unreadCount: 1,
      role: 'client',
      details: {
         email: 'kb@gmail.com',
         phone: '+1 23 4567 89',
         location: 'Oakdale Residential',
         joined: 'Sun, Apr 5',
         spent: '$100,000'
      }
   },
   {
      id: '2',
      name: 'Troy Shaw',
      avatar: 'https://i.pravatar.cc/150?u=ts',
      lastMessage: 'RTI-888 — Roof Deck Thickness Cert...',
      time: '12:30 PM',
      unreadCount: 0,
      isRead: true,
      role: 'staff',
      details: {
         email: 'troy@peakroofing.com',
         phone: '+1 33 2211 55',
         department: 'Engineering',
         earned: '$75,000'
      }
   },
   {
      id: '3',
      name: 'Cameron Williamson',
      avatar: 'https://i.pravatar.cc/150?u=cw',
      lastMessage: 'Snow is on the way!',
      time: '12:15 PM',
      unreadCount: 3,
      role: 'client',
      details: {
         email: 'cw@biz.com',
         phone: '+1 55 6677 88',
         location: 'Downtown Lofts',
         joined: 'Mon, Mar 12',
         spent: '$45,500'
      }
   },
   {
      id: '4',
      name: 'Jose Martinez',
      avatar: 'https://i.pravatar.cc/150?u=jm',
      lastMessage: 'Hey, I forgot to clock out yesterday. I left at...',
      time: '11:55 AM',
      unreadCount: 0,
      isRead: true,
      role: 'staff',
      details: {
         email: 'jose.m@staff.com',
         phone: '+1 99 8887 77',
         department: 'Roofing Team B',
         earned: '$50,200'
      }
   },
   {
      id: '5',
      name: 'Ahmed Khan',
      avatar: 'https://i.pravatar.cc/150?u=ah',
      lastMessage: 'The shipment just arrived at Sector G.',
      time: '10:10 AM',
      unreadCount: 0,
      role: 'staff',
      details: {
         email: 'ahmed@site.com',
         phone: '+1 77 6655 44',
         department: 'Logistics',
         earned: '$65,000'
      }
   }
]

const mockConversation: Message[] = [
   { id: 'm1', text: "Hi John, the material supplier just confirmed delivery for 7:00 AM tomorrow on the Oakdale site. Can we adjust our start time to 6:30 AM so they can prep the area before the truck arrives? Let me know if that's possible.", time: '10:40 PM', isSender: false },
   { id: 'm2', text: "Sounds Good! Yes, let's revert to 6:30 AM. I'll send the crew a notification now. Make sure J. Martinez knows — he's leading that section.", time: '11:00 PM', isSender: true },
   { id: 'm3', text: "Perfect, thanks! I'll confirm with Jose directly too. Also, should we order more flashing sheets just in case? I've seen a bit short last time.", time: '12:40 PM', isSender: false },
]

// ─── Components ────────────────────────────────────────────────────────────────
function InfoDrawer({ user, onClose }: { user: User; onClose: () => void }) {
   const isStaff = user.role === 'staff'
   return (
      <>
         <div className="fixed inset-0 bg-black/40 z-[100] backdrop-blur-[1px]" onClick={onClose} />
         <div className="fixed inset-y-0 right-0 z-[101] flex">
            <div className="bg-white w-[550px] max-w-full h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
               <div className="px-8 py-6 flex items-center justify-between border-b border-gray-100">
                  <h3 className="text-base font-black text-gray-900">{isStaff ? 'Staff Info' : 'Client Info'}</h3>
                  <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors"><X size={18}/></button>
               </div>
               <div className="flex-1 overflow-y-auto p-8 bg-[#FCFCFD]">
                  {/* Header/Hero */}
                  <div className="flex flex-col items-center mb-10">
                     <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white shadow-lg mb-4">
                        <img src={user.avatar} className="w-full h-full object-cover" alt={user.name} />
                     </div>
                     <h2 className="text-xl font-black text-gray-900">{user.name}</h2>
                     <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-1">{isStaff ? user.details.department : 'Customer'}</p>
                  </div>

                  {/* Details Grid */}
                  <div className="mb-10">
                     <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Details</h4>
                     <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                        <div className="grid grid-cols-[120px_1fr] divide-y divide-x divide-gray-50">
                           <div className="px-5 py-3.5 text-xs font-bold text-gray-500 flex items-center gap-2 bg-gray-50/50"><Briefcase size={12}/> Name</div>
                           <div className="px-5 py-3.5 text-xs font-black text-gray-900 flex items-center">{user.name}</div>
                           
                           <div className="px-5 py-3.5 text-xs font-bold text-gray-500 flex items-center gap-2 bg-gray-50/50"><Mail size={12}/> Email</div>
                           <div className="px-5 py-3.5 text-xs font-bold text-blue-600 flex items-center truncate">{user.details.email}</div>

                           <div className="px-5 py-3.5 text-xs font-bold text-gray-500 flex items-center gap-2 bg-gray-50/50"><Phone size={12}/> Phone No</div>
                           <div className="px-5 py-3.5 text-xs font-black text-gray-900 flex items-center">{user.details.phone}</div>

                           {isStaff ? (
                              <>
                                 <div className="px-5 py-3.5 text-xs font-bold text-gray-500 flex items-center gap-2 bg-gray-50/50"><Briefcase size={12}/> Department</div>
                                 <div className="px-5 py-3.5 text-xs font-black text-gray-900 flex items-center">{user.details.department}</div>
                                 <div className="px-5 py-3.5 text-xs font-bold text-gray-500 flex items-center gap-2 bg-gray-50/50"><DollarSign size={12}/> Earned</div>
                                 <div className="px-5 py-3.5 text-xs font-black text-gray-900 flex items-center">{user.details.earned}</div>
                              </>
                           ) : (
                              <>
                                 <div className="px-5 py-3.5 text-xs font-bold text-gray-500 flex items-center gap-2 bg-gray-50/50"><MapPin size={12}/> Location</div>
                                 <div className="px-5 py-3.5 text-xs font-black text-gray-900 flex items-center">{user.details.location}</div>
                                 <div className="px-5 py-3.5 text-xs font-bold text-gray-500 flex items-center gap-2 bg-gray-50/50"><Calendar size={12}/> Joined</div>
                                 <div className="px-5 py-3.5 text-xs font-black text-gray-900 flex items-center">{user.details.joined}</div>
                                 <div className="px-5 py-3.5 text-xs font-bold text-gray-500 flex items-center gap-2 bg-gray-50/50"><DollarSign size={12}/> Spent</div>
                                 <div className="px-5 py-3.5 text-xs font-black text-gray-900 flex items-center">{user.details.spent}</div>
                              </>
                           )}
                        </div>
                     </div>
                  </div>

                  {/* Associated Projects */}
                  <div>
                     <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">All Projects</h4>
                     <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                        <table className="w-full text-left border-collapse">
                           <thead className="bg-gray-50/50">
                              <tr className="text-[10px] font-black text-gray-500 uppercase tracking-wider border-b border-gray-100">
                                 <th className="px-5 py-3">Project</th>
                                 <th className="px-5 py-3">{isStaff ? 'Manager' : 'Amount Spent'}</th>
                                 <th className="px-5 py-3">Status</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-gray-50 text-xs font-medium text-gray-600">
                              <tr>
                                 <td className="px-5 py-3 font-bold text-gray-800">Full tear-off & overlay</td>
                                 <td className="px-5 py-3 text-gray-500">{isStaff ? 'Ahmed Khan' : '$18,000'}</td>
                                 <td className="px-5 py-3"><span className="bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded text-[9px] font-black uppercase border border-amber-100">In Progress</span></td>
                              </tr>
                              <tr>
                                 <td className="px-5 py-3 font-bold text-gray-800">Cleanup & disposal</td>
                                 <td className="px-5 py-3 text-gray-500">{isStaff ? 'Linda Chen' : '$4,500'}</td>
                                 <td className="px-5 py-3"><span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded text-[9px] font-black uppercase border border-emerald-100">Completed</span></td>
                              </tr>
                           </tbody>
                        </table>
                     </div>
                  </div>
               </div>
               <div className="p-6 border-t border-gray-100 bg-white flex justify-end">
                  <button onClick={onClose} className="px-6 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50 border border-gray-200 rounded-xl">Close</button>
               </div>
            </div>
         </div>
      </>
   )
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function InboxPage() {
   const [tab, setTab] = useState<'clients' | 'staffs'>('clients')
   const [selectedUser, setSelectedUser] = useState<User>(mockUsers[0])
   const [showDrawer, setShowDrawer] = useState(false)
   const [msgInput, setMsgInput] = useState('')
   const [attachMenuOpen, setAttachMenuOpen] = useState(false)

   const filteredUsers = mockUsers.filter(u => {
      if (tab === 'clients') return u.role === 'client'
      return u.role === 'staff'
   })

   const activeConversation = mockConversation // Simplified, in real would fetch by userId

   return (
      <div className="flex flex-col h-full bg-[#F3F5F8] overflow-hidden">
         {/* Fixed Global Header */}
         <div className="flex-none bg-white border-b border-gray-100 px-8 py-5">
            <div className="flex items-center justify-between">
               <div>
                  <h1 className="text-xl font-black text-gray-900 tracking-tight">Inbox</h1>
                  <p className="text-gray-400 text-xs mt-0.5 font-medium">Team messages, project threads, and client communications.</p>
               </div>
               <div className="flex items-center gap-3">
                  <UserHeaderBadge />
               </div>
            </div>
         </div>

         {/* Workspace Split View */}
         <div className="flex-1 flex overflow-hidden p-6 gap-6">
            
            {/* Left Pane: Contact Lists */}
            <div className="w-80 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
               
               {/* Selector Tabs */}
               <div className="flex-none p-4 border-b border-gray-50">
                  <div className="flex p-1 bg-gray-100 rounded-xl">
                     <button onClick={() => setTab('clients')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${tab === 'clients' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>Clients</button>
                     <button onClick={() => setTab('staffs')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${tab === 'staffs' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>Staffs</button>
                  </div>
               </div>

               {/* Search within Contacts */}
               <div className="flex-none px-4 pb-4">
                  <div className="relative">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                     <input placeholder="Search" className="w-full pl-9 pr-4 py-2 bg-gray-50 rounded-xl text-xs border border-transparent focus:border-gray-200 outline-none focus:ring-0 transition-all font-medium" />
                  </div>
               </div>

               {/* Scrollable User Thread List */}
               <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
                  {filteredUsers.map(u => (
                     <div 
                        key={u.id} 
                        onClick={() => setSelectedUser(u)}
                        className={`flex items-start gap-3 px-4 py-4 cursor-pointer hover:bg-blue-50/30 transition-colors border-l-2 ${selectedUser.id === u.id ? 'bg-blue-50/30 border-blue-600' : 'border-transparent'}`}
                     >
                        <div className="w-10 h-10 rounded-full overflow-hidden flex-none border border-gray-100 bg-gray-50">
                           <img src={u.avatar} className="w-full h-full object-cover" alt={u.name} />
                        </div>
                        <div className="flex-1 min-w-0">
                           <div className="flex justify-between items-baseline">
                              <h4 className={`text-xs font-black truncate ${u.unreadCount > 0 ? 'text-gray-900' : 'text-gray-800'}`}>{u.name}</h4>
                              <span className="text-[9px] font-medium text-gray-400 ml-2 whitespace-nowrap">{u.time}</span>
                           </div>
                           <p className={`text-[11px] mt-0.5 truncate ${u.unreadCount > 0 ? 'text-gray-800 font-bold' : 'text-gray-500'}`}>{u.lastMessage}</p>
                        </div>
                        <div className="flex-none flex items-center justify-center h-10">
                           {u.unreadCount > 0 ? (
                              <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center text-[8px] font-black text-white">{u.unreadCount}</div>
                           ) : u.isRead ? (
                              <CheckCheck size={14} className="text-emerald-500" />
                           ) : null}
                        </div>
                     </div>
                  ))}
               </div>
            </div>

            {/* Right Pane: Active Chat Space */}
            <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden relative">
               
               {/* Chat Header */}
               <div className="flex-none px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white/80 backdrop-blur-md z-10">
                  <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setShowDrawer(true)}>
                     <div className="w-9 h-9 rounded-full overflow-hidden border border-gray-100 shadow-sm transition-transform group-hover:scale-105">
                        <img src={selectedUser.avatar} alt={selectedUser.name} className="w-full h-full object-cover" />
                     </div>
                     <div>
                        <h3 className="text-sm font-black text-gray-900 group-hover:text-blue-600 transition-colors">{selectedUser.name}</h3>
                        <p className="text-[10px] font-bold text-gray-400">{selectedUser.role === 'client' ? selectedUser.details.location : selectedUser.details.department}</p>
                     </div>
                  </div>
                  <button onClick={() => setShowDrawer(true)} className="w-8 h-8 rounded-full hover:bg-gray-50 flex items-center justify-center text-gray-400"><MoreVertical size={16}/></button>
               </div>

               {/* Message Body */}
               <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#FCFCFD]">
                  
                  <div className="flex justify-center">
                     <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-100 px-3 py-1 rounded-full">Today, at 10:40 PM</span>
                  </div>

                  {activeConversation.map((msg, idx) => {
                     const isSender = msg.isSender
                     return (
                        <div key={msg.id} className={`flex ${isSender ? 'justify-end' : 'justify-start'}`}>
                           <div className={`flex gap-3 max-w-[75%] ${isSender ? 'flex-row-reverse' : 'flex-row'}`}>
                              {!isSender && (
                                 <div className="w-8 h-8 rounded-full overflow-hidden flex-none self-end mb-1">
                                    <img src={selectedUser.avatar} alt="avatar" className="w-full h-full object-cover" />
                                 </div>
                              )}
                              <div>
                                 <div className={`p-4 rounded-2xl text-sm font-medium leading-relaxed shadow-sm ${
                                    isSender 
                                       ? 'bg-[#0D1B2A] text-white rounded-br-none' 
                                       : 'bg-white border border-gray-100 text-gray-800 rounded-bl-none'
                                 }`}>
                                    {msg.text}
                                 </div>
                                 <div className={`text-[9px] font-bold text-gray-400 mt-1.5 flex items-center gap-1 ${isSender ? 'justify-end' : 'justify-start'}`}>
                                    {msg.time}
                                    {isSender && <Check size={10} className="text-blue-400"/>}
                                 </div>
                              </div>
                           </div>
                        </div>
                     )
                  })}
                  
                  {/* Secondary Date Break Marker visual for Figma alignment */}
                  <div className="flex justify-center py-2">
                     <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-100 px-3 py-1 rounded-full">Today, at 12:30 PM</span>
                  </div>
               </div>

               {/* Interaction Input Bar */}
               <div className="flex-none p-4 border-t border-gray-100 bg-white relative">
                  {/* Attachment Tooltip Drawer */}
                  {attachMenuOpen && (
                     <div className="absolute bottom-20 left-4 w-44 bg-white rounded-xl shadow-2xl border border-gray-100 p-1.5 animate-in slide-in-from-bottom-4 fade-in duration-200 overflow-hidden z-20">
                        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 text-xs font-bold text-gray-700 transition-colors">
                           <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center"><ImageIcon size={14}/></div>
                           Photos
                        </button>
                        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 text-xs font-bold text-gray-700 transition-colors">
                           <div className="w-7 h-7 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center"><Camera size={14}/></div>
                           Camera
                        </button>
                        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 text-xs font-bold text-gray-700 transition-colors">
                           <div className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center"><MapPin size={14}/></div>
                           Location
                        </button>
                        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 text-xs font-bold text-gray-700 transition-colors">
                           <div className="w-7 h-7 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center"><FileText size={14}/></div>
                           Document
                        </button>
                     </div>
                  )}

                  <div className="flex items-center gap-3 bg-[#F8F9FB] border border-gray-200 rounded-xl p-1.5 pl-3 focus-within:ring-2 focus-within:ring-blue-500/10 focus-within:border-blue-400 transition-all">
                     <button onClick={() => setAttachMenuOpen(!attachMenuOpen)} className={`w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm transition-all text-gray-400 hover:text-gray-700 ${attachMenuOpen ? 'bg-white text-gray-700 rotate-45' : ''}`}>
                        <Paperclip size={18} />
                     </button>
                     <input 
                        type="text" 
                        value={msgInput}
                        onChange={(e) => setMsgInput(e.target.value)}
                        placeholder="Type your message here..." 
                        className="flex-1 bg-transparent border-none outline-none text-sm text-gray-800 placeholder:text-gray-400 font-medium"
                     />
                     <button className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-yellow-500 transition-colors"><Smile size={18} /></button>
                     <button className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all shadow-sm ${msgInput.trim().length > 0 ? 'bg-[#0D1B2A] text-white' : 'bg-gray-200 text-gray-400'}`}>
                        <Send size={16} className="translate-x-px" />
                     </button>
                  </div>
               </div>
            </div>
         </div>

         {/* Persistent Info Layer */}
         {showDrawer && (
            <InfoDrawer user={selectedUser} onClose={() => setShowDrawer(false)} />
         )}
      </div>
   )
}
