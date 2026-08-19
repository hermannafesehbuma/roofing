/**
 * Invite lifecycle shared by staff and client onboarding (Addendum Task 4).
 *
 * One rule underpins all of it: nobody — Admin included — ever sets another
 * person's password. Accounts are created without a usable one and activated by
 * the account holder through an emailed link.
 */

export type OnboardingStatus = 'invited' | 'active' | 'expired'

/**
 * Addendum Task 7 #4. Long enough that someone who does not check email daily
 * is not locked out, short enough that stale links do not sit open forever.
 *
 * The decision says this becomes editable under Settings → Automation Rules.
 * That tab is not built yet, so this constant is the single source of truth
 * until it is — move it, don't copy it.
 */
export const INVITE_EXPIRY_DAYS = 7

/**
 * An invite goes stale on a clock, not on an event, so rather than running a
 * cron to flip rows to 'expired' we derive it whenever the record is read. The
 * stored column stays 'invited'; only the display and the Resend action care.
 */
export function resolveOnboardingStatus(
  stored: OnboardingStatus | string | null | undefined,
  invitedAt: string | null | undefined
): OnboardingStatus {
  if (stored === 'active') return 'active'
  if (stored === 'expired') return 'expired'
  if (!invitedAt) return 'invited'

  const sentAt = new Date(invitedAt).getTime()
  if (Number.isNaN(sentAt)) return 'invited'

  const expiresAt = sentAt + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  return Date.now() > expiresAt ? 'expired' : 'invited'
}

export const ONBOARDING_LABELS: Record<OnboardingStatus, string> = {
  invited: 'Invited',
  active: 'Active',
  expired: 'Expired',
}

/** Matches the status palette used across the portal. */
export const ONBOARDING_STYLES: Record<OnboardingStatus, string> = {
  active:  'text-emerald-700 bg-emerald-50',
  invited: 'text-amber-700 bg-amber-50',
  expired: 'text-red-600 bg-red-50',
}

/**
 * Notification types a Technician actually receives (Addendum Task 8).
 *
 * Deliberately not the full trigger table: showing an Admin-only alert like
 * "invoice overdue" as a togglable option offers control over something that
 * would never arrive.
 */
export const TECHNICIAN_NOTIFICATION_TYPES = [
  { key: 'task_assigned',       label: 'Task assigned to me' },
  { key: 'time_entry_reviewed', label: 'Time entry approved/rejected' },
  { key: 'payroll_ready',       label: 'Payroll ready' },
  { key: 'project_status',      label: 'Project status change' },
] as const

export type NotificationChannelPrefs = { in_app: boolean; email: boolean }
export type NotificationPreferences = Record<string, NotificationChannelPrefs>

/** In-app on, email off — a technician gets the alert without inbox noise. */
export function defaultNotificationPreferences(): NotificationPreferences {
  return Object.fromEntries(
    TECHNICIAN_NOTIFICATION_TYPES.map((t) => [t.key, { in_app: true, email: false }])
  )
}
