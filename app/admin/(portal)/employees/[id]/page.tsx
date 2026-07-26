import { notFound } from 'next/navigation'
import { getEmployee } from '../actions'
import {
  getEmployeeProjects, getEmployeeTimeline, getEmployeeRfis,
  getEmployeeDocuments, getEmployeeInspections, getAssignableManagers,
} from './actions'
import { EmployeeDetailClient } from './EmployeeDetailClient'

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const employee = await getEmployee(id)
  if (!employee) notFound()

  const [projects, timeline, rfis, documents, inspections, managers] = await Promise.all([
    getEmployeeProjects(id),
    getEmployeeTimeline(id),
    getEmployeeRfis(id),
    getEmployeeDocuments(id),
    getEmployeeInspections(id),
    getAssignableManagers(),
  ])

  return (
    <EmployeeDetailClient
      employee={employee}
      projects={projects}
      timeline={timeline}
      rfis={rfis}
      documents={documents}
      inspections={inspections}
      managers={managers}
    />
  )
}
