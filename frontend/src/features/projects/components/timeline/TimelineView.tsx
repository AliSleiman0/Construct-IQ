'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tooltip,
  Typography,
  type SelectChangeEvent,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import FlagIcon from '@mui/icons-material/Flag';
import TimelineIcon from '@mui/icons-material/Timeline';
import { useSnackbar } from 'notistack';
import { AppButton } from '@/components/ui/AppButton';
import { useProjects } from '@/features/projects/hooks/useProjects';
import {
  useCreatePhase,
  useDeletePhase,
  usePhases,
  useUpdatePhase,
} from '@/features/projects/hooks/usePhases';
import {
  useCreateMilestone,
  useDeleteMilestone,
  useMilestones,
  useUpdateMilestone,
} from '@/features/projects/hooks/useMilestones';
import { useRouter } from 'next/navigation';
import { useTasks } from '@/features/tasks/hooks/useTasks';
import { useUpdateTask } from '@/features/tasks/hooks/useTaskMutations';
import { TimelineAxis } from './TimelineAxis';
import { PhaseRow } from './PhaseRow';
import { MilestonePin } from './MilestonePin';
import { TaskRow, TASK_ROW_HEIGHT, TASK_ROW_GAP } from './TaskRow';
import { DependencyLayer, type TaskGeom } from './DependencyLayer';
import {
  CreatePhaseModal,
  EditPhaseModal,
  type PhaseFormValues,
} from './PhaseModal';
import {
  CreateMilestoneModal,
  EditMilestoneModal,
  type MilestoneFormValues,
} from './MilestoneModal';
import { ZoomControls } from './ZoomControls';
import { wouldCreateCycleBy } from '@/features/tasks/utils/dependencies';
import { computeDateWindow, dateToPercent, type ZoomLevel } from './timeline.utils';
import type { Phase } from '@/types/phase.types';
import type { Milestone } from '@/types/milestone.types';
import type { Task } from '@/types/task.types';

const PHASE_ROW_HEIGHT = 44;
const PHASE_ROW_GAP = 8;
const AXIS_HEIGHT = 40;
const PIN_LANE_HEIGHT = 56;
// Approx. y of a milestone pin's dot within the pin lane (label + date + dot).
const MILESTONE_DOT_CY = 40;

