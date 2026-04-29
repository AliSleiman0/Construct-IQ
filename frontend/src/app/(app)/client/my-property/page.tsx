'use client';

import { Box, Paper, Typography, Stack, Chip } from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import KeyIcon from '@mui/icons-material/Key';
import ConstructionIcon from '@mui/icons-material/Construction';
import { PageHeader } from '@/components/shared/PageHeader';
import { useAuthStore } from '@/store/auth.store';
import { findUnitForBuyer } from '@/mocks/units.mock';
import { paymentsForBuyer } from '@/mocks/payments.mock';
import { mockMilestones } from '@/mocks/progress.mock';
import { UnitDetail } from '@/features/units/components/UnitDetail';
import dayjs from 'dayjs';

export default function MyPropertyPage() {
  const user = useAuthStore((s) => s.user);
  const unit = user ? findUnitForBuyer(user.id) : undefined;

  if (!unit) {
    return (
      <Box>
        <PageHeader title="My Property" />
        <Paper elevation={0} sx={{ p: 4, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="body1">
            You don't have a reserved unit yet. Browse the building to find one.
          </Typography>
        </Paper>
      </Box>
    );
  }

  const payments = paymentsForBuyer(user!.id);
  const paid = payments.filter((p) => p.status === 'PAID').reduce((s, p) => s + p.amountUsd, 0);
  const total = payments.reduce((s, p) => s + p.amountUsd, 0);
  const nextDue = payments.find((p) => p.status === 'DUE');
  const nextMilestone = mockMilestones.find((m) => m.status === 'IN_PROGRESS') ?? mockMilestones.find((m) => m.status === 'UPCOMING');

  return (
    <Box>
      <PageHeader
        title="My Property"
        subtitle={`Tower Heights · Unit ${unit.label}`}
        actions={<Chip label="Reserved" color="warning" sx={{ fontWeight: 600 }} />}
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
            label="Reserved on"
            value={dayjs(unit.id).isValid() ? '—' : dayjs('2026-01-15').format('MMM D, YYYY')}
            hint="Down payment received"
          />
          <KeyDate
            icon={ConstructionIcon}
            label="Next milestone"
            value={nextMilestone ? nextMilestone.label : 'On schedule'}
            hint={nextMilestone ? `Target ${dayjs(nextMilestone.scheduledDate).format('MMM D, YYYY')}` : ''}
          />
          <KeyDate
            icon={KeyIcon}
            label="Anticipated handover"
            value={dayjs('2027-04-30').format('MMM D, YYYY')}
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
