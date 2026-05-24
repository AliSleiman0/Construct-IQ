export type TaskStatus =
  | 'TODO'
  | 'IN_PREPARATION'
  | 'IN_PROGRESS'
  | 'BLOCKED'
  | 'REVIEW'
  | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface TaskUserRef {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
}

export interface TaskComment {
  id: string;
  authorId: string | null;
  author?: TaskUserRef | null;
  body: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  projectId: string;
  assignedToId?: string | null;
  dueDate?: string | null;
  position?: number;
  comments?: TaskComment[];
  createdAt: string;
  updatedAt: string;
  assignedTo?: TaskUserRef | null;
}

export interface CreateTaskPayload {
  projectId: string;
  title: string;
  description?: string;
  assignedToId?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  dueDate?: string;
}

export type UpdateTaskPayload = Partial<Omit<CreateTaskPayload, 'projectId'>>;
