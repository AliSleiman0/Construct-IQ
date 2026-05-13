'use client';

import {
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Typography, Stack, IconButton, Tooltip, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button,
  Switch, FormControlLabel,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useState } from 'react';
import dayjs from 'dayjs';
import { PageHeader } from '@/components/shared/PageHeader';
import { AppButton } from '@/components/ui/AppButton';
import {
  usePlatformFeatures,
  useCreatePlatformFeature,
  useUpdatePlatformFeature,
  useDeletePlatformFeature,
} from '@/features/platform-features/hooks/usePlatformFeatures';

interface FeatureForm {
  key: string;
  name: string;
  description: string;
  isActive: boolean;
}

const EMPTY: FeatureForm = { key: '', name: '', description: '', isActive: true };

const KEY_REGEX = /^[a-z][a-z0-9_]*$/;

function isValidKey(k: string) {
  return k.length > 0 && k.length <= 80 && KEY_REGEX.test(k);
}

export default function FeaturesPage() {
  const { data: features = [], isLoading } = usePlatformFeatures(true);
  const createFeature = useCreatePlatformFeature();
  const updateFeature = useUpdatePlatformFeature();
  const deleteFeature = useDeletePlatformFeature();

  // Create
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<FeatureForm>(EMPTY);

  // Edit
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState('');
  const [editForm, setEditForm] = useState<FeatureForm>(EMPTY);

  // Delete confirm
  const [deleteId, setDeleteId] = useState('');
  const [deleteName, setDeleteName] = useState('');

  /* auto-slug the key from the name while the user types in the create form */
  const handleNameChange = (name: string) => {
    const slug = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    setCreateForm((f) => ({ ...f, name, key: f.key === '' || f.key === autoSlug(f.name) ? slug : f.key }));
  };
  const autoSlug = (name: string) =>
    name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

  const handleCreateClose = () => { setCreateOpen(false); setCreateForm(EMPTY); };
  const handleCreate = async () => {
    await createFeature.mutateAsync({
      key: createForm.key.trim(),
      name: createForm.name.trim(),
      description: createForm.description.trim() || undefined,
      isActive: createForm.isActive,
    });
    handleCreateClose();
  };

  const handleEditOpen = (f: any) => {
    setEditId(f._id);
    setEditForm({
      key: f.key,
      name: f.name,
      description: f.description ?? '',
      isActive: f.isActive,
    });
    setEditOpen(true);
  };
  const handleEditClose = () => { setEditOpen(false); setEditId(''); setEditForm(EMPTY); };
  const handleUpdate = async () => {
    await updateFeature.mutateAsync({
      id: editId,
      payload: {
        name: editForm.name.trim(),
        description: editForm.description.trim() || undefined,
        isActive: editForm.isActive,
      },
    });
    handleEditClose();
  };

  const handleDeleteConfirm = async () => {
    await deleteFeature.mutateAsync(deleteId);
    setDeleteId('');
    setDeleteName('');
  };

  const createValid = isValidKey(createForm.key) && createForm.name.trim().length > 0;
  const editValid = editForm.name.trim().length > 0;

  return (
    <Box>
      <PageHeader
        title="Feature Catalog"
        subtitle="Define sellable features that can be bundled into subscription plans."
        actions={
          <AppButton variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
            New feature
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
                <TableCell>Key</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(features as any[]).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No features yet. Create the first one above.
                  </TableCell>
                </TableRow>
              ) : (
                (features as any[]).map((f: any) => (
                  <TableRow key={f._id} hover>
                    <TableCell>
                      <Typography variant="caption" fontFamily="monospace"
                        sx={{ px: 1, py: 0.25, bgcolor: 'action.hover', borderRadius: 0.75 }}>
                        {f.key}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>{f.name}</TableCell>
                    <TableCell sx={{ maxWidth: 340 }}>
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {f.description ?? '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={f.isActive ? 'Active' : 'Inactive'}
                        color={f.isActive ? 'success' : 'default'}
                        size="small" sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {dayjs(f.createdAt).format('DD MMM YYYY')}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" justifyContent="flex-end" gap={0.5}>
                        <Tooltip title="Edit feature">
                          <IconButton size="small" onClick={() => handleEditOpen(f)}>
                            <EditOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete feature">
                          <IconButton size="small" color="error"
                            onClick={() => { setDeleteId(f._id); setDeleteName(f.name); }}>
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
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
        <DialogTitle>New feature</DialogTitle>
        <DialogContent>
          <Stack gap={2} mt={1}>
            <TextField
              label="Display name *"
              value={createForm.name}
              onChange={(e) => handleNameChange(e.target.value)}
              fullWidth autoFocus
              helperText="Shown to org admins when picking a plan"
            />
            <TextField
              label="Key *"
              value={createForm.key}
              onChange={(e) => setCreateForm((f) => ({ ...f, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
              fullWidth
              inputProps={{ pattern: '[a-z][a-z0-9_]*' }}
              helperText="Unique snake_case identifier used in code — cannot be changed after creation"
              error={createForm.key.length > 0 && !isValidKey(createForm.key)}
            />
            <TextField
              label="Description"
              value={createForm.description}
              onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
              fullWidth multiline minRows={2}
              helperText="Short explanation shown to users on plan cards"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={createForm.isActive}
                  onChange={(e) => setCreateForm((f) => ({ ...f, isActive: e.target.checked }))}
                  color="primary"
                />
              }
              label="Active — visible in plan picker"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCreateClose}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate}
            disabled={!createValid || createFeature.isPending}>
            {createFeature.isPending ? 'Creating…' : 'Create feature'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Edit dialog ── */}
      <Dialog open={editOpen} onClose={handleEditClose} fullWidth maxWidth="sm">
        <DialogTitle>Edit feature</DialogTitle>
        <DialogContent>
          <Stack gap={2} mt={1}>
            <TextField
              label="Key (read-only)"
              value={editForm.key}
              fullWidth disabled
              helperText="The key is permanent and used in code — it cannot be changed"
            />
            <TextField
              label="Display name *"
              value={editForm.name}
              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              fullWidth autoFocus
            />
            <TextField
              label="Description"
              value={editForm.description}
              onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
              fullWidth multiline minRows={2}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={editForm.isActive}
                  onChange={(e) => setEditForm((f) => ({ ...f, isActive: e.target.checked }))}
                  color="primary"
                />
              }
              label="Active — visible in plan picker"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleEditClose}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdate}
            disabled={!editValid || updateFeature.isPending}>
            {updateFeature.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete confirm ── */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId('')} maxWidth="xs" fullWidth>
        <DialogTitle>Delete feature</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{deleteName}</strong>?<br />
            Any plan that references this feature key will lose that entry.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteId('')}>Cancel</Button>
          <Button variant="contained" color="error"
            onClick={handleDeleteConfirm} disabled={deleteFeature.isPending}>
            {deleteFeature.isPending ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
