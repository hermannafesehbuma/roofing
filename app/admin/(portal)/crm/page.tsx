import { getLeads, getClients, getRepOptions } from './actions'
import { CRMClient } from './CRMClient'

export default async function CRMPage() {
  const [leads, clients, reps] = await Promise.all([
    getLeads(),
    getClients(),
    getRepOptions(),
  ])

  return <CRMClient initialLeads={leads} initialClients={clients} reps={reps} />
}
