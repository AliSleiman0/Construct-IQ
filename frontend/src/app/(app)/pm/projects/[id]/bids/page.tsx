'use client';

import { useParams } from 'next/navigation';
import { ProjectBidsView } from '@/features/bids/components/ProjectBidsView';

export default function PMProjectBidsPage() {
  const params = useParams();
  const projectId = String(params?.id ?? '');
  return <ProjectBidsView projectId={projectId} projectRouteBase="/pm/projects" />;
}
