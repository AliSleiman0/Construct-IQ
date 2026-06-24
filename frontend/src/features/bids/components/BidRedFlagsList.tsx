'use client';

import { Alert, Stack, Typography } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

interface BidRedFlagsListProps {
  flags: string[];
  /** When true, render the empty-state "No red flags identified" note. */
  showEmpty?: boolean;
}

export function BidRedFlagsList({ flags, showEmpty = false }: BidRedFlagsListProps) {
  if (flags.length === 0) {
    if (!showEmpty) return null;
    return (
      <Typography variant="caption" color="success.main">
        No red flags identified.
      </Typography>
    );
  }
  return (
    <Stack spacing={0.5}>
      {flags.map((flag, idx) => (
        <Alert
          key={idx}
          severity="warning"
          icon={<WarningAmberIcon fontSize="small" />}
          sx={{ py: 0.5, '& .MuiAlert-message': { fontSize: 13 } }}
        >
          {flag}
        </Alert>
      ))}
    </Stack>
  );
}
