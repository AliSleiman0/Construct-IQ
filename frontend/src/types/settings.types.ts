export interface OrgSettings {
  id: string;
  organizationId: string;
  brandColor: string;
  theme: string;
  emailSender?: string | null;
  timezone: string;
  currency: string;
  dateFormat: string;
  weekStart: string;
  measurement: string;
  notifications: Record<string, any>;
  twoFactorRequired: boolean;
  passwordPolicy: string;
  sessionTimeoutMin: number;
  lockoutMaxAttempts: number;
  lockoutDurationMin: number;
  allowedIps: string[];
  createdAt: string;
  updatedAt: string;
}

export interface UpdateOrgSettingsPayload {
  brandColor?: string;
  theme?: string;
  emailSender?: string | null;
  timezone?: string;
  currency?: string;
  dateFormat?: string;
  weekStart?: string;
  measurement?: string;
  notifications?: Record<string, any>;
  twoFactorRequired?: boolean;
  passwordPolicy?: string;
  sessionTimeoutMin?: number;
  lockoutMaxAttempts?: number;
  lockoutDurationMin?: number;
  allowedIps?: string[];
}
