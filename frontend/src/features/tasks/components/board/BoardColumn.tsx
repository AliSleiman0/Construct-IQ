'use client';

import { Box, Button, Paper, Stack, Tooltip, Typography, alpha, useTheme } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { TaskBoardCard, type BoardTask } from './TaskBoardCard';
import type { BoardColumnId } from './board.constants';

interface BoardColumnProps {
  id: BoardColumnId;
  label: string;
  tasks: BoardTask[];
  onAddTask?: (columnId: BoardColumnId) => void;
  addDisabledReason?: string;
  onCardMenu?: (task: BoardTask, anchor: HTMLElement) => void;
}

export function BoardColumn({ id, label, tasks, onAddTask, addDisabledReason, onCardMenu }: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const theme = useTheme();
  const taskIds = tasks.map((t) => t.id);

  const overTint = alpha(
    theme.palette.primary.main,
    theme.palette.mode === 'dark' ? 0.08 : 0.04,
  );

  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.5,
        borderRadius: 2,
        border: '1px solid',
        borderColor: isOver ? 'primary.main' : 'divider',
        bgcolor: isOver ? overTint : 'background.default',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: 'calc(100vh - 240px)',
        minHeight: 200,
        transition: 'border-color 120ms ease, background-color 120ms ease',
      }}
    >
      <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1.5, px: 0.5 }}>
        <Typography
          variant="caption"
          color="text.secondary"
          fontWeight={700}
          sx={{ textTransform: 'uppercase', letterSpacing: 0.6 }}
        >
          {label}
        </Typography>
        <Box
          sx={{
            minWidth: 22,
            height: 20,
            px: 0.75,
            borderRadius: 1,
            bgcolor: 'action.selected',
            color: 'text.secondary',
            fontSize: '0.6875rem',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {tasks.length}
        </Box>
      </Stack>

      <Box
        ref={setNodeRef}
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          minHeight: 120,
          overflowY: 'auto',
          pr: 0.5,
        }}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskBoardCard key={task.id} task={task} onMenu={onCardMenu} />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <Box
            sx={{
              flex: 1,
              minHeight: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px dashed',
              borderColor: 'divider',
              borderRadius: 1.5,
              color: 'text.disabled',
              fontSize: '0.75rem',
            }}
          >
            No tasks
          </Box>
        )}
        {onAddTask && (
          <Tooltip title={addDisabledReason ?? ''} disableHoverListener={!addDisabledReason} arrow>
            <span>
              <Button
                fullWidth
                size="small"
                variant="text"
                color="inherit"
                startIcon={<AddIcon fontSize="small" />}
                onClick={() => onAddTask(id)}
                disabled={!!addDisabledReason}
                sx={{
                  mt: 0.5,
                  justifyContent: 'flex-start',
                  textTransform: 'none',
                  color: 'text.secondary',
                  fontWeight: 500,
                  '&:hover': {
                    bgcolor: 'action.hover',
                    color: 'text.primary',
                  },
                }}
              >
                Add task
              </Button>
            </span>
          </Tooltip>
        )}
      </Box>
    </Paper>
  );
}
