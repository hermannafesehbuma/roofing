import { PortalPageSkeleton, KanbanSkeleton } from '@/app/components/ui/Skeleton'
import { FirstVisitOnly } from '@/app/components/ui/animations'

export default function Loading() {
  return (
    <FirstVisitOnly routeKey="/admin/inventory">
      <PortalPageSkeleton stats={4} content={<KanbanSkeleton columns={4} cardsPerColumn={2} />} />
    </FirstVisitOnly>
  )
}
