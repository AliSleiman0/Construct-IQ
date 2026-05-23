'use client';

import { useMemo, useState } from 'react';
import { Box, Stack, TextField, InputAdornment, IconButton, Tooltip, Skeleton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import { PageHeader } from '@/components/shared/PageHeader';
import { AppButton } from '@/components/ui/AppButton';
import { AppErrorState } from '@/components/ui/AppErrorState';
import { AppEmptyState } from '@/components/ui/AppEmptyState';
import { ProjectsTable } from '@/features/projects/components/ProjectsTable';
import { CreateProjectModal } from '@/features/projects/components/ProjectModals';
import { useProjects } from '@/features/projects/hooks/useProjects';
import { useCreateProject, useDeleteProject } from '@/features/projects/hooks/useProjectMutations';
import { useAuthStore } from '@/store/auth.store';
import type { Project, ProjectStatus } from '@/types/project.types';

type SortKey = 'name' | 'status' | 'startDate' | 'updatedAt';

const STATUS_ORDER: ProjectStatus[] = ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'];

export default function PMProjectsPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const isSuperAdmin = !!useAuthStore((s) => s.user?.isSuperAdmin);
  const canCreate = isSuperAdmin || hasPermission('create:projects');
  const canDelete = isSuperAdmin || hasPermission('delete:projects');

  const { data: projects, isLoading, isError, refetch } = useProjects();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortKey>('updatedAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [createOpen, setCreateOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useCreateProject();
  const deleteMutation = useDeleteProject();

  const handleDelete = async (project: Project) => {
    if (!confirm(`Delete project "${project.name}"? This cannot be undone.`)) return;
    try {
      await deleteMutation.mutateAsync(project.id);
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Failed to delete project');
    }
  };

  const visible = useMemo(() => {
    const q = search.toLowerCase();
    const filtered = (projects ?? []).filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(q) ||
        (p.code ?? '').toLowerCase().includes(q) ||
        (p.location ?? '').toLowerCase().includes(q);
      const matchesStatus = !statusFilter || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    const dir = sortDir === 'asc' ? 1 : -1;
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name) * dir;
        case 'status':
          return (STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)) * dir;
        case 'startDate': {
          // Nulls always sort last, regardless of direction.
          const av = a.startDate ? new Date(a.startDate).getTime() : null;
          const bv = b.startDate ? new Date(b.startDate).getTime() : null;
          if (av == null && bv == null) return 0;
          if (av == null) return 1;
          if (bv == null) return -1;
          return (av - bv) * dir;
        }
        case 'updatedAt':
        default:
          return (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()) * dir;
      }
    });
    return sorted;
  }, [projects, search, statusFilter, sortBy, sortDir]);

  const handleCreate = async (values: Parameters<typeof createMutation.mutateAsync>[0]) => {
    setFormError(null);
    try {
      await createMutation.mutateAsync(values);
      setCreateOpen(false);
    } catch (e: any) {
      setFormError(e?.response?.data?.message ?? 'Failed to create project');
    }
  };

  return (
    <Box>
      <PageHeader
        title="My Projects"
        subtitle="Active projects you manage."
        actions={
          canCreate ? (
            <AppButton
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setFormError(null);
                setCreateOpen(true);
              }}
            >
              New Project
            </AppButton>
          ) : undefined
        }
      />

      {/* Search + filter + sort */}
      <Stack direction="row" spacing={2} mb={3} flexWrap="wrap" useFlexGap alignItems="center">
        <TextField
          size="small"
          placeholder="Search projects…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: 280 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
        />
        <TextField
          select
          size="small"
          label="Status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          sx={{ width: 160 }}
          SelectProps={{ native: true }}
          InputLabelProps={{ shrink: true }}
        >
          <option value="">All</option>
          <option value="PLANNING">Planning</option>
          <option value="ACTIVE">Active</option>
          <option value="ON_HOLD">On Hold</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </TextField>
        <TextField
          select
          size="small"
          label="Sort by"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortKey)}
          sx={{ width: 180 }}
          SelectProps={{ native: true }}
          InputLabelProps={{ shrink: true }}
        >
          <option value="updatedAt">Recently updated</option>
          <option value="name">Name (A–Z)</option>
          <option value="status">Status</option>
          <option value="startDate">Start date</option>
        </TextField>
        <Tooltip title={sortDir === 'asc' ? 'Ascending' : 'Descending'}>
          <IconButton
            size="small"
            aria-label="Toggle sort direction"
            onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
          >
            <SwapVertIcon fontSize="small" sx={{ transform: sortDir === 'asc' ? 'scaleY(-1)' : 'none' }} />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* Content */}
      {isLoading && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rounded" height={52} />
          ))}
        </Box>
      )}
      {isError && <AppErrorState onRetry={refetch} />}
      {!isLoading && !isError && visible.length === 0 && (
        <AppEmptyState
          title={search || statusFilter ? 'No projects match your filters' : 'No projects yet'}
          description={
            search || statusFilter
              ? 'Try different search terms or clear the status filter.'
              : 'Create your first project to get started.'
          }
        />
      )}
      {!isLoading && !isError && visible.length > 0 && (
        <ProjectsTable
          projects={visible}
          detailBasePath="/pm/projects"
          onDelete={canDelete ? handleDelete : undefined}
          isDeleting={deleteMutation.isPending}
        />
      )}

      <CreateProjectModal
        open={createOpen}
        isLoading={createMutation.isPending}
        error={formError}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
      />
    </Box>
  );
}
