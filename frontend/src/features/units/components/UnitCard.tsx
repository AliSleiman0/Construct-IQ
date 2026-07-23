'use client';

import {
  Card,
  CardActionArea,
  CardMedia,
  CardContent,
  Box,
  Typography,
  Chip,
} from '@mui/material';
import KingBedIcon from '@mui/icons-material/KingBed';
import BathtubIcon from '@mui/icons-material/Bathtub';
import SquareFootIcon from '@mui/icons-material/SquareFoot';
import Link from 'next/link';
import type { Unit, UnitStatus } from '@/types/unit.types';
import { UNIT_TYPE_LABELS } from '@/types/unit.types';

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

interface UnitCardProps {
  unit: Unit;
  href: string;
}

// Units may have no photo uploaded yet; fall back to a neutral placeholder
// rather than rendering a broken <img>.
const FALLBACK_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="180">' +
      '<rect width="400" height="180" fill="%23e2e8f0"/>' +
      '<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" ' +
      'font-family="sans-serif" font-size="14" fill="%2394a3b8">No photo</text></svg>',
  );

export function UnitCard({ unit, href }: UnitCardProps) {
  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        transition: 'all 0.15s',
        '&:hover': {
          borderColor: 'primary.light',
          boxShadow: '0 8px 16px -8px rgba(0,0,0,0.12)',
          transform: 'translateY(-2px)',
        },
      }}
    >
      <CardActionArea component={Link} href={href}>
        <CardMedia
          component="img"
          height="180"
          image={unit.imageUrl ?? FALLBACK_IMAGE}
          alt={`Unit ${unit.label}`}
          sx={{ objectFit: 'cover' }}
        />
        <CardContent sx={{ p: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Unit {unit.label}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Floor {unit.floor} · {UNIT_TYPE_LABELS[unit.type] ?? unit.type}
              </Typography>
            </Box>
            <Chip
              label={STATUS_LABEL[unit.status]}
              color={STATUS_COLOR[unit.status]}
              size="small"
              sx={{ fontWeight: 600 }}
            />
          </Box>
          <Box display="flex" alignItems="center" gap={2} my={1.5} color="text.secondary">
            <Box display="flex" alignItems="center" gap={0.5}>
              <KingBedIcon sx={{ fontSize: 16 }} />
              <Typography variant="caption">{unit.bedrooms ?? '—'} bed</Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={0.5}>
              <BathtubIcon sx={{ fontSize: 16 }} />
              <Typography variant="caption">{unit.bathrooms ?? '—'} bath</Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={0.5}>
              <SquareFootIcon sx={{ fontSize: 16 }} />
              <Typography variant="caption">{Math.round(unit.sqft)} ft²</Typography>
            </Box>
          </Box>
          <Typography variant="h6" color="primary.main" fontWeight={700}>
            ${unit.priceUsd.toLocaleString()}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
