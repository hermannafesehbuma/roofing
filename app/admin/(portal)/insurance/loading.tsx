import { PortalPageSkeleton, KanbanSkeleton } from '@/app/components/ui/Skeleton'
import { FirstVisitOnly } from '@/app/components/ui/animations'

export default function Loading() {
  // Valid / Expiring soon / Expired.
  return (
    <FirstVisitOnly routeKey="/admin/insurance">
      <PortalPageSkeleton stats={4} content={<KanbanSkeleton columns={3} cardsPerColumn={3} />} />
    </FirstVisitOnly>
  )
}
