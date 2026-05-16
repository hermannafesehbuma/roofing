import { notFound } from 'next/navigation'
import { getEmployee } from '../actions'
import { EmployeeDetailClient } from './EmployeeDetailClient'

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const employee = await getEmployee(id)
  if (!employee) notFound()
  return <EmployeeDetailClient employee={employee} />
}
