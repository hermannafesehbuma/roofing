import { ArrowUp, Calendar, CalendarDays, CalendarRange, ChevronDown, FolderOpen, IdCard, Receipt, Wallet } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { getEmployees } from '../employees/actions'
import { getTimeEntries } from '../time-tracking/actions'
import { getProjects } from '../projects/actions'
import { getTasks } from '../tasks/actions'
import { MobileHome } from '@/app/components/ui/mobile/MobileHome'
import RevenueBars from './RevenueBars'
import CrewUtilizationBars from './CrewUtilizationBars'
import { ProgressRing, SplitRing, MultiRing } from './StatRings'
import { MarkVisited } from '@/app/components/ui/animations'

function RingCard({ title, tag, tagChevron, chart, legend }: {
  title: string
  tag: string
  tagChevron?: boolean
  chart: React.ReactNode
  legend: { label: string; value: string; color: string }[]
}) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] font-semibold text-gray-900">{title}</p>
        <span className="flex items-center gap-1 bg-gray-100 text-gray-500 text-[10px] font-medium px-2 py-1 rounded-md whitespace-nowrap">
          {tag}
          {tagChevron && <ChevronDown size={10} />}
        </span>
      </div>
      <div className="flex justify-center py-3">{chart}</div>
      <div className="space-y-2">
        {legend.map(({ label, value, color }) => (
          <div key={label} className="flex items-center gap-2 text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
            <span className="text-gray-500">{label}</span>
            <span className="ml-auto font-semibold text-gray-900">{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Stat card ───────────────────────────────────────────────────── */

function StatCard({ label, value, sub, subTone, subArrow, icon: Icon, iconColor }: {
  label: string
  value: string
  sub: string
  subTone: 'green' | 'red' | 'gray'
  subArrow?: boolean
  icon: LucideIcon
  iconColor: string
}) {
  const subClass = subTone === 'green' ? 'text-emerald-500' : subTone === 'red' ? 'text-red-500' : 'text-gray-400'
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] text-gray-500">{label}</p>
        <span className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: iconColor }}>
          <Icon size={13} className="text-white" strokeWidth={2.2} />
        </span>
      </div>
      <div className="flex items-end justify-between gap-2 mt-3">
        <p className="text-[26px] leading-none font-semibold text-gray-900">{value}</p>
        <span className={`flex items-center gap-0.5 text-[10px] font-medium whitespace-nowrap ${subClass}`}>
          {subArrow && <ArrowUp size={10} strokeWidth={2.5} />}
          {sub}
        </span>
      </div>
    </div>
  )
}

/* ── Timeline ────────────────────────────────────────────────────── */

