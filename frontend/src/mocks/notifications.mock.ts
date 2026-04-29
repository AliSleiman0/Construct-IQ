export type NotificationKind = 'info' | 'warning' | 'success' | 'error';

export interface MockNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  /** ISO timestamp */
  createdAt: string;
  read: boolean;
}

export const mockNotifications: MockNotification[] = [
  {
    id: 'n-1',
    kind: 'warning',
    title: 'Concrete pour delay',
    body: 'Tower Heights — Phase 3 deck B pour pushed to tomorrow.',
    createdAt: '2026-04-28T07:15:00.000Z',
    read: false,
  },
  {
    id: 'n-2',
    kind: 'info',
    title: 'New ticket assigned',
    body: 'Sam Chen assigned you ticket #TIQ-1042: "Login redirect loop".',
    createdAt: '2026-04-28T06:40:00.000Z',
    read: false,
  },
  {
    id: 'n-3',
    kind: 'success',
    title: 'Inspection passed',
    body: 'Zone 4 rebar inspection signed off by city inspector.',
    createdAt: '2026-04-27T18:05:00.000Z',
    read: false,
  },
  {
    id: 'n-4',
    kind: 'info',
    title: 'Payment received',
    body: 'Carlos Rivera — Tower Heights Unit 12B installment 4 of 12.',
    createdAt: '2026-04-27T14:22:00.000Z',
    read: true,
  },
  {
    id: 'n-5',
    kind: 'error',
    title: 'Subcontractor no-show',
    body: 'Electrical crew missed Phase 3 window. Schedule impact: 1 day.',
    createdAt: '2026-04-26T09:00:00.000Z',
    read: true,
  },
];
