import type {
  DigestCadence,
  UserNotificationPreferences,
} from '@/types/user.types';

export const DEFAULT_USER_NOTIFICATIONS: UserNotificationPreferences = {
  digest: 'weekly',
  newProject: true,
  invoiceDue: true,
  invoicePaid: true,
  ticketUpdate: true,
  productNews: false,
};

export const DIGEST_OPTIONS: Array<{
  value: DigestCadence;
  label: string;
  hint: string;
}> = [
  { value: 'daily', label: 'Daily', hint: 'Sent at 8:00 AM in your timezone' },
  { value: 'weekly', label: 'Weekly', hint: 'Sent Monday morning' },
  { value: 'never', label: 'Never', hint: 'No periodic summaries' },
];

/** Per-event toggle metadata. Keys must match the
 *  `UserNotificationPreferences` interface field names. Security alerts are
 *  intentionally excluded — they always deliver. */
export const EVENT_TOGGLES: Array<{
  key: Exclude<keyof UserNotificationPreferences, 'digest'>;
  label: string;
  hint: string;
}> = [
  {
    key: 'newProject',
    label: 'New project created',
    hint: 'When a Project Manager creates a new project in your organization',
  },
  {
    key: 'invoiceDue',
    label: 'Invoice due soon',
    hint: 'Three days before an invoice is due',
  },
  {
    key: 'invoicePaid',
    label: 'Invoice paid',
    hint: 'When an invoice is successfully charged',
  },
  {
    key: 'ticketUpdate',
    label: 'Support ticket updates',
    hint: 'When a ticket you reported gets a new reply',
  },
  {
    key: 'productNews',
    label: 'Product news',
    hint: 'Major releases, new features, and platform updates',
  },
];
