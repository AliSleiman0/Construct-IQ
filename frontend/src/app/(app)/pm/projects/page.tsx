'use client';

import { Box, Skeleton } from '@mui/material';
import { PageHeader } from '@/components/shared/PageHeader';
import { ProjectsTable } from '@/features/projects/components/ProjectsTable';
import { useProjects } from '@/features/projects/hooks/useProjects';

export default function PMProjectsPage() {
  const { data: projects = [], isLoading } = useProjects();

  return (
    <Box>
      <PageHeader
        title="My Projects"
        subtitle="Active projects you manage."
      />
      {isLoading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {[1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={52} />)}
        </Box>
      ) : (
        <ProjectsTable projects={projects} detailBasePath="/pm/projects" />
      )}
    </Box>
  );
}
