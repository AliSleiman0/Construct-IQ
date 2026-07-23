'use client';

import { Box, Typography } from '@mui/material';
import { useMemo, useState } from 'react';
import { AppLoader } from '@/components/ui/AppLoader';
import { AppErrorState } from '@/components/ui/AppErrorState';
import { useUnits } from '../hooks/useUnits';
import { UnitCard } from './UnitCard';
import { UnitFilters, type UnitFilterValue } from './UnitFilters';

interface UnitGalleryProps {
  detailBasePath: string;
}

export function UnitGallery({ detailBasePath }: UnitGalleryProps) {
  // Buyer-scoped server-side: a CLIENT gets only their own units here, so this
  // same component serves both the sales gallery and the buyer's portal.
  const { data: units, isLoading, isError, refetch } = useUnits();

  const [filters, setFilters] = useState<UnitFilterValue>({
    status: 'ALL',
    type: 'ALL',
    floor: 'ALL',
    maxPrice: 'ALL',
  });

  const all = useMemo(() => units ?? [], [units]);

  const floors = useMemo(
    () => Array.from(new Set(all.map((u) => u.floor))).sort((a, b) => a - b),
    [all],
  );

  const filtered = useMemo(() => {
    return all.filter((u) => {
      if (filters.status !== 'ALL' && u.status !== filters.status) return false;
      if (filters.type !== 'ALL' && u.type !== filters.type) return false;
      if (filters.floor !== 'ALL' && u.floor !== filters.floor) return false;
      if (filters.maxPrice !== 'ALL' && u.priceUsd > filters.maxPrice) return false;
      return true;
    });
  }, [all, filters]);

  if (isLoading) return <AppLoader />;
  if (isError) return <AppErrorState onRetry={refetch} />;

  return (
    <Box>
      <Box mb={3}>
        <UnitFilters value={filters} onChange={setFilters} floors={floors} />
      </Box>

      <Typography variant="caption" color="text.secondary" mb={2} display="block">
        Showing {filtered.length} of {all.length} units
      </Typography>

      {filtered.length === 0 && (
        <Box textAlign="center" py={6}>
          <Typography variant="body2" color="text.secondary">
            {all.length === 0
              ? 'No units have been added to this project yet.'
              : 'No units match the current filters.'}
          </Typography>
        </Box>
      )}

      <Box
        sx={{
          display: 'grid',
          gap: 2.5,
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)',
            lg: 'repeat(4, 1fr)',
          },
        }}
      >
        {filtered.map((u) => (
          <UnitCard key={u.id} unit={u} href={`${detailBasePath}/${u.id}`} />
        ))}
      </Box>
    </Box>
  );
}
