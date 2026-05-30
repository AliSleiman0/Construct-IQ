'use client';

import { useState } from 'react';
import { Box, Paper, Typography, Skeleton, IconButton, Tooltip, Dialog, DialogContent } from '@mui/material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import DeleteIcon from '@mui/icons-material/Delete';
import { useSnackbar } from 'notistack';
import { AppButton } from '@/components/ui/AppButton';
import { useAuthStore } from '@/store/auth.store';
import { useReportDocuments, useUploadDocument, useDeleteDocument } from '@/features/documents/hooks/useDocuments';
import type { ProjectDocument } from '@/types/document.types';

/**
 * SE-5 — site photos attached to a daily report. Each photo is an IMAGE
 * Document linked via dailyReportId (member-scoped server-side). Uploads reuse
 * the multipart /documents/upload path; the gallery shows image docs only.
 */
export function ReportPhotos({ reportId, projectId }: { reportId: string; projectId: string }) {
  const { enqueueSnackbar } = useSnackbar();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const isSuperAdmin = !!useAuthStore((s) => s.user?.isSuperAdmin);
  const canUpload = isSuperAdmin || hasPermission('upload:documents');
  const canDelete = isSuperAdmin || hasPermission('delete:documents');

  const { data: docs, isLoading } = useReportDocuments(reportId);
  const upload = useUploadDocument();
  const deletePhoto = useDeleteDocument();
  const [lightbox, setLightbox] = useState<ProjectDocument | null>(null);

  const photos = (docs ?? []).filter((d) => d.mimeType?.startsWith('image/') && d.fileUrl);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    try {
      for (const file of list) {
        await upload.mutateAsync({ file, meta: { projectId, dailyReportId: reportId, type: 'IMAGE' } });
      }
      enqueueSnackbar(`${list.length} photo${list.length > 1 ? 's' : ''} uploaded.`, { variant: 'success' });
    } catch (e: any) {
      const status = e?.response?.status;
      enqueueSnackbar(
        status === 503
          ? 'File storage is not configured on this server.'
          : (e?.response?.data?.message ?? 'Photo upload failed.'),
        { variant: 'error' },
      );
    }
  };

  const handleDelete = async (photo: ProjectDocument) => {
    if (!confirm(`Delete photo "${photo.name}"?`)) return;
    try {
      await deletePhoto.mutateAsync(photo.id);
      enqueueSnackbar('Photo deleted.', { variant: 'success' });
    } catch (e: any) {
      enqueueSnackbar(e?.response?.data?.message ?? 'Failed to delete photo.', { variant: 'error' });
    }
  };

  return (
    <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
        <Typography variant="subtitle2" fontWeight={600}>
          Photos ({photos.length})
        </Typography>
        {canUpload && (
          <AppButton
            size="small"
            variant="outlined"
            component="label"
            startIcon={<PhotoCameraIcon />}
            loading={upload.isPending}
          >
            Add photos
            <input
              hidden
              type="file"
              accept="image/*"
              multiple
              data-testid="report-photo-input"
              onChange={(e) => {
                handleFiles(e.target.files);
                e.target.value = '';
              }}
            />
          </AppButton>
        )}
      </Box>

      {isLoading ? (
        <Skeleton variant="rounded" height={120} />
      ) : photos.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {canUpload ? 'No photos yet. Add site photos from the field.' : 'No photos attached to this report.'}
        </Typography>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gap: 1.5,
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' },
          }}
        >
          {photos.map((p) => (
            <Box
              key={p.id}
              sx={{
                position: 'relative',
                aspectRatio: '1 / 1',
                borderRadius: 1.5,
                overflow: 'hidden',
                border: '1px solid',
                borderColor: 'divider',
                cursor: 'pointer',
                '&:hover .photo-delete': { opacity: 1 },
              }}
            >
              <Box
                component="img"
                src={p.fileUrl as string}
                alt={p.name}
                onClick={() => setLightbox(p)}
                sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              {canDelete && (
                <Tooltip title="Delete photo">
                  <span>
                    <IconButton
                      className="photo-delete"
                      size="small"
                      aria-label={`Delete ${p.name}`}
                      disabled={deletePhoto.isPending}
                      onClick={() => handleDelete(p)}
                      sx={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        opacity: { xs: 1, md: 0 },
                        transition: 'opacity 0.15s',
                        bgcolor: 'rgba(0,0,0,0.55)',
                        color: '#fff',
                        '&:hover': { bgcolor: 'rgba(0,0,0,0.75)' },
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              )}
            </Box>
          ))}
        </Box>
      )}

      <Dialog open={!!lightbox} onClose={() => setLightbox(null)} maxWidth="lg">
        <DialogContent sx={{ p: 0 }}>
          {lightbox?.fileUrl && (
            <Box
              component="img"
              src={lightbox.fileUrl}
              alt={lightbox.name}
              sx={{ display: 'block', maxWidth: '90vw', maxHeight: '85vh' }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Paper>
  );
}
