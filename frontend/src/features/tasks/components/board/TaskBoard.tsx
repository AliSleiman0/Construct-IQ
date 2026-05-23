'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  CircularProgress,
  FormControl,
  InputLabel,
  Menu,
  MenuItem,
  Select,
  Stack,
  Tooltip,
  Typography,
  type SelectChangeEvent,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  defaultDropAnimationSideEffects,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type DropAnimation,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useSnackbar } from 'notistack';
import { BoardColumn } from './BoardColumn';
import { TaskBoardCard, type BoardTask } from './TaskBoardCard';
import {
  BOARD_COLUMNS,
  BOARD_COLUMN_IDS,
  isBoardColumnId,
  type BoardColumnId,
} from './board.constants';
import { CreateTaskModal, EditTaskModal, type TaskFormValues } from '../TaskModals';
import { AppModal } from '@/components/ui/AppModal';
import { AppButton } from '@/components/ui/AppButton';
import { useTasks } from '../../hooks/useTasks';
import {
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useReorderTasks,
} from '../../hooks/useTaskMutations';
import { useProjects } from '@/features/projects/hooks/useProjects';
import { useUsers } from '@/features/users/hooks/useUsers';
import type { Task, TaskStatus } from '@/types/task.types';

type TasksByColumn = Record<BoardColumnId, BoardTask[]>;

const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: { active: { opacity: '0.4' } },
  }),
  duration: 220,
  easing: 'cubic-bezier(0.2, 0, 0, 1)',
};

function emptyByColumn(): TasksByColumn {
  return BOARD_COLUMN_IDS.reduce<TasksByColumn>((acc, id) => {
    acc[id] = [];
    return acc;
  }, {} as TasksByColumn);
}

function groupByColumn(tasks: BoardTask[]): TasksByColumn {
  const grouped = emptyByColumn();
  for (const t of tasks) {
    if (isBoardColumnId(t.status)) {
      grouped[t.status].push(t);
    }
  }
  return grouped;
}

function findColumnOfTask(state: TasksByColumn, taskId: string): BoardColumnId | null {
  for (const col of BOARD_COLUMN_IDS) {
    if (state[col].some((t) => t.id === taskId)) return col;
  }
  return null;
}

