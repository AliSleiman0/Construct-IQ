'use client';

import { Box, Paper, Typography, Chip, Stack, LinearProgress } from '@mui/material';
import dayjs from 'dayjs';
import { findProjectById, type ProjectStatus } from '@/mocks/projects.mock';

const STATUS_COLOR: Record<ProjectStatus, 'default' | 'primary' | 'info' | 'success' | 'warning'> = {
  PLANNING: 'info',
  IN_PROGRESS: 'primary',
  CLOSEOUT: 'warning',
  COMPLETED: 'success',
  ON_HOLD: 'default',
};

const STATUS_LABEL: Record<ProjectStatus, string> = {
  PLANNING: 'Planning',
  IN_PROGRESS: 'In progress',
  CLOSEOUT: 'Closeout',
  COMPLETED: 'Completed',
  ON_HOLD: 'On hold',
};

export function ProjectDetail({ projectId }: { projectId: string }) {
  const p = findProjectById(projectId);

  if (!p) {
    return (
      <Paper elevation={0} sx={{ p: 4, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Typography variant="h6">Project not found</Typography>
      </Paper>
    );
  }

  const burnPct = p.budgetUsd === 0 ? 0 : Math.round((p.spentUsd / p.budgetUsd) * 100);

  return (
    <Stack gap={2.5}>
      <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Box display="flex" alignItems="center" gap={1.5} mb={1.5}>
          <Chip label={p.code} size="small" variant="outlined" sx={{ fontFamily: 'monospace', fontWeight: 600 }} />
          <Chip label={STATUS_LABEL[p.status]} color={STATUS_COLOR[p.status]} size="small" sx={{ fontWeight: 600 }} />
        </Box>
        <Typography variant="h4" fontWeight={700} mb={0.5}>
          {p.name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {p.orgName} · Managed by {p.managerName}
        </Typography>
      </Paper>

      <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle2" fontWeight={600} mb={1.5}>
            Schedule
          </Typography>
          <Stack gap={1.5}>
            <KV label="Started" value={dayjs(p.startDate).format('MMM D, YYYY')} />
            <KV label="Target end" value={dayjs(p.targetEndDate).format('MMM D, YYYY')} />
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
                Progress
              </Typography>
              <Box display="flex" alignItems="center" gap={1.5} mt={0.5}>
                <LinearProgress
                  variant="determinate"
                  value={p.progressPct}
                  sx={{ flex: 1, height: 8, borderRadius: 1 }}
                />
                <Typography variant="body2" fontWeight={600}>
                  {p.progressPct}%
                </Typography>
              </Box>
            </Box>
          </Stack>
        </Paper>

        <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle2" fontWeight={600} mb={1.5}>
            Budget
          </Typography>
          <Stack gap={1.5}>
            <KV label="Total budget" value={`$${(p.budgetUsd / 1_000_000).toFixed(2)}M`} />
            <KV label="Spent to date" value={`$${(p.spentUsd / 1_000_000).toFixed(2)}M`} />
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
                Burn rate
              </Typography>
              <Box display="flex" alignItems="center" gap={1.5} mt={0.5}>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, burnPct)}
                  color={burnPct > 90 ? 'warning' : 'primary'}
                  sx={{ flex: 1, height: 8, borderRadius: 1 }}
                />
                <Typography variant="body2" fontWeight={600}>
                  {burnPct}%
                </Typography>
              </Box>
            </Box>
          </Stack>
        </Paper>
      </Box>
    </Stack>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={500}>
        {value}
      </Typography>
    </Box>
  );
}
