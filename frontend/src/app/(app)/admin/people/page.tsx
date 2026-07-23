'use client';

import { useState } from 'react';
import {
  Box,
  Paper,
  Skeleton,
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
import { useUsers, useRoles } from '@/features/users/hooks/useUsers';
import {
  useCreateUser,
  useUpdateUser,
  useAssignRole,
  useRemoveRole,
} from '@/features/users/hooks/useUserMutations';
import {
  CreateUserModal,
  EditUserModal,
  type CreateFormValues,
} from '@/features/users/components/UserModals';
import { useAuthStore } from '@/store/auth.store';
import type { CreateUserPayload, UpdateUserPayload, User } from '@/types/user.types';

export default function AdminPeoplePage() {
  const { enqueueSnackbar } = useSnackbar();
  const user = useAuthStore((s) => s.user);
  const { data: users = [], isLoading } = useUsers();
  const { data: roles = [] } = useRoles();
  const createUser = useCreateUser();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Edit flow — the modal already exists (UserModals.EditUserModal) with role
  // assign/remove; it was just never mounted here.
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const editId = editTarget?.id ?? '';
  const updateUser = useUpdateUser(editId);
  const assignRole = useAssignRole(editId);
  const removeRole = useRemoveRole(editId);

  const handleUpdate = (values: UpdateUserPayload) => {
    if (!editTarget) return;
    setEditError(null);
    updateUser.mutate(values, {
      onSuccess: () => {
        enqueueSnackbar('Member updated.', { variant: 'success' });
        setEditTarget(null);
      },
      onError: (err: any) => {
        const raw = err?.response?.data?.message ?? 'Failed to update member.';
        const msg = Array.isArray(raw) ? raw.join(', ') : String(raw);
        setEditError(msg);
        enqueueSnackbar(msg, { variant: 'error' });
      },
    });
  };

  const handleAssignRole = (roleId: string) => {
    assignRole.mutate(roleId, {
      onSuccess: () => enqueueSnackbar('Role assigned.', { variant: 'success' }),
      onError: () => enqueueSnackbar('Failed to assign role.', { variant: 'error' }),
    });
  };

  const handleRemoveRole = (roleId: string) => {
    removeRole.mutate(roleId, {
      onSuccess: () => enqueueSnackbar('Role removed.', { variant: 'success' }),
      onError: () => enqueueSnackbar('Failed to remove role.', { variant: 'error' }),
    });
  };

  const handleInvite = (values: CreateFormValues) => {
    setInviteError(null);
    const { confirmPassword: _confirm, ...rest } = values;
    const payload: CreateUserPayload = rest;
    createUser.mutate(payload, {
      onSuccess: () => {
        enqueueSnackbar('Member invited.', { variant: 'success' });
        setInviteOpen(false);
      },
      onError: (err: any) => {
        const raw = err?.response?.data?.message ?? 'Failed to invite member.';
        const msg = Array.isArray(raw) ? raw.join(', ') : String(raw);
        setInviteError(msg);
        enqueueSnackbar(msg, { variant: 'error' });
      },
    });
  };

  return (
    <Box>
      <PageHeader
        title="People"
        subtitle={`Team members for ${user?.organization.name ?? 'your organization'}.`}
        actions={
          <AppButton
            variant="contained"
            startIcon={<PersonAddIcon />}
            onClick={() => {
              setInviteError(null);
              setInviteOpen(true);
            }}
          >
            Invite member
          </AppButton>
        }
      />

      {isLoading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} variant="rounded" height={52} />)}
        </Box>
      ) : (
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
              {(users as any[]).map((u) => (
                <TableRow
                  key={u.id}
                  hover
                  onClick={() => {
                    setEditError(null);
                    setEditTarget(u as User);
                  }}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1.5}>
                      <Avatar sx={{ width: 32, height: 32, fontSize: '0.8rem' }}>
                        {u.firstName?.[0]}{u.lastName?.[0]}
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
                    <Chip
                      label={u.userRoles?.[0]?.role?.name ?? '—'}
                      size="small"
                      sx={{ fontWeight: 500 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={u.status}
                      color={u.status === 'ACTIVE' ? 'success' : 'default'}
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
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
      )}

      <CreateUserModal
        open={inviteOpen}
        roles={roles}
        isLoading={createUser.isPending}
        error={inviteError}
        onClose={() => setInviteOpen(false)}
        onSubmit={handleInvite}
      />

      <EditUserModal
        open={!!editTarget}
        // Re-read from the refreshed list so role assign/remove reflects live.
        user={
          editTarget
            ? ((users as User[]).find((u) => u.id === editTarget.id) ?? editTarget)
            : null
        }
        roles={roles}
        isLoading={updateUser.isPending}
        error={editError}
        onClose={() => setEditTarget(null)}
        onSubmit={handleUpdate}
        onAssignRole={handleAssignRole}
        onRemoveRole={handleRemoveRole}
      />
    </Box>
  );
}
