'use client';

import { useEffect } from 'react';
import { Box, Typography, Button } from '@mui/material';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Dashboard Error]', error);
  }, [error]);

  return (
    <Box sx={{ p: 6, textAlign: 'center' }}>
      <Typography variant="h5" color="error" gutterBottom>
        Something went wrong
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontFamily: 'monospace' }}>
        {error.message}
      </Typography>
      <Button variant="outlined" onClick={reset}>
        Try again
      </Button>
    </Box>
  );
}
