'use client';

import { useMemo } from 'react';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { Box, Chip, FormControl, InputLabel, MenuItem, OutlinedInput, Select } from '@mui/material';

export interface DepOption {
  id: string;
  name: string;
}

/**
 * Generic "Depends on" multiselect (finish-to-start) — mirrors the EditTaskModal
 * dependency picker. Used for phase + milestone dependency editing. Renders
 * nothing when there are no candidate peers. The cycle guard runs at submit time
 * in the calling component (the backend does not enforce it).
 */
export function DependsOnSelect<T extends FieldValues>({
  control,
  name,
  label,
  options,
}: {
  control: Control<T>;
  name: Path<T>;
  label: string;
  options: DepOption[];
}) {
  const titleById = useMemo(() => new Map(options.map((o) => [o.id, o.name])), [options]);
  if (options.length === 0) return null;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <FormControl fullWidth>
          <InputLabel id={`${name}-label`}>{label}</InputLabel>
          <Select
            labelId={`${name}-label`}
            multiple
            value={(field.value as string[]) ?? []}
            onChange={(e) =>
              field.onChange(
                typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value,
              )
            }
            input={<OutlinedInput label={label} />}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {(selected as string[]).map((id) => (
                  <Chip key={id} size="small" label={titleById.get(id) ?? id} />
                ))}
              </Box>
            )}
          >
            {options.map((o) => (
              <MenuItem key={o.id} value={o.id}>
                {o.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}
    />
  );
}