const TIMELINE_MONTHS = ['March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

type TimelineBar = { label: string; start: number; width: number; color: string; pct: number }

const timelineRows: TimelineBar[][] = [
  [{ label: 'Hartfield Rd Reroof', start: 1, width: 27, color: '#F4762B', pct: 40 }],
  [{ label: 'Hartfield Rd Reroof', start: 40, width: 27, color: '#2FBF9B', pct: 40 }],
  [{ label: 'Oakfield Industrial', start: 70, width: 26, color: '#6C63E8', pct: 40 }],
  [{ label: 'Devonshire Flat Roof', start: 18, width: 28, color: '#A94BE8', pct: 40 }],
  [{ label: 'Thornton Ave Single', start: 70, width: 28, color: '#4BA3F0', pct: 40 }],
  [{ label: 'Manor Park Reline', start: 38, width: 34, color: '#F5B440', pct: 40 }],
  [
    { label: 'Hartfield Rd Reroof', start: 14, width: 34, color: '#8A5A44', pct: 40 },
    { label: 'Hartfield Rd Reroof', start: 64, width: 34, color: '#EE6FA0', pct: 40 },
  ],
]

function GanttBar({ label, start, width, color, pct }: TimelineBar) {
  return (
    <div
      className="absolute top-1.5 bottom-1.5 rounded-md px-2 py-1.5 flex flex-col justify-between overflow-hidden"
      style={{ left: `${start}%`, width: `${width}%`, backgroundColor: color }}
    >
      <span className="text-white text-[10px] font-medium leading-none truncate">{label}</span>
      <div className="flex items-center gap-1.5">
        <div className="flex-1 h-[3px] rounded-full bg-white/35 overflow-hidden">
          <div className="h-full rounded-full bg-white" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-white text-[9px] font-medium leading-none">{pct}%</span>
      </div>
    </div>
  )
}

function MonthGridlines() {
  return (
    <>
      {TIMELINE_MONTHS.slice(1).map((m, i) => (
        <span key={m} className="absolute top-0 bottom-0 w-px bg-gray-100" style={{ left: `${((i + 1) / TIMELINE_MONTHS.length) * 100}%` }} />
      ))}
    </>
  )
}

const monthlyRevenue = [
  { period: 'Jan–Feb', val: 46 }, { period: 'Mar–Apr', val: 100 }, { period: 'May–Jun', val: 57 },
  { period: 'Jul–Aug', val: 77 }, { period: 'Sep–Oct', val: 47 }, { period: 'Nov–Dec', val: 66 },
]

const crewUtilization = [
  { label: 'Field Ops', pct: 85, color: '#3B82F6' },
  { label: 'Engineering', pct: 72, color: '#A855F7' },
  { label: 'Operations', pct: 68, color: '#22C55E' },
  { label: 'Admin', pct: 55, color: '#F59E0B' },
]

const avatarColors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4']
function initials(name: string) { return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() }

function fmtClockIn(t: string): string {
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

const TARGET_SHIFT_HOURS = 8

/** Hours worked so far — clock_out when present, otherwise elapsed until now. */
function hoursWorked(clockIn: string, clockOut: string | null, now: Date): number {
  const [hi, mi] = clockIn.split(':').map(Number)
  const endMins = clockOut
    ? (() => { const [ho, mo] = clockOut.split(':').map(Number); return ho * 60 + mo })()
    : now.getHours() * 60 + now.getMinutes()
  return Math.max(0, (endMins - (hi * 60 + mi)) / 60)
}

export default async function DashboardPage() {
  const [employees, timeEntries, projects, tasks] = await Promise.all([
    getEmployees(), getTimeEntries(), getProjects(), getTasks(),
  ])
  const activeCount = employees.filter((e) => e.status === 'active').length
  const totalCount = employees.length

  const now = new Date()
  const todayKey = now.toLocaleDateString('en-CA') // YYYY-MM-DD, local
  const todaysEntries = timeEntries.filter((e) => e.date === todayKey)
  const clockedIn = [...todaysEntries].sort((a, b) => a.clock_in.localeCompare(b.clock_in)).slice(0, 8)
  const onSiteCount = todaysEntries.filter((e) => !e.clock_out).length
  const avatarByUser = new Map(employees.map((e) => [e.id, e.avatar_url]))

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <MarkVisited />
      {/* Field crews get the phone home screen; the analytics board is desktop-only. */}
      <MobileHome
        projects={projects}
        tasks={tasks}
        timeEntries={timeEntries}
        greetingHour={now.getHours()}
        todayKey={todayKey}
      />

      <main className="hidden md:block flex-1 overflow-y-auto p-6 space-y-5">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard label="Active Projects" value="8" sub="+2 vs last month" subTone="gray" icon={FolderOpen} iconColor="#2F6BED" />
          <StatCard label="Revenue This Month" value="$94.2k" sub="$142,000" subTone="green" subArrow icon={Wallet} iconColor="#22C55E" />
          <StatCard label="Outstanding Invoices" value="$38.5k" sub="5 overdue" subTone="red" icon={Receipt} iconColor="#EF4444" />
          <StatCard label="Active Employees" value={`${activeCount} /${totalCount}`} sub="Live" subTone="green" icon={IdCard} iconColor="#22C55E" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <RingCard
            title="Budget Used"
            tag="Projects + Inventory"
            chart={<ProgressRing pct={67} color="#0D1B2A" value="67%" caption="Budget Used" />}
            legend={[
              { label: 'Labour + Materials', value: '$1.24M', color: '#0D1B2A' },
              { label: 'Remaining Budget', value: '$610k', color: '#D1D5DB' },
            ]}
          />
          <RingCard
            title="Invoiced / Paid"
            tag="This Month"
            tagChevron
            chart={<SplitRing segments={[{ value: 71, color: '#22C55E' }, { value: 29, color: '#EF4444' }]} value="71%" caption="collection rate" />}
            legend={[
              { label: 'Paid', value: '$1.24M', color: '#22C55E' },
              { label: 'Overdue / Sent', value: '$610k', color: '#EF4444' },
            ]}
          />
          <RingCard
            title="Compliance Metrics"
            tag="Projects + Inventory"
            chart={
              <MultiRing
                value="71%"
                caption="collection rate"
                rings={[
                  { pct: 92, color: '#7FE0BE', track: '#EAF7F2' },
                  { pct: 74, color: '#F97316', track: '#FDEDE1' },
                  { pct: 52, color: '#EA580C', track: '#FBE7DC' },
                ]}
              />
            }
            legend={[
              { label: 'Valid certs', value: '17', color: '#22C55E' },
              { label: 'Expiring <60 days', value: '5', color: '#F97316' },
              { label: 'Expired', value: '2', color: '#EF4444' },
            ]}
          />
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-gray-900">Active Projects Timeline</p>
            <div className="flex items-center gap-1 text-[11px]">
              {[{ label: 'Day', icon: Calendar }, { label: 'Week', icon: CalendarRange }, { label: 'Month', icon: CalendarDays }].map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border transition-colors ${
                    label === 'Month'
                      ? 'border-gray-200 bg-white text-gray-900 font-medium shadow-sm'
                      : 'border-transparent text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <Icon size={12} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="border border-gray-100 rounded-lg overflow-hidden">
            <div className="flex border-b border-gray-100">
              {TIMELINE_MONTHS.map((m, i) => (
                <div key={m} className={`flex-1 text-center text-[10px] text-gray-500 py-2 ${i > 0 ? 'border-l border-gray-100' : ''}`}>{m}</div>
              ))}
            </div>
            {timelineRows.map((bars, i) => (
              <div key={i} className={`relative h-14 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
                <MonthGridlines />
                {bars.map((bar) => (
                  <GanttBar key={`${bar.label}-${bar.start}`} {...bar} />
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[13px] font-semibold text-gray-900">Monthly Revenue</p>
              <span className="bg-gray-100 text-gray-500 text-[10px] font-medium px-2 py-1 rounded-md whitespace-nowrap">Invoice &amp; Billing · Paid</span>
            </div>
            <div className="flex items-baseline gap-2 mt-3">
              <p className="text-[26px] leading-none font-semibold text-gray-900">$94,200</p>
              <span className="text-[11px] text-gray-400">March – April 2026</span>
              <span className="text-[11px] text-gray-300">·</span>
              <span className="text-[11px] font-medium text-emerald-500">+12%</span>
            </div>
            <RevenueBars data={monthlyRevenue} highlight="Mar–Apr" />
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[13px] font-semibold text-gray-900">Crew Utilization</p>
              <span className="bg-gray-100 text-gray-500 text-[10px] font-medium px-2 py-1 rounded-md whitespace-nowrap">Time Tracking · This Week</span>
            </div>
            <div className="flex items-baseline gap-2 mt-3">
              <p className="text-[26px] leading-none font-semibold text-gray-900">78%</p>
              <span className="text-[11px] text-gray-400">Actual / Target hours</span>
              <span className="text-[11px] text-gray-300">·</span>
              <span className="text-[11px] font-medium text-emerald-500">+5% vs last week</span>
            </div>
            <CrewUtilizationBars data={crewUtilization} />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 flex items-center gap-2.5">
            <p className="text-[13px] font-semibold text-gray-900">Clocked-In Workers</p>
            <span className="bg-emerald-50 text-emerald-600 text-[10px] font-medium px-2 py-0.5 rounded-md whitespace-nowrap">
              {onSiteCount} / {activeCount} on site
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-y border-gray-100">
                  {['Employee', 'Project', 'Site / Location', 'Clock In', 'Hours'].map((h) => (
                    <th key={h} className="text-left px-5 py-2.5 text-gray-400 font-normal text-[11px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clockedIn.map((entry, i) => {
                  const hrs = hoursWorked(entry.clock_in, entry.clock_out, now)
                  const avatar = avatarByUser.get(entry.user_id)
                  return (
                    <tr key={entry.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          {avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={avatar} alt={entry.employee_name} className="w-7 h-7 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: avatarColors[i % avatarColors.length] }}>
                              <span className="text-white text-[10px] font-semibold">{initials(entry.employee_name)}</span>
                            </div>
                          )}
                          <span className="font-medium text-gray-800">{entry.employee_name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-500">{entry.project_name ?? '—'}</td>
                      <td className="px-5 py-3 text-gray-500">{entry.location ?? '—'}</td>
                      <td className="px-5 py-3 text-gray-500">{fmtClockIn(entry.clock_in)}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-28 h-[3px] bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-[#0D1B2A]" style={{ width: `${Math.min(hrs / TARGET_SHIFT_HOURS, 1) * 100}%` }} />
                          </div>
                          <span className="text-[11px] text-gray-500 tabular-nums">{hrs.toFixed(1)}</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {clockedIn.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400">Nobody clocked in today.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
