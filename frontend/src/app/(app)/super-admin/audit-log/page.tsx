'use client';

import {
  Box,
  Paper,
  Stack,
  Typography,
  TextField,
  MenuItem,
  Chip,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { PageHeader } from '@/components/shared/PageHeader';
import { mockAuditLog, type AuditAction } from '@/mocks/audit-log.mock';

const ACTION_COLOR: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'> = {
  login: 'info',
  logout: 'default',
  'user.create': 'success',
  'user.deactivate': 'warning',
  'role.assign': 'primary',
  'role.remove': 'warning',
  'project.create': 'success',
  'project.archive': 'default',
  'org.create': 'success',
  'org.suspend': 'error',
  'plan.upgrade': 'success',
  'plan.downgrade': 'warning',
  'invoice.paid': 'success',
  'ticket.create': 'info',
  'ticket.resolve': 'success',
  'report.file': 'info',
  'issue.resolve': 'success',
};

const ACTION_OPTIONS: ('ALL' | AuditAction)[] = [
  'ALL',
  'login',
  'logout',
  'user.create',
  'user.deactivate',
  'role.assign',
  'role.remove',
  'project.create',
  'project.archive',
  'org.create',
  'org.suspend',
  'plan.upgrade',
  'plan.downgrade',
  'invoice.paid',
  'ticket.create',
  'ticket.resolve',
  'report.file',
  'issue.resolve',
];

export default function AuditLogPage() {
  const [search, setSearch] = useState('');
  const [action, setAction] = useState<'ALL' | AuditAction>('ALL');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return mockAuditLog.filter((e) => {
      if (action !== 'ALL' && e.action !== action) return false;
      if (!q) return true;
      return (
        e.actorName.toLowerCase().includes(q) ||
        e.orgName.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q)
      );
    });
  }, [search, action]);

  return (
    <Box>
      <PageHeader title="Audit Log" subtitle="System-wide activity feed." />

      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} mb={2}>
        <TextField
          size="small"
          placeholder="Search actor, org, description…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flex: 1, maxWidth: 360 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
        />
        <TextField
          size="small"
          select
          label="Action"
          value={action}
          onChange={(e) => setAction(e.target.value as 'ALL' | AuditAction)}
          sx={{ minWidth: 200 }}
        >
          {ACTION_OPTIONS.map((a) => (
            <MenuItem key={a} value={a}>
              {a === 'ALL' ? 'All actions' : a}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <Stack gap={1}>
        {filtered.length === 0 && (
          <Box textAlign="center" py={5}>
            <Typography variant="body2" color="text.secondary">
              No audit entries match.
            </Typography>
          </Box>
        )}
        {filtered.map((e) => (
          <Paper
            key={e.id}
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Chip
              label={e.action}
              size="small"
              color={ACTION_COLOR[e.action] ?? 'default'}
              sx={{ fontFamily: 'monospace', fontWeight: 600, minWidth: 110 }}
            />
            <Box flex={1} minWidth={0}>
              <Typography variant="body2">{e.description}</Typography>
              <Typography variant="caption" color="text.secondary">
                {e.actorName} · {e.orgName} · {e.ipAddress}
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" whiteSpace="nowrap">
              {dayjs(e.createdAt).format('MMM D, HH:mm')}
            </Typography>
          </Paper>
        ))}
      </Stack>
    </Box>
  );
}
