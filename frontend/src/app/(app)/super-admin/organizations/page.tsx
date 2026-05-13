'use client';

import {
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Chip, Typography, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Stack, Button, IconButton, CircularProgress, Tooltip,
  InputAdornment,
} from '@mui/material';
import AddBusinessIcon from '@mui/icons-material/AddBusiness';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import { useState } from 'react';
import dayjs from 'dayjs';
import { PageHeader } from '@/components/shared/PageHeader';
import { AppButton } from '@/components/ui/AppButton';
import {
  useOrganizations,
  useCreateOrganization,
  useUpdateOrganization,
  useSetOrgActive,
} from '@/features/organizations/hooks/useOrganizations';

const EMPTY_CREATE = {
  name: '', slug: '', adminFirstName: '', adminLastName: '',
  adminEmail: '', adminPassword: '', maxUsers: '',
};

const EMPTY_EDIT = {
  name: '', email: '', phone: '', address: '', website: '', maxUsers: '',
};

export default function OrganizationsPage() {
  const { data: orgs = [], isLoading } = useOrganizations();
  const createOrg = useCreateOrganization();
  const updateOrg = useUpdateOrganization();
  const setActive = useSetOrgActive();

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE);

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState('');
  const [editForm, setEditForm] = useState(EMPTY_EDIT);

  const setC = (k: keyof typeof EMPTY_CREATE) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setCreateForm((f) => ({ ...f, [k]: e.target.value }));

  const setE = (k: keyof typeof EMPTY_EDIT) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setEditForm((f) => ({ ...f, [k]: e.target.value }));

  const handleCreateClose = () => { setCreateOpen(false); setCreateForm(EMPTY_CREATE); };

  const handleCreate = async () => {
    if (!createForm.name.trim() || !createForm.slug.trim() || !createForm.adminEmail.trim()) return;
    const maxUsers = createForm.maxUsers ? parseInt(createForm.maxUsers, 10) : undefined;
    await createOrg.mutateAsync({
      name: createForm.name.trim(),
      slug: createForm.slug.trim(),
      adminFirstName: createForm.adminFirstName || 'Admin',
      adminLastName: createForm.adminLastName || 'User',
      adminEmail: createForm.adminEmail.trim(),
      adminPassword: createForm.adminPassword || 'Demo@1234',
      ...(maxUsers && maxUsers > 0 ? { maxUsers } : {}),
    });
    handleCreateClose();
  };

  const handleEditOpen = (org: any) => {
    setEditId(org._id);
    setEditForm({
      name: org.name ?? '',
      email: org.email ?? '',
      phone: org.phone ?? '',
      address: org.address ?? '',
      website: org.website ?? '',
      maxUsers: org.maxUsers != null ? String(org.maxUsers) : '',
    });
    setEditOpen(true);
  };

  const handleEditClose = () => { setEditOpen(false); setEditId(''); setEditForm(EMPTY_EDIT); };

  const handleUpdate = async () => {
    if (!editForm.name.trim()) return;
    const maxUsersRaw = editForm.maxUsers.trim();
    const maxUsers = maxUsersRaw === '' ? null : parseInt(maxUsersRaw, 10);
    await updateOrg.mutateAsync({
      id: editId,
      payload: {
        name: editForm.name.trim(),
        ...(editForm.email.trim() ? { email: editForm.email.trim() } : {}),
        ...(editForm.phone.trim() ? { phone: editForm.phone.trim() } : {}),
        ...(editForm.address.trim() ? { address: editForm.address.trim() } : {}),
        ...(editForm.website.trim() ? { website: editForm.website.trim() } : {}),
        maxUsers,
      },
    });
    handleEditClose();
  };

  return (
    <Box>
      <PageHeader
        title="Organizations"
        subtitle="All tenants on ConstructIQ. Suspend or onboard from here."
        actions={
          <AppButton variant="contained" startIcon={<AddBusinessIcon />} onClick={() => setCreateOpen(true)}>
            New organization
          </AppButton>
        }
      />

      {isLoading ? (
        <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper} elevation={0}
          sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em' } }}>
                <TableCell>Name</TableCell>
                <TableCell>Slug</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Max seats</TableCell>
                <TableCell>Joined</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(orgs as any[]).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No organizations yet.
                  </TableCell>
                </TableRow>
              ) : (
                (orgs as any[]).map((o: any) => (
                  <TableRow key={o._id} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{o.name}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'text.secondary' }}>
                      {o.slug}
                    </TableCell>
                    <TableCell>
                      <Chip label={o.isActive ? 'Active' : 'Suspended'}
                        color={o.isActive ? 'success' : 'default'} size="small" sx={{ fontWeight: 600 }} />
                    </TableCell>
                    <TableCell>
                      {o.maxUsers != null
                        ? <Typography variant="body2">{o.maxUsers} seats</Typography>
                        : <Typography variant="caption" color="text.secondary">Unlimited</Typography>}
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {dayjs(o.createdAt).format('MMM YYYY')}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit organization">
                        <IconButton size="small" onClick={() => handleEditOpen(o)}>
                          <EditOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={o.isActive ? 'Suspend org' : 'Activate org'}>
                        <IconButton size="small"
                          color={o.isActive ? 'warning' : 'success'}
                          disabled={setActive.isPending}
                          onClick={() => setActive.mutate({ id: o._id, isActive: !o.isActive })}>
                          {o.isActive
                            ? <PauseCircleOutlineIcon fontSize="small" />
                            : <PlayCircleOutlineIcon fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ── Create dialog ── */}
      <Dialog open={createOpen} onClose={handleCreateClose} fullWidth maxWidth="sm">
        <DialogTitle>New organization</DialogTitle>
        <DialogContent>
          <Stack gap={2} mt={1}>
            <TextField label="Organization name *" value={createForm.name} onChange={setC('name')} autoFocus fullWidth />
            <TextField label="Slug *" value={createForm.slug} onChange={setC('slug')} fullWidth
              placeholder="e.g. company-d" helperText="Lowercase letters, numbers, and hyphens" />
            <Stack direction="row" gap={2}>
              <TextField label="Admin first name" value={createForm.adminFirstName} onChange={setC('adminFirstName')} fullWidth />
              <TextField label="Admin last name" value={createForm.adminLastName} onChange={setC('adminLastName')} fullWidth />
            </Stack>
            <TextField label="Admin email *" value={createForm.adminEmail} onChange={setC('adminEmail')} fullWidth type="email" />
            <TextField label="Admin password" value={createForm.adminPassword} onChange={setC('adminPassword')}
              fullWidth type="password" placeholder="Default: Demo@1234" />
            <TextField
              label="Max seats"
              value={createForm.maxUsers}
              onChange={setC('maxUsers')}
              fullWidth
              type="number"
              inputProps={{ min: 1 }}
              placeholder="Leave blank for unlimited"
              InputProps={{ endAdornment: <InputAdornment position="end">users</InputAdornment> }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCreateClose}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate}
            disabled={!createForm.name.trim() || !createForm.slug.trim() || !createForm.adminEmail.trim() || createOrg.isPending}>
            {createOrg.isPending ? 'Creating…' : 'Create organization'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Edit dialog ── */}
      <Dialog open={editOpen} onClose={handleEditClose} fullWidth maxWidth="sm">
        <DialogTitle>Edit organization</DialogTitle>
        <DialogContent>
          <Stack gap={2} mt={1}>
            <TextField label="Organization name *" value={editForm.name} onChange={setE('name')} autoFocus fullWidth />
            <TextField label="Contact email" value={editForm.email} onChange={setE('email')} fullWidth type="email" />
            <Stack direction="row" gap={2}>
              <TextField label="Phone" value={editForm.phone} onChange={setE('phone')} fullWidth />
              <TextField label="Website" value={editForm.website} onChange={setE('website')} fullWidth
                placeholder="https://…" />
            </Stack>
            <TextField label="Address" value={editForm.address} onChange={setE('address')} fullWidth multiline minRows={2} />
            <TextField
              label="Max seats"
              value={editForm.maxUsers}
              onChange={setE('maxUsers')}
              fullWidth
              type="number"
              inputProps={{ min: 1 }}
              placeholder="Leave blank for unlimited"
              InputProps={{ endAdornment: <InputAdornment position="end">users</InputAdornment> }}
              helperText="Clear the field to remove the seat limit"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleEditClose}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdate}
            disabled={!editForm.name.trim() || updateOrg.isPending}>
            {updateOrg.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
