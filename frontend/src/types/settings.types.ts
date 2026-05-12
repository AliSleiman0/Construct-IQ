export interface OrgSettings {
  id: string;
  organizationId: string;
  brandColor: string;
  theme: string;
  timezone: string;
  currency: string;
  dateFormat: string;
  weekStart: string;
  measurement: string;
  notifications: Record<string, any>;
  twoFactorRequired: boolean;
  passwordPolicy: string;
  sessionTimeoutMin: number;
  ssoEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateOrgSettingsPayload {
  brandColor?: string;
  theme?: string;
  timezone?: string;
  currency?: string;
  dateFormat?: string;
  weekStart?: string;
  measurement?: string;
  notifications?: Record<string, any>;
  twoFactorRequired?: boolean;
  passwordPolicy?: string;
  sessionTimeoutMin?: number;
  ssoEnabled?: boolean;
}
