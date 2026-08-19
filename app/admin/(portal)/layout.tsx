export const dynamic = 'force-dynamic';

import Sidebar from './Sidebar'
import PageAccessGuard from './PageAccessGuard'
import AppHeader from '@/app/components/ui/AppHeader'
import { MobileNav } from '@/app/components/ui/mobile/MobileNav'
import { MobileOnlyGate } from './MobileOnlyGate'

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    // Wraps the sidebar too: technicians are held at a blank screen above the
    // mobile breakpoint, and nothing of the portal should show through.
    <MobileOnlyGate>
      <div className="flex h-screen bg-white overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <PageAccessGuard>
            <AppHeader />
            {/* Bottom nav is fixed on phones, so the scroll area reserves room for it. */}
            <div className="flex-1 flex flex-col min-h-0 pb-16 md:pb-0">
              {children}
            </div>
          </PageAccessGuard>
        </div>
        <MobileNav />
      </div>
    </MobileOnlyGate>
  )
}
