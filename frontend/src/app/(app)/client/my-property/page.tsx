'use client';

import { Box, Paper, Typography, Stack, Chip } from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import KeyIcon from '@mui/icons-material/Key';
import ConstructionIcon from '@mui/icons-material/Construction';
import { PageHeader } from '@/components/shared/PageHeader';
import { AppLoader } from '@/components/ui/AppLoader';
import { AppErrorState } from '@/components/ui/AppErrorState';
import { UnitDetail } from '@/features/units/components/UnitDetail';
import { useMyUnit } from '@/features/units/hooks/useUnits';
import { usePayments } from '@/features/payments/hooks/usePayments';
import { useMilestones } from '@/features/projects/hooks/useMilestones';
import { useProject } from '@/features/projects/hooks/useProjects';
import type { UnitStatus } from '@/types/unit.types';
import dayjs from 'dayjs';

const STATUS_CHIP: Record<UnitStatus, { label: string; color: 'success' | 'warning' | 'default' }> = {
  AVAILABLE: { label: 'Available', color: 'success' },
  RESERVED: { label: 'Reserved', color: 'warning' },
  SOLD: { label: 'Sold', color: 'default' },
};

export default function MyPropertyPage() {
  // Buyer-scoped server-side — no need to pass the user's own id.
  const { data: unit, isLoading, isError, refetch } = useMyUnit();
  const { data: payments } = usePayments({ unitId: unit?.id });
  const { data: milestones } = useMilestones(unit?.projectId ?? null);
  const { data: project } = useProject(unit?.projectId ?? null);

  if (isLoading) return <AppLoader />;
  if (isError) return <AppErrorState onRetry={refetch} />;

  if (!unit) {
    return (
      <Box>
        <PageHeader title="My Property" />
        <Paper elevation={0} sx={{ p: 4, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="body1">
            You don&apos;t have a reserved unit yet. Browse the building to find one.
          </Typography>
        </Paper>
      </Box>
    );
  }

  const schedule = payments ?? [];
  // PARTIAL installments contribute what was actually received.
  const paid = schedule.reduce(
    (s, p) => s + (p.status === 'PAID' ? p.amountUsd : p.paidAmountUsd ?? 0),
    0,
  );
  const total = schedule.reduce((s, p) => s + p.amountUsd, 0);

  // "Next due" is the earliest still-open installment — there is no `DUE`
  // status server-side, so it is derived from the schedule order.
  const nextDue = schedule
    .filter((p) => p.status === 'PENDING' || p.status === 'PARTIAL' || p.status === 'OVERDUE')
    .sort((a, b) => dayjs(a.dueDate).valueOf() - dayjs(b.dueDate).valueOf())[0];

  const list = milestones ?? [];
  const nextMilestone =
    list.find((m) => m.status === 'IN_PROGRESS') ?? list.find((m) => m.status === 'PENDING');

  const chip = STATUS_CHIP[unit.status];

  return (
    <Box>
      <PageHeader
        title="My Property"
        subtitle={`${project?.name ?? 'Your project'} · Unit ${unit.label}`}
        actions={<Chip label={chip.label} color={chip.color} sx={{ fontWeight: 600 }} />}
      />

      <Stack gap={3}>
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
          }}
        >
          <KeyDate
            icon={EventIcon}
            label="Contract value"
            value={`$${unit.priceUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            hint={`${schedule.length} installment${schedule.length === 1 ? '' : 's'}`}
          />
          <KeyDate
            icon={ConstructionIcon}
            label="Next milestone"
            value={nextMilestone?.name ?? 'On schedule'}
            hint={
              nextMilestone?.targetDate
                ? `Target ${dayjs(nextMilestone.targetDate).format('MMM D, YYYY')}`
                : ''
            }
          />
          <KeyDate
            icon={KeyIcon}
            label="Anticipated handover"
            value={project?.endDate ? dayjs(project.endDate).format('MMM D, YYYY') : '—'}
            hint="Subject to inspection"
          />
        </Box>

        <Paper
          elevation={0}
          sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
        >
          <Typography variant="subtitle1" fontWeight={600} mb={1}>
            Payments at a glance
          </Typography>
          <Box display="flex" gap={4} flexWrap="wrap">
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
                Paid to date
              </Typography>
              <Typography variant="h5" fontWeight={700}>
                ${paid.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
                Contract total
              </Typography>
              <Typography variant="h5" fontWeight={700}>
                ${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </Typography>
            </Box>
            {nextDue && (
              <Box>
                <Typography variant="caption" color="warning.main" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
                  Next due
                </Typography>
                <Typography variant="h5" fontWeight={700} color="warning.main">
                  ${nextDue.amountUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  by {dayjs(nextDue.dueDate).format('MMM D, YYYY')}
                </Typography>
              </Box>
            )}
          </Box>
        </Paper>

        <UnitDetail unitId={unit.id} />
      </Stack>
    </Box>
  );
}

function KeyDate({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Paper
      elevation={0}
      sx={{ p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
    >
      <Box display="flex" alignItems="center" gap={1.5} mb={1}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 1.5,
            bgcolor: 'action.hover',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'text.secondary',
          }}
        >
          <Icon sx={{ fontSize: 18 }} />
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
          {label}
        </Typography>
      </Box>
      <Typography variant="h6" fontWeight={700}>
        {value}
      </Typography>
      {hint && (
        <Typography variant="caption" color="text.secondary">
          {hint}
        </Typography>
      )}
    </Paper>
  );
}