export function TaskBoard() {
  const { enqueueSnackbar } = useSnackbar();
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const [projectFilter, setProjectFilter] = useState<string>('');
  const { data: tasks, isLoading: tasksLoading } = useTasks({
    projectId: projectFilter || undefined,
  });
  const { data: users } = useUsers();
  const createMutation = useCreateTask();
  const updateMutation = useUpdateTask();
  const deleteMutation = useDeleteTask();
  const reorderMutation = useReorderTasks();

  // Default to the first project once the project list resolves.
  useEffect(() => {
    if (projectFilter) return;
    if (projects && projects.length > 0) {
      setProjectFilter(projects[0].id);
    }
  }, [projects, projectFilter]);
  const [tasksByColumn, setTasksByColumn] = useState<TasksByColumn>(emptyByColumn);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [createPrefill, setCreatePrefill] = useState<{ status: BoardColumnId } | null>(
    null,
  );
  const [editTarget, setEditTarget] = useState<BoardTask | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BoardTask | null>(null);
  const [menu, setMenu] = useState<{ task: BoardTask; anchor: HTMLElement } | null>(
    null,
  );

  const preDragSnapshot = useRef<TasksByColumn | null>(null);

  const projectNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of projects ?? []) map.set(p.id, p.name);
    return map;
  }, [projects]);

  const userById = useMemo(() => {
    const map = new Map<string, { id: string; firstName: string; lastName: string; avatarUrl?: string | null }>();
    for (const u of users ?? []) {
      map.set(u.id, {
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        avatarUrl: u.avatarUrl ?? null,
      });
    }
    return map;
  }, [users]);

  const enrichedTasks = useMemo<BoardTask[]>(() => {
    const list = tasks ?? [];
    return list.map((t) => {
      const assignedTo = t.assignedToId
        ? userById.get(t.assignedToId) ?? t.assignedTo ?? null
        : null;
      const projectTag = projectNameById.get(t.projectId);
      return {
        ...t,
        assignedTo,
        projectTag,
      };
    });
  }, [tasks, projectNameById, userById]);

  // Sync local drag-state mirror from server data — but never mid-drag.
  useEffect(() => {
    if (activeId !== null) return;
    setTasksByColumn(groupByColumn(enrichedTasks));
  }, [enrichedTasks, activeId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const projectOptions = useMemo(() => projects ?? [], [projects]);

  const activeTask = useMemo<BoardTask | null>(() => {
    if (!activeId) return null;
    for (const col of BOARD_COLUMN_IDS) {
      const found = tasksByColumn[col].find((t) => t.id === activeId);
      if (found) return found;
    }
    return null;
  }, [activeId, tasksByColumn]);

  const getTaskTitle = useCallback(
    (id: UniqueIdentifier | undefined): string => {
      if (!id) return 'task';
      const idStr = String(id);
      for (const col of BOARD_COLUMN_IDS) {
        const found = tasksByColumn[col].find((t) => t.id === idStr);
        if (found) return found.title;
      }
      return idStr;
    },
    [tasksByColumn],
  );

  const getColumnLabel = useCallback(
    (id: UniqueIdentifier | undefined): string => {
      if (!id) return 'board';
      const idStr = String(id);
      if (isBoardColumnId(idStr)) {
        return BOARD_COLUMNS.find((c) => c.id === idStr)?.label ?? idStr;
      }
      const col = findColumnOfTask(tasksByColumn, idStr);
      return col ? BOARD_COLUMNS.find((c) => c.id === col)?.label ?? col : 'board';
    },
    [tasksByColumn],
  );

  const announcements = useMemo<Announcements>(
    () => ({
      onDragStart: ({ active }) => `Picked up task ${getTaskTitle(active.id)}.`,
      onDragOver: ({ active, over }) =>
        over
          ? `Task ${getTaskTitle(active.id)} is over ${getColumnLabel(over.id)}.`
          : '',
      onDragEnd: ({ active, over }) =>
        over
          ? `Task ${getTaskTitle(active.id)} dropped into ${getColumnLabel(over.id)}.`
          : `Task ${getTaskTitle(active.id)} dropped.`,
      onDragCancel: ({ active }) => `Move cancelled for ${getTaskTitle(active.id)}.`,
    }),
    [getTaskTitle, getColumnLabel],
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
    preDragSnapshot.current = tasksByColumn;
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);
    if (activeIdStr === overIdStr) return;

    setTasksByColumn((prev) => {
      const sourceCol = findColumnOfTask(prev, activeIdStr);
      if (!sourceCol) return prev;
      const destCol: BoardColumnId | null = isBoardColumnId(overIdStr)
        ? overIdStr
        : findColumnOfTask(prev, overIdStr);
      if (!destCol) return prev;

      if (sourceCol === destCol) {
        const list = prev[sourceCol];
        const fromIdx = list.findIndex((t) => t.id === activeIdStr);
        const toIdx = list.findIndex((t) => t.id === overIdStr);
        if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return prev;
        return { ...prev, [sourceCol]: arrayMove(list, fromIdx, toIdx) };
      }

      const sourceList = [...prev[sourceCol]];
      const destList = [...prev[destCol]];
      const movingIdx = sourceList.findIndex((t) => t.id === activeIdStr);
      if (movingIdx === -1) return prev;
      const [moving] = sourceList.splice(movingIdx, 1);
      const movedTask: BoardTask = { ...moving, status: destCol };

      if (isBoardColumnId(overIdStr)) {
        destList.push(movedTask);
      } else {
        const overIdx = destList.findIndex((t) => t.id === overIdStr);
        const insertAt = overIdx === -1 ? destList.length : overIdx;
        destList.splice(insertAt, 0, movedTask);
      }

      return { ...prev, [sourceCol]: sourceList, [destCol]: destList };
    });
  }

  async function handleDragEnd(_event: DragEndEvent) {
    const wasActive = activeId;
    const snapshot = preDragSnapshot.current;
    setActiveId(null);
    preDragSnapshot.current = null;
    if (!wasActive || !snapshot) return;

    const originalCol = findColumnOfTask(snapshot, wasActive);
    const newCol = findColumnOfTask(tasksByColumn, wasActive);
    if (!originalCol || !newCol) return;

    // The destination column's local order is final after handleDragOver — persist it.
    // One call covers both an in-column reorder and a cross-column drop (the moved card's
    // status is set server-side from `status`).
    const destIds = tasksByColumn[newCol].map((t) => t.id);
    const prevIds = snapshot[newCol].map((t) => t.id);
    const unchanged =
      originalCol === newCol &&
      destIds.length === prevIds.length &&
      destIds.every((id, i) => id === prevIds[i]);
    if (unchanged) return;

    try {
      await reorderMutation.mutateAsync({ status: newCol as TaskStatus, taskIds: destIds });
    } catch (err: any) {
      setTasksByColumn(snapshot);
      const msg = err?.response?.data?.error?.message ?? "Couldn't update task";
      enqueueSnackbar(msg, { variant: 'error' });
    }
  }

  function handleDragCancel() {
    if (preDragSnapshot.current) {
      setTasksByColumn(preDragSnapshot.current);
    }
    setActiveId(null);
    preDragSnapshot.current = null;
  }

  const handleAddTask = (columnId: BoardColumnId) => {
    setCreatePrefill({ status: columnId });
  };

  const handleCardMenu = (task: BoardTask, anchor: HTMLElement) => {
    setMenu({ task, anchor });
  };

  const closeMenu = () => setMenu(null);

  const openEdit = () => {
    if (menu) setEditTarget(menu.task);
    closeMenu();
  };
  const openDelete = () => {
    if (menu) setDeleteTarget(menu.task);
    closeMenu();
  };

  const handleCreateSubmit = async (values: TaskFormValues) => {
    if (!projectFilter) {
      enqueueSnackbar('Pick a project before creating a task.', { variant: 'warning' });
      return;
    }
    try {
      await createMutation.mutateAsync({
        projectId: projectFilter,
        title: values.title,
        description: values.description || undefined,
        status: values.status,
        priority: values.priority,
        assignedToId: values.assignedToId,
        dueDate: values.dueDate || undefined,
      });
      enqueueSnackbar('Task created.', { variant: 'success' });
      setCreatePrefill(null);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message ?? 'Failed to create task';
      enqueueSnackbar(msg, { variant: 'error' });
    }
  };

  const handleEditSubmit = async (values: TaskFormValues) => {
    if (!editTarget) return;
    try {
      await updateMutation.mutateAsync({
        id: editTarget.id,
        payload: {
          title: values.title,
          description: values.description || undefined,
          status: values.status,
          priority: values.priority,
          assignedToId: values.assignedToId,
          dueDate: values.dueDate || undefined,
        },
      });
      enqueueSnackbar('Task updated.', { variant: 'success' });
      setEditTarget(null);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message ?? 'Failed to update task';
      enqueueSnackbar(msg, { variant: 'error' });
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      enqueueSnackbar('Task deleted.', { variant: 'success' });
      setDeleteTarget(null);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message ?? 'Failed to delete task';
      enqueueSnackbar(msg, { variant: 'error' });
    }
  };

  const noProjects = !projectsLoading && (projects?.length ?? 0) === 0;
  const addDisabledReason = noProjects
    ? 'Create a project first'
    : !projectFilter
      ? 'Pick a project to add tasks'
      : undefined;

  return (
    <Stack gap={2}>
      <Stack direction="row" gap={1.5} alignItems="center" flexWrap="wrap">
        <FormControl size="small" sx={{ minWidth: 240 }} disabled={noProjects}>
          <InputLabel id="board-project-filter-label">Project</InputLabel>
          <Select
            labelId="board-project-filter-label"
            label="Project"
            value={projectFilter}
            onChange={(e: SelectChangeEvent) => setProjectFilter(e.target.value)}
          >
            {projectOptions.length === 0 && (
              <MenuItem value="" disabled>
                No projects available
              </MenuItem>
            )}
            {projectOptions.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {tasksLoading && (
          <Stack direction="row" gap={1} alignItems="center" sx={{ color: 'text.secondary' }}>
            <CircularProgress size={16} />
            <Typography variant="caption">Loading tasks…</Typography>
          </Stack>
        )}
        <Box sx={{ ml: 'auto' }}>
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
                onClick={() => setCreatePrefill({ status: 'TODO' })}
              >
                Add Task
              </AppButton>
            </span>
          </Tooltip>
        </Box>
      </Stack>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        accessibility={{ announcements }}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: `repeat(${BOARD_COLUMNS.length}, minmax(280px, 1fr))`,
            gap: 2,
            overflowX: 'auto',
            pb: 1,
            alignItems: 'flex-start',
          }}
        >
          {BOARD_COLUMNS.map((col) => (
            <BoardColumn
              key={col.id}
              id={col.id}
              label={col.label}
              tasks={tasksByColumn[col.id]}
              onAddTask={handleAddTask}
              addDisabledReason={addDisabledReason}
              onCardMenu={handleCardMenu}
            />
          ))}
        </Box>

        <DragOverlay dropAnimation={dropAnimation}>
          {activeTask ? <TaskBoardCard task={activeTask} isOverlay /> : null}
        </DragOverlay>
      </DndContext>

      <Menu anchorEl={menu?.anchor ?? null} open={!!menu} onClose={closeMenu}>
        <MenuItem onClick={openEdit}>Edit</MenuItem>
        <MenuItem onClick={openDelete} sx={{ color: 'error.main' }}>
          Delete
        </MenuItem>
      </Menu>

      <CreateTaskModal
        open={!!createPrefill}
        isLoading={createMutation.isPending}
        defaultStatus={createPrefill?.status ?? 'TODO'}
        onClose={() => setCreatePrefill(null)}
        onSubmit={handleCreateSubmit}
      />

      <EditTaskModal
        open={!!editTarget}
        task={(editTarget as Task | null) ?? null}
        isLoading={updateMutation.isPending}
        onClose={() => setEditTarget(null)}
        onSubmit={handleEditSubmit}
      />

      <AppModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete task?"
        actions={
          <Stack direction="row" spacing={1} justifyContent="flex-end" p={2} pt={0}>
            <AppButton
              variant="outlined"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </AppButton>
            <AppButton
              variant="contained"
              color="error"
              loading={deleteMutation.isPending}
              onClick={confirmDelete}
            >
              Delete
            </AppButton>
          </Stack>
        }
      >
        <Box px={3} pb={1}>
          <Typography variant="body2" color="text.secondary">
            This will remove <strong>{deleteTarget?.title}</strong>. You can&apos;t undo this from the UI.
          </Typography>
        </Box>
      </AppModal>
    </Stack>
  );
}
