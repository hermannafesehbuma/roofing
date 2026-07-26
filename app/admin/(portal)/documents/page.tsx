import { DocumentsClient } from './DocumentsClient'

export default function DocumentsPage() {
  // Documents are scoped to the signed-in user, and the session lives in the
  // browser, so the client component loads them once it knows who is asking.
  return <DocumentsClient />
}
