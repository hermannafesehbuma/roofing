import { getSettingsStats, getPermissions, getAuditLogs } from './actions'
import { getEmployees } from '../employees/actions'
import { SettingsClient } from './SettingsClient'
import { MarkVisited } from '@/app/components/ui/animations'
import { SettingsRoleRouter } from './SettingsRoleRouter'

export default async function SettingsPage() {
  const employees = await getEmployees()
  const stats = await getSettingsStats()
  const initialPermissions = await getPermissions()
  const initialAuditLogs = await getAuditLogs()

  return (
    <>
      <MarkVisited />
      <SettingsRoleRouter>
        <SettingsClient
          initialEmployees={employees}
          stats={stats}
          initialPermissions={initialPermissions}
          initialAuditLogs={initialAuditLogs}
        />
      </SettingsRoleRouter>
    </>
  )
}
