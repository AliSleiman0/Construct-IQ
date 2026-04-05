'use client';

import {
  Controller,
  FieldValues,
  Path,
  Control,
} from 'react-hook-form';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  SelectProps,
} from '@mui/material';

interface SelectOption {
  label: string;
  value: string | number;
}

interface FormSelectFieldProps<T extends FieldValues>
  extends Omit<SelectProps, 'name' | 'error'> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  options: SelectOption[];
  helperText?: string;
}

export function FormSelectField<T extends FieldValues>({
  name,
  control,
  label,
  options,
  helperText,
  ...props
}: FormSelectFieldProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <FormControl fullWidth error={!!fieldState.error}>
          <InputLabel>{label}</InputLabel>
          <Select {...field} label={label} {...props}>
            {options.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
          <FormHelperText>
            {fieldState.error?.message ?? helperText}
          </FormHelperText>
        </FormControl>
      )}
    />
  );
}
