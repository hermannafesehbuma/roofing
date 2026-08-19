import { headers } from 'next/headers'

/**
 * Absolute origin for links that leave the app (invite and reset emails).
 *
 * Prefers the configured site URL so a link mailed from a preview deploy still
 * points at production; falls back to the request's own origin.
 */
export async function getSiteUrl() {
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
