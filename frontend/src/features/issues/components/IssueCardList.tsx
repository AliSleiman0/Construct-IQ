'use client';

import { Box, Paper, Typography } from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import Link from 'next/link';
import dayjs from 'dayjs';
import type { Issue, UserRef } from '@/types/issue.types';
import { IssueSeverityBadge, IssueStatusBadge } from './IssueBadges';

function userName(u?: UserRef | null): string {
  if (!u) return 'Unknown';
  return `${u.firstName} ${u.lastName}`.trim() || 'Unknown';
}

/** The rich card view of issues (the "cards" toggle of the triage console). */
export function IssueCardList({ issues, detailBasePath }: { issues: Issue[]; detailBasePath: string }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 1.5 }}>
      {issues.map((iss) => (
        <Paper
          key={iss.id}
          elevation={0}
          component={Link}
          href={`${detailBasePath}/${iss.id}`}
          sx={{
            p: 2.5,
            borderRadius: 2,
            border: '1px solid',
            borderColor: iss.severity === 'CRITICAL' ? 'error.light' : 'divider',
            bgcolor: iss.severity === 'CRITICAL' ? 'rgba(239,68,68,0.04)' : 'background.paper',
            textDecoration: 'none',
            color: 'inherit',
            display: 'block',
            '&:hover': { borderColor: 'primary.light', boxShadow: '0 4px 8px -4px rgba(0,0,0,0.08)' },
          }}
        >
          <Box display="flex" alignItems="center" gap={1.5} mb={1} flexWrap="wrap">
            {iss.project?.name && (
              <Typography variant="caption" sx={{ fontWeight: 600 }} color="text.secondary">
                {iss.project.name}
              </Typography>
            )}
            <IssueSeverityBadge severity={iss.severity} />
            <IssueStatusBadge status={iss.status} />
          </Box>
          <Typography variant="subtitle1" fontWeight={600} mb={0.5}>
            {iss.title}
          </Typography>
          {iss.description && (
            <Typography variant="body2" color="text.secondary" mb={1}>
              {iss.description}
            </Typography>
          )}
          <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
            {iss.location && (
              <Box display="flex" alignItems="center" gap={0.5} color="text.secondary">
                <LocationOnIcon sx={{ fontSize: 14 }} />
                <Typography variant="caption">{iss.location}</Typography>
              </Box>
            )}
            {iss.trade && (
              <Typography variant="caption" color="text.secondary">
                {iss.trade}
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary">
              {iss.assignedTo ? `→ ${userName(iss.assignedTo)}` : 'Unassigned'} · {userName(iss.createdBy)} ·{' '}
              {dayjs(iss.createdAt).format('MMM D')}
            </Typography>
          </Box>
        </Paper>
      ))}
    </Box>
  );
}
