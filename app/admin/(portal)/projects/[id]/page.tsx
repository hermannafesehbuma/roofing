import { notFound } from 'next/navigation';
import { ProjectDetailClient } from './ProjectDetailClient';
import { getProject } from '../actions';

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  return <ProjectDetailClient project={project} />;
}
