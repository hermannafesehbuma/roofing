import { getTasks, getProjectOptions, getAssigneeOptions } from './actions'
import { TasksClient } from './TasksClient'

export default async function TasksPage() {
  const [tasks, projects, assignees] = await Promise.all([
    getTasks(),
    getProjectOptions(),
    getAssigneeOptions(),
  ])

  return <TasksClient initialTasks={tasks} projects={projects} assignees={assignees} />
}
