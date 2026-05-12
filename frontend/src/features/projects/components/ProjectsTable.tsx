'use client';

import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, Typography,
} from '@mui/material';
import Link from 'next/link';

const STATUS_COLORS: Record<string, 'default' | 'primary' | 'warning' | 'success' | 'error' | 'info'> = {
  PLANNING: 'info',
  ACTIVE: 'success',
  ON_HOLD: 'warning',
  COMPLETED: 'default',
  CANCELLED: 'error',
};

interface Project {
  id: string;
  name: string;
  code?: string | null;
  status: string;
  totalBudget?: number | null;
  currency?: string;
  startDate?: string | null;
  endDate?: string | null;
}

interface ProjectsTableProps {
  projects: Project[];
  detailBasePath: string;
  hideOrgColumn?: boolean;
}

function formatCurrency(amount: number | null | undefined, currency = 'USD'): string {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

export function ProjectsTable({ projects, detailBasePath }: ProjectsTableProps) {
  if (projects.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
        <Typography color="text.secondary">No projects found.</Typography>
      </Paper>
    );
  }

  return (
    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Project</TableCell>
            <TableCell>Code</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Budget</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {projects.map((project) => (
            <TableRow key={project.id} hover>
              <TableCell>
                <Link
                  href={`${detailBasePath}/${project.id}`}
                  style={{ color: '#1976d2', textDecoration: 'none', fontWeight: 600 }}
                >
                  {project.name}
                </Link>
              </TableCell>
              <TableCell>
                <Typography variant="body2" color="text.secondary">
                  {project.code ?? '—'}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip
                  label={project.status.replace('_', ' ')}
                  size="small"
                  color={STATUS_COLORS[project.status] ?? 'default'}
                />
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2">
                  {formatCurrency(project.totalBudget, project.currency)}
                </Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