export function TimelineView() {
  const { enqueueSnackbar } = useSnackbar();
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const [projectId, setProjectId] = useState<string>('');

  // Default to the first project once project list loads.
  useEffect(() => {
    if (projectId) return;
    if (projects && projects.length > 0) {
      setProjectId(projects[0].id);
    }
  }, [projects, projectId]);

  const phasesQuery = usePhases(projectId || null);
  const milestonesQuery = useMilestones(projectId || null);
  const createPhase = useCreatePhase(projectId);
  const updatePhase = useUpdatePhase(projectId);
  const deletePhase = useDeletePhase(projectId);
  const createMilestone = useCreateMilestone(projectId);
  const updateMilestone = useUpdateMilestone(projectId);
  const deleteMilestone = useDeleteMilestone(projectId);
  const tasksQuery = useTasks({ projectId: projectId || undefined });
  const updateTask = useUpdateTask();
  const router = useRouter();

  const phases = useMemo(() => {
    const list = phasesQuery.data ?? [];
    return [...list].sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      const as = a.startDate ? new Date(a.startDate).getTime() : Number.POSITIVE_INFINITY;
      const bs = b.startDate ? new Date(b.startDate).getTime() : Number.POSITIVE_INFINITY;
      return as - bs;
    });
  }, [phasesQuery.data]);

  const milestones = milestonesQuery.data ?? [];
  const tasks = useMemo(() => tasksQuery.data ?? [], [tasksQuery.data]);

  // Zoom = scrollable track-width multiplier; the percent-positioned bars scale with it.
  const [zoom, setZoom] = useState<ZoomLevel>(1);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const getTrackWidth = () => trackRef.current?.clientWidth ?? 0;

  // Live pixel width of the (zoomed) track — drives the dependency-arrow geometry.
  const [trackWidthPx, setTrackWidthPx] = useState(0);
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    setTrackWidthPx(el.clientWidth);
    const ro = new ResizeObserver(() => setTrackWidthPx(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, [zoom, projectId]);

  const handleTaskDates = async (id: string, payload: { startDate?: string; dueDate?: string }) => {
    try {
      await updateTask.mutateAsync({ id, payload });
    } catch {
      enqueueSnackbar('Failed to update task dates', { variant: 'error' });
    }
  };

  // Commit drag/resize date changes for a phase bar.
  const handlePhaseDates = async (id: string, payload: { startDate?: string; endDate?: string }) => {
    try {
      await updatePhase.mutateAsync({ id, payload });
    } catch {
      enqueueSnackbar('Failed to update phase dates', { variant: 'error' });
    }
  };
  const handleMilestoneDate = async (id: string, targetDate: string) => {
    try {
      await updateMilestone.mutateAsync({ id, payload: { targetDate } });
    } catch {
      enqueueSnackbar('Failed to move milestone', { variant: 'error' });
    }
  };

  const selectedProject = useMemo(
    () => projects?.find((p) => p.id === projectId) ?? null,
    [projects, projectId],
  );

  const window = useMemo(
    () =>
      computeDateWindow(
        phases,
        milestones,
        selectedProject
          ? {
              startDate: (selectedProject as any).startDate ?? null,
              endDate: (selectedProject as any).endDate ?? null,
            }
          : undefined,
        tasks,
      ),
    [phases, milestones, selectedProject, tasks],
  );

  // Tasks ordered by phase (phase order, then a trailing "no phase" group) and
  // the per-task geometry the dependency arrows connect to (percent x + pixel cy).
  const { orderedTasks, taskGeom } = useMemo(() => {
    const byStart = (a: Task, b: Task) => {
      const av = a.startDate ?? a.dueDate ?? '9999';
      const bv = b.startDate ?? b.dueDate ?? '9999';
      return av < bv ? -1 : av > bv ? 1 : 0;
    };
    const ordered: Task[] = [];
    for (const p of phases) ordered.push(...tasks.filter((t) => t.phaseId === p.id).sort(byStart));
    const phaseIds = new Set(phases.map((p) => p.id));
    ordered.push(...tasks.filter((t) => !t.phaseId || !phaseIds.has(t.phaseId)).sort(byStart));

    const geom = new Map<string, TaskGeom>();
    ordered.forEach((t, i) => {
      const cy = i * (TASK_ROW_HEIGHT + TASK_ROW_GAP) + TASK_ROW_HEIGHT / 2;
      let leftPct: number;
      let rightPct: number;
      if (t.startDate && t.dueDate) {
        leftPct = dateToPercent(t.startDate, window.startMs, window.endMs);
        rightPct = dateToPercent(t.dueDate, window.startMs, window.endMs);
      } else if (t.dueDate) {
        rightPct = dateToPercent(t.dueDate, window.startMs, window.endMs);
        leftPct = Math.max(rightPct - 1, 0);
      } else {
        leftPct = 0;
        rightPct = 5;
      }
      geom.set(t.id, { leftPct, rightPct, cy });
    });
    return { orderedTasks: ordered, taskGeom: geom };
  }, [phases, tasks, window]);

  // Phase-bar geometry (start/end → bar edges; cy at the row center) for the
  // phase dependency arrows. Phases without both dates have no bar → no arrow.
  const phaseGeom = useMemo(() => {
    const geom = new Map<string, TaskGeom>();
    phases.forEach((p, i) => {
      if (!p.startDate || !p.endDate) return;
      geom.set(p.id, {
        leftPct: dateToPercent(p.startDate, window.startMs, window.endMs),
        rightPct: dateToPercent(p.endDate, window.startMs, window.endMs),
        cy: i * (PHASE_ROW_HEIGHT + PHASE_ROW_GAP) + PHASE_ROW_HEIGHT / 2,
      });
    });
    return geom;
  }, [phases, window]);

  // Milestone geometry — single point (leftPct == rightPct) at the pin dot's y.
  const milestoneGeom = useMemo(() => {
    const geom = new Map<string, TaskGeom>();
    for (const m of milestones) {
      if (!m.targetDate) continue;
      const x = dateToPercent(m.targetDate, window.startMs, window.endMs);
      if (x < 0 || x > 100) continue;
      geom.set(m.id, { leftPct: x, rightPct: x, cy: MILESTONE_DOT_CY });
    }
    return geom;
  }, [milestones, window]);

  const taskLaneHeight =
    orderedTasks.length === 0
      ? 0
      : orderedTasks.length * TASK_ROW_HEIGHT + (orderedTasks.length - 1) * TASK_ROW_GAP;

  // Modal state
  const [createPhaseOpen, setCreatePhaseOpen] = useState(false);
  const [editPhase, setEditPhase] = useState<Phase | null>(null);
  const [createMilestoneOpen, setCreateMilestoneOpen] = useState(false);
  const [editMilestone, setEditMilestone] = useState<Milestone | null>(null);

  const noProjects = !projectsLoading && (projects?.length ?? 0) === 0;
  const addDisabledReason = noProjects
    ? 'Create a project first'
    : !projectId
      ? 'Pick a project to add'
      : undefined;

  const handleCreatePhase = async (values: PhaseFormValues) => {
    if (!projectId) return;
    try {
      await createPhase.mutateAsync({
        name: values.name,
        description: values.description || undefined,
        status: values.status,
        startDate: values.startDate || undefined,
        endDate: values.endDate || undefined,
        order: values.order,
      });
      enqueueSnackbar('Phase created.', { variant: 'success' });
      setCreatePhaseOpen(false);
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.error?.message ?? 'Failed to create phase', {
        variant: 'error',
      });
    }
  };

  const handleEditPhase = async (values: PhaseFormValues) => {
    if (!editPhase) return;
    // Client-side cycle guard (backend does not enforce it).
    const deps = values.dependsOnPhaseIds ?? [];
    const cyclic = deps.find((depId) => wouldCreateCycleBy(phases, editPhase.id, depId, (p) => p.dependsOnPhaseIds));
    if (cyclic) {
      const name = phases.find((p) => p.id === cyclic)?.name ?? 'that phase';
      enqueueSnackbar(`"${name}" already depends on this phase — that would create a cycle.`, { variant: 'error' });
      return;
    }
    try {
      await updatePhase.mutateAsync({
        id: editPhase.id,
        payload: {
          name: values.name,
          description: values.description || undefined,
          status: values.status,
          startDate: values.startDate || undefined,
          endDate: values.endDate || undefined,
          order: values.order,
          dependsOnPhaseIds: deps,
        },
      });
      enqueueSnackbar('Phase updated.', { variant: 'success' });
      setEditPhase(null);
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.error?.message ?? 'Failed to update phase', {
        variant: 'error',
      });
    }
  };

  const handleDeletePhase = async () => {
    if (!editPhase) return;
    try {
      await deletePhase.mutateAsync(editPhase.id);
      enqueueSnackbar('Phase deleted.', { variant: 'success' });
      setEditPhase(null);
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.error?.message ?? 'Failed to delete phase', {
        variant: 'error',
      });
    }
  };

  const handleCreateMilestone = async (values: MilestoneFormValues) => {
    if (!projectId) return;
    try {
      await createMilestone.mutateAsync({
        name: values.name,
        description: values.description || undefined,
        status: values.status,
        targetDate: values.targetDate || undefined,
        percentComplete: values.percentComplete,
        phaseId: values.phaseId,
        isMajor: values.isMajor,
      });
      enqueueSnackbar('Milestone created.', { variant: 'success' });
      setCreateMilestoneOpen(false);
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.error?.message ?? 'Failed to create milestone', {
        variant: 'error',
      });
    }
  };

  const handleEditMilestone = async (values: MilestoneFormValues) => {
    if (!editMilestone) return;
    const deps = values.dependsOnMilestoneIds ?? [];
    const cyclic = deps.find((depId) =>
      wouldCreateCycleBy(milestones, editMilestone.id, depId, (m) => m.dependsOnMilestoneIds),
    );
    if (cyclic) {
      const name = milestones.find((m) => m.id === cyclic)?.name ?? 'that milestone';
      enqueueSnackbar(`"${name}" already depends on this milestone — that would create a cycle.`, { variant: 'error' });
      return;
    }
    try {
      await updateMilestone.mutateAsync({
        id: editMilestone.id,
        payload: {
          name: values.name,
          description: values.description || undefined,
          status: values.status,
          targetDate: values.targetDate || undefined,
          percentComplete: values.percentComplete,
          phaseId: values.phaseId,
          isMajor: values.isMajor,
          dependsOnMilestoneIds: deps,
        },
      });
      enqueueSnackbar('Milestone updated.', { variant: 'success' });
      setEditMilestone(null);
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.error?.message ?? 'Failed to update milestone', {
        variant: 'error',
      });
    }
  };

  const handleDeleteMilestone = async () => {
    if (!editMilestone) return;
    try {
      await deleteMilestone.mutateAsync(editMilestone.id);
      enqueueSnackbar('Milestone deleted.', { variant: 'success' });
      setEditMilestone(null);
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.error?.message ?? 'Failed to delete milestone', {
        variant: 'error',
      });
    }
  };

  const phasesAreaHeight =
    phases.length === 0
      ? PHASE_ROW_HEIGHT
      : phases.length * PHASE_ROW_HEIGHT + (phases.length - 1) * PHASE_ROW_GAP;
  const totalTimelineHeight =
    PIN_LANE_HEIGHT + AXIS_HEIGHT + phasesAreaHeight + 16 + (taskLaneHeight ? taskLaneHeight + 32 : 0);
  const isLoading = phasesQuery.isLoading || milestonesQuery.isLoading || tasksQuery.isLoading;
  const isEmpty =
    !isLoading && phases.length === 0 && milestones.length === 0 && orderedTasks.length === 0;

  return (
    <Stack gap={2}>
      {/* Header — project picker + actions */}
      <Stack direction="row" gap={1.5} alignItems="center" flexWrap="wrap">
        <FormControl size="small" sx={{ minWidth: 240 }} disabled={noProjects}>
          <InputLabel id="timeline-project-label">Project</InputLabel>
          <Select
            labelId="timeline-project-label"
            label="Project"
            value={projectId}
            onChange={(e: SelectChangeEvent) => setProjectId(e.target.value)}
          >
            {(projects ?? []).length === 0 && (
              <MenuItem value="" disabled>
                No projects available
              </MenuItem>
            )}
            {(projects ?? []).map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {isLoading && (
          <Stack direction="row" gap={1} alignItems="center" sx={{ color: 'text.secondary' }}>
            <CircularProgress size={16} />
            <Typography variant="caption">Loading…</Typography>
          </Stack>
        )}
        <Box sx={{ ml: 'auto' }}>
          <Stack direction="row" gap={1} alignItems="center">
            <ZoomControls zoom={zoom} onChange={setZoom} />
            <Tooltip
              title={addDisabledReason ?? ''}
              disableHoverListener={!addDisabledReason}
              arrow
            >
              <span>
                <AppButton
                  variant="outlined"
                  startIcon={<FlagIcon />}
                  disabled={!!addDisabledReason}
                  onClick={() => setCreateMilestoneOpen(true)}
                >
                  Add Milestone
                </AppButton>
              </span>
            </Tooltip>
            <Tooltip
              title={addDisabledReason ?? ''}
              disableHoverListener={!addDisabledReason}
              arrow
            >
              <span>
                <AppButton
                  variant="contained"
                  startIcon={<AddIcon />}
                  disabled={!!addDisabledReason}
                  onClick={() => setCreatePhaseOpen(true)}
                >
                  Add Phase
                </AppButton>
              </span>
            </Tooltip>
          </Stack>
        </Box>
      </Stack>

      {/* Timeline */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          overflowX: 'auto',
        }}
      >
        {isEmpty ? (
          <Stack alignItems="center" gap={1.5} py={6} color="text.secondary">
            <TimelineIcon sx={{ fontSize: 40, opacity: 0.5 }} />
            <Typography variant="subtitle1" fontWeight={600} color="text.primary">
              No phases or milestones yet
            </Typography>
            <Typography variant="body2" sx={{ maxWidth: 360, textAlign: 'center' }}>
              Plot the project schedule by adding phases (date ranges) and milestones (single
              dates).
            </Typography>
            <Stack direction="row" gap={1} mt={1}>
              <AppButton
                variant="outlined"
                startIcon={<FlagIcon />}
                onClick={() => setCreateMilestoneOpen(true)}
                disabled={!!addDisabledReason}
              >
                Add Milestone
              </AppButton>
              <AppButton
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setCreatePhaseOpen(true)}
                disabled={!!addDisabledReason}
              >
                Add the first phase
              </AppButton>
            </Stack>
          </Stack>
        ) : (
          <Box
            ref={trackRef}
            sx={{ position: 'relative', minHeight: totalTimelineHeight, minWidth: 720, width: `${zoom * 100}%` }}
          >
            {/* Milestone pin lane (top) */}
            <Box sx={{ position: 'relative', height: PIN_LANE_HEIGHT }}>
              {milestones.map((m) => (
                <MilestonePin
                  key={m.id}
                  milestone={m}
                  window={window}
                  totalHeight={PIN_LANE_HEIGHT + AXIS_HEIGHT + phasesAreaHeight}
                  windowSpanMs={window.endMs - window.startMs}
                  getTrackWidth={getTrackWidth}
                  onClick={(milestone) => setEditMilestone(milestone)}
                  onCommitDate={handleMilestoneDate}
                />
              ))}
              <DependencyLayer
                items={milestones.map((m) => ({ id: m.id, dependsOn: m.dependsOnMilestoneIds ?? [] }))}
                geom={milestoneGeom}
                trackWidthPx={trackWidthPx}
                height={PIN_LANE_HEIGHT}
                markerId="dep-arrow-milestones"
              />
            </Box>

            {/* Quarter axis */}
            <TimelineAxis window={window} />

            {/* Phase rows + dependency arrows */}
            <Box sx={{ position: 'relative', mt: 1 }}>
              <Stack gap={`${PHASE_ROW_GAP}px`}>
                {phases.map((p) => (
                  <PhaseRow
                    key={p.id}
                    phase={p}
                    window={window}
                    windowSpanMs={window.endMs - window.startMs}
                    getTrackWidth={getTrackWidth}
                    onClick={(phase) => setEditPhase(phase)}
                    onCommitDates={handlePhaseDates}
                  />
                ))}
                {phases.length === 0 && (
                  <Box
                    sx={{
                      height: PHASE_ROW_HEIGHT,
                      border: '1px dashed',
                      borderColor: 'divider',
                      borderRadius: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'text.disabled',
                      fontSize: '0.75rem',
                    }}
                  >
                    No phases yet
                  </Box>
                )}
              </Stack>
              {phases.length > 0 && (
                <DependencyLayer
                  items={phases.map((p) => ({ id: p.id, dependsOn: p.dependsOnPhaseIds ?? [] }))}
                  geom={phaseGeom}
                  trackWidthPx={trackWidthPx}
                  height={phasesAreaHeight}
                  markerId="dep-arrow-phases"
                />
              )}
            </Box>

            {/* Task lane — bars grouped by phase order + dependency arrows */}
            {orderedTasks.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 0.6 }}>
                  Tasks
                </Typography>
                <Box sx={{ position: 'relative', mt: 0.5, height: taskLaneHeight }}>
                  <Stack gap={`${TASK_ROW_GAP}px`}>
                    {orderedTasks.map((t) => (
                      <TaskRow
                        key={t.id}
                        task={t}
                        window={window}
                        windowSpanMs={window.endMs - window.startMs}
                        getTrackWidth={getTrackWidth}
                        onOpen={(task) => router.push(`/pm/tasks/${task.id}`)}
                        onCommitDates={handleTaskDates}
                      />
                    ))}
                  </Stack>
                  <DependencyLayer
                    items={orderedTasks.map((t) => ({ id: t.id, dependsOn: t.dependsOnTaskIds ?? [] }))}
                    geom={taskGeom}
                    trackWidthPx={trackWidthPx}
                    height={taskLaneHeight}
                    markerId="dep-arrow-tasks"
                  />
                </Box>
              </Box>
            )}
          </Box>
        )}
      </Paper>

      <CreatePhaseModal
        open={createPhaseOpen}
        isLoading={createPhase.isPending}
        onClose={() => setCreatePhaseOpen(false)}
        onSubmit={handleCreatePhase}
      />
      <EditPhaseModal
        open={!!editPhase}
        phase={editPhase}
        dependencyPhases={phases}
        isLoading={updatePhase.isPending}
        isDeleting={deletePhase.isPending}
        onClose={() => setEditPhase(null)}
        onSubmit={handleEditPhase}
        onDelete={handleDeletePhase}
      />
      <CreateMilestoneModal
        open={createMilestoneOpen}
        phases={phases}
        isLoading={createMilestone.isPending}
        onClose={() => setCreateMilestoneOpen(false)}
        onSubmit={handleCreateMilestone}
      />
      <EditMilestoneModal
        open={!!editMilestone}
        milestone={editMilestone}
        phases={phases}
        dependencyMilestones={milestones}
        isLoading={updateMilestone.isPending}
        isDeleting={deleteMilestone.isPending}
        onClose={() => setEditMilestone(null)}
        onSubmit={handleEditMilestone}
        onDelete={handleDeleteMilestone}
      />
    </Stack>
  );
}
