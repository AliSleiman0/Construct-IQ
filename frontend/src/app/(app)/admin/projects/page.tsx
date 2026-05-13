'use client';

import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Skeleton,
  TextField,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useSnackbar } from 'notistack';
import { PageHeader } from '@/components/shared/PageHeader';
import { ProjectsTable } from '@/features/projects/components/ProjectsTable';
import { useProjects } from '@/features/projects/hooks/useProjects';
import { useCreateProject } from '@/features/projects/hooks/useProjectMutations';
import type { MockProject } from '@/mocks/projects.mock';
import { useAuthStore } from '@/store/auth.store';

const STATUS_OPTIONS = [
  { value: 'PLANNING', label: 'Planning' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ON_HOLD', label: 'On Hold' },
];

function toMockStatus(s: string): MockProject['status'] {
  if (s === 'ACTIVE') return 'IN_PROGRESS';
  if (s === 'CANCELLED') return 'ON_HOLD';
  return s as MockProject['status'];
}

export default function AdminProjectsPage() {
  const user = useAuthStore((s) => s.user);
  const { data: rawProjects = [], isLoading } = useProjects();
  const createProject = useCreateProject();
  const { enqueueSnackbar } = useSnackbar();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [status, setStatus] = useState('PLANNING');

  const projects: MockProject[] = useMemo(
    () =>
      rawProjects.map((p: any) => ({
        id: p._id ?? p.id,
        name: p.name,
        code: p.code ?? '',
        orgId: p.organizationId ?? '',
        orgName: '',
        managerName: '',
        status: toMockStatus(p.status),
        budgetUsd: p.totalBudget ?? 0,
        spentUsd: 0,
        startDate: p.startDate ?? '',
        targetEndDate: p.endDate ?? '',
        progressPct: 0,
      })),
    [rawProjects],
  );

  function handleClose() {
    setOpen(false);
    setName('');
    setCode('');
    setStatus('PLANNING');
  }

  function handleCreate() {
    if (!name.trim()) return;
    createProject.mutate(
      { name: name.trim(), code: code.trim() || undefined, status: status as any },
      {
        onSuccess: () => {
          enqueueSnackbar('Project created.', { variant: 'success' });
          handleClose();
        },
        onError: () => enqueueSnackbar('Failed to create project.', { variant: 'error' }),
      },
    );
  }

  return (
    <Box>
      <PageHeader
        title="Projects"
        subtitle={`All projects under ${user?.organization.name ?? 'your organization'}.`}
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
            New project
          </Button>
        }
      />

      {isLoading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {[1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={52} />)}
        </Box>
      ) : (
        <ProjectsTable projects={projects} detailBasePath="/admin/projects" hideOrgColumn />
      )}

      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>New project</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            label="Project name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
            fullWidth
          />
          <TextField
            label="Code (optional)"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            fullWidth
            placeholder="e.g. PRJ-001"
          />
          <TextField
            select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            fullWidth
          >
            {STATUS_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!name.trim() || createProject.isPending}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
