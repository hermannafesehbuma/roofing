import { getSupportTickets } from './actions'
import SupportClient from './SupportClient'
import { MarkVisited } from '@/app/components/ui/animations'

export default async function SupportPage() {
  const initialTickets = await getSupportTickets()
  return (
    <>
      <MarkVisited />
      <SupportClient initialTickets={initialTickets} />
    </>
  )
}
