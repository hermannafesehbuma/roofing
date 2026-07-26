'use server'

import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'

async function getSiteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
  }

  const headerList = await headers()
  const origin = headerList.get('origin')
  if (origin) return origin

  const host = headerList.get('host') ?? 'localhost:3000'
  const proto = headerList.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}

export async function requestPasswordReset(email: string) {
  const trimmed = email.trim()

  if (!trimmed) {
    return { success: false as const, error: 'Please enter your email address.' }
  }

  const supabase = createAdminClient()
  const siteUrl = await getSiteUrl()

  const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
    redirectTo: `${siteUrl}/admin/reset-password`,
  })

  // Never reveal whether the address is registered — only surface real
  // delivery problems (rate limits, misconfigured SMTP).
  if (error) {
    console.error('requestPasswordReset error:', error.message)

    if (error.status === 429) {
      return { success: false as const, error: 'Too many reset requests. Please wait a minute and try again.' }
    }

    return { success: false as const, error: 'We could not send the reset email right now. Please try again shortly.' }
  }

  return { success: true as const }
}
