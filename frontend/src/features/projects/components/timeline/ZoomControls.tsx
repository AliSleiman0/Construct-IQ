'use client';

import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import type { ZoomLevel } from './timeline.utils';

export function ZoomControls({ zoom, onChange }: { zoom: ZoomLevel; onChange: (z: ZoomLevel) => void }) {
  return (
    <ToggleButtonGroup
      size="small"
      exclusive
      value={zoom}
      onChange={(_, v) => v && onChange(v as ZoomLevel)}
      aria-label="Timeline zoom"
    >
      <ToggleButton value={1} aria-label="Fit">Fit</ToggleButton>
      <ToggleButton value={2} aria-label="2x zoom">2×</ToggleButton>
      <ToggleButton value={4} aria-label="4x zoom">4×</ToggleButton>
    </ToggleButtonGroup>
  );
}
