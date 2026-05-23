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
} from '@mui/material';
import Link from 'next/link';
import dayjs from 'dayjs';
import { ProjectStatusBadge } from './ProjectStatusBadge';
import type { Project } from '@/types/project.types';

interface ProjectsTableProps {
  projects: Project[];
  detailBasePath: string;
}

function formatBudget(total?: number | null, currency?: string): string {
  if (total == null) return '—';
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency || 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(total);
  } catch {
    return `${currency ?? ''} ${total.toLocaleString()}`.trim();
  }
}

function formatDateRange(start?: string | null, end?: string | null): string {
  const s = start ? dayjs(start).format("MMM 'YY") : null;
  const e = end ? dayjs(end).format("MMM 'YY") : null;
  if (!s && !e) return '—';
  return `${s ?? '—'} – ${e ?? '—'}`;
}

export function ProjectsTable({ projects, detailBasePath }: ProjectsTableProps) {
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
            <TableCell align="right">Members</TableCell>
            <TableCell align="right">Tasks</TableCell>
            <TableCell>Budget</TableCell>
            <TableCell>Dates</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {projects.length === 0 && (
            <TableRow>
              <TableCell colSpan={7}>
                <Box textAlign="center" py={5}>
                  <Typography variant="body2" color="text.secondary">
                    No projects yet.
                  </Typography>
                </Box>
              </TableCell>
            </TableRow>
          )}
          {projects.map((p) => (
            <TableRow key={p.id} hover sx={{ '& a': { color: 'inherit', textDecoration: 'none' } }}>
              <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                <Link href={`${detailBasePath}/${p.id}`}>{p.code || '—'}</Link>
              </TableCell>
              <TableCell sx={{ fontWeight: 500 }}>
                <Link href={`${detailBasePath}/${p.id}`}>{p.name}</Link>
              </TableCell>
              <TableCell>
                <ProjectStatusBadge status={p.status} />
              </TableCell>
              <TableCell align="right">{p._count.members}</TableCell>
              <TableCell align="right">{p._count.tasks}</TableCell>
              <TableCell>
                <Typography variant="body2">{formatBudget(p.totalBudget, p.currency)}</Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2">{formatDateRange(p.startDate, p.endDate)}</Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
