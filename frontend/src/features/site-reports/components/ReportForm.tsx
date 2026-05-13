'use client';

import {
  Box,
  Paper,
  Typography,
  TextField,
  MenuItem,
  Stack,
  IconButton,
  Button,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSnackbar } from 'notistack';
import { useMockState } from '@/store/mock-state.store';
import { useAuthStore } from '@/store/auth.store';
import type { Weather } from '@/mocks/daily-reports.mock';

const WEATHER: { value: Weather; label: string }[] = [
  { value: 'SUNNY', label: 'Sunny' },
  { value: 'CLOUDY', label: 'Cloudy' },
  { value: 'RAIN', label: 'Rain' },
  { value: 'WINDY', label: 'Windy' },
  { value: 'STORM', label: 'Storm' },
];

interface ReportFormProps {
  /** Where to navigate after successful create */
  successBasePath: string;
}

export function ReportForm({ successBasePath }: ReportFormProps) {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const user = useAuthStore((s) => s.user);
  const createDailyReport = useMockState((s) => s.createDailyReport);

  const [reportDate, setReportDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [weather, setWeather] = useState<Weather>('SUNNY');
  const [highTempF, setHighTempF] = useState('72');
  const [lowTempF, setLowTempF] = useState('55');
  const [manpower, setManpower] = useState([{ trade: 'Concrete', count: 8 }]);
  const [equipment, setEquipment] = useState([{ name: 'Tower Crane #1', hours: 8 }]);
  const [workCompleted, setWorkCompleted] = useState('');
  const [blockers, setBlockers] = useState('');
  const [notes, setNotes] = useState('');

  const addManpower = () => setManpower((m) => [...m, { trade: '', count: 0 }]);
  const removeManpower = (idx: number) => setManpower((m) => m.filter((_, i) => i !== idx));
  const updateManpower = (idx: number, key: 'trade' | 'count', value: string) =>
    setManpower((m) =>
      m.map((row, i) =>
        i === idx ? { ...row, [key]: key === 'count' ? Number(value) || 0 : value } : row,
      ),
    );

  const addEquipment = () => setEquipment((e) => [...e, { name: '', hours: 0 }]);
  const removeEquipment = (idx: number) => setEquipment((e) => e.filter((_, i) => i !== idx));
  const updateEquipment = (idx: number, key: 'name' | 'hours', value: string) =>
    setEquipment((e) =>
      e.map((row, i) =>
        i === idx ? { ...row, [key]: key === 'hours' ? Number(value) || 0 : value } : row,
      ),
    );

  const handleSubmit = () => {
    if (!user) return;
    if (!workCompleted.trim()) {
      enqueueSnackbar('Work completed is required.', { variant: 'warning' });
      return;
    }

    const r = createDailyReport({
      reportDate,
      projectId: 'proj-tower-heights',
      projectName: 'Tower Heights',
      authorId: user.id,
      authorName: `${user.firstName} ${user.lastName}`,
      weather,
      highTempF: Number(highTempF) || 0,
      lowTempF: Number(lowTempF) || 0,
      manpower: manpower.filter((m) => m.trade.trim()),
      equipment: equipment.filter((e) => e.name.trim()),
      workCompleted: workCompleted.trim(),
      blockers: blockers.trim(),
      notes: notes.trim(),
    });

    enqueueSnackbar(`Report ${r.id} filed.`, { variant: 'success' });
    router.push(`${successBasePath}/${r.id}`);
  };

  return (
    <Stack gap={2.5}>
      <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle1" fontWeight={600} mb={2}>
          General
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} flexWrap="wrap">
          <TextField
            label="Date"
            type="date"
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 180 }}
          />
          <TextField
            select
            label="Weather"
            value={weather}
            onChange={(e) => setWeather(e.target.value as Weather)}
            sx={{ minWidth: 160 }}
          >
            {WEATHER.map((w) => (
              <MenuItem key={w.value} value={w.value}>
                {w.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="High °F"
            type="number"
            value={highTempF}
            onChange={(e) => setHighTempF(e.target.value)}
            sx={{ minWidth: 120 }}
          />
          <TextField
            label="Low °F"
            type="number"
            value={lowTempF}
            onChange={(e) => setLowTempF(e.target.value)}
            sx={{ minWidth: 120 }}
          />
        </Stack>
      </Paper>

      <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="subtitle1" fontWeight={600}>
            Manpower
          </Typography>
          <Button startIcon={<AddIcon />} size="small" onClick={addManpower}>
            Add trade
          </Button>
        </Box>
        <Stack gap={1}>
          {manpower.map((m, i) => (
            <Box key={i} display="flex" gap={1.5} alignItems="center">
              <TextField
                size="small"
                label="Trade"
                value={m.trade}
                onChange={(e) => updateManpower(i, 'trade', e.target.value)}
                sx={{ flex: 1 }}
              />
              <TextField
                size="small"
                label="Count"
                type="number"
                value={String(m.count)}
                onChange={(e) => updateManpower(i, 'count', e.target.value)}
                sx={{ width: 110 }}
              />
              <IconButton size="small" onClick={() => removeManpower(i)} color="error">
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
        </Stack>
      </Paper>

      <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="subtitle1" fontWeight={600}>
            Equipment
          </Typography>
          <Button startIcon={<AddIcon />} size="small" onClick={addEquipment}>
            Add equipment
          </Button>
        </Box>
        <Stack gap={1}>
          {equipment.map((e, i) => (
            <Box key={i} display="flex" gap={1.5} alignItems="center">
              <TextField
                size="small"
                label="Equipment"
                value={e.name}
                onChange={(ev) => updateEquipment(i, 'name', ev.target.value)}
                sx={{ flex: 1 }}
              />
              <TextField
                size="small"
                label="Hours"
                type="number"
                value={String(e.hours)}
                onChange={(ev) => updateEquipment(i, 'hours', ev.target.value)}
                sx={{ width: 110 }}
              />
              <IconButton size="small" onClick={() => removeEquipment(i)} color="error">
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
        </Stack>
      </Paper>

      <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle1" fontWeight={600} mb={2}>
          Work done
        </Typography>
        <Stack gap={2}>
          <TextField
            label="Work completed"
            multiline
            minRows={3}
            fullWidth
            value={workCompleted}
            onChange={(e) => setWorkCompleted(e.target.value)}
            placeholder="Floor 11 deck pour completed (180 cy). Curtain wall continued on east elevation."
          />
          <TextField
            label="Blockers"
            multiline
            minRows={2}
            fullWidth
            value={blockers}
            onChange={(e) => setBlockers(e.target.value)}
            placeholder="Anything that delayed the work — late deliveries, sub no-shows, weather…"
          />
          <TextField
            label="Notes"
            multiline
            minRows={2}
            fullWidth
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Stack>
      </Paper>

      <Box display="flex" justifyContent="flex-end" gap={1.5}>
        <Button variant="text" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit}>
          File report
        </Button>
      </Box>
    </Stack>
  );
}
