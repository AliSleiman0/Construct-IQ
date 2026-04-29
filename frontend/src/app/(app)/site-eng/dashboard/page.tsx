'use client';

import { Box } from '@mui/material';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import ArticleIcon from '@mui/icons-material/Article';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard, StatGrid } from '@/components/shared/StatCard';
import { DashboardPanel } from '@/components/shared/DashboardPanel';
import { MiniBarChart } from '@/components/shared/MiniBarChart';

export default function SiteEngDashboardPage() {
  return (
    <Box>
      <PageHeader
        title="Site Dashboard"
        subtitle="Tower Heights · Phase 3 — Decks B & C."
      />

      <StatGrid>
        <StatCard label="My Tasks" value="9" hint="3 blocking" icon={TaskAltIcon} tone="info" />
        <StatCard label="Open Issues" value="4" hint="1 high severity" icon={ReportProblemIcon} tone="warning" />
        <StatCard label="My Reports" value="11" hint="Last filed today" icon={ArticleIcon} tone="success" />
        <StatCard label="Inspections" value="2" hint="Both pending sign-off" icon={FactCheckIcon} tone="primary" />
      </StatGrid>

      <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        <DashboardPanel title="Manpower on site" subtitle="Headcount per day, last 7 days">
          <MiniBarChart
            data={[
              { label: 'Mo', value: 24 },
              { label: 'Tu', value: 28 },
              { label: 'We', value: 27 },
              { label: 'Th', value: 30 },
              { label: 'Fr', value: 26 },
              { label: 'Sa', value: 12 },
              { label: 'Su', value: 0 },
            ]}
          />
        </DashboardPanel>
        <DashboardPanel title="Issues by severity" subtitle="Open this month">
          <MiniBarChart
            color="#ef4444"
            data={[
              { label: 'Low', value: 6 },
              { label: 'Med', value: 4 },
              { label: 'High', value: 1 },
              { label: 'Crit', value: 0 },
            ]}
          />
        </DashboardPanel>
      </Box>
    </Box>
  );
}
