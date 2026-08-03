import { createAdminClient } from '@/lib/supabase/admin'
import { MAX_IMAGE_BYTES } from '@/lib/upload-limits'

/**
 * Upload targets — project images in `projects`, employee photos in
 * `avatar_url`, RFI attachments in `documents`, COIs and certifications in
 * `insurance_documents`.
 *
 * `insurance_documents` is the one private bucket: `getPublicUrl` returns a URL
 * that 400s there, so uploads to it record the object path and reading is done
 * through {@link signedUrlFor}.
 */
export const STORAGE_BUCKET = 'avatar_url'
export const PROJECTS_BUCKET = 'projects'
export const DOCUMENTS_BUCKET = 'documents'
export const INSURANCE_BUCKET = 'insurance_documents'

const TARGETS = {
  projects:  { bucket: PROJECTS_BUCKET,  prefix: '', public: true  },
  avatars:   { bucket: STORAGE_BUCKET,   prefix: '', public: true  },
  documents: { bucket: DOCUMENTS_BUCKET, prefix: '', public: true  },
  insurance: { bucket: INSURANCE_BUCKET, prefix: '', public: false },
} as const

export type StorageTarget = keyof typeof TARGETS
/** Kept as a named map so call sites read as `StorageFolder.projects`. */
export const StorageFolder = {
  projects: 'projects',
  avatars: 'avatars',
  documents: 'documents',
  insurance: 'insurance',
} as const satisfies Record<StorageTarget, StorageTarget>

export type UploadResult = { url: string; path: string } | { error: string }

function extensionOf(fileName: string, fallback: string) {
  const ext = fileName.split('.').pop()
  return ext && ext !== fileName ? ext.toLowerCase() : fallback
}

/** Builds a path inside a target, honouring that target's folder prefix. */
export function storagePathFor(target: StorageTarget, name: string) {
  const { prefix } = TARGETS[target]
  return prefix ? `${prefix}/${name}` : name
}

export function bucketFor(target: StorageTarget) {
  return TARGETS[target].bucket
}

/**
 * Node's fetch reports every transport-level failure — dropped socket, reset
 * connection, DNS blip — as the bare string "fetch failed". supabase-js hands
 * that straight back as `error.message`, so without this check a flaky link
 * shows up in the UI as an unactionable "fetch failed".
 */
function isTransientNetworkError(message: string) {
  const m = message.toLowerCase()
  return (
    m.includes('fetch failed') ||
    m.includes('network') ||
    m.includes('socket') ||
    m.includes('econnreset') ||
    m.includes('etimedout') ||
    m.includes('timeout')
  )
}

/** Turns storage/transport failures into something a user can act on. */
function friendlyUploadError(message: string) {
  if (isTransientNetworkError(message)) {
    return 'Could not reach file storage — check your connection and try again.'
  }
  if (message.toLowerCase().includes('exceeded the maximum allowed size')) {
    return `Image is too large. The limit is ${MAX_IMAGE_BYTES / 1_000_000}MB.`
  }
  return message
}

const UPLOAD_ATTEMPTS = 3

/**
 * Uploads a file to the given target and returns its public URL.
 *
 * Large uploads over a slow link drop often enough that a single attempt is not
 * good enough — transport failures are retried with a short backoff, while real
 * rejections (size, MIME, duplicate path) fail immediately since retrying them
 * only makes the user wait longer for the same answer.
 */
export async function uploadToStorage(
  target: StorageTarget,
  file: File,
  options?: { name?: string; fallbackExtension?: string }
): Promise<UploadResult> {
  if (!file || file.size === 0) return { error: 'No file provided' }

  const { bucket } = TARGETS[target]
  const name =
    options?.name ?? `${crypto.randomUUID()}.${extensionOf(file.name, options?.fallbackExtension ?? 'jpg')}`
  const path = storagePathFor(target, name)

  const admin = createAdminClient()
  // Read once: re-reading the stream on a retry would yield an empty body.
  const bytes = await file.arrayBuffer()
  const contentType = file.type || 'application/octet-stream'

  let lastError = 'Upload failed'
  for (let attempt = 1; attempt <= UPLOAD_ATTEMPTS; attempt++) {
    let message: string | null = null
    try {
      const { error } = await admin.storage
        .from(bucket)
        .upload(path, bytes, { contentType, upsert: false })
      if (!error) {
        // Private buckets have no public URL — callers store the path and mint a
        // signed URL when someone actually opens the file.
        if (!TARGETS[target].public) return { url: path, path }
        const { data } = admin.storage.from(bucket).getPublicUrl(path)
        return { url: data.publicUrl, path }
      }
      message = error.message
    } catch (e) {
      // supabase-js normally returns transport errors, but a thrown TypeError
      // from fetch would otherwise escape as an unhandled server action crash.
      message = e instanceof Error ? e.message : String(e)
    }

    lastError = message
    if (!isTransientNetworkError(message) || attempt === UPLOAD_ATTEMPTS) break
    console.warn(`uploadToStorage: ${message} (attempt ${attempt}/${UPLOAD_ATTEMPTS}), retrying`)
    await new Promise((resolve) => setTimeout(resolve, 500 * attempt))
  }

  console.error('uploadToStorage failed:', lastError)
  return { error: friendlyUploadError(lastError) }
}

/**
 * Time-limited URL for an object in a private bucket. Returns null when the
 * object is gone, so callers can fall back rather than open a broken link.
 */
export async function signedUrlFor(
  target: StorageTarget,
  pathOrUrl: string,
  expiresInSeconds = 60 * 60
): Promise<string | null> {
  const path = pathOrUrl.startsWith('http') ? storagePathFromUrl(pathOrUrl, target) : pathOrUrl
  if (!path) return null

  const { data, error } = await createAdminClient()
    .storage.from(TARGETS[target].bucket)
    .createSignedUrl(path, expiresInSeconds)

  if (error) {
    console.error('signedUrlFor:', error.message)
    return null
  }
  return data.signedUrl
}

/** Turns a stored public URL back into a bucket path, for deletions. */
export function storagePathFromUrl(url: string, target: StorageTarget): string | null {
  const marker = `/${TARGETS[target].bucket}/`
  const idx = url.indexOf(marker)
  return idx === -1 ? null : url.slice(idx + marker.length)
}

export async function removeFromStorage(target: StorageTarget, pathOrUrl: string) {
  const path = pathOrUrl.startsWith('http') ? storagePathFromUrl(pathOrUrl, target) : pathOrUrl
  if (!path) return
  await createAdminClient().storage.from(TARGETS[target].bucket).remove([path])
}
