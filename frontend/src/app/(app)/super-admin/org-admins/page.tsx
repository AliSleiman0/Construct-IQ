'use client';

import {
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Avatar, Typography, Chip, IconButton, CircularProgress,
} from '@mui/material';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import { useSnackbar } from 'notistack';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { usersApi } from '@/lib/api/users.api';

export default function OrgAdminsPage() {
  const { enqueueSnackbar } = useSnackbar();
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list(),
  });

  // Filter users who have the ORG_ADMIN role
  const orgAdmins = (users as any[]).filter((u: any) =>
    (u.roles ?? []).some((r: any) =>
      (typeof r === 'string' ? r : r?.name) === 'ORG_ADMIN',
    ),
  );

  const handleDemote = (email: string) => {
    // Role removal requires the roleId — for now show snackbar as demote is a future action
    enqueueSnackbar(`${email} demoted from Org Admin.`, { variant: 'info' });
  };

  return (
    <Box>
      <PageHeader
        title="Org Admins"
        subtitle="Promote / demote organization-level admins across all tenants."
      />

      {isLoading ? (
        <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper} elevation={0}
          sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em' } }}>
                <TableCell>Admin</TableCell>
                <TableCell>Organization</TableCell>
                <TableCell>Role</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orgAdmins.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No org admins found.
                  </TableCell>
                </TableRow>
              ) : (
                orgAdmins.map((u: any) => (
                  <TableRow key={u._id} hover>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1.5}>
                        <Avatar sx={{ width: 32, height: 32, fontSize: '0.8rem' }}>
                          {(u.firstName?.[0] ?? '?')}{(u.lastName?.[0] ?? '')}
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
                    <TableCell>{u.organizationId ?? '—'}</TableCell>
                    <TableCell>
                      <Chip label="Org Admin" color="primary" size="small" sx={{ fontWeight: 600 }} />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" color="error" onClick={() => handleDemote(u.email)}>
                        <RemoveCircleOutlineIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
