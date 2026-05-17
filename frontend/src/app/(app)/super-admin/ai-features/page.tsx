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
  usePlatformAiFeatures,
  useCreatePlatformAiFeature,
  useUpdatePlatformAiFeature,
  useDeletePlatformAiFeature,
} from '@/features/platform-ai-features/hooks/usePlatformAiFeatures';

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

export default function AiFeaturesPage() {
  const { data: features = [], isLoading } = usePlatformAiFeatures(true);
  const createFeature = useCreatePlatformAiFeature();
  const updateFeature = useUpdatePlatformAiFeature();
  const deleteFeature = useDeletePlatformAiFeature();

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

  const autoSlug = (name: string) =>
    name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

  /* auto-slug the key from the name while the user types in the create form */
  const handleNameChange = (name: string) => {
    const slug = autoSlug(name);
    setCreateForm((f) => ({ ...f, name, key: f.key === '' || f.key === autoSlug(f.name) ? slug : f.key }));
  };

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
        title="AI Feature Catalog"
        subtitle="AI capabilities sellable as part of an AI subscription, independent of the core plan."
        actions={
          <AppButton variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
            New AI feature
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
                    No AI features yet. Create the first one above.
                  </TableCell>
                </TableRow>
              ) : (
                (features as any[]).map((f: any) => (
                  <TableRow key={f._id} hover sx={{ opacity: f.isActive ? 1 : 0.6 }}>
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
                        <Tooltip title="Edit AI feature">
                          <IconButton size="small" onClick={() => handleEditOpen(f)}>
                            <EditOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete AI feature">
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
        <DialogTitle>New AI feature</DialogTitle>
        <DialogContent>
          <Stack gap={2} mt={1}>
            <TextField
              label="Display name *"
              value={createForm.name}
              onChange={(e) => handleNameChange(e.target.value)}
              fullWidth autoFocus
              helperText="Shown to org admins when picking an AI plan"
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
              helperText="Short explanation shown to users on AI plan cards"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={createForm.isActive}
                  onChange={(e) => setCreateForm((f) => ({ ...f, isActive: e.target.checked }))}
                  color="primary"
                />
              }
              label="Active — visible in AI plan picker"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCreateClose}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate}
            disabled={!createValid || createFeature.isPending}>
            {createFeature.isPending ? 'Creating…' : 'Create AI feature'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Edit dialog ── */}
      <Dialog open={editOpen} onClose={handleEditClose} fullWidth maxWidth="sm">
        <DialogTitle>Edit AI feature</DialogTitle>
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
              label="Active — visible in AI plan picker"
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
        <DialogTitle>Delete AI feature</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{deleteName}</strong>?<br />
            Any AI plan that references this key will lose that entry.
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
