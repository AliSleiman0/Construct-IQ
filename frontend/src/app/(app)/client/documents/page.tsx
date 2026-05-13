'use client';

import { Box, Paper, Typography, Stack, Button } from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DownloadIcon from '@mui/icons-material/Download';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';
import { PageHeader } from '@/components/shared/PageHeader';

interface MockDoc {
  id: string;
  name: string;
  size: string;
  uploadedAt: string;
}

const DOCS: MockDoc[] = [
  { id: 'd-1', name: 'Sale & Purchase Agreement — Unit 12B.pdf', size: '1.4 MB', uploadedAt: '2026-01-15T10:00:00.000Z' },
  { id: 'd-2', name: 'Tower Heights — Sales Brochure.pdf', size: '8.2 MB', uploadedAt: '2025-11-02T08:00:00.000Z' },
  { id: 'd-3', name: 'Floor Plan — Unit 12B.pdf', size: '420 KB', uploadedAt: '2025-11-02T08:05:00.000Z' },
  { id: 'd-4', name: 'Building Specifications.pdf', size: '2.1 MB', uploadedAt: '2025-11-02T08:10:00.000Z' },
  { id: 'd-5', name: 'Payment Schedule — Unit 12B.pdf', size: '180 KB', uploadedAt: '2026-01-15T10:05:00.000Z' },
  { id: 'd-6', name: 'HOA Bylaws (Draft).pdf', size: '650 KB', uploadedAt: '2026-03-12T15:00:00.000Z' },
];

export default function ClientDocumentsPage() {
  const { enqueueSnackbar } = useSnackbar();
  const handleDownload = (doc: MockDoc) =>
    enqueueSnackbar(`Download started: ${doc.name}`, { variant: 'info' });

  return (
    <Box>
      <PageHeader title="Documents" subtitle="Contracts, brochures, and reference material." />
      <Stack gap={1.5}>
        {DOCS.map((d) => (
          <Paper
            key={d.id}
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 1.5,
                bgcolor: 'rgba(220,38,38,0.08)',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <PictureAsPdfIcon />
            </Box>
            <Box flex={1} minWidth={0}>
              <Typography variant="body1" fontWeight={500}>
                {d.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {d.size} · uploaded {dayjs(d.uploadedAt).format('MMM D, YYYY')}
              </Typography>
            </Box>
            <Button startIcon={<DownloadIcon />} onClick={() => handleDownload(d)}>
              Download
            </Button>
          </Paper>
        ))}
      </Stack>
    </Box>
  );
}
