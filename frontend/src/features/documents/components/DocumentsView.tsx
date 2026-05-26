'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Box, FormControl, InputLabel, Select, MenuItem, Skeleton, Paper, Typography, Stack,
  Table, TableHead, TableBody, TableRow, TableCell, IconButton, Tooltip, Chip, Link,
  Alert, TextField, type SelectChangeEvent,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import dayjs from 'dayjs';
import { PageHeader } from '@/components/shared/PageHeader';
import { AppButton } from '@/components/ui/AppButton';
import { AppModal } from '@/components/ui/AppModal';
import { AppErrorState } from '@/components/ui/AppErrorState';
import { AppEmptyState } from '@/components/ui/AppEmptyState';
import { useProjects } from '@/features/projects/hooks/useProjects';
import { useUsers } from '@/features/users/hooks/useUsers';
import { useAuthStore } from '@/store/auth.store';
import { useDocuments, useUploadDocument, useDeleteDocument } from '../hooks/useDocuments';
import { DOCUMENT_TYPES, type DocumentType } from '@/types/document.types';

function fileSize(bytes?: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function typeLabel(t: string): string {
  return t.split('_').map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
}

export function DocumentsView() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const isSuperAdmin = !!useAuthStore((s) => s.user?.isSuperAdmin);
  const canUpload = isSuperAdmin || hasPermission('upload:documents');
  const canDelete = isSuperAdmin || hasPermission('delete:documents');

  const { data: projects, isLoading: projectsLoading } = useProjects();
  const [projectId, setProjectId] = useState('');
  useEffect(() => {
    if (!projectId && projects && projects.length > 0) setProjectId(projects[0].id);
  }, [projects, projectId]);

  return (
    <Box>
      <PageHeader title="Documents" subtitle="Drawings, contracts, and project files." />
      {projectsLoading ? (
        <Skeleton variant="rounded" height={56} sx={{ maxWidth: 320, mb: 3 }} />
      ) : !projects || projects.length === 0 ? (
        <AppEmptyState title="No projects" description="You have no projects to store documents for yet." />
      ) : (
        <>
          <FormControl size="small" sx={{ minWidth: 280, mb: 3 }}>
            <InputLabel id="docs-project-label">Project</InputLabel>
            <Select labelId="docs-project-label" label="Project" value={projectId}
              onChange={(e: SelectChangeEvent) => setProjectId(e.target.value)}>
              {projects.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
            </Select>
          </FormControl>
          {projectId && <DocumentsPanel projectId={projectId} canUpload={canUpload} canDelete={canDelete} />}
        </>
      )}
    </Box>
  );
}

function DocumentsPanel({ projectId, canUpload, canDelete }: { projectId: string; canUpload: boolean; canDelete: boolean }) {
  const { data: docs, isLoading, isError, refetch } = useDocuments(projectId);
  const { data: users } = useUsers();
  const deleteDoc = useDeleteDocument();
  const [uploadOpen, setUploadOpen] = useState(false);

  const userName = useMemo(() => {
    const m = new Map((users ?? []).map((u) => [u.id, `${u.firstName} ${u.lastName}`]));
    return (id?: string | null) => (id ? m.get(id) ?? '—' : '—');
  }, [users]);

  if (isLoading) return <Skeleton variant="rounded" height={240} />;
  if (isError) return <AppErrorState onRetry={refetch} />;

  // Exclude photos attached to a daily report (SE-5) — those live on the report,
  // not in the project documents/drawings table.
  const rows = (docs ?? []).filter((d) => !d.dailyReportId);

  return (
    <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
        <Typography variant="subtitle1" fontWeight={700}>Documents</Typography>
        {canUpload && (
          <AppButton size="small" variant="contained" startIcon={<UploadFileIcon />} onClick={() => setUploadOpen(true)}>
            Upload
          </AppButton>
        )}
      </Box>

      {rows.length === 0 ? (
        <AppEmptyState title="No documents" description={canUpload ? 'Upload your first document.' : 'No documents for this project yet.'} />
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell align="right">Size</TableCell>
              <TableCell>Uploaded by</TableCell>
              <TableCell>Date</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((d) => (
              <TableRow key={d.id} hover>
                <TableCell><Typography variant="body2" fontWeight={500}>{d.name}</Typography></TableCell>
                <TableCell><Chip size="small" variant="outlined" label={typeLabel(d.type)} /></TableCell>
                <TableCell align="right">{fileSize(d.sizeBytes)}</TableCell>
                <TableCell>{userName(d.uploadedById)}</TableCell>
                <TableCell>{dayjs(d.createdAt).format('MMM D, YYYY')}</TableCell>
                <TableCell align="right">
                  {d.fileUrl && (
                    <Tooltip title="Download">
                      <IconButton size="small" component={Link} href={d.fileUrl} target="_blank" rel="noopener" aria-label={`Download ${d.name}`}>
                        <DownloadIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {canDelete && (
                    <Tooltip title="Delete">
                      <span>
                        <IconButton size="small" color="error" aria-label={`Delete ${d.name}`} disabled={deleteDoc.isPending}
                          onClick={async () => { if (confirm(`Delete document "${d.name}"?`)) await deleteDoc.mutateAsync(d.id); }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <UploadDocumentModal open={uploadOpen} projectId={projectId} onClose={() => setUploadOpen(false)} />
    </Paper>
  );
}

function UploadDocumentModal({ open, projectId, onClose }: { open: boolean; projectId: string; onClose: () => void }) {
  const upload = useUploadDocument();
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<DocumentType>('OTHER');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (!open) { setFile(null); setName(''); setType('OTHER'); setError(null); } }, [open]);

  const submit = async () => {
    if (!file) { setError('Choose a file to upload.'); return; }
    setError(null);
    try {
      await upload.mutateAsync({ file, meta: { projectId, type, name: name.trim() || undefined } });
      onClose();
    } catch (e: any) {
      const status = e?.response?.status;
      setError(status === 503
        ? 'File storage is not configured on this server.'
        : (e?.response?.data?.message ?? 'Upload failed'));
    }
  };

  return (
    <AppModal open={open} onClose={onClose} title="Upload document"
      actions={
        <Stack direction="row" spacing={1} justifyContent="flex-end" p={2} pt={0}>
          <AppButton variant="outlined" onClick={onClose} disabled={upload.isPending}>Cancel</AppButton>
          <AppButton variant="contained" loading={upload.isPending} onClick={submit}>Upload</AppButton>
        </Stack>
      }
    >
      <Stack spacing={2.5} px={3} pb={1}>
        {error && <Alert severity="error">{error}</Alert>}
        <AppButton variant="outlined" component="label" startIcon={<UploadFileIcon />}>
          {file ? file.name : 'Choose file'}
          <input hidden type="file" data-testid="doc-file-input"
            onChange={(e) => { const f = e.target.files?.[0] ?? null; setFile(f); if (f && !name) setName(f.name); }} />
        </AppButton>
        <TextField label="Name (optional)" size="small" fullWidth value={name} onChange={(e) => setName(e.target.value)} />
        <TextField select label="Type" size="small" fullWidth value={type} onChange={(e) => setType(e.target.value as DocumentType)}>
          {DOCUMENT_TYPES.map((t) => <MenuItem key={t} value={t}>{typeLabel(t)}</MenuItem>)}
        </TextField>
      </Stack>
    </AppModal>
  );
}
