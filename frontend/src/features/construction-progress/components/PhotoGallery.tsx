'use client';

import { Box, Paper, Typography } from '@mui/material';
import dayjs from 'dayjs';
import { AppLoader } from '@/components/ui/AppLoader';
import { useProgressPhotos } from '../hooks/useProgressPhotos';

interface PhotoGalleryProps {
  /** Derived from the buyer's own unit — null until that resolves. */
  projectId: string | null;
}

export function PhotoGallery({ projectId }: PhotoGalleryProps) {
  // A buyer is not a project member, so the backend treats the projects they
  // bought into as visible — otherwise this gallery would always be empty.
  const { data, isLoading } = useProgressPhotos(
    projectId ? { projectId } : undefined,
  );
  const photos = data ?? [];

  return (
    <Box>
      <Typography variant="subtitle1" fontWeight={600} mb={2}>
        Site photos
      </Typography>

      {isLoading && <AppLoader />}

      {!isLoading && photos.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No site photos have been published yet.
        </Typography>
      )}
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)',
          },
        }}
      >
        {photos.map((p) => (
          <Paper
            key={p.id}
            elevation={0}
            sx={{
              borderRadius: 2,
              overflow: 'hidden',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Box
              component="img"
              src={p.url}
              alt={p.caption ?? 'Site photo'}
              sx={{
                width: '100%',
                height: 200,
                objectFit: 'cover',
                display: 'block',
              }}
            />
            <Box p={1.5}>
              <Typography variant="body2" fontWeight={500}>
                {p.caption}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {dayjs(p.takenAt).format('MMM D, YYYY')}
              </Typography>
            </Box>
          </Paper>
        ))}
      </Box>
    </Box>
  );
}
