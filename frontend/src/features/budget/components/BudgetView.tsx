'use client';

import { useEffect, useState } from 'react';
import { Box, FormControl, InputLabel, Select, MenuItem, Skeleton, type SelectChangeEvent } from '@mui/material';
import { PageHeader } from '@/components/shared/PageHeader';
import { AppEmptyState } from '@/components/ui/AppEmptyState';
import { BudgetPanel } from './BudgetPanel';
import { useProjects } from '@/features/projects/hooks/useProjects';
import { useAuthStore } from '@/store/auth.store';

/**
 * Shared budget surface used by both /pm/budget (PM = read-only) and
 * /surveyor/budget (QS = manage). Edit affordances key off `manage:budget`.
 */
export function BudgetView() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const isSuperAdmin = !!useAuthStore((s) => s.user?.isSuperAdmin);
  const canManage = isSuperAdmin || hasPermission('manage:budget');

  const { data: projects, isLoading } = useProjects();
  const [projectId, setProjectId] = useState('');

  // Default to the first project once loaded.
  useEffect(() => {
    if (!projectId && projects && projects.length > 0) setProjectId(projects[0].id);
  }, [projects, projectId]);

  return (
    <Box>
      <PageHeader
        title="Budget"
        subtitle={canManage ? 'Track planned cost vs. spend by line item.' : 'Read-only view of project budgets.'}
      />

      {isLoading ? (
        <Skeleton variant="rounded" height={56} sx={{ maxWidth: 320, mb: 3 }} />
      ) : !projects || projects.length === 0 ? (
        <AppEmptyState title="No projects" description="You don't have any projects to show a budget for yet." />
      ) : (
        <>
          <FormControl size="small" sx={{ minWidth: 280, mb: 3 }}>
            <InputLabel id="budget-project-label">Project</InputLabel>
            <Select
              labelId="budget-project-label"
              label="Project"
              value={projectId}
              onChange={(e: SelectChangeEvent) => setProjectId(e.target.value)}
            >
              {projects.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {projectId && <BudgetPanel projectId={projectId} canManage={canManage} />}
        </>
      )}
    </Box>
  );
}
