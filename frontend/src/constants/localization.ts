import type {
  DateFormat,
  FirstDayOfWeek,
  Language,
  MeasurementSystem,
  TimeFormat,
  UserLocalization,
} from '@/types/user.types';

export const DEFAULT_USER_LOCALIZATION: UserLocalization = {
  language: 'en',
  timezone: 'auto',
  dateFormat: 'MMM D, YYYY',
  timeFormat: '12h',
  firstDayOfWeek: 'sunday',
  measurement: 'imperial',
};

export const LANGUAGE_OPTIONS: Array<{ value: Language; label: string }> = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'French (Français)' },
  { value: 'es', label: 'Spanish (Español)' },
  { value: 'ar', label: 'Arabic (العربية)' },
];

export const TIMEZONE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'auto', label: 'Auto-detect (browser)' },
  { value: 'America/Los_Angeles', label: '(GMT-08:00) Pacific Time — Los Angeles' },
  { value: 'America/Denver', label: '(GMT-07:00) Mountain Time — Denver' },
  { value: 'America/Chicago', label: '(GMT-06:00) Central Time — Chicago' },
  { value: 'America/New_York', label: '(GMT-05:00) Eastern Time — New York' },
  { value: 'Europe/London', label: '(GMT+00:00) London' },
  { value: 'Europe/Berlin', label: '(GMT+01:00) Berlin' },
];

export const DATE_FORMAT_OPTIONS: Array<{ value: DateFormat; label: string }> = [
  { value: 'MMM D, YYYY', label: 'MMM D, YYYY — Jan 15, 2026' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY — 01/15/2026' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY — 15/01/2026' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD — 2026-01-15' },
];

export const TIME_FORMAT_OPTIONS: Array<{ value: TimeFormat; label: string; hint: string }> = [
  { value: '12h', label: '12-hour', hint: 'e.g. 3:45 PM' },
  { value: '24h', label: '24-hour', hint: 'e.g. 15:45' },
];

export const WEEK_START_OPTIONS: Array<{ value: FirstDayOfWeek; label: string }> = [
  { value: 'sunday', label: 'Sunday' },
  { value: 'monday', label: 'Monday' },
  { value: 'saturday', label: 'Saturday' },
];

export const MEASUREMENT_OPTIONS: Array<{
  value: MeasurementSystem;
  label: string;
  hint: string;
}> = [
  { value: 'imperial', label: 'Imperial', hint: 'feet, inches, pounds, °F' },
  { value: 'metric', label: 'Metric', hint: 'meters, kilograms, °C' },
];

/** Resolve a stored timezone string (which may be the literal `'auto'`) to a
 *  concrete IANA zone using the browser's locale. Safe on the server: falls
 *  back to UTC if `Intl` is unavailable. */
export function resolveTimezone(value: string): string {
  if (value !== 'auto') return value;
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';
  } catch {
    return 'UTC';
  }
}
