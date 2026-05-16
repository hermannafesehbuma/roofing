import { Bell, Search } from 'lucide-react'
import { getEmployees } from '../employees/actions'

function DonutChart({ pct, color }: { pct: number; color: string }) {
  const r = 44
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  return (
    <svg width="110" height="110" viewBox="0 0 110 110">
      <circle cx="55" cy="55" r={r} fill="none" stroke="#F3F4F6" strokeWidth="10" />
      <circle cx="55" cy="55" r={r} fill="none" stroke={color} strokeWidth="10"
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 55 55)" />
      <text x="55" y="52" textAnchor="middle" fontSize="15" fontWeight="700" fill="#111827">{pct}%</text>
      <text x="55" y="67" textAnchor="middle" fontSize="9" fill="#9CA3AF">utilized</text>
    </svg>
  )
}

function StatCard({ label, value, sub, subColor }: { label: string; value: string; sub: string; subColor: 'green' | 'red' | 'gray' }) {
  const subClass = subColor === 'green' ? 'text-emerald-600 bg-emerald-50' : subColor === 'red' ? 'text-red-500 bg-red-50' : 'text-gray-500 bg-gray-100'
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <p className="text-xs text-gray-500 mb-2">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <span className={`inline-block mt-2 text-[11px] font-medium px-2 py-0.5 rounded-full ${subClass}`}>{sub}</span>
    </div>
  )
}

function GanttBar({ label, start, width, color, pct }: { label: string; start: number; width: number; color: string; pct?: number }) {
  return (
    <div className="flex items-center gap-3 text-xs mb-2">
      <div className="w-36 shrink-0 text-gray-500 truncate text-right">{label}</div>
      <div className="flex-1 relative h-6">
        <div className="absolute top-0 h-full rounded-md flex items-center px-2 text-white text-[11px] font-medium"
          style={{ left: `${start}%`, width: `${width}%`, backgroundColor: color }}>
          {pct != null ? `${pct}%` : ''}
        </div>
      </div>
    </div>
  )
}

const monthlyRevenue = [
  { month: 'Jan', val: 42 }, { month: 'Feb', val: 58 }, { month: 'Mar', val: 75 },
  { month: 'Apr', val: 94 }, { month: 'May', val: 61 }, { month: 'Jun', val: 48 }, { month: 'Jul', val: 55 },
]

const workers = [
  { name: 'Metro Corp', project: 'Metro Commercial Fee', site: 'Job Site A – Oakdale', clockIn: '7:02 AM', hrs: 72 },
  { name: 'Johnson Family', project: 'Oakdale Residential', site: 'Job Site A – Oakdale', clockIn: '6:59 AM', hrs: 68 },
  { name: 'DW Properties', project: 'Green Valley Office', site: 'Job Site B – Riverside', clockIn: '7:05 AM', hrs: 65 },
  { name: 'Summers Dev', project: 'Summers Flat', site: 'Office / Site A', clockIn: '8:02 AM', hrs: 50 },
  { name: 'Highland HOA', project: 'Highland Tearoff', site: 'Downtown, NV', clockIn: '7:30 AM', hrs: 58 },
  { name: 'Rivera LLC', project: 'Riverside Storage', site: 'Downtown, NV', clockIn: '7:45 AM', hrs: 44 },
]

const avatarColors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4']
function initials(name: string) { return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() }

