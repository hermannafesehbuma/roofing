'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getSiteUrl } from '@/lib/site-url'
import { sendEmail } from './sendEmail'
import { INVITE_EXPIRY_DAYS } from '@/lib/onboarding'

type InviteTarget = {
  email: string
  name: string
  /** Which table carries the onboarding columns to stamp. */
  table: 'users' | 'clients'
  id: string
}

/**
 * Sends the activation link that turns a created-but-unusable account into a
 * real login (Addendum Tasks 4 and 5).
 *
 * Supabase's `invite` link type only works for addresses with no auth user, and
 * both flows create the auth user first (staff so the employee record can hold
 * a `supabase_id`, clients so the portal can be scoped before the first login).
 * So this generates a `recovery` link instead — same single-use token, same
 * expiry, and it lands on /admin/activate where the invitee sets their own
 * password. No password is ever chosen on their behalf.
 */
export async function sendInvite({ email, name, table, id }: InviteTarget): Promise<
  { sent: true } | { sent: false; error: string }
> {
  const admin = createAdminClient()
  const siteUrl = await getSiteUrl()

  const { data, error } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: `${siteUrl}/admin/activate` },
  })

  if (error || !data.properties?.action_link) {
    return { sent: false, error: error?.message ?? 'Could not generate an activation link' }
  }

  const result = await sendEmail({
    to: email,
    subject: 'Activate your Peak Roofing account',
    html: inviteHtml({ name, link: data.properties.action_link }),
  })

  if (!result.sent) return { sent: false, error: result.error }

  // Stamp only after a successful send, so a failed delivery does not leave a
  // record claiming an invite is outstanding.
  await admin
    .from(table)
    .update({ onboarding_status: 'invited', invited_at: new Date().toISOString() })
    .eq('id', id)

  return { sent: true }
}

function inviteHtml({ name, link }: { name: string; link: string }) {
  const firstName = name.trim().split(' ')[0] || 'there'
  return `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#101828">
  <p style="font-size:20px;font-weight:700;letter-spacing:0.08em;color:#0A1629;margin:0 0 32px">PEAK ROOFING</p>
  <h1 style="font-size:20px;font-weight:600;margin:0 0 12px">Welcome, ${escapeHtml(firstName)}</h1>
  <p style="font-size:14px;line-height:1.6;color:#475467;margin:0 0 24px">
    An account has been created for you. Choose a password to activate it — no one else can set one for you.
  </p>
  <a href="${link}" style="display:inline-block;background:#0A1629;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px">
    Activate Account
  </a>
  <p style="font-size:12px;line-height:1.6;color:#98A2B3;margin:28px 0 0">
    This link expires in ${INVITE_EXPIRY_DAYS} days. If it does, ask an administrator to resend your invite.
  </p>
</div>`
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!)
  )
}
