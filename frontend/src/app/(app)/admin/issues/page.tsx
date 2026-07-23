'use client';

import { IssuesConsole } from '@/features/issues/components/IssuesConsole';

export default function AdminIssuesPage() {
  return <IssuesConsole detailBasePath="/admin/issues" />;
}
