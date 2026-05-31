'use client'

import { useState, useEffect, Fragment } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ShieldAlert, ArrowLeft } from 'lucide-react'

// Copy of default permissions fallback
const defaultPermissions = [
  { id: 'create_projects', name: 'Create projects', category: 'Projects', admin: true, manager: false, staff: false, client: false },
  { id: 'view_projects', name: 'View all projects', category: 'Projects', admin: true, manager: true, staff: true, client: false },
  { id: 'edit_projects', name: 'Edit project details', category: 'Projects', admin: true, manager: false, staff: false, client: false },
  { id: 'add_staff', name: 'Add new staff', category: 'Staff', admin: true, manager: true, staff: false, client: false },
  { id: 'manage_staff_accounts', name: 'Manage staff accounts', category: 'Staff', admin: true, manager: true, staff: false, client: false },
  { id: 'export_reports', name: 'Export reports', category: 'Staff', admin: true, manager: true, staff: false, client: false },
  { id: 'assign_crew', name: 'Assign crew member', category: 'Staff', admin: true, manager: true, staff: true, client: false },
  { id: 'access_invoicing', name: 'Access invoicing', category: 'Finance', admin: true, manager: true, staff: false, client: true },
  { id: 'create_task', name: 'Create Task', category: 'Task', admin: true, manager: true, staff: true, client: true },
  { id: 'assign_task', name: 'Assign Task', category: 'Task', admin: true, manager: true, staff: true, client: false },
  { id: 'view_task', name: 'View Task', category: 'Task', admin: true, manager: true, staff: true, client: false },
  { id: 'add_lead', name: 'Add New Lead', category: 'CRM', admin: true, manager: false, staff: false, client: false },
  { id: 'view_crm_leads', name: 'View CRM leads', category: 'CRM', admin: true, manager: false, staff: false, client: false }
]

const pathPermissionMap: Record<string, string> = {
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

const pageNames: Record<string, string> = {
  '/admin/employees': 'Employees',
  '/admin/projects': 'Projects',
  '/admin/crm': 'CRM / Leads',
  '/admin/tasks': 'Tasks',
  '/admin/invoices': 'Invoice & Billing',
  '/admin/settings': 'Settings',
  '/admin/insurance': 'Insurance',
  '/admin/time-tracking': 'Time Tracking',
  '/admin/inventory': 'Inventory',
  '/admin/inbox': 'Inbox',
  '/admin/support': 'Help & Support',
}

export default function PageAccessGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [role, setRole] = useState<string>('admin')
  const [permissions, setPermissions] = useState<any[]>(defaultPermissions)
  const [mounted, setMounted] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    setMounted(true)
    
    const loadState = () => {
      const isAuth = localStorage.getItem('is_authenticated') === 'true'
      setIsAuthenticated(isAuth)
      
      if (!isAuth) {
        router.push('/admin/login')
        return
      }

      const storedRole = localStorage.getItem('user_role') || 'admin'
      setRole(storedRole)

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

    return () => {
      window.removeEventListener('permissions-changed', loadState)
      window.removeEventListener('role-changed', loadState)
      window.removeEventListener('auth-changed', loadState)
    }
  }, [router])

  if (!mounted || isAuthenticated === null) {
    return <div className="flex-1 bg-[#F4F6F9]" />
  }

  if (isAuthenticated === false) {
    return <div className="flex-1 bg-[#F4F6F9]" />
  }

  // Admin has access to everything
  if (role === 'admin') {
    return <Fragment>{children}</Fragment>
  }

  // Dashboard, Support, and Settings are accessible to all authenticated users
  if (pathname.startsWith('/admin/dashboard') || pathname.startsWith('/admin/support') || pathname.startsWith('/admin/settings')) {
    return <Fragment>{children}</Fragment>
  }

  // General module verification using database permissions
  let hasAccess = true

  for (const [prefix, permId] of Object.entries(pathPermissionMap)) {
    if (pathname.startsWith(prefix)) {
      const perm = permissions.find(p => p.id === permId)
      if (perm) {
        if (role === 'manager') hasAccess = perm.manager
        else if (role === 'staff') hasAccess = perm.staff
        else if (role === 'client') hasAccess = perm.client
      } else {
        hasAccess = false
      }
      break
    }
  }

  if (!hasAccess) {
    const pageName = pageNames[Object.keys(pageNames).find(prefix => pathname.startsWith(prefix)) || ''] || 'Requested Page'
    return <AccessRestrictedView pageName={pageName} onBack={() => router.push('/admin/dashboard')} />
  }

  return <Fragment>{children}</Fragment>
}

function AccessRestrictedView({ pageName, onBack }: { pageName: string; onBack: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#F4F6F9] min-h-[500px]">
      <div className="bg-white rounded-2xl p-10 max-w-md w-full shadow-lg border border-gray-100 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-6 animate-pulse">
          <ShieldAlert size={30} className="text-red-500" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">Access Restricted</h2>
        <p className="text-xs text-gray-400 font-medium mb-1">Module: <span className="text-gray-600 font-semibold">{pageName}</span></p>
        <p className="text-xs text-gray-500 leading-relaxed mb-8 max-w-xs">
          Your current user role configuration does not have the required permissions to view this screen. Please switch roles in the sidebar or update the permissions matrix under Settings.
        </p>
        <button
          onClick={onBack}
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#0D1B2A] hover:bg-[#162437] text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </button>
      </div>
    </div>
  )
}
