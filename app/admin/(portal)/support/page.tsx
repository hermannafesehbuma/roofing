import { getSupportTickets } from './actions'
import SupportClient from './SupportClient'

export default async function SupportPage() {
  const initialTickets = await getSupportTickets()
  return <SupportClient initialTickets={initialTickets} />
}
