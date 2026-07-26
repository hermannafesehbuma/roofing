'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { mobileTabsForRole, isActiveRoute } from '@/lib/navigation'
import { useCurrentUser } from '@/app/components/ui/useCurrentUser'

/**
 * Below `md` the sidebar is replaced by this tab bar. Contents depend on the
 * role: clients get their four portal pages, crews get the routes they need on
 * site — the rest of the sidebar (CRM, invoicing, inventory) is desktop-only.
 */
export function MobileNav() {
  const pathname = usePathname() ?? ''
  const profile = useCurrentUser()
  const items = mobileTabsForRole(profile?.role ?? 'staff')

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-100 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-stretch justify-around px-2 py-1.5">
        {items.map(({ label, shortLabel, icon: Icon, href }) => {
          const active = isActiveRoute(pathname, href)
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className="flex-1 flex flex-col items-center gap-0.5 py-1 rounded-lg"
            >
              <span className={`px-3 py-1 rounded-lg transition-colors ${active ? 'bg-gray-100' : ''}`}>
                <Icon size={18} className={active ? 'text-[#0A1629]' : 'text-gray-400'} strokeWidth={active ? 2.2 : 1.8} />
              </span>
              <span className={`text-[10px] ${active ? 'text-[#0A1629] font-semibold' : 'text-gray-400'}`}>
                {shortLabel ?? label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
