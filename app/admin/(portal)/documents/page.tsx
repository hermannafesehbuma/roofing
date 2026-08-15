import { DocumentsClient } from './DocumentsClient'
import { MarkVisited } from '@/app/components/ui/animations'

export default function DocumentsPage() {
  // Documents are scoped to the signed-in user, and the session lives in the
  // browser, so the client component loads them once it knows who is asking.
  return (
    <>
      <MarkVisited />
      <DocumentsClient />
    </>
  )
}
