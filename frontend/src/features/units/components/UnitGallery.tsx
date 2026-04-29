'use client';

import { Box, Typography } from '@mui/material';
import { useMemo, useState } from 'react';
import { mockUnits } from '@/mocks/units.mock';
import { UnitCard } from './UnitCard';
import { UnitFilters, type UnitFilterValue } from './UnitFilters';

interface UnitGalleryProps {
  detailBasePath: string;
}

export function UnitGallery({ detailBasePath }: UnitGalleryProps) {
  const [filters, setFilters] = useState<UnitFilterValue>({
    status: 'ALL',
    type: 'ALL',
    floor: 'ALL',
    maxPrice: 'ALL',
  });

  const filtered = useMemo(() => {
    return mockUnits.filter((u) => {
      if (filters.status !== 'ALL' && u.status !== filters.status) return false;
      if (filters.type !== 'ALL' && u.type !== filters.type) return false;
      if (filters.floor !== 'ALL' && u.floor !== filters.floor) return false;
      if (filters.maxPrice !== 'ALL' && u.priceUsd > filters.maxPrice) return false;
      return true;
    });
  }, [filters]);

  return (
    <Box>
      <Box mb={3}>
        <UnitFilters value={filters} onChange={setFilters} />
      </Box>

      <Typography variant="caption" color="text.secondary" mb={2} display="block">
        Showing {filtered.length} of {mockUnits.length} units
      </Typography>

      {filtered.length === 0 && (
        <Box textAlign="center" py={6}>
          <Typography variant="body2" color="text.secondary">
            No units match the current filters.
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
