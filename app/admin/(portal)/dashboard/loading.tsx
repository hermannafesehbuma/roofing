import { Skeleton, PageHeaderSkeleton, StatCardsSkeleton, TableSkeleton } from '@/app/components/ui/Skeleton'
import { FirstVisitOnly } from '@/app/components/ui/animations'

/** A card with a title line and a chart area below it. */
function ChartCardSkeleton({ height = 'h-44' }: { height?: string }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-5 w-16 rounded-md" />
      </div>
      <Skeleton className={`w-full ${height} rounded-lg`} />
    </div>
  )
}

export default function Loading() {
  return (
    <FirstVisitOnly routeKey="/admin/dashboard">
      <div className="flex flex-col h-full overflow-hidden bg-white">
        <PageHeaderSkeleton />
        <div className="flex-1 overflow-hidden px-7 py-6 space-y-4">
          <StatCardsSkeleton count={4} />

          {/* Three ring cards, then the two bar charts, then the table. */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ChartCardSkeleton height="h-36" />
            <ChartCardSkeleton height="h-36" />
            <ChartCardSkeleton height="h-36" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCardSkeleton />
            <ChartCardSkeleton />
          </div>

          <TableSkeleton rows={5} columns={5} />
        </div>
      </div>
    </FirstVisitOnly>
  )
}
