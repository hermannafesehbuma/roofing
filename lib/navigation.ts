import {
  LayoutDashboard, Users, FolderKanban, TrendingUp, CheckSquare, Shield,
  Receipt, Clock, Package, Inbox, FileText, type LucideIcon,
} from 'lucide-react'

export type NavItem = {
  label: string
  /** Shorter label for the mobile tab bar, where space is tight. */
  shortLabel?: string
  icon: LucideIcon
  href: string
}

const ALL_NAV: NavItem[] = [
  { label: 'Dashboard',        icon: LayoutDashboard, href: '/admin/dashboard',     shortLabel: 'Home' },
  { label: 'Employees',        icon: Users,           href: '/admin/employees' },
  { label: 'Projects',         icon: FolderKanban,    href: '/admin/projects',      shortLabel: 'Project' },
  { label: 'CRM / Leads',      icon: TrendingUp,      href: '/admin/crm' },
  { label: 'Tasks',            icon: CheckSquare,     href: '/admin/tasks',         shortLabel: 'Task' },
  { label: 'Insurance',        icon: Shield,          href: '/admin/insurance' },
  { label: 'Invoice & Billing', icon: Receipt,        href: '/admin/invoices',      shortLabel: 'Invoice' },
  { label: 'Documents',        icon: FileText,        href: '/admin/documents',     shortLabel: 'Document' },
  { label: 'Time Tracking',    icon: Clock,           href: '/admin/time-tracking', shortLabel: 'Clock' },
  { label: 'Inventory',        icon: Package,         href: '/admin/inventory' },
  { label: 'Inbox',            icon: Inbox,           href: '/admin/inbox' },
]

/**
 * Clients get a cut-down portal: four pages, identical on web and mobile.
 * Everyone else keeps the full workspace nav (still permission-filtered).
 */
export const CLIENT_ROUTES = [
  '/admin/projects',
  '/admin/invoices',
  '/admin/documents',
  '/admin/inbox',
] as const

/** Where a role lands after login, and where it is sent if it wanders off. */
export function homeRouteForRole(role: string) {
  return role === 'client' ? '/admin/projects' : '/admin/dashboard'
}

export function navForRole(role: string): NavItem[] {
  if (role === 'client') {
    return CLIENT_ROUTES.map((href) => ALL_NAV.find((item) => item.href === href)!).filter(Boolean)
  }
  // Documents is a client-facing page; staff reach files through a project.
  return ALL_NAV.filter((item) => item.href !== '/admin/documents')
}

/**
 * Account screens every signed-in user reaches from the header avatar menu.
 * Kept out of `CLIENT_ROUTES` so they stay off the sidebar and the tab bar.
 */
export const SELF_SERVICE_ROUTES = ['/admin/profile'] as const

export function isRouteAllowedForRole(pathname: string, role: string) {
  if (role !== 'client') return true
  return [...CLIENT_ROUTES, ...SELF_SERVICE_ROUTES].some(
    (href) => pathname === href || pathname.startsWith(`${href}/`)
  )
}

/**
 * Bottom tab bar contents. Clients see their four pages — the same set as the
 * web sidebar, so the portal is identical on both. Crews get the subset they
 * need on site; the rest of the workspace stays desktop-only.
 */
const CREW_TABS = ['/admin/dashboard', '/admin/projects', '/admin/tasks', '/admin/time-tracking', '/admin/inbox']

export function mobileTabsForRole(role: string): NavItem[] {
  if (role === 'client') return navForRole('client')
  return CREW_TABS.map((href) => ALL_NAV.find((item) => item.href === href)!).filter(Boolean)
}

/**
 * A nav item stays selected on its detail routes too, so `/admin/projects/:id`
 * keeps "Projects" highlighted. The trailing slash keeps sibling routes that
 * merely share a prefix from matching.
 */
export function isActiveRoute(pathname: string | null, href: string): boolean {
  if (!pathname) return false
  return pathname === href || pathname.startsWith(`${href}/`)
}
