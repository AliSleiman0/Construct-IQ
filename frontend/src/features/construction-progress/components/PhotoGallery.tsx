'use client';

import { Box, Paper, Typography } from '@mui/material';
import dayjs from 'dayjs';
import { mockProgressPhotos } from '@/mocks/progress.mock';

export function PhotoGallery() {
  return (
    <Box>
      <Typography variant="subtitle1" fontWeight={600} mb={2}>
        Site photos
      </Typography>
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
        {mockProgressPhotos.map((p) => (
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
              alt={p.caption}
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
