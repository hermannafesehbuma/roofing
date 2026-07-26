/**
 * Upload limits shared by the client pickers and the server upload path.
 *
 * Lives apart from `lib/storage.ts` on purpose: that module pulls in the
 * service-role admin client, so a client component importing it would drag the
 * admin key into the browser bundle. These are plain constants, safe anywhere.
 *
 * `MAX_IMAGE_BYTES` mirrors the `projects` bucket's own 10MB cap, and
 * `ALLOWED_IMAGE_TYPES` mirrors its MIME allowlist — keep them in sync with the
 * bucket, and keep `serverActions.bodySizeLimit` in next.config.ts above them.
 */
export const MAX_IMAGE_BYTES = 10_000_000

export const ALLOWED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'image/avif',
] as const

/** `accept` value for file inputs, so the OS picker filters to what we allow. */
export const IMAGE_ACCEPT = ALLOWED_IMAGE_TYPES.join(',')

function formatMb(bytes: number) {
  return `${(bytes / 1_000_000).toFixed(bytes % 1_000_000 === 0 ? 0 : 1)}MB`
}

/**
 * Rejects a picked image before it is ever sent. Returns null when the file is
 * fine — a slow upload that fails at the far end is a much worse way to learn
 * the file was too big.
 */
export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    return `Unsupported image type${file.type ? ` (${file.type})` : ''}. Use PNG, JPEG, WebP, GIF or AVIF.`
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `Image is ${formatMb(file.size)}. The limit is ${formatMb(MAX_IMAGE_BYTES)} — please pick a smaller file.`
  }
  return null
}
