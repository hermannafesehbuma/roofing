export const dynamic = 'force-dynamic';

import Sidebar from './Sidebar'
import PageAccessGuard from './PageAccessGuard'
import AppHeader from '@/app/components/ui/AppHeader'
import { MobileNav } from '@/app/components/ui/mobile/MobileNav'

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-[#F4F6F9] overflow-hidden">
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
  )
}
