'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  TrendingUp,
  CheckSquare,
  Shield,
  Receipt,
  Clock,
  Package,
  Inbox,
  Settings,
  HelpCircle,
  ChevronDown,
} from 'lucide-react'

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/admin/dashboard' },
  { label: 'Employees', icon: Users, href: '/admin/employees' },
  { label: 'Projects', icon: FolderKanban, href: '/admin/projects' },
  { label: 'CRM / Leads', icon: TrendingUp, href: '/admin/crm' },
  { label: 'Tasks', icon: CheckSquare, href: '/admin/tasks' },
  { label: 'Insurance', icon: Shield, href: '/admin/insurance' },
  { label: 'Invoice & Billing', icon: Receipt, href: '/admin/invoices' },
  { label: 'Time Tracking', icon: Clock, href: '/admin/time-tracking' },
  { label: 'Inventory', icon: Package, href: '/admin/inventory' },
  { label: 'Inbox', icon: Inbox, href: '/admin/inbox' },
]

const bottomItems = [
  { label: 'Settings', icon: Settings, href: '/admin/settings' },
  { label: 'Help & Support', icon: HelpCircle, href: '/admin/support' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 shrink-0 flex flex-col bg-[#0D1B2A] h-screen">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/10">
        <div className="flex items-center justify-center w-8 h-8 bg-white/10 rounded-md">
          <span className="text-white font-bold text-[10px] tracking-widest">PEAK</span>
        </div>
        <div>
          <p className="text-white font-semibold text-sm leading-none">Peak Roofing</p>
          <p className="text-white/40 text-[10px] mt-0.5">Admin Portal</p>
        </div>
      </div>

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {navItems.map(({ label, icon: Icon, href }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-white/10 text-white font-medium'
                  : 'text-white/50 hover:bg-white/5 hover:text-white/80'
              }`}
            >
              <Icon size={16} strokeWidth={active ? 2 : 1.5} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom nav */}
      <div className="px-3 pb-3 space-y-0.5 border-t border-white/10 pt-3">
        {bottomItems.map(({ label, icon: Icon, href }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/50 hover:bg-white/5 hover:text-white/80 transition-colors"
          >
            <Icon size={16} strokeWidth={1.5} />
            {label}
          </Link>
        ))}
      </div>

      {/* User profile */}
      <div className="px-3 pb-4">
        <button className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-semibold">JD</span>
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-white text-xs font-medium truncate">John Doe</p>
            <p className="text-white/40 text-[10px] truncate">Administrator</p>
          </div>
          <ChevronDown size={13} className="text-white/30 shrink-0" />
        </button>
      </div>
    </aside>
  )
}
