import { PortalPageSkeleton, KanbanSkeleton } from '@/app/components/ui/Skeleton'
import { FirstVisitOnly } from '@/app/components/ui/animations'

export default function Loading() {
  // No stat band on this screen, and its cards lead with a photo.
  return (
    <FirstVisitOnly routeKey="/admin/projects">
      <PortalPageSkeleton
        stats={0}
        content={<KanbanSkeleton columns={3} cardsPerColumn={2} withImage />}
      />
    </FirstVisitOnly>
  )
}
