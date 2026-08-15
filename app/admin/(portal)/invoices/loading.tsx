import { PortalPageSkeleton, TableSkeleton } from '@/app/components/ui/Skeleton'
import { FirstVisitOnly } from '@/app/components/ui/animations'

export default function Loading() {
  return (
    <FirstVisitOnly routeKey="/admin/invoices">
      <PortalPageSkeleton stats={4} content={<TableSkeleton rows={8} columns={6} />} />
    </FirstVisitOnly>
  )
}
