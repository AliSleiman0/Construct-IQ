'use client';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Typography, Stack, Chip, IconButton, Tooltip,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import type { Issue, IssueSeverity, IssueStatus } from '@/types/issue.types';

const SEVERITY_COLOR: Record<IssueSeverity, 'default' | 'info' | 'warning' | 'error'> = {
  LOW: 'default', MEDIUM: 'info', HIGH: 'warning', CRITICAL: 'error',
};
const STATUS_COLOR: Record<IssueStatus, 'default' | 'info' | 'success' | 'error'> = {
  OPEN: 'error', IN_PROGRESS: 'info', RESOLVED: 'success', CLOSED: 'default',
};
const STATUS_LABEL: Record<IssueStatus, string> = {
  OPEN: 'Open', IN_PROGRESS: 'In Progress', RESOLVED: 'Resolved', CLOSED: 'Closed',
};

interface IssueTableProps {
  issues: Issue[];
  onEdit: (issue: Issue) => void;
  onDelete: (issue: Issue) => void;
}

export function IssueTable({ issues, onEdit, onDelete }: IssueTableProps) {
  return (
    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ '& th': { fontWeight: 600, bgcolor: 'grey.50' } }}>
            <TableCell>Title</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Severity</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Reported</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {issues.map((issue) => (
            <TableRow key={issue.id} hover>
              <TableCell>
                <Typography variant="body2" fontWeight={500}>{issue.title}</Typography>
              </TableCell>
              <TableCell>
                <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
                  {issue.type.toLowerCase().replace('_', ' ')}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip label={issue.severity} color={SEVERITY_COLOR[issue.severity]} size="small" />
              </TableCell>
              <TableCell>
                <Chip label={STATUS_LABEL[issue.status]} color={STATUS_COLOR[issue.status]} size="small" />
              </TableCell>
              <TableCell>
                <Typography variant="caption" color="text.secondary">
                  {new Date(issue.createdAt).toLocaleDateString()}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Stack direction="row" justifyContent="flex-end">
                  <Tooltip title="Edit">
                    <IconButton size="small" onClick={() => onEdit(issue)}><EditIcon fontSize="small" /></IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton size="small" color="error" onClick={() => onDelete(issue)}><DeleteIcon fontSize="small" /></IconButton>
                  </Tooltip>
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
