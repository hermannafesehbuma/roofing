'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
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
  LogOut,
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

const defaultPermissions = [
  { id: 'create_projects', name: 'Create projects', category: 'Projects', admin: true, manager: false, staff: false, client: false },
  { id: 'view_projects', name: 'View all projects', category: 'Projects', admin: true, manager: true, staff: true, client: false },
  { id: 'edit_projects', name: 'Edit project details', category: 'Projects', admin: true, manager: false, staff: false, client: false },
  { id: 'add_staff', name: 'Add new staff', category: 'Staff', admin: true, manager: true, staff: false, client: false },
  { id: 'manage_staff_accounts', name: 'Manage staff accounts', category: 'Staff', admin: true, manager: true, staff: false, client: false },
  { id: 'export_reports', name: 'Export reports', category: 'Staff', admin: true, manager: true, staff: false, client: false },
  { id: 'assign_crew', name: 'Assign crew member', category: 'Staff', admin: true, manager: true, staff: true, client: false },
  { id: 'access_invoicing', name: 'Access invoicing', category: 'Finance', admin: true, manager: true, staff: false, client: false },
  { id: 'create_task', name: 'Create Task', category: 'Task', admin: true, manager: true, staff: true, client: true },
  { id: 'assign_task', name: 'Assign Task', category: 'Task', admin: true, manager: true, staff: true, client: false },
  { id: 'view_task', name: 'View Task', category: 'Task', admin: true, manager: true, staff: true, client: false },
  { id: 'add_lead', name: 'Add New Lead', category: 'CRM', admin: true, manager: false, staff: false, client: false },
  { id: 'view_crm_leads', name: 'View CRM leads', category: 'CRM', admin: true, manager: false, staff: false, client: false }
]

// Maps sidebar routes to the permission_id that grants access
const navItemPermissions: Record<string, string> = {
  '/admin/employees': 'manage_staff_accounts',
  '/admin/projects': 'view_projects',
  '/admin/crm': 'view_crm_leads',
  '/admin/tasks': 'view_task',
  '/admin/invoices': 'access_invoicing',
  '/admin/insurance': 'export_reports',
  '/admin/time-tracking': 'assign_crew',
  '/admin/inventory': 'export_reports',
  '/admin/inbox': 'assign_task',
}

const roleGradients: Record<string, string> = {
  admin: 'from-blue-400 to-blue-600',
  manager: 'from-amber-400 to-amber-600',
  staff: 'from-emerald-400 to-emerald-600',
  client: 'from-purple-400 to-purple-600',
}

