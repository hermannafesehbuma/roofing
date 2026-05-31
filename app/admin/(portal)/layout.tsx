import Sidebar from './Sidebar'
import PageAccessGuard from './PageAccessGuard'

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-[#F4F6F9] overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <PageAccessGuard>
          {children}
        </PageAccessGuard>
      </div>
    </div>
  )
}
