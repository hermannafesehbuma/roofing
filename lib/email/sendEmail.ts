import { Resend } from 'resend'

export type EmailOptions = {
  to: string
  subject: string
  html: string
}

export type EmailResult = { sent: true; id?: string } | { sent: false; error: string }

/** Verified sender in Resend. Override per environment. */
const FROM = process.env.EMAIL_FROM ?? 'Peak Roofing <onboarding@resend.dev>'

/**
 * Sends through Resend when `RESEND_API_KEY` is configured.
 *
 * Without a key it logs and reports success, so local work and tests do not
 * fail on a missing secret — but it never pretends a real send happened when
 * the provider rejects one: those come back as `{ sent: false }` so callers can
 * surface the failure.
 */
export async function sendEmail({ to, subject, html }: EmailOptions): Promise<EmailResult> {
  if (!to || !to.includes('@')) {
    return { sent: false, error: 'No valid recipient address' }
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.log('[email] RESEND_API_KEY not set — logging instead of sending')
    console.log(`[email] to=${to} subject=${subject} bytes=${html.length}`)
    return { sent: true }
  }

  try {
    const { data, error } = await new Resend(apiKey).emails.send({ from: FROM, to, subject, html })
    if (error) {
      console.error('sendEmail:', error.message)
      return { sent: false, error: error.message }
    }
    return { sent: true, id: data?.id }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('sendEmail threw:', message)
    return { sent: false, error: message }
  }
}
