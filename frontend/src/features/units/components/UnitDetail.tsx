'use client';

import { Box, Paper, Typography, Chip, Stack, Divider, Button } from '@mui/material';
import KingBedIcon from '@mui/icons-material/KingBed';
import BathtubIcon from '@mui/icons-material/Bathtub';
import SquareFootIcon from '@mui/icons-material/SquareFoot';
import LayersIcon from '@mui/icons-material/Layers';
import { useSnackbar } from 'notistack';
import { findUnitById, type UnitStatus } from '@/mocks/units.mock';

const STATUS_COLOR: Record<UnitStatus, 'success' | 'warning' | 'default'> = {
  AVAILABLE: 'success',
  RESERVED: 'warning',
  SOLD: 'default',
};

const STATUS_LABEL: Record<UnitStatus, string> = {
  AVAILABLE: 'Available',
  RESERVED: 'Reserved',
  SOLD: 'Sold',
};

export function UnitDetail({ unitId }: { unitId: string }) {
  const { enqueueSnackbar } = useSnackbar();
  const unit = findUnitById(unitId);

  if (!unit) {
    return (
      <Paper elevation={0} sx={{ p: 4, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Typography variant="h6">Unit not found</Typography>
      </Paper>
    );
  }

  const handleInterest = () => {
    enqueueSnackbar(
      `Interest registered for Unit ${unit.label}. Sales will reach out within 1 business day.`,
      { variant: 'success' },
    );
  };

  return (
    <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: '3fr 2fr' } }}>
      <Paper
        elevation={0}
        sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}
      >
        <Box
          component="img"
          src={unit.imageUrl}
          alt={`Unit ${unit.label}`}
          sx={{ width: '100%', height: 380, objectFit: 'cover', display: 'block' }}
        />
        <Box p={3}>
          <Box display="flex" alignItems="center" gap={1.5} mb={1.5}>
            <Typography variant="h4" fontWeight={700}>
              Unit {unit.label}
            </Typography>
            <Chip
              label={STATUS_LABEL[unit.status]}
              color={STATUS_COLOR[unit.status]}
              size="small"
              sx={{ fontWeight: 600 }}
            />
          </Box>
          <Typography variant="body1" color="text.secondary" mb={2.5}>
            {unit.description}
          </Typography>
          <Divider sx={{ my: 2 }} />
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
            }}
          >
            <SpecRow icon={LayersIcon} label="Floor" value={String(unit.floor)} />
            <SpecRow icon={KingBedIcon} label="Bedrooms" value={String(unit.bedrooms)} />
            <SpecRow icon={BathtubIcon} label="Bathrooms" value={String(unit.bathrooms)} />
            <SpecRow icon={SquareFootIcon} label="Area" value={`${Math.round(unit.sqft)} ft²`} />
          </Box>
        </Box>
      </Paper>

      <Stack gap={2}>
        <Paper
          elevation={0}
          sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
            Price
          </Typography>
          <Typography variant="h4" fontWeight={700} color="primary.main" mt={0.5}>
            ${unit.priceUsd.toLocaleString()}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Includes parking + storage locker
          </Typography>

          {unit.status === 'AVAILABLE' && (
            <Button
              variant="contained"
              fullWidth
              size="large"
              sx={{ mt: 2.5 }}
              onClick={handleInterest}
            >
              Express interest
            </Button>
          )}
          {unit.status === 'RESERVED' && (
            <Button variant="outlined" fullWidth size="large" sx={{ mt: 2.5 }} disabled>
              Reservation in progress
            </Button>
          )}
          {unit.status === 'SOLD' && (
            <Button variant="outlined" fullWidth size="large" sx={{ mt: 2.5 }} disabled>
              Sold
            </Button>
          )}
        </Paper>

        <Paper
          elevation={0}
          sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
        >
          <Typography variant="subtitle2" fontWeight={600} mb={1.5}>
            What's included
          </Typography>
          <Stack gap={0.75}>
            {[
              'Floor-to-ceiling windows',
              'Quartz kitchen counters',
              'Smart-home pre-wiring',
              'Concierge service (24/7)',
              'Rooftop pool & gym access',
            ].map((line) => (
              <Typography key={line} variant="body2" color="text.secondary">
                • {line}
              </Typography>
            ))}
          </Stack>
        </Paper>
      </Stack>
    </Box>
  );
}

function SpecRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <Box display="flex" alignItems="center" gap={1.5}>
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: 1.5,
          bgcolor: 'action.hover',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'text.secondary',
        }}
      >
        <Icon sx={{ fontSize: 18 }} />
      </Box>
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
          {label}
        </Typography>
        <Typography variant="body1" fontWeight={600}>
          {value}
        </Typography>
      </Box>
    </Box>
  );
}
