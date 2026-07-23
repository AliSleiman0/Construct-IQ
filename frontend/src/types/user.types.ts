export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface UserRole {
  role: { id: string; name: string };
}

export type Language = 'en' | 'fr' | 'es' | 'ar';
export type DateFormat =
  | 'MMM D, YYYY'
  | 'MM/DD/YYYY'
  | 'DD/MM/YYYY'
  | 'YYYY-MM-DD';
export type TimeFormat = '12h' | '24h';
export type FirstDayOfWeek = 'sunday' | 'monday' | 'saturday';
export type MeasurementSystem = 'imperial' | 'metric';

export interface UserLocalization {
  language: Language;
  /** IANA timezone or the literal `'auto'` (resolved on the client). */
  timezone: string;
  dateFormat: DateFormat;
  timeFormat: TimeFormat;
  firstDayOfWeek: FirstDayOfWeek;
  measurement: MeasurementSystem;
}

export type DigestCadence = 'daily' | 'weekly' | 'never';

/** Per-event opt-out toggles. `true` = "I want this email".
 *  Security alerts are intentionally absent — they always deliver. */
export interface UserNotificationPreferences {
  digest: DigestCadence;
  newProject: boolean;
  invoiceDue: boolean;
  invoicePaid: boolean;
  ticketUpdate: boolean;
  productNews: boolean;
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
  localization: UserLocalization;
  notifications: UserNotificationPreferences;
  userRoles: UserRole[];
}

export interface Role {
  id: string;
  name: string;
  description?: string | null;
  /** Present on the /users/roles listing — the grants that define the role. */
  permissionKeys?: string[];
  isSystem?: boolean;
  userCount?: number;
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

export interface UpdateMyProfilePayload {
  localization?: Partial<UserLocalization>;
  notifications?: Partial<UserNotificationPreferences>;
}

export interface CreateOrgAdminPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  organizationId: string;
}
