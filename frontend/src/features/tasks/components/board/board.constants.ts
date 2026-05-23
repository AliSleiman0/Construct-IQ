import type { TaskStatus } from '@/types/task.types';

export interface BoardColumnDef {
  id: TaskStatus;
  label: string;
}

export const BOARD_COLUMNS: ReadonlyArray<BoardColumnDef> = [
  { id: 'TODO', label: 'To Do' },
  { id: 'IN_PREPARATION', label: 'In Preparation' },
  { id: 'IN_PROGRESS', label: 'In Progress' },
  { id: 'BLOCKED', label: 'Blocked' },
  { id: 'REVIEW', label: 'In Review' },
  { id: 'DONE', label: 'Done' },
];

export type BoardColumnId = (typeof BOARD_COLUMNS)[number]['id'];

export const BOARD_COLUMN_IDS = BOARD_COLUMNS.map((c) => c.id) as ReadonlyArray<BoardColumnId>;

export function isBoardColumnId(value: string): value is BoardColumnId {
  return BOARD_COLUMN_IDS.includes(value as BoardColumnId);
}
