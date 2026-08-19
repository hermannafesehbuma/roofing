'use client'

import { useEffect, useState, useTransition } from 'react'
import { Send, RefreshCw } from 'lucide-react'
import { SearchInput } from '@/app/components/ui/SearchInput'
import { Skeleton } from '@/app/components/ui/Skeleton'
import { ONBOARDING_LABELS, ONBOARDING_STYLES, INVITE_EXPIRY_DAYS } from '@/lib/onboarding'
import { getAccessDirectory, resendInvite, type AccessRow } from './onboardingActions'

/**
 * Settings → Users & Access (Wireframe C).
 *
 * Staff and client logins in one table, because the question an Admin actually
 * asks — "who still hasn't activated?" — spans both. Onboarding state is
 * separate from the HR status in Staff Directory: someone can be an active
 * employee who has never opened their invite.
 */
export function UsersAccessTab({ onNotify }: { onNotify?: (message: string, type: 'success' | 'error') => void }) {
  const [rows, setRows] = useState<AccessRow[]>([])
  const [loading, setLoading] = useState(true)
  const [scope, setScope] = useState<'staff' | 'client'>('staff')
  const [search, setSearch] = useState('')
  const [sending, setSending] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  useEffect(() => {
    getAccessDirectory().then((data) => {
      setRows(data)
      setLoading(false)
    })
  }, [])

  const visible = rows.filter((row) => {
    if (row.kind !== scope) return false
    const q = search.trim().toLowerCase()
    return !q || row.name.toLowerCase().includes(q) || row.email.toLowerCase().includes(q)
  })

  function handleResend(row: AccessRow) {
    setSending(row.id)
    startTransition(async () => {
      const result = await resendInvite(row.kind, row.id)
      setSending(null)
      if ('error' in result) {
        onNotify?.(result.error, 'error')
        return
      }
      onNotify?.(`Invite resent to ${row.email}`, 'success')
      setRows(await getAccessDirectory())
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {([
            { value: 'staff' as const, label: 'Staff' },
            { value: 'client' as const, label: 'Clients' },
          ]).map((option) => (
            <button
              key={option.value}
              onClick={() => setScope(option.value)}
              className={`px-4 py-1.5 rounded-md text-xs transition-colors ${
                scope === option.value
                  ? 'bg-[#0A1629] text-white font-semibold'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <SearchInput value={search} onChange={setSearch} className="sm:w-64" />
        <div className="flex-1" />
        <p className="text-[11px] text-gray-400">
          Invites expire after {INVITE_EXPIRY_DAYS} days.
        </p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-3 border-b border-gray-50">
              <Skeleton className="h-3.5 flex-1 max-w-[160px]" />
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          ))}
        </div>
      ) : visible.length === 0 ? (
        <p className="py-12 text-center text-xs text-gray-400">
          {rows.length === 0 ? 'No accounts yet.' : 'No accounts match your search.'}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400">
                <th className="text-left font-medium py-3 pr-4">Name</th>
                <th className="text-left font-medium py-3 pr-4">Role</th>
                <th className="text-left font-medium py-3 pr-4">Linked to</th>
                <th className="text-left font-medium py-3 pr-4">Onboarding</th>
                <th className="text-right font-medium py-3" />
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={`${row.kind}-${row.id}`} className="border-b border-gray-50 last:border-0">
                  <td className="py-3 pr-4">
                    <p className="font-medium text-gray-900">{row.name}</p>
                    <p className="text-[11px] text-gray-400">{row.email}</p>
                  </td>
                  <td className="py-3 pr-4 text-gray-600">{row.role}</td>
                  <td className="py-3 pr-4 text-gray-600">{row.linkedTo}</td>
                  <td className="py-3 pr-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-medium ${ONBOARDING_STYLES[row.onboarding]}`}>
                      {ONBOARDING_LABELS[row.onboarding]}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    {row.onboarding !== 'active' && (
                      <button
                        onClick={() => handleResend(row)}
                        disabled={sending === row.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-[11px] font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-60"
                      >
                        {sending === row.id
                          ? <RefreshCw size={12} className="animate-spin" />
                          : <Send size={12} />}
                        Resend
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
