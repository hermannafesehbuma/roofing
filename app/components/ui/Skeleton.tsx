/**
 * Skeleton placeholders for the portal.
 *
 * These mirror the real components' geometry — same heights, same paddings,
 * same column widths — so content does not jump when it swaps in. The sweep
 * animation itself lives in `globals.css` under `.skeleton`.
 *
 * Server components by default: they render inside `loading.tsx` route
 * fallbacks and carry no interactivity.
 */

/** One grey block. Everything else is composed from this. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton rounded-md ${className}`} />
}

/** The page title and subtitle band every portal screen opens with. */
export function PageHeaderSkeleton() {
  return (
    <div className="flex-none px-7 py-5 bg-white border-b border-gray-100 flex items-center justify-between gap-4">
      <div className="space-y-2.5">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-3.5 w-72" />
      </div>
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-full" />
        <Skeleton className="h-9 w-9 rounded-full" />
        <div className="hidden sm:block space-y-1.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-2.5 w-14" />
        </div>
      </div>
    </div>
  )
}

/**
 * The toolbar band: view switch on the left, search, then filter and the
 * primary action on the right.
 */
export function ToolbarSkeleton() {
  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-40 rounded-lg" />
        <Skeleton className="h-10 w-64 rounded-lg" />
      </div>
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-24 rounded-lg" />
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>
    </div>
  )
}

/** The row of KPI tiles above the data on most screens. */
export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 min-h-[112px] flex flex-col justify-between gap-4">
          <div className="flex items-start justify-between gap-3">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
          <div className="flex items-end justify-between gap-3">
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * A kanban board: grey column headers matching the real ones, then card
 * placeholders. `withImage` covers the projects board, whose cards lead with a
 * photo.
 */
export function KanbanSkeleton({
  columns = 4,
  cardsPerColumn = 2,
  withImage = false,
}: {
  columns?: number
  cardsPerColumn?: number
  withImage?: boolean
}) {
  return (
    <div className="flex gap-6 overflow-hidden pb-4">
      {Array.from({ length: columns }).map((_, col) => (
        <div key={col} className="min-w-[280px] flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-4 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-2 w-2 rounded-full" />
              <Skeleton className="h-3.5 w-24" />
            </div>
            <Skeleton className="h-3.5 w-4" />
          </div>

          <div className="flex flex-col gap-4">
            {Array.from({ length: cardsPerColumn }).map((_, card) => (
              <div key={card} className="bg-white border border-gray-200 rounded-xl shadow-sm p-3">
                {withImage && <Skeleton className="h-32 w-full rounded-lg mb-4" />}
                <div className="space-y-3">
                  <div className="flex items-center gap-2.5">
                    {!withImage && <Skeleton className="h-8 w-8 rounded-full" />}
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3.5 w-3/5" />
                      <Skeleton className="h-3 w-2/5" />
                    </div>
                  </div>
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-4/5" />
                  <Skeleton className="h-3 w-3/5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/** A card grid — clients, employees, documents. */
export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-11 w-11 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-2/5" />
              <Skeleton className="h-3 w-3/5" />
            </div>
          </div>
          <div className="space-y-2.5">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * A data table. Column widths cycle through a fixed pattern so the placeholder
 * looks like tabular data rather than a stack of identical bars.
 */
const CELL_WIDTHS = ['w-3/4', 'w-1/2', 'w-2/3', 'w-1/3', 'w-5/6', 'w-1/2']

export function TableSkeleton({ rows = 8, columns = 6 }: { rows?: number; columns?: number }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="bg-[#F8F9FB] border-b border-gray-100 px-6 py-3.5 flex gap-6">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1 max-w-[120px]" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="border-b border-gray-50 px-6 py-4 flex items-center gap-6">
          {Array.from({ length: columns }).map((_, col) => (
            <div key={col} className="flex-1 max-w-[160px]">
              <Skeleton className={`h-3.5 ${CELL_WIDTHS[(row + col) % CELL_WIDTHS.length]}`} />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

/**
 * The whole screen: header, stat band, toolbar, then whatever the route shows
 * below it. Route `loading.tsx` files compose this with a `content` of their
 * own so each board or table gets a placeholder shaped like itself.
 */
export function PortalPageSkeleton({
  stats = 4,
  showToolbar = true,
  content,
}: {
  stats?: number
  showToolbar?: boolean
  content: React.ReactNode
}) {
  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      <PageHeaderSkeleton />
      <div className="flex-1 overflow-hidden px-7 py-6">
        {stats > 0 && (
          <div className="mb-12">
            <StatCardsSkeleton count={stats} />
          </div>
        )}
        {showToolbar && (
          <div className="mb-6">
            <ToolbarSkeleton />
          </div>
        )}
        {content}
      </div>
    </div>
  )
}
