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

/**
 * Routes switched off across the whole product. They stay in the codebase and
 * keep their pages, but disappear from every nav surface — sidebar, mobile tab
 * bar and the client portal — and `next.config.ts` redirects the URL, so a
 * typed address cannot reach them either. Re-enable by emptying this list.
 */
export const DISABLED_ROUTES: readonly string[] = ['/admin/inbox']

export function isRouteDisabled(pathname: string): boolean {
  return DISABLED_ROUTES.some((href) => pathname === href || pathname.startsWith(`${href}/`))
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
  const enabled = ALL_NAV.filter((item) => !isRouteDisabled(item.href))
  if (role === 'client') {
    return CLIENT_ROUTES.map((href) => enabled.find((item) => item.href === href)).filter(
      (item): item is NavItem => Boolean(item)
    )
  }
  // Documents is a client-facing page; staff reach files through a project.
  return enabled.filter((item) => item.href !== '/admin/documents')
}

/**
 * Account screens every signed-in user reaches from the header avatar menu.
 * Kept out of `CLIENT_ROUTES` so they stay off the sidebar and the tab bar.
 */
export const SELF_SERVICE_ROUTES = ['/admin/profile'] as const

export function isRouteAllowedForRole(pathname: string, role: string) {
  if (isRouteDisabled(pathname)) return false
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
  return CREW_TABS.filter((href) => !isRouteDisabled(href))
    .map((href) => ALL_NAV.find((item) => item.href === href))
    .filter((item): item is NavItem => Boolean(item))
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
