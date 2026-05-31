import { getSettingsStats, getPermissions, getAuditLogs } from './actions'
import { getEmployees } from '../employees/actions'
import { SettingsClient } from './SettingsClient'

export default async function SettingsPage() {
  const employees = await getEmployees()
  const stats = await getSettingsStats()
  const initialPermissions = await getPermissions()
  const initialAuditLogs = await getAuditLogs()

  return (
    <SettingsClient
      initialEmployees={employees}
      stats={stats}
      initialPermissions={initialPermissions}
      initialAuditLogs={initialAuditLogs}
    />
  )
}
