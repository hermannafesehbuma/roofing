/**
 * Date-axis helpers shared by the Gantt-style timelines (dashboard "Active
 * Projects Timeline" and the employee "Project Timeline" tab).
 *
 * A window is a run of equal-width columns starting at `start`. Positions are
 * expressed in *column units* rather than raw milliseconds so that bars line up
 * with column edges even in Month view, where columns differ in real length.
 */

export type TimelineView = 'Day' | 'Week' | 'Month'

export type TimelineColumn = { key: string; label: string }

export type TimelineWindow = {
  view: TimelineView
  start: Date
  columns: TimelineColumn[]
  /** Position of a date in column units; 0 is the window start. */
  offsetOf: (date: Date) => number
  rangeLabel: string
}

/** How many columns each view shows. */
const COLUMN_COUNT: Record<TimelineView, number> = { Day: 14, Week: 12, Month: 12 }

const DAY_MS = 86_400_000
const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function addDays(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}

/** Monday-based week start. */
export function startOfWeek(d: Date) {
  const day = startOfDay(d)
  // getDay() is Sunday-based, so Sunday (0) must fall back a full six days.
  return addDays(day, -((day.getDay() + 6) % 7))
}

export function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1)
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

/** Snap an anchor date to the first column boundary of the given view. */
export function alignAnchor(view: TimelineView, anchor: Date) {
  if (view === 'Day') return startOfDay(anchor)
  if (view === 'Week') return startOfWeek(anchor)
  return startOfMonth(anchor)
}

/** Move the window forward or backward by `dir` whole windows. */
export function shiftAnchor(view: TimelineView, anchor: Date, dir: number) {
  const count = COLUMN_COUNT[view]
  if (view === 'Day') return addDays(anchor, dir * count)
  if (view === 'Week') return addDays(anchor, dir * count * 7)
  return addMonths(anchor, dir * count)
}

function formatDay(d: Date) {
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`
}

export function buildWindow(view: TimelineView, rawAnchor: Date): TimelineWindow {
  const start = alignAnchor(view, rawAnchor)
  const count = COLUMN_COUNT[view]
  const columns: TimelineColumn[] = []

  for (let i = 0; i < count; i++) {
    if (view === 'Day') {
      const d = addDays(start, i)
      columns.push({ key: d.toDateString(), label: `${WEEKDAY_INITIALS[d.getDay()]}${d.getDate()}` })
    } else if (view === 'Week') {
      const d = addDays(start, i * 7)
      columns.push({ key: d.toDateString(), label: formatDay(d) })
    } else {
      const d = addMonths(start, i)
      columns.push({ key: d.toDateString(), label: MONTHS_SHORT[d.getMonth()] })
    }
  }

  const offsetOf = (date: Date) => {
    if (view === 'Day') return (date.getTime() - start.getTime()) / DAY_MS
    if (view === 'Week') return (date.getTime() - start.getTime()) / (DAY_MS * 7)
    // Month columns vary in length, so index the month then add the day fraction.
    const months = (date.getFullYear() - start.getFullYear()) * 12 + (date.getMonth() - start.getMonth())
    const dayFraction = (date.getDate() - 1) / daysInMonth(date.getFullYear(), date.getMonth())
    return months + dayFraction
  }

  const last = view === 'Month' ? addMonths(start, count - 1) : columns[count - 1]
  const endDate =
    view === 'Day' ? addDays(start, count - 1)
    : view === 'Week' ? addDays(start, count * 7 - 1)
    : new Date((last as Date).getFullYear(), (last as Date).getMonth(), 1)

  const rangeLabel =
    view === 'Month'
      ? start.getFullYear() === endDate.getFullYear()
        ? `${MONTHS_SHORT[start.getMonth()]} – ${MONTHS_SHORT[endDate.getMonth()]} ${start.getFullYear()}`
        : `${MONTHS_SHORT[start.getMonth()]} ${start.getFullYear()} – ${MONTHS_SHORT[endDate.getMonth()]} ${endDate.getFullYear()}`
      : `${formatDay(start)} – ${formatDay(endDate)}, ${endDate.getFullYear()}`

  return { view, start, columns, offsetOf, rangeLabel }
}

/** The month a window sits in, for the standalone month button in the design. */
export function windowMonthLabel(win: TimelineWindow) {
  return MONTHS_LONG[win.start.getMonth()]
}

export type BarPlacement = { leftPct: number; widthPct: number } | null

/**
 * Clip a date range to the window and convert it to left/width percentages.
 * Returns null when the range falls entirely outside the visible columns.
 */
export function placeBar(win: TimelineWindow, from: Date, to: Date): BarPlacement {
  const count = win.columns.length
  const rawStart = win.offsetOf(from)
  const rawEnd = win.offsetOf(to)
  const clippedStart = Math.max(rawStart, 0)
  const clippedEnd = Math.min(rawEnd, count)
  if (clippedEnd <= clippedStart) return null
  return {
    leftPct: (clippedStart / count) * 100,
    widthPct: ((clippedEnd - clippedStart) / count) * 100,
  }
}
