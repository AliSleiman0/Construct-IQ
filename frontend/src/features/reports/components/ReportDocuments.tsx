'use client';

import { useEffect, useState } from 'react';
import {
  Box, Paper, Typography, Skeleton, IconButton, Tooltip, Chip, Stack, Alert,
  Table, TableHead, TableBody, TableRow, TableCell, TextField, MenuItem, Link,
  List, ListItemButton, ListItemText, Checkbox,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import DownloadIcon from '@mui/icons-material/Download';
import dayjs from 'dayjs';
import { useSnackbar } from 'notistack';
import { AppButton } from '@/components/ui/AppButton';
import { AppModal } from '@/components/ui/AppModal';
import { useAuthStore } from '@/store/auth.store';
import {
  useReportDocuments, useDocuments, useUploadDocument, useUpdateDocument,
} from '@/features/documents/hooks/useDocuments';
import { DOCUMENT_TYPES, type DocumentType, type ProjectDocument } from '@/types/document.types';

function fileSize(bytes?: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function typeLabel(t: string): string {
  return t.split('_').map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
}

/**
 * Documents (non-image files) attached to a daily report. Files can be uploaded
 * fresh or linked from the project's existing library; both set `dailyReportId`.
 * Images are intentionally excluded — those live in {@link ReportPhotos}.
 */
export function ReportDocuments({ reportId, projectId }: { reportId: string; projectId: string }) {
  const { enqueueSnackbar } = useSnackbar();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const isSuperAdmin = !!useAuthStore((s) => s.user?.isSuperAdmin);
  const canManage = isSuperAdmin || hasPermission('upload:documents');

  const { data: docs, isLoading } = useReportDocuments(reportId);
  const updateDoc = useUpdateDocument();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);

  const files = (docs ?? []).filter((d) => !d.mimeType?.startsWith('image/'));

  const handleUnlink = async (doc: ProjectDocument) => {
    if (!confirm(`Remove "${doc.name}" from this report? The document stays in the project library.`)) return;
    try {
      await updateDoc.mutateAsync({ id: doc.id, dailyReportId: null });
      enqueueSnackbar('Document removed from report.', { variant: 'success' });
    } catch (e: any) {
      enqueueSnackbar(e?.response?.data?.message ?? 'Failed to remove document.', { variant: 'error' });
    }
  };

  return (
    <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5} gap={1} flexWrap="wrap">
        <Typography variant="subtitle2" fontWeight={600}>
          Attached documents ({files.length})
        </Typography>
        {canManage && (
          <Stack direction="row" spacing={1}>
            <AppButton size="small" variant="outlined" startIcon={<LinkIcon />} onClick={() => setLinkOpen(true)}>
              Link existing
            </AppButton>
            <AppButton size="small" variant="outlined" startIcon={<UploadFileIcon />} onClick={() => setUploadOpen(true)}>
              Attach file
            </AppButton>
          </Stack>
        )}
      </Box>

      {isLoading ? (
        <Skeleton variant="rounded" height={120} />
      ) : files.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {canManage
            ? 'No documents attached. Attach a file or link one from the project library.'
            : 'No documents attached to this report.'}
        </Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell align="right">Size</TableCell>
              <TableCell>Date</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {files.map((d) => (
              <TableRow key={d.id} hover>
                <TableCell><Typography variant="body2" fontWeight={500}>{d.name}</Typography></TableCell>
                <TableCell><Chip size="small" variant="outlined" label={typeLabel(d.type)} /></TableCell>
                <TableCell align="right">{fileSize(d.sizeBytes)}</TableCell>
                <TableCell>{dayjs(d.createdAt).format('MMM D, YYYY')}</TableCell>
                <TableCell align="right">
                  {d.fileUrl && (
                    <Tooltip title="Download">
                      <IconButton size="small" component={Link} href={d.fileUrl} target="_blank" rel="noopener" aria-label={`Download ${d.name}`}>
                        <DownloadIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {canManage && (
                    <Tooltip title="Remove from report">
                      <span>
                        <IconButton size="small" color="error" aria-label={`Remove ${d.name}`} disabled={updateDoc.isPending}
                          onClick={() => handleUnlink(d)}>
                          <LinkOffIcon fontSize="small" />
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

      <AttachFileModal open={uploadOpen} reportId={reportId} projectId={projectId} onClose={() => setUploadOpen(false)} />
      <LinkExistingModal open={linkOpen} reportId={reportId} projectId={projectId} onClose={() => setLinkOpen(false)} />
    </Paper>
  );
}

function AttachFileModal({ open, reportId, projectId, onClose }: { open: boolean; reportId: string; projectId: string; onClose: () => void }) {
  const upload = useUploadDocument();
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<DocumentType>('OTHER');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (!open) { setFile(null); setName(''); setType('OTHER'); setError(null); } }, [open]);

  const submit = async () => {
    if (!file) { setError('Choose a file to attach.'); return; }
    setError(null);
    try {
      await upload.mutateAsync({ file, meta: { projectId, dailyReportId: reportId, type, name: name.trim() || undefined } });
      onClose();
    } catch (e: any) {
      const status = e?.response?.status;
      setError(status === 503
        ? 'File storage is not configured on this server.'
        : (e?.response?.data?.message ?? 'Upload failed'));
    }
  };

  return (
    <AppModal open={open} onClose={onClose} title="Attach document"
      actions={
        <Stack direction="row" spacing={1} justifyContent="flex-end" p={2} pt={0}>
          <AppButton variant="outlined" onClick={onClose} disabled={upload.isPending}>Cancel</AppButton>
          <AppButton variant="contained" loading={upload.isPending} onClick={submit}>Attach</AppButton>
        </Stack>
      }
    >
      <Stack spacing={2.5} px={3} pb={1}>
        {error && <Alert severity="error">{error}</Alert>}
        <AppButton variant="outlined" component="label" startIcon={<UploadFileIcon />}>
          {file ? file.name : 'Choose file'}
          <input hidden type="file" data-testid="report-doc-input"
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

function LinkExistingModal({ open, reportId, projectId, onClose }: { open: boolean; reportId: string; projectId: string; onClose: () => void }) {
  const { enqueueSnackbar } = useSnackbar();
  const { data: docs, isLoading } = useDocuments(projectId);
  const updateDoc = useUpdateDocument();
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => { if (!open) setSelected([]); }, [open]);

  // Only library documents not already tied to a report can be linked here.
  const available = (docs ?? []).filter((d) => !d.dailyReportId);

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const submit = async () => {
    try {
      await Promise.all(selected.map((id) => updateDoc.mutateAsync({ id, dailyReportId: reportId })));
      enqueueSnackbar(`${selected.length} document${selected.length > 1 ? 's' : ''} linked.`, { variant: 'success' });
      onClose();
    } catch (e: any) {
      enqueueSnackbar(e?.response?.data?.message ?? 'Failed to link documents.', { variant: 'error' });
    }
  };

  return (
    <AppModal open={open} onClose={onClose} title="Link existing documents"
      actions={
        <Stack direction="row" spacing={1} justifyContent="flex-end" p={2} pt={0}>
          <AppButton variant="outlined" onClick={onClose} disabled={updateDoc.isPending}>Cancel</AppButton>
          <AppButton variant="contained" loading={updateDoc.isPending} disabled={selected.length === 0} onClick={submit}>
            Link {selected.length > 0 ? `(${selected.length})` : ''}
          </AppButton>
        </Stack>
      }
    >
      <Box px={1} pb={1}>
        {isLoading ? (
          <Skeleton variant="rounded" height={160} sx={{ m: 2 }} />
        ) : available.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
            No unlinked documents in this project. Upload one from the Documents page first.
          </Typography>
        ) : (
          <List dense sx={{ maxHeight: 360, overflow: 'auto' }}>
            {available.map((d) => (
              <ListItemButton key={d.id} onClick={() => toggle(d.id)} dense>
                <Checkbox edge="start" checked={selected.includes(d.id)} tabIndex={-1} disableRipple />
                <ListItemText
                  primary={d.name}
                  secondary={`${typeLabel(d.type)} · ${fileSize(d.sizeBytes)} · ${dayjs(d.createdAt).format('MMM D, YYYY')}`}
                />
              </ListItemButton>
            ))}
          </List>
        )}
      </Box>
    </AppModal>
  );
}
