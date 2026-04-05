'use client';

import { Controller, FieldValues, Path, Control } from 'react-hook-form';
import { TextField, TextFieldProps } from '@mui/material';

interface FormTextFieldProps<T extends FieldValues>
  extends Omit<TextFieldProps, 'name' | 'error' | 'helperText'> {
  name: Path<T>;
  control: Control<T>;
}

export function FormTextField<T extends FieldValues>({
  name,
  control,
  label,
  ...props
}: FormTextFieldProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <TextField
          {...field}
          label={label}
          error={!!fieldState.error}
          helperText={fieldState.error?.message}
          {...props}
        />
      )}
    />
  );
}
