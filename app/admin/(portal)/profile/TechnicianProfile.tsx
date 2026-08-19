'use client'

import Image from 'next/image'
import { LogOut } from 'lucide-react'
import { initialsOf } from '@/app/components/ui/useCurrentUser'
import { ROLE_TITLES } from '@/app/components/ui/ProfileMenu'
import { formatShortDate } from '@/lib/format'
import type { OwnProfile, ProfileRecords } from './actions'

/**
 * The crew's profile screen.
 *
 * Read-only by design: a technician confirms who they are, checks their
 * certifications and pay, and signs out. Anything editable — name, phone, and
 * the password — lives behind the gear in the header, which is why there is no
 * form here. Other roles keep the editable profile in `ProfileClient`.
 */
export function TechnicianProfile({ profile, records, onSignOut }: {
  profile: OwnProfile
  records: ProfileRecords
  onSignOut: () => void
}) {
  const name = `${profile.firstName} ${profile.lastName}`.trim()
  const roleTitle = ROLE_TITLES[profile.role] ?? profile.role

  return (
    <div className="space-y-4">
      {/* Identity */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center gap-3">
          <span className="relative w-12 h-12 rounded-full overflow-hidden shrink-0 bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
            {profile.avatarUrl ? (
              <Image src={profile.avatarUrl} alt={name} fill sizes="48px" className="object-cover" />
            ) : (
              <span className="text-white text-sm font-semibold">{initialsOf(name)}</span>
            )}
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold text-gray-900 truncate">{name || '—'}</p>
            <p className="text-xs text-gray-400 truncate">
              {roleTitle}{profile.employeeId && ` · ${profile.employeeId}`}
            </p>
          </div>

          {profile.status && (
            <span className={`shrink-0 inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium ${
              profile.status === 'active' ? 'text-emerald-700 bg-emerald-50' : 'text-gray-600 bg-gray-100'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${profile.status === 'active' ? 'bg-emerald-500' : 'bg-gray-400'}`} />
              {profile.status === 'active' ? 'Active' : profile.status}
            </span>
          )}
        </div>
      </section>

      {/* Certification */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Certification</h2>
        {records.certifications.length === 0 ? (
          <p className="text-xs text-gray-400 py-2">No certifications on file.</p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {records.certifications.map((cert) => (
              <li key={cert.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{cert.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {cert.expiryDate ? `Expires: ${formatShortDate(cert.expiryDate)}` : 'No expiry'}
                    {/* The countdown only earns its place while it is close. */}
                    {cert.daysRemaining !== null && cert.daysRemaining >= 0 && cert.daysRemaining <= 60 &&
                      ` — ${cert.daysRemaining} days`}
                  </p>
                </div>
                <span className={`shrink-0 px-2 py-1 rounded-md text-[11px] font-medium ${CERT_BADGE[cert.status] ?? CERT_BADGE.valid}`}>
                  {CERT_LABEL[cert.status] ?? cert.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Pay Stubs */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Pay Stubs</h2>
        {records.payStubs.length === 0 ? (
          <p className="text-xs text-gray-400 py-2">No pay stubs yet.</p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {records.payStubs.map((stub) => (
              <li key={stub.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {formatShortDate(stub.periodStart)} – {formatShortDate(stub.periodEnd)}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Regular{stub.hoursWorked !== null && ` · ${stub.hoursWorked} hrs`}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-emerald-600">{fmtPay(stub.netPay)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <button
        onClick={onSignOut}
        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-red-50/70 px-6 py-3.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
      >
        Log Out <LogOut size={16} />
      </button>
    </div>
  )
}

/** Certification status pills, matching the Insurance board's colours. */
const CERT_BADGE: Record<string, string> = {
  valid:         'text-emerald-700 bg-emerald-50',
  expiring_soon: 'text-orange-700 bg-orange-50',
  expired:       'text-red-700 bg-red-50',
}

const CERT_LABEL: Record<string, string> = {
  valid:         'Valid',
  expiring_soon: 'Expiring Soon',
  expired:       'Expired',
}

/** Whole dollars — pay stubs are shown to the crew, not accounted here. */
function fmtPay(v: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v)
}
