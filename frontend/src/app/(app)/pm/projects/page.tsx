'use client';

import { Box } from '@mui/material';
import { PageHeader } from '@/components/shared/PageHeader';
import { ProjectsTable } from '@/features/projects/components/ProjectsTable';
import { projectsForOrg } from '@/mocks/projects.mock';
import { useAuthStore } from '@/store/auth.store';

export default function PMProjectsPage() {
  const user = useAuthStore((s) => s.user);
  const projects = user ? projectsForOrg(user.organization.id) : [];

  return (
    <Box>
      <PageHeader
        title="My Projects"
        subtitle="Active projects you manage."
      />
      <ProjectsTable projects={projects} detailBasePath="/pm/projects" hideOrgColumn />
    </Box>
  );
}