const roleTitles: Record<string, string> = {
  admin: 'Administrator',
  manager: 'Project Manager',
  staff: 'Field Operations',
  client: 'Client',
}

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [role, setRole] = useState<string>('admin')
  const [permissions, setPermissions] = useState<any[]>(defaultPermissions)
  const [showMenu, setShowMenu] = useState(false)
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const loadState = () => {
      const storedRole = localStorage.getItem('user_role') || 'admin'
      setRole(storedRole)

      const firstName = localStorage.getItem('user_first_name') || ''
      const lastName = localStorage.getItem('user_last_name') || ''
      setUserName(firstName && lastName ? `${firstName} ${lastName}` : storedRole.charAt(0).toUpperCase() + storedRole.slice(1))
      setUserEmail(localStorage.getItem('user_email') || '')

      const storedPerms = localStorage.getItem('peak_permissions')
      if (storedPerms) {
        try {
          setPermissions(JSON.parse(storedPerms))
        } catch (e) {
          console.error(e)
        }
      }
    }

    loadState()

    window.addEventListener('permissions-changed', loadState)
    window.addEventListener('role-changed', loadState)
    window.addEventListener('auth-changed', loadState)

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      window.removeEventListener('permissions-changed', loadState)
      window.removeEventListener('role-changed', loadState)
      window.removeEventListener('auth-changed', loadState)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleSignOut = () => {
    localStorage.removeItem('is_authenticated')
    localStorage.removeItem('user_role')
    localStorage.removeItem('user_email')
    localStorage.removeItem('user_first_name')
    localStorage.removeItem('user_last_name')
    localStorage.removeItem('peak_permissions')
    window.dispatchEvent(new Event('auth-changed'))
    window.dispatchEvent(new Event('role-changed'))
    setShowMenu(false)
    router.push('/admin/login')
  }

  // Check if user has any enabled permission for a given route
  const hasPermissionForRoute = (href: string): boolean => {
    const permId = navItemPermissions[href]
    if (!permId) return true // Dashboard and unmapped routes are always visible

    const perm = permissions.find(p => p.id === permId)
    if (!perm) return false

    if (role === 'admin') return perm.admin
    if (role === 'manager') return perm.manager
    if (role === 'staff') return perm.staff
    if (role === 'client') return perm.client
    return false
  }

  // Filter main navigation items based on permissions
  const visibleNavItems = navItems.filter(({ href }) => {
    if (role === 'admin') return true
    if (href === '/admin/dashboard') return true // Everyone sees dashboard
    return hasPermissionForRoute(href)
  })

  // Filter bottom navigation items
  const visibleBottomItems = bottomItems.filter(({ href }) => {
    return true // Settings and Help & Support are visible to all
  })

  const initials = userName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || role[0]?.toUpperCase() || 'U'

  return (
    <aside className="w-56 shrink-0 flex flex-col bg-white border-r border-gray-200 h-screen">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100">
        <div className="h-8 px-2.5 bg-[#0D1B2A] rounded-md flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-[10px] tracking-widest">PEAK</span>
        </div>
        <div>
          <p className="text-gray-900 font-semibold text-sm leading-none">Peak Roofing</p>
          <p className="text-gray-400 text-[10px] mt-0.5">Admin Portal</p>
        </div>
      </div>

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {visibleNavItems.map(({ label, icon: Icon, href }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-gray-100 text-gray-900 font-medium'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon size={16} strokeWidth={active ? 2 : 1.5} className={active ? 'text-gray-900' : 'text-gray-400'} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom nav */}
      <div className="px-3 pb-3 space-y-0.5 border-t border-gray-100 pt-3">
        {visibleBottomItems.map(({ label, icon: Icon, href }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-gray-100 text-gray-900 font-medium'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon size={16} strokeWidth={active ? 2 : 1.5} className={active ? 'text-gray-900' : 'text-gray-400'} />
              {label}
            </Link>
          )
        })}
      </div>

      {/* User profile */}
      <div className="px-3 pb-4 relative border-t border-gray-100 pt-4" ref={menuRef}>
        {showMenu && (
          <div className="absolute bottom-16 left-3 right-3 bg-white rounded-xl shadow-2xl border border-gray-100 py-1.5 z-50 text-xs text-gray-800 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <p className="px-3 py-1.5 text-[9px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 mb-1">Account</p>
            <div className="px-3 py-2 text-xs text-gray-500">
              <p className="font-medium text-gray-700">{userEmail}</p>
              <p className="text-[10px] text-gray-400 mt-0.5 capitalize">{roleTitles[role] || role}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="w-full text-left px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100 mt-1 flex items-center gap-2"
            >
              <LogOut size={13} />
              Sign Out
            </button>
          </div>
        )}

        <button
          onClick={() => setShowMenu(!showMenu)}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-left"
        >
          <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${roleGradients[role] || roleGradients.admin} flex items-center justify-center shrink-0`}>
            <span className="text-white text-xs font-semibold">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-gray-900 text-xs font-medium truncate">{userName}</p>
            <p className="text-gray-400 text-[10px] truncate">{roleTitles[role] || role}</p>
          </div>
          <ChevronDown size={13} className="text-gray-400 shrink-0" />
        </button>
      </div>
    </aside>
  )
}
