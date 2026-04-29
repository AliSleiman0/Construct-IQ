export type MilestoneStatus = 'DONE' | 'IN_PROGRESS' | 'UPCOMING';

export interface MockMilestone {
  id: string;
  label: string;
  description: string;
  scheduledDate: string;     // ISO
  completedDate: string | null;
  status: MilestoneStatus;
  percentComplete: number;
}

export interface MockProgressPhoto {
  id: string;
  url: string;
  caption: string;
  takenAt: string;
}

export const mockMilestones: MockMilestone[] = [
  {
    id: 'm-1',
    label: 'Site preparation',
    description: 'Excavation, utilities relocation, hoarding installed.',
    scheduledDate: '2025-09-01T00:00:00.000Z',
    completedDate: '2025-09-04T00:00:00.000Z',
    status: 'DONE',
    percentComplete: 100,
  },
  {
    id: 'm-2',
    label: 'Foundation',
    description: 'Mat foundation poured, basement walls complete.',
    scheduledDate: '2025-12-15T00:00:00.000Z',
    completedDate: '2025-12-12T00:00:00.000Z',
    status: 'DONE',
    percentComplete: 100,
  },
  {
    id: 'm-3',
    label: 'Structural frame',
    description: 'Reinforced concrete columns + slabs to floor 12.',
    scheduledDate: '2026-03-30T00:00:00.000Z',
    completedDate: '2026-03-28T00:00:00.000Z',
    status: 'DONE',
    percentComplete: 100,
  },
  {
    id: 'm-4',
    label: 'Building envelope',
    description: 'Curtain wall, roofing, weather-tight.',
    scheduledDate: '2026-07-12T00:00:00.000Z',
    completedDate: null,
    status: 'IN_PROGRESS',
    percentComplete: 78,
  },
  {
    id: 'm-5',
    label: 'MEP rough-in',
    description: 'Mechanical, electrical, plumbing in walls and ceilings.',
    scheduledDate: '2026-09-30T00:00:00.000Z',
    completedDate: null,
    status: 'IN_PROGRESS',
    percentComplete: 32,
  },
  {
    id: 'm-6',
    label: 'Interior finishes',
    description: 'Drywall, paint, flooring, cabinetry, fixtures.',
    scheduledDate: '2027-01-31T00:00:00.000Z',
    completedDate: null,
    status: 'UPCOMING',
    percentComplete: 0,
  },
  {
    id: 'm-7',
    label: 'Common-area completion',
    description: 'Lobby, amenities, landscaping.',
    scheduledDate: '2027-03-15T00:00:00.000Z',
    completedDate: null,
    status: 'UPCOMING',
    percentComplete: 0,
  },
  {
    id: 'm-8',
    label: 'Handover',
    description: 'Final inspection and unit keys delivered to buyers.',
    scheduledDate: '2027-04-30T00:00:00.000Z',
    completedDate: null,
    status: 'UPCOMING',
    percentComplete: 0,
  },
];

export const mockProgressPhotos: MockProgressPhoto[] = [
  {
    id: 'ph-1',
    url: 'https://picsum.photos/seed/site-1/800/520',
    caption: 'Site prep — excavation underway',
    takenAt: '2025-09-02T14:00:00.000Z',
  },
  {
    id: 'ph-2',
    url: 'https://picsum.photos/seed/site-2/800/520',
    caption: 'Mat foundation pour — 320 cubic yards',
    takenAt: '2025-11-18T11:00:00.000Z',
  },
  {
    id: 'ph-3',
    url: 'https://picsum.photos/seed/site-3/800/520',
    caption: 'Floor 6 slab — ahead of schedule',
    takenAt: '2026-01-22T09:30:00.000Z',
  },
  {
    id: 'ph-4',
    url: 'https://picsum.photos/seed/site-4/800/520',
    caption: 'Topping out — floor 12 reached',
    takenAt: '2026-03-28T16:00:00.000Z',
  },
  {
    id: 'ph-5',
    url: 'https://picsum.photos/seed/site-5/800/520',
    caption: 'Curtain wall installation — east elevation',
    takenAt: '2026-04-19T10:15:00.000Z',
  },
  {
    id: 'ph-6',
    url: 'https://picsum.photos/seed/site-6/800/520',
    caption: 'MEP rough-in — floor 8',
    takenAt: '2026-04-25T13:40:00.000Z',
  },
];
