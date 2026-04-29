'use client';

import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Typography,
  Chip,
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';
import { PageHeader } from '@/components/shared/PageHeader';
import { AppButton } from '@/components/ui/AppButton';
import { mockDemoUsers } from '@/mocks/users.mock';
import { useAuthStore } from '@/store/auth.store';
import { ROLE_LABELS, type Role } from '@/config/roles';

export default function AdminPeoplePage() {
  const { enqueueSnackbar } = useSnackbar();
  const user = useAuthStore((s) => s.user);

  const orgUsers = mockDemoUsers.filter((u) => u.organization.id === user?.organization.id);

  return (
    <Box>
      <PageHeader
        title="People"
        subtitle={`Team members for ${user?.organization.name ?? 'your organization'}.`}
        actions={
          <AppButton
            variant="contained"
            startIcon={<PersonAddIcon />}
            onClick={() => enqueueSnackbar('Invite flow opened (demo).', { variant: 'info' })}
          >
            Invite member
          </AppButton>
        }
      />

      <TableContainer
        component={Paper}
        elevation={0}
        sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
      >
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em' } }}>
              <TableCell>Name</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Last login</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orgUsers.map((u) => (
              <TableRow key={u.id} hover>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1.5}>
                    <Avatar sx={{ width: 32, height: 32, fontSize: '0.8rem' }}>
                      {u.firstName[0]}
                      {u.lastName[0]}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight={500}>
                        {u.firstName} {u.lastName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {u.email}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip label={ROLE_LABELS[u.roles[0] as Role] ?? u.roles[0]} size="small" sx={{ fontWeight: 500 }} />
                </TableCell>
                <TableCell>
                  <Chip label={u.status} color={u.status === 'ACTIVE' ? 'success' : 'default'} size="small" sx={{ fontWeight: 600 }} />
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">
                    {u.lastLoginAt ? dayjs(u.lastLoginAt).format('MMM D, HH:mm') : '—'}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
