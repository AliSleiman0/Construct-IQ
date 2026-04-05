export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface UserRole {
  role: { id: string; name: string };
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  avatarUrl?: string | null;
  status: UserStatus;
  organizationId: string;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
  userRoles: UserRole[];
}

export interface Role {
  id: string;
  name: string;
  description?: string | null;
}

export interface CreateUserPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roleId: string;
  phone?: string;
  status?: UserStatus;
}

export interface UpdateUserPayload {
  firstName?: string;
  lastName?: string;
  phone?: string;
  status?: UserStatus;
}
