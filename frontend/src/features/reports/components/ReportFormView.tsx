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
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSnackbar } from 'notistack';
import { useProjects } from '@/features/projects/hooks/useProjects';
import { useCreateReport } from '@/features/reports/hooks/useReportMutations';

const WEATHER = ['SUNNY', 'CLOUDY', 'RAIN', 'WINDY', 'STORM'];

interface ReportFormViewProps {
  /** Where to navigate after a successful create (the new report's detail). */
  successBasePath: string;
}

export function ReportFormView({ successBasePath }: ReportFormViewProps) {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const { data: projects, isLoading: projectsLoading } = useProjects();

  const [projectId, setProjectId] = useState('');
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [weather, setWeather] = useState('SUNNY');
  const [highTempC, setHighTempC] = useState('24');
  const [lowTempC, setLowTempC] = useState('12');
  const [manpower, setManpower] = useState([{ trade: 'Concrete', count: 8 }]);
  const [equipment, setEquipment] = useState([{ name: 'Tower Crane #1', hours: 8 }]);
  const [workCompleted, setWorkCompleted] = useState('');
  const [blockers, setBlockers] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const createReport = useCreateReport(projectId);

  const addManpower = () => setManpower((m) => [...m, { trade: '', count: 0 }]);
  const removeManpower = (idx: number) => setManpower((m) => m.filter((_, i) => i !== idx));
  const updateManpower = (idx: number, key: 'trade' | 'count', value: string) =>
    setManpower((m) => m.map((row, i) => (i === idx ? { ...row, [key]: key === 'count' ? Number(value) || 0 : value } : row)));

  const addEquipment = () => setEquipment((e) => [...e, { name: '', hours: 0 }]);
  const removeEquipment = (idx: number) => setEquipment((e) => e.filter((_, i) => i !== idx));
  const updateEquipment = (idx: number, key: 'name' | 'hours', value: string) =>
    setEquipment((e) => e.map((row, i) => (i === idx ? { ...row, [key]: key === 'hours' ? Number(value) || 0 : value } : row)));

  const handleSubmit = async () => {
    setError(null);
    if (!projectId) {
      setError('Please choose a project.');
      return;
    }
    if (!workCompleted.trim()) {
      setError('Work completed is required.');
      return;
    }
    try {
      const created = await createReport.mutateAsync({
        reportDate,
        weather,
        highTempC: Number(highTempC) || undefined,
        lowTempC: Number(lowTempC) || undefined,
        workCompleted: workCompleted.trim(),
        blockers: blockers.trim() || undefined,
        notes: notes.trim() || undefined,
        manpowerEntries: manpower.filter((m) => m.trade.trim()),
        equipmentEntries: equipment.filter((e) => e.name.trim()),
      });
      enqueueSnackbar('Daily report filed.', { variant: 'success' });
      router.push(`${successBasePath}/${created.id}`);
    } catch (e: any) {
      // 409 → unique (projectId, reportDate); surface the backend message.
      setError(e?.response?.data?.message ?? 'Failed to file report.');
    }
  };

  return (
    <Stack gap={2.5}>
      {error && <Alert severity="error">{error}</Alert>}

      <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle1" fontWeight={600} mb={2}>
          General
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} flexWrap="wrap">
          <TextField
            select
            label="Project"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            disabled={projectsLoading}
            required
            sx={{ minWidth: 220 }}
          >
            {(projects ?? []).map((p: any) => (
              <MenuItem key={p.id ?? p._id} value={p.id ?? p._id}>
                {p.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Date"
            type="date"
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 180 }}
          />
          <TextField select label="Weather" value={weather} onChange={(e) => setWeather(e.target.value)} sx={{ minWidth: 150 }}>
            {WEATHER.map((w) => (
              <MenuItem key={w} value={w}>
                {w.charAt(0) + w.slice(1).toLowerCase()}
              </MenuItem>
            ))}
          </TextField>
          <TextField label="High °C" type="number" value={highTempC} onChange={(e) => setHighTempC(e.target.value)} sx={{ minWidth: 110 }} />
          <TextField label="Low °C" type="number" value={lowTempC} onChange={(e) => setLowTempC(e.target.value)} sx={{ minWidth: 110 }} />
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
              <TextField size="small" label="Trade" value={m.trade} onChange={(e) => updateManpower(i, 'trade', e.target.value)} sx={{ flex: 1 }} />
              <TextField size="small" label="Count" type="number" value={String(m.count)} onChange={(e) => updateManpower(i, 'count', e.target.value)} sx={{ width: 110 }} />
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
              <TextField size="small" label="Equipment" value={e.name} onChange={(ev) => updateEquipment(i, 'name', ev.target.value)} sx={{ flex: 1 }} />
              <TextField size="small" label="Hours" type="number" value={String(e.hours)} onChange={(ev) => updateEquipment(i, 'hours', ev.target.value)} sx={{ width: 110 }} />
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
          <TextField label="Notes" multiline minRows={2} fullWidth value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Stack>
      </Paper>

      <Box display="flex" justifyContent="flex-end" gap={1.5}>
        <Button variant="text" onClick={() => router.back()} disabled={createReport.isPending}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={createReport.isPending}>
          File report
        </Button>
      </Box>
    </Stack>
  );
}
