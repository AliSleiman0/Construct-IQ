'use client';

import { useMemo, useState } from 'react';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Avatar, Typography, Chip, IconButton, CircularProgress,
} from '@mui/material';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { useSnackbar } from 'notistack';
import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { PageHeader } from '@/components/shared/PageHeader';
import { AppButton } from '@/components/ui/AppButton';
import { usersApi } from '@/lib/api/users.api';
import { useOrganizations } from '@/features/organizations/hooks/useOrganizations';
import { useCreateOrgAdmin } from '@/features/users/hooks/useUserMutations';
import {
  CreateOrgAdminModal,
  type CreateOrgAdminFormSubmit,
} from '@/features/users/components/CreateOrgAdminModal';

export default function OrgAdminsPage() {
  const { enqueueSnackbar } = useSnackbar();
  const { data: orgAdmins = [], isLoading } = useQuery({
    queryKey: ['users', 'org-admins'],
    queryFn: () => usersApi.listOrgAdmins(),
  });
  const { data: organizations = [] } = useOrganizations();
  const createOrgAdmin = useCreateOrgAdmin();

  const [modalOpen, setModalOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const orgById = useMemo(
    () => new Map(organizations.map((o) => [o.id, o])),
    [organizations],
  );

  const handleSubmit = (values: CreateOrgAdminFormSubmit) => {
    setSubmitError(null);
    createOrgAdmin.mutate(values, {
      onSuccess: () => {
        enqueueSnackbar(
          `Org Admin created for ${orgById.get(values.organizationId)?.name ?? 'organization'}.`,
          { variant: 'success' },
        );
        setModalOpen(false);
      },
      onError: (err) => {
        const apiMessage = isAxiosError(err)
          ? (err.response?.data?.error?.message ??
             err.response?.data?.message ??
             null)
          : null;
        const message = Array.isArray(apiMessage)
          ? apiMessage.join(', ')
          : apiMessage ?? 'Failed to create org admin.';
        setSubmitError(message);
      },
    });
  };

  const handleDemote = (email: string) => {
    enqueueSnackbar(`${email} demoted from Org Admin.`, { variant: 'info' });
  };

  return (
    <Box>
      <PageHeader
        title="Org Admins"
        subtitle="Promote / demote organization-level admins across all tenants."
        actions={
          <AppButton
            variant="contained"
            startIcon={<PersonAddIcon />}
            onClick={() => {
              setSubmitError(null);
              setModalOpen(true);
            }}
          >
            Create Org Admin
          </AppButton>
        }
      />

      {isLoading ? (
        <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
      ) : (
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
        >
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
                  <TableRow key={u.id ?? u._id} hover>
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
                    <TableCell>
                      {orgById.get(u.organizationId)?.name ?? '—'}
                    </TableCell>
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

      <CreateOrgAdminModal
        open={modalOpen}
        organizations={organizations}
        isLoading={createOrgAdmin.isPending}
        error={submitError}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </Box>
  );
}
