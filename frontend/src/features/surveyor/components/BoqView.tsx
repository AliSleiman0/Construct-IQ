'use client';

import { useEffect, useState } from 'react';
import { Box, FormControl, InputLabel, Select, MenuItem, Skeleton, type SelectChangeEvent } from '@mui/material';
import { PageHeader } from '@/components/shared/PageHeader';
import { AppEmptyState } from '@/components/ui/AppEmptyState';
import { BoqPanel } from './BoqPanel';
import { useProjects } from '@/features/projects/hooks/useProjects';
import { useAuthStore } from '@/store/auth.store';

/**
 * Bill of Quantities surface for /surveyor/boq. The QS (manage:budget) gets full
 * CRUD; read-only budget viewers see the table without edit affordances. The
 * project list is member-scoped server-side, so the picker only shows the
 * caller's projects.
 */
export function BoqView() {
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
      <PageHeader title="Bill of Quantities" subtitle="Item-by-item quantities, rates, and totals." />

      {isLoading ? (
        <Skeleton variant="rounded" height={56} sx={{ maxWidth: 320, mb: 3 }} />
      ) : !projects || projects.length === 0 ? (
        <AppEmptyState title="No projects" description="You don't have any projects to show a bill of quantities for yet." />
      ) : (
        <>
          <FormControl size="small" sx={{ minWidth: 280, mb: 3 }}>
            <InputLabel id="boq-project-label">Project</InputLabel>
            <Select
              labelId="boq-project-label"
              label="Project"
              value={projectId}
              onChange={(e: SelectChangeEvent) => setProjectId(e.target.value)}
            >
              {projects.map((p) => (
                <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {projectId && <BoqPanel projectId={projectId} canManage={canManage} />}
        </>
      )}
    </Box>
  );
}