export default async function DashboardPage() {
  const employees = await getEmployees()
  const activeCount = employees.filter((e) => e.status === 'active').length
  const totalCount = employees.length

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="bg-white border-b border-gray-100 px-7 py-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-base font-semibold text-gray-900">Dashboard</h1>
          <p className="text-xs text-gray-400 mt-0.5">Overview of everything happening</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50"><Search size={14} /></button>
          <button className="relative w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50">
            <Bell size={14} />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
          </button>
          <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
              <span className="text-white text-[10px] font-semibold">JD</span>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-800 leading-none">John Doe</p>
              <p className="text-[10px] text-gray-400">Admin</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-5">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard label="Active Projects" value="8" sub="+3 vs last month" subColor="green" />
          <StatCard label="Revenue This Month" value="$94.2k" sub="$342,000 total pipeline" subColor="gray" />
          <StatCard label="Outstanding Invoices" value="11 / 18" sub="5 overdue" subColor="red" />
          <StatCard label="Active Employees" value={`${activeCount} / ${totalCount}`} sub="Team members" subColor="green" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <p className="text-xs font-semibold text-gray-700">Budget Used</p>
            <p className="text-[10px] text-gray-400 mb-3">Projects &gt; Inventory | This Month</p>
            <div className="flex items-center gap-5">
              <DonutChart pct={67} color="#3B82F6" />
              <div className="space-y-2 text-xs">
                <div><p className="text-gray-500">Labour + Materials</p><p className="font-semibold text-gray-800">$1.24M</p></div>
                <div><p className="text-gray-500">Remaining Budget</p><p className="font-semibold text-gray-800">$610k</p></div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <p className="text-xs font-semibold text-gray-700">Invoiced / Paid</p>
            <p className="text-[10px] text-gray-400 mb-3">Projects + Inventory | This Month</p>
            <div className="flex items-center gap-5">
              <DonutChart pct={71} color="#10B981" />
              <div className="space-y-2 text-xs">
                <div><p className="text-gray-500">Paid</p><p className="font-semibold text-gray-800">$1.24M</p></div>
                <div><p className="text-gray-500">Overdue / Sent</p><p className="font-semibold text-gray-800">$510k</p></div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <p className="text-xs font-semibold text-gray-700">Compliance Metrics</p>
            <p className="text-[10px] text-gray-400 mb-3">Projects &gt; Inventory | This Month</p>
            <div className="flex items-center gap-5">
              <DonutChart pct={75} color="#F59E0B" />
              <div className="space-y-2 text-xs">
                {[{ label: 'Valid Certs', color: 'bg-emerald-400', val: 17 }, { label: 'Expiring (<30d)', color: 'bg-amber-400', val: 5 }, { label: 'Expired', color: 'bg-red-400', val: 2 }].map(({ label, color, val }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-sm inline-block ${color}`} />
                    <span className="text-gray-600">{label}</span>
                    <span className="ml-auto font-semibold text-gray-800">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-gray-800">Active Projects Timeline</p>
            <div className="flex gap-1 text-xs">
              {['Day', 'Week', 'Month'].map((v, i) => (
                <button key={v} className={`px-3 py-1 rounded-md ${i === 2 ? 'bg-[#0D1B2A] text-white' : 'text-gray-500 hover:bg-gray-100'}`}>{v}</button>
              ))}
            </div>
          </div>
          <div className="flex text-[10px] text-gray-400 mb-3 pl-[156px]">
            {['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m) => (
              <div key={m} className="flex-1 text-center">{m}</div>
            ))}
          </div>
          <GanttBar label="Hartfield Re-Reroof" start={0} width={28} color="#F97316" pct={42} />
          <GanttBar label="Greenview Re-Reroof" start={22} width={32} color="#A855F7" pct={67} />
          <GanttBar label="Dartmoor Flat Roof" start={8} width={40} color="#8B5CF6" />
          <GanttBar label="Canfield Industrial" start={48} width={30} color="#6366F1" />
          <GanttBar label="Harrison Ave Single" start={42} width={25} color="#EF4444" />
          <GanttBar label="Senior Park Revive" start={55} width={22} color="#F59E0B" />
          <GanttBar label="Hartfield Re-Reroof 2" start={30} width={35} color="#10B981" pct={40} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs text-gray-500">Monthly Revenue</p>
                <p className="text-xl font-bold text-gray-900">$94,200</p>
                <span className="text-[11px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full font-medium">Invoice/Billing · Paid</span>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">March – April 2026 · -13%</p>
            </div>
            <div className="flex items-end gap-2 h-24">
              {monthlyRevenue.map(({ month, val }) => (
                <div key={month} className="flex flex-col items-center gap-1.5">
                  <div className="w-8 bg-gray-100 rounded-t-md relative overflow-hidden" style={{ height: 80 }}>
                    <div className="absolute bottom-0 w-full rounded-t-md" style={{ height: `${val}%`, background: month === 'Apr' ? '#0D1B2A' : '#E5E7EB' }} />
                  </div>
                  <span className="text-[10px] text-gray-400">{month}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs text-gray-500">Crew Utilization</p>
                <p className="text-xl font-bold text-gray-900">78%</p>
                <span className="text-[11px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full font-medium">Actual / Target Hours · +11% vs last week</span>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Time Tracking · This Week</p>
            </div>
            <div className="space-y-3 mt-2">
              {[{ label: 'Field Ops', pct: 85, color: '#3B82F6' }, { label: 'Engineering', pct: 72, color: '#8B5CF6' }, { label: 'Operations', pct: 68, color: '#10B981' }, { label: 'Admin', pct: 55, color: '#F59E0B' }].map(({ label, pct, color }) => (
                <div key={label}>
                  <div className="flex justify-between text-[11px] mb-1"><span className="text-gray-600">{label}</span><span className="text-gray-800 font-medium">{pct}%</span></div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} /></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-800">Team Members</p>
            <a href="/admin/employees" className="text-xs text-[#0D1B2A] font-medium hover:underline">View all</a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  {['Employee', 'Role', 'Department', 'Phone', 'Email', 'Status'].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-gray-500 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.slice(0, 8).map((emp, i) => {
                  const statusColors: Record<string, string> = {
                    active: 'bg-emerald-50 text-emerald-600',
                    on_leave: 'bg-amber-50 text-amber-600',
                    inactive: 'bg-gray-100 text-gray-500',
                  }
                  const statusLabels: Record<string, string> = {
                    active: 'Active', on_leave: 'On Leave', inactive: 'Inactive',
                  }
                  return (
                    <tr key={emp.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          {emp.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={emp.avatar_url} alt={emp.first_name} className="w-7 h-7 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: avatarColors[i % avatarColors.length] }}>
                              <span className="text-white text-[10px] font-semibold">{initials(`${emp.first_name} ${emp.last_name}`)}</span>
                            </div>
                          )}
                          <span className="font-medium text-gray-800">{emp.first_name} {emp.last_name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-600 capitalize">{emp.role}</td>
                      <td className="px-5 py-3 text-gray-500">{emp.department ?? '—'}</td>
                      <td className="px-5 py-3 text-gray-500">{emp.phone ?? '—'}</td>
                      <td className="px-5 py-3 text-gray-500">{emp.email}</td>
                      <td className="px-5 py-3">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusColors[emp.status] ?? ''}`}>
                          {statusLabels[emp.status] ?? emp.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
                {employees.length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">No employees yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
