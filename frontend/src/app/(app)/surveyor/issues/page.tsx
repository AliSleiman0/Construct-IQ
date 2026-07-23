'use client';

import { IssueListView } from '@/features/issues/components/IssueListView';

export default function SurveyorIssuesPage() {
  return <IssueListView detailBasePath="/surveyor/issues" />;
}
