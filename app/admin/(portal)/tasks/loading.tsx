import { PortalPageSkeleton, KanbanSkeleton } from '@/app/components/ui/Skeleton'
import { FirstVisitOnly } from '@/app/components/ui/animations'

export default function Loading() {
  // To Do / In Progress / In Review / Completed.
  return (
    <FirstVisitOnly routeKey="/admin/tasks">
      <PortalPageSkeleton stats={4} content={<KanbanSkeleton columns={4} cardsPerColumn={3} />} />
    </FirstVisitOnly>
  )
}
