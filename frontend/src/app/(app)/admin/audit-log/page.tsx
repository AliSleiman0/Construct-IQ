'use client';

import { AuditLogView } from '@/features/audit/components/AuditLogView';

// Same component as the super-admin view — AuditService.findAll scopes a
// non-super-admin caller to their own organization, so no extra filtering here.
export default function AdminAuditLogPage() {
  return <AuditLogView subtitle="Everything that changed in your organization." />;
}
