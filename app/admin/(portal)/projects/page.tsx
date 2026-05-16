import { getProjects } from './actions';
import { ProjectsClient } from './ProjectsClient';

export default async function ProjectsPage() {
  const projects = await getProjects();
  return <ProjectsClient initialProjects={projects} />;
}
