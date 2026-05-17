'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { AppModal } from '@/components/ui/AppModal';
import { AppButton } from '@/components/ui/AppButton';

export interface PlanOption {
  id: string;
  name: string;
  tier: string;
  pricePerMonth: number;
  maxUsers: number;
  maxProjects: number;
  features?: string[];
  isPopular?: boolean;
}

interface ChangePlanModalProps {
  open: boolean;
  plans: PlanOption[];
  currentPlanId: string | null;
  preselectedPlanId: string | null;
  usage: { users: number; projects: number };
  isLoading: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: (planId: string) => void;
}

export function ChangePlanModal({
  open,
  plans,
  currentPlanId,
  preselectedPlanId,
  usage,
  isLoading,
  error,
  onClose,
  onConfirm,
}: ChangePlanModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(preselectedPlanId);

  useEffect(() => {
    if (open) setSelectedId(preselectedPlanId);
  }, [open, preselectedPlanId]);

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === selectedId) ?? null,
    [plans, selectedId],
  );

  const overLimit = useMemo(() => {
    if (!selectedPlan) return null;
    const overUsers = usage.users > selectedPlan.maxUsers;
    const overProjects = usage.projects > selectedPlan.maxProjects;
    if (!overUsers && !overProjects) return null;
    return { overUsers, overProjects, plan: selectedPlan };
  }, [selectedPlan, usage]);

  const confirmDisabled =
    !selectedId || selectedId === currentPlanId || isLoading;

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title="Change plan"
      subtitle="Select a plan to switch to. Changes take effect immediately."
      maxWidth="md"
      actions={
        <Stack direction="row" spacing={1} justifyContent="flex-end" p={2} pt={0}>
          <AppButton variant="outlined" onClick={onClose} disabled={isLoading}>
            Cancel
          </AppButton>
          <AppButton
            variant="contained"
            loading={isLoading}
            disabled={confirmDisabled}
            onClick={() => selectedId && onConfirm(selectedId)}
          >
            Confirm change
          </AppButton>
        </Stack>
      }
    >
      <Stack spacing={2} px={3} pb={1}>
        {error && <Alert severity="error">{error}</Alert>}

        {overLimit && (
          <Alert severity="warning">
            You&apos;re currently using <strong>{usage.users}</strong> members and{' '}
            <strong>{usage.projects}</strong> projects, but{' '}
            <strong>{overLimit.plan.name}</strong> allows only{' '}
            <strong>{overLimit.plan.maxUsers}</strong> members /{' '}
            <strong>{overLimit.plan.maxProjects}</strong> projects. You can still switch,
            but new members or projects will be blocked until you free up capacity.
          </Alert>
        )}

        <Stack spacing={1.5}>
          {plans.map((p) => {
            const isCurrent = p.id === currentPlanId;
            const isSelected = !isCurrent && p.id === selectedId;
            return (
              <Paper
                key={p.id}
                elevation={0}
                onClick={() => {
                  if (isCurrent) return;
                  setSelectedId(p.id);
                }}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  border: '2px solid',
                  borderColor: isSelected ? 'primary.main' : 'divider',
                  cursor: isCurrent ? 'default' : 'pointer',
                  opacity: isCurrent ? 0.7 : 1,
                  transition: 'border-color 120ms, background 120ms',
                  background: isSelected ? 'rgba(25,118,210,0.06)' : 'transparent',
                  '&:hover': isCurrent || isSelected
                    ? undefined
                    : { background: 'rgba(0,0,0,0.02)' },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                  {/* Radio indicator */}
                  <Box
                    sx={{
                      mt: 0.5,
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      border: '2px solid',
                      borderColor: isSelected ? 'primary.main' : isCurrent ? 'success.main' : 'divider',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {isSelected && (
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main' }} />
                    )}
                    {isCurrent && (
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main' }} />
                    )}
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, flex: 1 }}>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant="subtitle1" fontWeight={600}>
                          {p.name}
                        </Typography>
                        {isCurrent && <Chip label="Current plan" size="small" color="success" sx={{ fontWeight: 600 }} />}
                        {p.isPopular && !isCurrent && (
                          <Chip
                            label="Popular"
                            size="small"
                            variant="outlined"
                            sx={{ color: 'text.secondary', borderColor: 'divider' }}
                          />
                        )}
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        Up to <strong>{p.maxUsers}</strong> members ·{' '}
                        <strong>{p.maxProjects}</strong> projects
                      </Typography>
                      {p.features && p.features.length > 0 && (
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 0.5, mt: 1 }}>
                          {p.features.map((f) => (
                            <Box key={f} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                              <CheckCircleIcon sx={{ fontSize: 14, color: 'success.main' }} />
                              <Typography variant="caption" color="text.secondary">
                                {f}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      )}
                    </Box>
                    <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                      <Typography variant="h6" fontWeight={600} sx={{ lineHeight: 1 }}>
                        ${p.pricePerMonth}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        / month
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Paper>
            );
          })}
        </Stack>
      </Stack>
    </AppModal>
  );
}
