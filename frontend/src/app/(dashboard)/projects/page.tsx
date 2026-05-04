'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Stack, Typography, TextField, InputAdornment, Grid } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import { PageHeader } from '@/components/shared/PageHeader';
import { AppButton } from '@/components/ui/AppButton';
import { AppLoader } from '@/components/ui/AppLoader';
import { AppEmptyState } from '@/components/ui/AppEmptyState';
import { AppErrorState } from '@/components/ui/AppErrorState';
import { ProjectCard } from '@/features/projects/components/ProjectCard';
import { CreateProjectModal, EditProjectModal } from '@/features/projects/components/ProjectModals';
import { useProjects } from '@/features/projects/hooks/useProjects';
import { useCreateProject, useUpdateProject, useDeleteProject } from '@/features/projects/hooks/useProjectMutations';
import { useAuthStore } from '@/store/auth.store';
import { ROUTES } from '@/constants/routes';
import type { Project } from '@/types/project.types';

export default function ProjectsPage() {
  const router = useRouter();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const isSuperAdmin = !!useAuthStore((s) => s.user?.isSuperAdmin);
  const canCreate = isSuperAdmin || hasPermission('create:projects');

  const { data: projects, isLoading, isError, refetch } = useProjects();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useCreateProject();
  const updateMutation = useUpdateProject(editProject?.id ?? '');
  const deleteMutation = useDeleteProject();

  const filtered = (projects ?? []).filter((p) => {
    const q = search.toLowerCase();
    const matchesSearch = p.name.toLowerCase().includes(q) || (p.code ?? '').toLowerCase().includes(q) || (p.location ?? '').toLowerCase().includes(q);
    const matchesStatus = !statusFilter || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = projects ? [
    { label: 'Total', value: projects.length },
    { label: 'Active', value: projects.filter((p) => p.status === 'ACTIVE').length },
    { label: 'Planning', value: projects.filter((p) => p.status === 'PLANNING').length },
    { label: 'On Hold', value: projects.filter((p) => p.status === 'ON_HOLD').length },
    { label: 'Completed', value: projects.filter((p) => p.status === 'COMPLETED').length },
  ] : [];

  const handleCreate = async (values: any) => {
    setFormError(null);
    try {
      await createMutation.mutateAsync(values);
      setCreateOpen(false);
    } catch (e: any) {
      setFormError(e?.response?.data?.message ?? 'Failed to create project');
    }
  };

  const handleUpdate = async (values: any) => {
    setFormError(null);
    try {
      await updateMutation.mutateAsync(values);
      setEditProject(null);
    } catch (e: any) {
      setFormError(e?.response?.data?.message ?? 'Failed to update project');
    }
  };

  const handleDelete = async (project: Project) => {
    if (!confirm(`Delete project "${project.name}"? This cannot be undone.`)) return;
    await deleteMutation.mutateAsync(project.id);
  };

  return (
    <Box>
      <PageHeader
        title="Projects"
        subtitle="Manage your construction projects."
        breadcrumbs={[{ label: 'Projects' }]}
        actions={
          canCreate ? (
            <AppButton variant="contained" startIcon={<AddIcon />} onClick={() => { setFormError(null); setCreateOpen(true); }}>
              New Project
            </AppButton>
          ) : undefined
        }
      />

      {/* Stats strip */}
      {projects && (
        <Stack direction="row" spacing={2} mb={3} flexWrap="wrap" useFlexGap>
          {stats.map((stat) => (
            <Box key={stat.label} sx={{ px: 3, py: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', minWidth: 90 }}>
              <Typography variant="h5" fontWeight={700}>{stat.value}</Typography>
              <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
            </Box>
          ))}
        </Stack>
      )}

      {/* Search + filter */}
      <Stack direction="row" spacing={2} mb={3}>
        <TextField
          size="small"
          placeholder="Search projects…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: 280 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" color="action" /></InputAdornment> }}
        />
        <TextField
          select
          size="small"
          label="Status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          sx={{ width: 160 }}
          SelectProps={{ native: true }}
        >
          <option value="">All</option>
          <option value="PLANNING">Planning</option>
          <option value="ACTIVE">Active</option>
          <option value="ON_HOLD">On Hold</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </TextField>
      </Stack>

      {/* Content */}
      {isLoading && <AppLoader />}
      {isError && <AppErrorState onRetry={refetch} />}
      {!isLoading && !isError && filtered.length === 0 && (
        <AppEmptyState
          title={search ? 'No projects match your search' : 'No projects yet'}
          description={search ? 'Try different search terms.' : 'Create your first project to get started.'}
        />
      )}
      {!isLoading && !isError && filtered.length > 0 && (
        <Grid container spacing={2.5}>
          {filtered.map((project) => (
            <Grid item xs={12} sm={6} lg={4} key={project.id}>
              <ProjectCard
                project={project}
                onClick={() => router.push(ROUTES.PROJECT_DETAIL(project.id))}
              />
            </Grid>
          ))}
        </Grid>
      )}

      <CreateProjectModal
        open={createOpen}
        isLoading={createMutation.isPending}
        error={formError}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
      />
      <EditProjectModal
        open={!!editProject}
        project={editProject}
        isLoading={updateMutation.isPending}
        error={formError}
        onClose={() => setEditProject(null)}
        onSubmit={handleUpdate}
      />
    </Box>
  );
}
