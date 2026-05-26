'use client';

import { useEffect, useState } from 'react';
import { Box, FormControl, InputLabel, Select, MenuItem, Skeleton, type SelectChangeEvent } from '@mui/material';
import { PageHeader } from '@/components/shared/PageHeader';
import { AppEmptyState } from '@/components/ui/AppEmptyState';
import { ValuationsPanel } from './ValuationsPanel';
import { useProjects } from '@/features/projects/hooks/useProjects';
import { useAuthStore } from '@/store/auth.store';

/**
 * Valuations surface for /surveyor/valuations. The QS (manage:budget) raises,
 * edits, submits, and certifies progress claims; read-only budget viewers see
 * the table without those affordances. Project list is member-scoped.
 */
export function ValuationsView() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const isSuperAdmin = !!useAuthStore((s) => s.user?.isSuperAdmin);
  const canManage = isSuperAdmin || hasPermission('manage:budget');

  const { data: projects, isLoading } = useProjects();
  const [projectId, setProjectId] = useState('');

  useEffect(() => {
    if (!projectId && projects && projects.length > 0) setProjectId(projects[0].id);
  }, [projects, projectId]);

  return (
    <Box>
      <PageHeader title="Valuations" subtitle="Progress billing — value of work in place." />

      {isLoading ? (
        <Skeleton variant="rounded" height={56} sx={{ maxWidth: 320, mb: 3 }} />
      ) : !projects || projects.length === 0 ? (
        <AppEmptyState title="No projects" description="You don't have any projects to show valuations for yet." />
      ) : (
        <>
          <FormControl size="small" sx={{ minWidth: 280, mb: 3 }}>
            <InputLabel id="valuations-project-label">Project</InputLabel>
            <Select
              labelId="valuations-project-label"
              label="Project"
              value={projectId}
              onChange={(e: SelectChangeEvent) => setProjectId(e.target.value)}
            >
              {projects.map((p) => (
                <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {projectId && <ValuationsPanel projectId={projectId} canManage={canManage} />}
        </>
      )}
    </Box>
  );
}
