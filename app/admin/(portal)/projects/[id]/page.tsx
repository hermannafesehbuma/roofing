import { ProjectDetailClient } from './ProjectDetailClient';
import { mockProjects } from '../data';

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  // In a real app, you would fetch data here based on params.id
  const project = mockProjects.find(p => p.id === params.id) || mockProjects[0];

  return <ProjectDetailClient project={project} />;
}
