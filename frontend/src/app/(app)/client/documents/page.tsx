'use client';

import { Box, Paper, Typography, Stack, Button } from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DownloadIcon from '@mui/icons-material/Download';
import dayjs from 'dayjs';
import { PageHeader } from '@/components/shared/PageHeader';
import { AppLoader } from '@/components/ui/AppLoader';
import { AppErrorState } from '@/components/ui/AppErrorState';
import { useMyUnit } from '@/features/units/hooks/useUnits';
import { useDocuments } from '@/features/documents/hooks/useDocuments';

function fileSize(bytes?: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ClientDocumentsPage() {
  // A buyer belongs to no project, so their project comes from the unit they
  // own — and the backend grants document visibility on that same basis.
  const { data: unit, isLoading: unitLoading } = useMyUnit();
  const { data: documents, isLoading, isError, refetch } = useDocuments(unit?.projectId);

  if (unitLoading || isLoading) return <AppLoader />;
  if (isError) return <AppErrorState onRetry={refetch} />;

  const docs = documents ?? [];

  return (
    <Box>
      <PageHeader
        title="Documents"
        subtitle="Contracts, plans, and brochures for your unit."
      />

      {docs.length === 0 ? (
        <Paper elevation={0} sx={{ p: 4, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="body2" color="text.secondary">
            {unit
              ? 'No documents have been shared with you yet.'
              : "You don't have a unit yet, so there are no documents to show."}
          </Typography>
        </Paper>
      ) : (
        <Stack gap={1.5}>
          {docs.map((doc) => (
            <Paper
              key={doc.id}
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <PictureAsPdfIcon color="error" />
              <Box flex={1} minWidth={0}>
                <Typography variant="subtitle2" fontWeight={600} noWrap>
                  {doc.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {fileSize(doc.sizeBytes)} · Added {dayjs(doc.createdAt).format('MMM D, YYYY')}
                </Typography>
              </Box>
              {doc.fileUrl && (
                <Button
                  size="small"
                  startIcon={<DownloadIcon />}
                  component="a"
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Download
                </Button>
              )}
            </Paper>
          ))}
        </Stack>
      )}
    </Box>
  );
}
