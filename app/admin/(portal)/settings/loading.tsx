import { Skeleton, PageHeaderSkeleton, TableSkeleton } from '@/app/components/ui/Skeleton'
import { FirstVisitOnly } from '@/app/components/ui/animations'

export default function Loading() {
  return (
    <FirstVisitOnly routeKey="/admin/settings">
      <div className="flex flex-col h-full overflow-hidden bg-white">
        <PageHeaderSkeleton />
        <div className="flex-1 overflow-hidden px-7 py-6 space-y-6">
          {/* Section tabs, then the panel below them. */}
          <div className="flex items-center gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-24" />
            ))}
          </div>
          <TableSkeleton rows={6} columns={5} />
        </div>
      </div>
    </FirstVisitOnly>
  )
}
