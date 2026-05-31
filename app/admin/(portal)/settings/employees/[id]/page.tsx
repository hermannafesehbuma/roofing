import { notFound } from 'next/navigation'
import { getEmployee } from '../../../employees/actions'
import { SettingsEmployeeDetailClient } from './SettingsEmployeeDetailClient'

export default async function SettingsEmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const employee = await getEmployee(id)
  if (!employee) notFound()

  return <SettingsEmployeeDetailClient employee={employee} />
}
