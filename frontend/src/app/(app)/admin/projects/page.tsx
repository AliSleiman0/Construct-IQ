'use client';

import { Box } from '@mui/material';
import { PageHeader } from '@/components/shared/PageHeader';
import { ProjectsTable } from '@/features/projects/components/ProjectsTable';
import { projectsForOrg } from '@/mocks/projects.mock';
import { useAuthStore } from '@/store/auth.store';

export default function AdminProjectsPage() {
  const user = useAuthStore((s) => s.user);
  const projects = user ? projectsForOrg(user.organization.id) : [];

  return (
    <Box>
      <PageHeader
        title="Projects"
        subtitle={`All projects under ${user?.organization.name ?? 'your organization'}.`}
      />
      <ProjectsTable projects={projects} detailBasePath="/admin/projects" hideOrgColumn />
    </Box>
  );
}
