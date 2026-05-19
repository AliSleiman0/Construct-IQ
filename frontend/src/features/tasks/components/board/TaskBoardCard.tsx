'use client';

import { forwardRef } from 'react';
import {
  Avatar,
  Box,
  Chip,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TaskPriorityChip } from '../TaskPriorityChip';
import type { Task } from '@/types/task.types';

export interface BoardTask extends Task {
  code?: string;
  projectTag?: string;
  phaseTag?: string;
  sprintTag?: string;
}

interface TaskBoardCardProps {
  task: BoardTask;
  isOverlay?: boolean;
  onMenu?: (task: BoardTask, anchor: HTMLElement) => void;
}

function initials(firstName?: string, lastName?: string) {
  const f = firstName?.[0] ?? '';
  const l = lastName?.[0] ?? '';
  return (f + l).toUpperCase() || '?';
}

function shortCode(task: BoardTask): string {
  if (task.code) return task.code;
  return task.id.slice(-6).toUpperCase();
}

interface CardSurfaceProps {
  task: BoardTask;
  isOverlay?: boolean;
  onMenu?: (task: BoardTask, anchor: HTMLElement) => void;
}

const CardSurface = forwardRef<
  HTMLDivElement,
  CardSurfaceProps & React.HTMLAttributes<HTMLDivElement>
>(function CardSurface({ task, isOverlay, onMenu, style, ...rest }, ref) {
  const theme = useTheme();
  const projectTagBg = alpha(
    theme.palette.primary.main,
    theme.palette.mode === 'dark' ? 0.2 : 0.08,
  );
  const projectTagFg =
    theme.palette.mode === 'dark'
      ? theme.palette.primary.light
      : theme.palette.primary.dark;
  const fullName = task.assignedTo
    ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}`
    : 'Unassigned';

  const overlayStyle: React.CSSProperties = isOverlay
    ? { ...style, transform: `${style?.transform ?? ''} scale(1.02)`.trim() }
    : style ?? {};

  return (
    <Paper
      ref={ref}
      {...rest}
      style={overlayStyle}
      elevation={isOverlay ? 8 : 0}
      sx={{
        p: 1.5,
        borderRadius: 1.5,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        cursor: isOverlay ? 'grabbing' : 'grab',
        userSelect: 'none',
        touchAction: 'none',
        transition: 'border-color 120ms ease, box-shadow 120ms ease',
        '&:hover': {
          borderColor: 'primary.light',
        },
      }}
    >
      <Stack gap={1}>
        <Typography
          variant="body2"
          fontWeight={600}
          color="text.primary"
          sx={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            lineHeight: 1.35,
          }}
        >
          {task.title}
        </Typography>

        {task.projectTag && (
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              alignSelf: 'flex-start',
              px: 0.75,
              py: 0.25,
              borderRadius: 0.75,
              bgcolor: projectTagBg,
              color: projectTagFg,
              fontSize: '0.6875rem',
              fontWeight: 600,
              letterSpacing: 0.4,
              textTransform: 'uppercase',
              maxWidth: '100%',
            }}
          >
            <Typography
              component="span"
              sx={{
                fontSize: 'inherit',
                fontWeight: 'inherit',
                letterSpacing: 'inherit',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {task.projectTag}
            </Typography>
          </Box>
        )}

        {(task.sprintTag || task.phaseTag) && (
          <Stack direction="row" gap={0.75} flexWrap="wrap">
            {task.sprintTag && (
              <Chip
                label={task.sprintTag}
                size="small"
                variant="outlined"
                sx={{ height: 22, fontSize: '0.6875rem' }}
              />
            )}
            {task.phaseTag && (
              <Chip
                label={task.phaseTag}
                size="small"
                variant="outlined"
                color="success"
                sx={{ height: 22, fontSize: '0.6875rem' }}
              />
            )}
          </Stack>
        )}

        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          gap={1}
          sx={{ mt: 0.25 }}
        >
          <Typography variant="caption" color="text.secondary" fontWeight={500}>
            {shortCode(task)}
          </Typography>
          <Stack direction="row" alignItems="center" gap={0.5}>
            <TaskPriorityChip priority={task.priority} />
            <Tooltip title={fullName} arrow>
              <Avatar
                src={task.assignedTo?.avatarUrl ?? undefined}
                sx={{
                  width: 24,
                  height: 24,
                  fontSize: '0.6875rem',
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                }}
              >
                {initials(task.assignedTo?.firstName, task.assignedTo?.lastName)}
              </Avatar>
            </Tooltip>
            {onMenu && !isOverlay && (
              <IconButton
                size="small"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onMenu(task, e.currentTarget);
                }}
                aria-label="Task actions"
                sx={{ ml: 0.25, color: 'text.secondary' }}
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
            )}
          </Stack>
        </Stack>
      </Stack>
    </Paper>
  );
});

export function TaskBoardCard({ task, isOverlay = false, onMenu }: TaskBoardCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  if (isOverlay) {
    return <CardSurface task={task} isOverlay />;
  }

  if (isDragging) {
    return (
      <Box
        ref={setNodeRef}
        style={{
          transform: CSS.Transform.toString(transform),
          transition,
        }}
        sx={{
          minHeight: 110,
          borderRadius: 1.5,
          border: '1px dashed',
          borderColor: 'primary.light',
          bgcolor: (t) => alpha(t.palette.primary.main, 0.04),
        }}
      />
    );
  }

  return (
    <CardSurface
      ref={setNodeRef}
      task={task}
      onMenu={onMenu}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      {...attributes}
      {...listeners}
    />
  );
}
