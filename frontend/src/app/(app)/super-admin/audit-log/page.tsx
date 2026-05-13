'use client';

import {
  Box, Paper, Typography, Stack, Chip, TextField,
  MenuItem, CircularProgress, Pagination,
} from '@mui/material';
import { useState } from 'react';
import dayjs from 'dayjs';
import { PageHeader } from '@/components/shared/PageHeader';
import { useAuditLogs } from '@/features/audit/hooks/useAuditLogs';

const ACTION_COLORS: Record<string, 'default' | 'info' | 'success' | 'warning' | 'error'> = {
  'user.login': 'info', 'user.logout': 'default',
  'user.create': 'success', 'user.update': 'info', 'user.delete': 'error',
  'org.create': 'success', 'org.update': 'info', 'org.suspend': 'warning', 'org.activate': 'success',
  'project.create': 'success', 'project.update': 'info', 'project.delete': 'error',
  'issue.create': 'warning', 'issue.resolve': 'success',
  'report.create': 'info', 'ticket.create': 'warning', 'ticket.resolve': 'success',
};

const ENTITY_TYPES = ['ALL', 'User', 'Organization', 'Project', 'Issue', 'DailyReport', 'Ticket', 'Task'];
const PAGE_SIZE = 20;

export default function AuditLogPage() {
  const [search, setSearch] = useState('');
  const [entityType, setEntityType] = useState('ALL');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useAuditLogs({
    entityType: entityType !== 'ALL' ? entityType : undefined,
    limit: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
  });

  const items: any[] = data?.items ?? [];
  const total: number = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Client-side search on the current page
  const filtered = search.trim()
    ? items.filter((e: any) => {
        const q = search.toLowerCase();
        return (
          (e.action ?? '').toLowerCase().includes(q) ||
          (e.entityType ?? '').toLowerCase().includes(q) ||
          (e.entityId ?? '').toLowerCase().includes(q) ||
          (e.actorUserId ?? '').toLowerCase().includes(q) ||
          (e.ipAddress ?? '').toLowerCase().includes(q)
        );
      })
    : items;

  return (
    <Box>
      <PageHeader
        title="Audit Log"
        subtitle="System-wide activity feed. All writes and login events."
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} mb={2.5}>
        <TextField
          label="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          placeholder="action, entity, actor, IP…"
          sx={{ flex: 1 }}
        />
        <TextField
          select
          label="Entity type"
          value={entityType}
          onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
          size="small"
          sx={{ minWidth: 180 }}
        >
          {ENTITY_TYPES.map((t) => (
            <MenuItem key={t} value={t}>{t}</MenuItem>
          ))}
        </TextField>
      </Stack>

      {isLoading ? (
        <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
      ) : (
        <>
          <Stack gap={1.5}>
            {filtered.length === 0 ? (
              <Typography color="text.secondary" textAlign="center" py={4}>
                No audit entries found.
              </Typography>
            ) : (
              filtered.map((entry: any) => (
                <Paper key={entry._id} elevation={0}
                  sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
                  <Box display="flex" alignItems="flex-start" gap={1.5} flexWrap="wrap">
                    <Chip
                      label={entry.action ?? 'unknown'}
                      color={ACTION_COLORS[entry.action ?? ''] ?? 'default'}
                      size="small"
                      sx={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.7rem' }}
                    />
                    <Box flex={1} minWidth={0}>
                      <Typography variant="body2" fontWeight={500}>
                        {entry.entityType} {entry.entityId ? `· ${entry.entityId}` : ''}
                      </Typography>
                      <Stack direction="row" gap={2} flexWrap="wrap" mt={0.5}>
                        {entry.actorUserId && (
                          <Typography variant="caption" color="text.secondary">
                            Actor: {entry.actorUserId}
                          </Typography>
                        )}
                        {entry.ipAddress && (
                          <Typography variant="caption" color="text.secondary">
                            IP: {entry.ipAddress}
                          </Typography>
                        )}
                      </Stack>
                    </Box>
                    <Typography variant="caption" color="text.secondary" whiteSpace="nowrap">
                      {dayjs(entry.createdAt).format('DD MMM YYYY HH:mm')}
                    </Typography>
                  </Box>
                </Paper>
              ))
            )}
          </Stack>

          {pageCount > 1 && (
            <Box display="flex" justifyContent="center" mt={3}>
              <Pagination
                count={pageCount}
                page={page}
                onChange={(_, v) => setPage(v)}
                color="primary"
              />
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
