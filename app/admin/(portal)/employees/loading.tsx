import { PortalPageSkeleton, CardGridSkeleton } from '@/app/components/ui/Skeleton'
import { FirstVisitOnly } from '@/app/components/ui/animations'

export default function Loading() {
  return (
    <FirstVisitOnly routeKey="/admin/employees">
      <PortalPageSkeleton stats={4} content={<CardGridSkeleton count={6} />} />
    </FirstVisitOnly>
  )
}
