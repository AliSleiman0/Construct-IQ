'use client';

import { Box, MenuItem, TextField, Stack } from '@mui/material';
import type { UnitStatus, UnitType } from '@/mocks/units.mock';

export interface UnitFilterValue {
  status: 'ALL' | UnitStatus;
  type: 'ALL' | UnitType;
  floor: 'ALL' | number;
  maxPrice: 'ALL' | number;
}

const TYPES: ('ALL' | UnitType)[] = ['ALL', '1BR', '2BR', '3BR', 'Penthouse'];
const STATUSES: ('ALL' | UnitStatus)[] = ['ALL', 'AVAILABLE', 'RESERVED', 'SOLD'];
const FLOORS = [7, 8, 9, 10, 11, 12];
const PRICES = [300_000, 400_000, 500_000, 700_000, 1_000_000];

interface UnitFiltersProps {
  value: UnitFilterValue;
  onChange: (next: UnitFilterValue) => void;
}

export function UnitFilters({ value, onChange }: UnitFiltersProps) {
  const update = <K extends keyof UnitFilterValue>(key: K, next: UnitFilterValue[K]) =>
    onChange({ ...value, [key]: next });

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}>
        <TextField
          select
          size="small"
          label="Status"
          value={value.status}
          onChange={(e) => update('status', e.target.value as UnitFilterValue['status'])}
          sx={{ minWidth: 150 }}
        >
          {STATUSES.map((s) => (
            <MenuItem key={s} value={s}>
              {s === 'ALL' ? 'All statuses' : s.toLowerCase()}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Type"
          value={value.type}
          onChange={(e) => update('type', e.target.value as UnitFilterValue['type'])}
          sx={{ minWidth: 150 }}
        >
          {TYPES.map((t) => (
            <MenuItem key={t} value={t}>
              {t === 'ALL' ? 'All types' : t}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Floor"
          value={String(value.floor)}
          onChange={(e) =>
            update(
              'floor',
              e.target.value === 'ALL' ? 'ALL' : (Number(e.target.value) as UnitFilterValue['floor']),
            )
          }
          sx={{ minWidth: 120 }}
        >
          <MenuItem value="ALL">All floors</MenuItem>
          {FLOORS.map((f) => (
            <MenuItem key={f} value={String(f)}>
              Floor {f}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Max price"
          value={String(value.maxPrice)}
          onChange={(e) =>
            update(
              'maxPrice',
              e.target.value === 'ALL'
                ? 'ALL'
                : (Number(e.target.value) as UnitFilterValue['maxPrice']),
            )
          }
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="ALL">Any price</MenuItem>
          {PRICES.map((p) => (
            <MenuItem key={p} value={String(p)}>
              Up to ${p.toLocaleString()}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
    </Box>
  );
}
