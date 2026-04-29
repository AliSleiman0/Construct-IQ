'use client';

import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  LinearProgress,
} from '@mui/material';
import Link from 'next/link';
import dayjs from 'dayjs';
import type { MockProject, ProjectStatus } from '@/mocks/projects.mock';

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

interface ProjectsTableProps {
  projects: MockProject[];
  detailBasePath: string;
  hideOrgColumn?: boolean;
}

export function ProjectsTable({ projects, detailBasePath, hideOrgColumn }: ProjectsTableProps) {
  return (
    <TableContainer
      component={Paper}
      elevation={0}
      sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
    >
      <Table size="small">
        <TableHead>
          <TableRow sx={{ '& th': { fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em' } }}>
            <TableCell>Code</TableCell>
            <TableCell>Project</TableCell>
            <TableCell>Status</TableCell>
            {!hideOrgColumn && <TableCell>Org</TableCell>}
            <TableCell>Manager</TableCell>
            <TableCell>Progress</TableCell>
            <TableCell>Budget</TableCell>
            <TableCell>Target end</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {projects.length === 0 && (
            <TableRow>
              <TableCell colSpan={hideOrgColumn ? 7 : 8}>
                <Box textAlign="center" py={5}>
                  <Typography variant="body2" color="text.secondary">
                    No projects yet.
                  </Typography>
                </Box>
              </TableCell>
            </TableRow>
          )}
          {projects.map((p) => {
            const burnPct = p.budgetUsd === 0 ? 0 : Math.round((p.spentUsd / p.budgetUsd) * 100);
            return (
              <TableRow key={p.id} hover sx={{ '& a': { color: 'inherit', textDecoration: 'none' } }}>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                  <Link href={`${detailBasePath}/${p.id}`}>{p.code}</Link>
                </TableCell>
                <TableCell sx={{ fontWeight: 500 }}>
                  <Link href={`${detailBasePath}/${p.id}`}>{p.name}</Link>
                </TableCell>
                <TableCell>
                  <Chip label={STATUS_LABEL[p.status]} color={STATUS_COLOR[p.status]} size="small" sx={{ fontWeight: 600 }} />
                </TableCell>
                {!hideOrgColumn && <TableCell>{p.orgName}</TableCell>}
                <TableCell>{p.managerName}</TableCell>
                <TableCell sx={{ minWidth: 160 }}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <LinearProgress
                      variant="determinate"
                      value={p.progressPct}
                      sx={{ flex: 1, height: 6, borderRadius: 1 }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ minWidth: 32 }}>
                      {p.progressPct}%
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    ${(p.spentUsd / 1_000_000).toFixed(1)}M / ${(p.budgetUsd / 1_000_000).toFixed(1)}M
                  </Typography>
                  <Typography variant="caption" color={burnPct > 90 ? 'warning.main' : 'text.secondary'}>
                    {burnPct}% burned
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{dayjs(p.targetEndDate).format('MMM YYYY')}</Typography>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
