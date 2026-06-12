'use client';

import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import DescriptionIcon from '@mui/icons-material/Description';
import type { BidExtractionStatus } from '@/types/bids.types';

export interface ExtractionProgressItem {
  fileName: string;
  status: BidExtractionStatus;
  error?: string | null;
}

interface BidExtractionProgressProps {
  items: ExtractionProgressItem[];
}

function StatusIcon({ status }: { status: BidExtractionStatus }) {
  if (status === 'COMPLETE')
    return <CheckCircleIcon color="success" fontSize="small" />;
  if (status === 'FAILED') return <ErrorIcon color="error" fontSize="small" />;
  return <CircularProgress size={16} />;
}

export function BidExtractionProgress({ items }: BidExtractionProgressProps) {
  if (items.length === 0) return null;
  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent sx={{ p: 2.5 }}>
        <Typography variant="subtitle2" fontWeight={700} mb={1.5}>
          Extraction progress
        </Typography>
        <Stack spacing={1}>
          {items.map((item) => (
            <Box
              key={item.fileName}
              display="flex"
              alignItems="center"
              gap={1.5}
              sx={{ p: 1, borderRadius: 1, bgcolor: 'background.default' }}
            >
              <DescriptionIcon fontSize="small" color="action" />
              <Box flexGrow={1} minWidth={0}>
                <Typography variant="body2" noWrap title={item.fileName}>
                  {item.fileName}
                </Typography>
                {item.status === 'FAILED' && item.error && (
                  <Typography variant="caption" color="error" noWrap>
                    {item.error}
                  </Typography>
                )}
              </Box>
              <StatusIcon status={item.status} />
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
