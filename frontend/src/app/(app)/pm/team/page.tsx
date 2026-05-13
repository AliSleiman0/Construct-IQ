'use client';

import {
  Box,
  Paper,
  Avatar,
  Typography,
  Stack,
  Chip,
} from '@mui/material';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import { useSnackbar } from 'notistack';
import { PageHeader } from '@/components/shared/PageHeader';
import { AppButton } from '@/components/ui/AppButton';
import { mockDemoUsers } from '@/mocks/users.mock';
import { ROLE_LABELS, type Role } from '@/config/roles';

const PROJECT_ROLES: Role[] = ['PM', 'PROCUREMENT', 'SURVEYOR', 'SITE_ENG'];

export default function PMTeamPage() {
  const { enqueueSnackbar } = useSnackbar();
  const team = mockDemoUsers.filter(
    (u) => u.organization.slug === 'company-a' && PROJECT_ROLES.includes(u.roles[0] as Role),
  );

  return (
    <Box>
      <PageHeader
        title="Project Team"
        subtitle="Tower Heights — assigned team."
        actions={
          <AppButton
            variant="contained"
            startIcon={<GroupAddIcon />}
            onClick={() => enqueueSnackbar('Add-to-team flow opened (demo).', { variant: 'info' })}
          >
            Add member
          </AppButton>
        }
      />

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
        }}
      >
        {team.map((u) => (
          <Paper
            key={u.id}
            elevation={0}
            sx={{ p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
          >
            <Box display="flex" alignItems="center" gap={2} mb={1.5}>
              <Avatar sx={{ width: 48, height: 48, fontSize: '1rem', fontWeight: 600 }}>
                {u.firstName[0]}
                {u.lastName[0]}
              </Avatar>
              <Box minWidth={0}>
                <Typography variant="subtitle2" fontWeight={600}>
                  {u.firstName} {u.lastName}
                </Typography>
                <Typography variant="caption" color="text.secondary" component="div" noWrap>
                  {u.email}
                </Typography>
              </Box>
            </Box>
            <Stack direction="row" gap={0.75} flexWrap="wrap">
              <Chip label={ROLE_LABELS[u.roles[0] as Role]} size="small" color="primary" sx={{ fontWeight: 600 }} />
              <Chip label="Tower Heights" size="small" variant="outlined" />
            </Stack>
          </Paper>
        ))}
      </Box>
    </Box>
  );
}
