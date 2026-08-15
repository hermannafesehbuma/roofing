import { PortalPageSkeleton, KanbanSkeleton } from '@/app/components/ui/Skeleton'
import { FirstVisitOnly } from '@/app/components/ui/animations'

export default function Loading() {
  // Six stages, and the board is the default view.
  return (
    <FirstVisitOnly routeKey="/admin/crm">
      <PortalPageSkeleton stats={4} content={<KanbanSkeleton columns={6} cardsPerColumn={2} />} />
    </FirstVisitOnly>
  )
}
