export type Weather = 'SUNNY' | 'CLOUDY' | 'RAIN' | 'WINDY' | 'STORM';

export interface MockManpower {
  trade: string;
  count: number;
}

export interface MockEquipment {
  name: string;
  hours: number;
}

export interface MockDailyReport {
  id: string;
  reportDate: string;        // YYYY-MM-DD
  projectId: string;
  projectName: string;
  authorId: string;
  authorName: string;
  weather: Weather;
  highTempF: number;
  lowTempF: number;
  manpower: MockManpower[];
  equipment: MockEquipment[];
  workCompleted: string;
  blockers: string;
  notes: string;
  createdAt: string;
}

const PROJECT = { id: 'proj-tower-heights', name: 'Tower Heights' };

const SAMPLE_REPORTS: Omit<MockDailyReport, 'id' | 'createdAt'>[] = [
  {
    reportDate: '2026-04-27',
    projectId: PROJECT.id,
    projectName: PROJECT.name,
    authorId: 'user-site-eng',
    authorName: 'Sebastian Diaz',
    weather: 'SUNNY',
    highTempF: 76,
    lowTempF: 58,
    manpower: [
      { trade: 'Concrete', count: 12 },
      { trade: 'Steel', count: 6 },
      { trade: 'Electrical', count: 4 },
      { trade: 'Plumbing', count: 4 },
    ],
    equipment: [
      { name: 'Tower Crane #1', hours: 9 },
      { name: 'Concrete Pump', hours: 5.5 },
      { name: 'Generator (250 kVA)', hours: 9 },
    ],
    workCompleted:
      'Floor 11 deck pour completed (180 cy). Curtain wall panels installed on east elevation, levels 7–9.',
    blockers: '',
    notes: 'On schedule. Pour quality good per inspector spot-check.',
  },
  {
    reportDate: '2026-04-26',
    projectId: PROJECT.id,
    projectName: PROJECT.name,
    authorId: 'user-site-eng',
    authorName: 'Sebastian Diaz',
    weather: 'CLOUDY',
    highTempF: 68,
    lowTempF: 54,
    manpower: [
      { trade: 'Concrete', count: 10 },
      { trade: 'Steel', count: 6 },
      { trade: 'MEP', count: 8 },
    ],
    equipment: [
      { name: 'Tower Crane #1', hours: 8 },
      { name: 'Generator (250 kVA)', hours: 8 },
    ],
    workCompleted:
      'Rebar tying for floor 11 deck. MEP rough-in continued on floor 8 — about 60% complete.',
    blockers: 'Electrical sub crew arrived 1 hour late.',
    notes: 'Made up the time before shift end.',
  },
  {
    reportDate: '2026-04-25',
    projectId: PROJECT.id,
    projectName: PROJECT.name,
    authorId: 'user-site-eng',
    authorName: 'Sebastian Diaz',
    weather: 'RAIN',
    highTempF: 61,
    lowTempF: 49,
    manpower: [
      { trade: 'Concrete', count: 4 },
      { trade: 'Steel', count: 2 },
      { trade: 'MEP', count: 6 },
    ],
    equipment: [{ name: 'Generator (250 kVA)', hours: 6 }],
    workCompleted:
      'Outdoor work paused mid-morning. MEP rough-in on floor 8 continued indoors. Site cleanup in PM.',
    blockers: 'Heavy rain stopped exterior work for ~5 hours.',
    notes: 'No safety incidents. Forecast clearing tomorrow.',
  },
  {
    reportDate: '2026-04-24',
    projectId: PROJECT.id,
    projectName: PROJECT.name,
    authorId: 'user-site-eng',
    authorName: 'Sebastian Diaz',
    weather: 'WINDY',
    highTempF: 65,
    lowTempF: 50,
    manpower: [
      { trade: 'Concrete', count: 8 },
      { trade: 'Steel', count: 5 },
      { trade: 'Curtain Wall', count: 6 },
    ],
    equipment: [
      { name: 'Tower Crane #1', hours: 6 },
      { name: 'Concrete Pump', hours: 4 },
    ],
    workCompleted: 'Curtain wall panels lifted to levels 7–8. Crane operations limited by gusts.',
    blockers: 'Crane stand-down for 1.5 hrs in afternoon (30 mph gusts).',
    notes: 'Used downtime for safety briefing.',
  },
  {
    reportDate: '2026-04-23',
    projectId: PROJECT.id,
    projectName: PROJECT.name,
    authorId: 'user-site-eng',
    authorName: 'Sebastian Diaz',
    weather: 'SUNNY',
    highTempF: 78,
    lowTempF: 60,
    manpower: [
      { trade: 'Concrete', count: 12 },
      { trade: 'Steel', count: 6 },
      { trade: 'Electrical', count: 5 },
      { trade: 'Plumbing', count: 4 },
    ],
    equipment: [
      { name: 'Tower Crane #1', hours: 9 },
      { name: 'Concrete Pump', hours: 6 },
    ],
    workCompleted: 'Floor 10 pour complete. Curtain wall continued on east elevation.',
    blockers: '',
    notes: 'Inspector signed off on rebar Zone 4.',
  },
  {
    reportDate: '2026-04-22',
    projectId: PROJECT.id,
    projectName: PROJECT.name,
    authorId: 'user-site-eng',
    authorName: 'Sebastian Diaz',
    weather: 'SUNNY',
    highTempF: 80,
    lowTempF: 62,
    manpower: [
      { trade: 'Concrete', count: 10 },
      { trade: 'Steel', count: 7 },
    ],
    equipment: [{ name: 'Tower Crane #1', hours: 9 }],
    workCompleted: 'Rebar tying complete on floor 10 deck. Pour scheduled tomorrow morning.',
    blockers: '',
    notes: '',
  },
  {
    reportDate: '2026-04-21',
    projectId: PROJECT.id,
    projectName: PROJECT.name,
    authorId: 'user-site-eng',
    authorName: 'Sebastian Diaz',
    weather: 'CLOUDY',
    highTempF: 70,
    lowTempF: 55,
    manpower: [
      { trade: 'Concrete', count: 9 },
      { trade: 'MEP', count: 7 },
    ],
    equipment: [
      { name: 'Tower Crane #1', hours: 8 },
      { name: 'Generator (250 kVA)', hours: 8 },
    ],
    workCompleted: 'Formwork for floor 10 deck. MEP rough-in floor 7 complete.',
    blockers: '',
    notes: 'Floor 7 ready for inspection.',
  },
  {
    reportDate: '2026-04-20',
    projectId: PROJECT.id,
    projectName: PROJECT.name,
    authorId: 'user-site-eng',
    authorName: 'Sebastian Diaz',
    weather: 'CLOUDY',
    highTempF: 67,
    lowTempF: 52,
    manpower: [
      { trade: 'Concrete', count: 8 },
      { trade: 'MEP', count: 6 },
    ],
    equipment: [{ name: 'Tower Crane #1', hours: 7 }],
    workCompleted: 'Formwork continued. MEP rough-in floor 7 — 90% complete.',
    blockers: 'Late delivery of curtain wall brackets — pushed install to next day.',
    notes: '',
  },
  {
    reportDate: '2026-04-17',
    projectId: PROJECT.id,
    projectName: PROJECT.name,
    authorId: 'user-pm',
    authorName: 'Pete Williams',
    weather: 'STORM',
    highTempF: 58,
    lowTempF: 47,
    manpower: [{ trade: 'Site Crew', count: 4 }],
    equipment: [],
    workCompleted: 'Site secured for severe weather. No production work.',
    blockers: 'Severe thunderstorm — site closed.',
    notes: 'Insurance notified per protocol.',
  },
  {
    reportDate: '2026-04-16',
    projectId: PROJECT.id,
    projectName: PROJECT.name,
    authorId: 'user-site-eng',
    authorName: 'Sebastian Diaz',
    weather: 'SUNNY',
    highTempF: 74,
    lowTempF: 58,
    manpower: [
      { trade: 'Concrete', count: 11 },
      { trade: 'Steel', count: 6 },
      { trade: 'MEP', count: 8 },
    ],
    equipment: [
      { name: 'Tower Crane #1', hours: 9 },
      { name: 'Concrete Pump', hours: 5 },
    ],
    workCompleted: 'Floor 9 pour complete. MEP rough-in floor 6 — 100% complete and inspected.',
    blockers: '',
    notes: 'Floor 6 ready for closeout.',
  },
];

const buildReports = (): MockDailyReport[] =>
  SAMPLE_REPORTS.map((r, i) => ({
    ...r,
    id: `dr-${String(1000 + SAMPLE_REPORTS.length - i).padStart(4, '0')}`,
    createdAt: new Date(`${r.reportDate}T18:30:00.000Z`).toISOString(),
  }));

export const mockDailyReports: MockDailyReport[] = buildReports();
