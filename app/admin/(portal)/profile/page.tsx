import { ProfileClient } from './ProfileClient'
import { MarkVisited } from '@/app/components/ui/animations'

export default function ProfilePage() {
  // The signed-in user lives in the browser session, so the client component
  // loads the record once it knows who is asking.
  return (
    <>
      <MarkVisited />
      <ProfileClient />
    </>
  )
}
