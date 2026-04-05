'use client';

import { useState } from 'react';
import { Box, Alert, Stack, Typography, InputAdornment, TextField } from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import SearchIcon from '@mui/icons-material/Search';
import { PageHeader } from '@/components/shared/PageHeader';
import { AppButton } from '@/components/ui/AppButton';
import { AppLoader } from '@/components/ui/AppLoader';
import { AppEmptyState } from '@/components/ui/AppEmptyState';
import { AppErrorState } from '@/components/ui/AppErrorState';
import { UserTable } from '@/features/users/components/UserTable';
import { CreateUserModal, EditUserModal } from '@/features/users/components/UserModals';
import { useUsers, useRoles } from '@/features/users/hooks/useUsers';
import { useCreateUser, useUpdateUser, useDeactivateUser } from '@/features/users/hooks/useUserMutations';
import { useAuthStore } from '@/store/auth.store';
import { usersApi } from '@/lib/api/users.api';
import type { User } from '@/types/user.types';

export default function UsersPage() {
  const currentUser = useAuthStore((s) => s.user);
  const canCreate = useAuthStore((s) => s.hasPermission('create:users'));
  const canManage = useAuthStore((s) => s.hasPermission('manage:users'));

  const { data: users, isLoading, isError, refetch } = useUsers();
  const { data: roles = [] } = useRoles();

  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useCreateUser();
  const deactivateMutation = useDeactivateUser();

  // Dynamic update hook — recreated when editUser changes
  const updateMutation = useUpdateUser(editUser?.id ?? '');

  const filteredUsers = (users ?? []).filter((u) => {
    const q = search.toLowerCase();
    return (
      u.firstName.toLowerCase().includes(q) ||
      u.lastName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  });

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleCreate = async (values: Parameters<typeof createMutation.mutateAsync>[0]) => {
    setFormError(null);
    try {
      await createMutation.mutateAsync(values);
      setCreateOpen(false);
    } catch (e: any) {
      setFormError(e?.response?.data?.message ?? 'Failed to create user');
    }
  };

  const handleUpdate = async (values: Parameters<typeof updateMutation.mutateAsync>[0]) => {
    setFormError(null);
    try {
      await updateMutation.mutateAsync(values);
      setEditUser(null);
    } catch (e: any) {
      setFormError(e?.response?.data?.message ?? 'Failed to update user');
    }
  };

  const handleDeactivate = async (user: User) => {
    if (!confirm(`Deactivate ${user.firstName} ${user.lastName}? They will lose access immediately.`)) return;
    await deactivateMutation.mutateAsync(user.id);
  };

  const handleAssignRole = async (roleId: string) => {
    if (!editUser) return;
    try {
      await usersApi.assignRole(editUser.id, roleId);
      refetch();
      // Refresh editUser data
      const updated = await usersApi.getById(editUser.id);
      setEditUser(updated);
    } catch (e: any) {
      setFormError(e?.response?.data?.message ?? 'Failed to assign role');
    }
  };

  const handleRemoveRole = async (roleId: string) => {
    if (!editUser) return;
    try {
      await usersApi.removeRole(editUser.id, roleId);
      refetch();
      const updated = await usersApi.getById(editUser.id);
      setEditUser(updated);
    } catch (e: any) {
      setFormError(e?.response?.data?.message ?? 'Failed to remove role');
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Box>
      <PageHeader
        title="Team Members"
        subtitle="Manage your organization's users and their roles."
        breadcrumbs={[{ label: 'Settings' }, { label: 'Team Members' }]}
        actions={
          canCreate ? (
            <AppButton
              variant="contained"
              startIcon={<PersonAddIcon />}
              onClick={() => { setFormError(null); setCreateOpen(true); }}
            >
              Add User
            </AppButton>
          ) : undefined
        }
      />

      {/* Search bar */}
      <Box mb={3}>
        <TextField
          size="small"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: 320 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Stats strip */}
      {users && (
        <Stack direction="row" spacing={3} mb={3}>
          {[
            { label: 'Total', value: users.length },
            { label: 'Active', value: users.filter((u) => u.status === 'ACTIVE').length },
            { label: 'Inactive', value: users.filter((u) => u.status !== 'ACTIVE').length },
          ].map((stat) => (
            <Box key={stat.label} sx={{ px: 3, py: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', minWidth: 100 }}>
              <Typography variant="h5" fontWeight={700}>{stat.value}</Typography>
              <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
            </Box>
          ))}
        </Stack>
      )}

      {/* Content */}
      {isLoading && <AppLoader />}
      {isError && <AppErrorState onRetry={refetch} />}
      {!isLoading && !isError && filteredUsers.length === 0 && (
        <AppEmptyState
          title={search ? 'No users match your search' : 'No team members yet'}
          description={search ? 'Try a different name or email.' : 'Add your first team member to get started.'}
        />
      )}
      {!isLoading && !isError && filteredUsers.length > 0 && (
        <UserTable
          users={filteredUsers}
          currentUserId={currentUser?.id ?? ''}
          onEdit={(user) => { setFormError(null); setEditUser(user); }}
          onDeactivate={handleDeactivate}
        />
      )}

      {/* Modals */}
      <CreateUserModal
        open={createOpen}
        roles={roles}
        isLoading={createMutation.isPending}
        error={formError}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
      />
      <EditUserModal
        open={!!editUser}
        user={editUser}
        roles={roles}
        isLoading={updateMutation.isPending}
        error={formError}
        onClose={() => setEditUser(null)}
        onSubmit={handleUpdate}
        onAssignRole={handleAssignRole}
        onRemoveRole={handleRemoveRole}
      />
    </Box>
  );
}
