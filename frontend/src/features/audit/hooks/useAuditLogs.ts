import { useQuery } from '@tanstack/react-query';
import { auditLogsApi } from '@/lib/api/auditLogs.api';

export function useAuditLogs(params?: {
  actorUserId?: string;
  entityType?: string;
  from?: string;
  to?: string;
  limit?: number;
  skip?: number;
}) {
  return useQuery({
    queryKey: ['audit-logs', params],
    queryFn: () => auditLogsApi.list(params),
  });
}
