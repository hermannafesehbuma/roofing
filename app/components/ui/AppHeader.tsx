'use client'

import { usePathname } from 'next/navigation'
import { Bell } from 'lucide-react'
import UserHeaderBadge from './UserHeaderBadge'

/**
 * The single portal header. Rendered once in the (portal) layout — pages must
 * not ship their own title bar. Titles are keyed by route prefix, so detail
 * pages (/admin/employees/[id]) inherit their section heading.
 */
const PAGE_TITLES: { prefix: string; title: string; subtitle: string }[] = [
  { prefix: '/admin/settings',      title: 'Settings',                  subtitle: 'Manage your team members, roles, and access permissions' },
  { prefix: '/admin/dashboard',     title: 'Dashboard',                 subtitle: 'Overview of everything happening' },
  { prefix: '/admin/employees',     title: 'Employees',                 subtitle: 'Manage all your team members in one place.' },
  { prefix: '/admin/projects',      title: 'Projects',                  subtitle: 'Manage all your projects, timelines, and team assignments in one place.' },
  { prefix: '/admin/crm',           title: 'CRM / Leads',               subtitle: 'Track leads and manage client relationships.' },
  { prefix: '/admin/tasks',         title: 'Tasks',                     subtitle: 'Track, assign, and manage all project tasks across your team.' },
  { prefix: '/admin/insurance',     title: 'Insurance & Certificates',  subtitle: 'Track COI policies, employee certifications, and upcoming expirations.' },
  { prefix: '/admin/invoices',      title: 'Invoice & Billing',         subtitle: 'Create, send, and track all invoices and payments in one place.' },
  { prefix: '/admin/time-tracking', title: 'Time Tracking',             subtitle: 'Clock In/Out, manage timesheets, and approve team hours.' },
  { prefix: '/admin/inventory',     title: 'Inventory',                 subtitle: 'Track materials, stock levels, and purchase orders for all projects.' },
  { prefix: '/admin/inbox',         title: 'Inbox',                     subtitle: 'Team messages, project threads, and client communications.' },
  { prefix: '/admin/documents',     title: 'Documents',                 subtitle: 'Contracts, permits, and project paperwork in one place.' },
  { prefix: '/admin/support',       title: 'Help & Support',            subtitle: 'Manage and respond to user support requests.' },
  { prefix: '/admin/profile',       title: 'My Profile',                subtitle: 'Your account details, photo, and sign-in.' },
]

export default function AppHeader() {
  const pathname = usePathname() ?? ''
  // Longest prefix wins so /admin/settings/employees/[id] stays on Settings.
  const page = PAGE_TITLES
    .filter((p) => pathname.startsWith(p.prefix))
    .sort((a, b) => b.prefix.length - a.prefix.length)[0]

  if (!page) return null

  return (
    <header className="hidden md:flex bg-white border-b border-gray-100 px-8 py-4 items-center justify-between shrink-0">
      <div>
        <h1 className="text-lg font-semibold text-gray-900 tracking-tight">{page.title}</h1>
        <p className="text-xs text-gray-400 mt-0.5">{page.subtitle}</p>
      </div>
      <div className="flex items-center gap-3">
        <button className="relative w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 transition-colors">
          <Bell size={14} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
        </button>
        <UserHeaderBadge />
      </div>
    </header>
  )
}
