import { getTimeEntries, getTimeFormOptions } from './actions'
import { TimeTrackingClient } from './TimeTrackingClient'

export default async function TimeTrackingPage() {
  const [entries, formOptions] = await Promise.all([
    getTimeEntries(),
    getTimeFormOptions(),
  ])

  return (
    <TimeTrackingClient
      initialEntries={entries}
      employees={formOptions.employees}
      projects={formOptions.projects}
    />
  )
}
