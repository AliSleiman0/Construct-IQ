'use client';

import { IssueListView } from '@/features/issues/components/IssueListView';

export default function PlanningEngIssuesPage() {
  return <IssueListView detailBasePath="/planning-eng/issues" />;
}
