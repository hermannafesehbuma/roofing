import { PortalPageSkeleton, TableSkeleton } from '@/app/components/ui/Skeleton'
import { FirstVisitOnly } from '@/app/components/ui/animations'

export default function Loading() {
  return (
    <FirstVisitOnly routeKey="/admin/inbox">
      <PortalPageSkeleton stats={0} content={<TableSkeleton rows={8} columns={5} />} />
    </FirstVisitOnly>
  )
}
