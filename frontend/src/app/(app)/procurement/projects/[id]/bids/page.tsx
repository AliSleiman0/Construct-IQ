'use client';

import { useParams } from 'next/navigation';
import { ProjectBidsView } from '@/features/bids/components/ProjectBidsView';

export default function ProcurementProjectBidsPage() {
  const params = useParams();
  const projectId = String(params?.id ?? '');
  return (
    <ProjectBidsView
      projectId={projectId}
      projectRouteBase="/procurement/bids"
      backHref="/procurement/bids"
      backLabel="Back to bids"
    />
  );
}
