'use client';

import { useMemo, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Divider,
  LinearProgress,
  Skeleton,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import GroupIcon from '@mui/icons-material/Group';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import CloudIcon from '@mui/icons-material/Cloud';
import InfoIcon from '@mui/icons-material/Info';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { PageHeader } from '@/components/shared/PageHeader';
import { AppButton } from '@/components/ui/AppButton';
import { usePlans } from '@/features/plans/hooks/usePlans';
import { useOrgDashboard } from '@/features/dashboard/hooks/useOrgDashboard';
import { useCurrentOrg, useSetOrgPlan, useSetOrgAiPlan } from '@/features/organizations/hooks/useOrganizations';
import { ChangePlanModal, type PlanOption } from '@/features/organizations/components/ChangePlanModal';
import { ChangeAiPlanModal, type AiPlanOption } from '@/features/organizations/components/ChangeAiPlanModal';
import { useAiPlans } from '@/features/ai-plans/hooks/useAiPlans';
import { usePlatformAiFeatures } from '@/features/platform-ai-features/hooks/usePlatformAiFeatures';

const TIER_ORDER = ['STARTER', 'PRO', 'ENTERPRISE'] as const;
const AI_TIER_ORDER = ['ESSENTIALS', 'ADVANCED', 'PRO'] as const;
const USAGE_ICONS = { Members: GroupIcon, Projects: FolderOpenIcon, Storage: CloudIcon };
const USAGE_COLORS = { Members: 'primary' as const, Projects: 'info' as const, Storage: 'success' as const };

export default function AdminSubscriptionPage() {
  const { data: plans = [], isLoading: plansLoading } = usePlans();
  const { data: aiPlans = [] } = useAiPlans();
  const { data: aiFeatureCatalog = [] } = usePlatformAiFeatures(true);
  const { data: dashboard, isLoading: dashLoading } = useOrgDashboard();
  const { data: org, isLoading: orgLoading } = useCurrentOrg();
  const setPlan = useSetOrgPlan();
  const setAiPlan = useSetOrgAiPlan();

  const sortedPlans = useMemo<PlanOption[]>(
    () =>
      [...plans]
        .map((p: any): PlanOption => ({
          id: p._id ?? p.id,
          name: p.name,
          tier: p.tier,
          pricePerMonth: p.pricePerMonth,
          maxUsers: p.maxUsers,
          maxProjects: p.maxProjects,
          features: p.features,
          isPopular: p.isPopular,
        }))
        .sort(
          (a, b) =>
            (TIER_ORDER as readonly string[]).indexOf(a.tier) -
            (TIER_ORDER as readonly string[]).indexOf(b.tier),
        ),
    [plans],
  );

  const currentPlan = useMemo(
    () => sortedPlans.find((p) => p.id === org?.planId) ?? null,
    [sortedPlans, org?.planId],
  );

  const currentIdx = currentPlan ? sortedPlans.findIndex((p) => p.id === currentPlan.id) : -1;
  const nextUp = currentIdx >= 0 ? sortedPlans[currentIdx + 1] ?? null : sortedPlans[0] ?? null;
  const nextDown = currentIdx > 0 ? sortedPlans[currentIdx - 1] ?? null : null;

  const features = currentPlan?.features ?? [];
  const maxUsers = currentPlan?.maxUsers ?? 0;
  const maxProjects = currentPlan?.maxProjects ?? 0;

  const usersUsed = dashboard?.teamMemberCount ?? 0;
  const projectsUsed = dashboard?.totalProjectCount ?? 0;

  const usage = [
    { label: 'Members', current: usersUsed, max: maxUsers },
    { label: 'Projects', current: projectsUsed, max: maxProjects },
    { label: 'Storage', current: 8.2, max: 100, unit: 'GB' },
  ];

  const [modalOpen, setModalOpen] = useState(false);
  const [preselect, setPreselect] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiPreselect, setAiPreselect] = useState<string | null>(null);
  const [aiModalError, setAiModalError] = useState<string | null>(null);

  const sortedAiPlans = useMemo<AiPlanOption[]>(
    () =>
      [...aiPlans]
        .map((p: any): AiPlanOption => ({
          id: p._id ?? p.id,
          name: p.name,
          tier: p.tier,
          pricePerMonth: p.pricePerMonth,
          features: p.features,
          isPopular: p.isPopular,
        }))
        .sort(
          (a, b) =>
            (AI_TIER_ORDER as readonly string[]).indexOf(a.tier) -
            (AI_TIER_ORDER as readonly string[]).indexOf(b.tier),
        ),
    [aiPlans],
  );

  const currentAiPlanId = (org as any)?.aiPlanId ?? null;
  const currentAiPlan = useMemo(
    () => sortedAiPlans.find((p) => p.id === currentAiPlanId) ?? null,
    [sortedAiPlans, currentAiPlanId],
  );

  const aiCurrentIdx = currentAiPlan ? sortedAiPlans.findIndex((p) => p.id === currentAiPlan.id) : -1;
  const aiNextUp = aiCurrentIdx >= 0 ? sortedAiPlans[aiCurrentIdx + 1] ?? null : sortedAiPlans[0] ?? null;
  const aiNextDown = aiCurrentIdx > 0 ? sortedAiPlans[aiCurrentIdx - 1] ?? null : null;

  const aiFeatureNames = useMemo(() => {
    const m: Record<string, string> = {};
    for (const f of aiFeatureCatalog as any[]) m[f.key] = f.name;
    return m;
  }, [aiFeatureCatalog]);

  const hasCorePlan = !!org?.planId;

  const handleConfirm = (planId: string) => {
    if (!org) return;
    setModalError(null);
    setPlan.mutate(
      { orgId: org.id, planId },
      {
        onSuccess: () => setModalOpen(false),
        onError: (err: any) => {
          const raw = err?.response?.data?.message ?? 'Failed to update plan.';
          setModalError(Array.isArray(raw) ? raw.join(', ') : String(raw));
        },
      },
    );
  };

  const openModal = (preselectId: string | null) => {
    setPreselect(preselectId);
    setModalError(null);
    setModalOpen(true);
  };

  const handleAiConfirm = (aiPlanId: string) => {
    if (!org) return;
    setAiModalError(null);
    setAiPlan.mutate(
      { orgId: org.id, aiPlanId },
      {
        onSuccess: () => setAiModalOpen(false),
        onError: (err: any) => {
          const raw = err?.response?.data?.message ?? 'Failed to update AI subscription.';
          setAiModalError(Array.isArray(raw) ? raw.join(', ') : String(raw));
        },
      },
    );
  };

  const openAiModal = (preselectId: string | null) => {
    setAiPreselect(preselectId);
    setAiModalError(null);
    setAiModalOpen(true);
  };

  const handleCancelAi = () => {
    if (!org || !currentAiPlanId) return;
    setAiPlan.mutate({ orgId: org.id, aiPlanId: null });
  };

  const isLoading = plansLoading || dashLoading || orgLoading;

  if (isLoading) {
    return (
      <Box>
        <PageHeader title="Subscription" subtitle="Manage your plan, view usage limits, and change tiers anytime." />
        <Skeleton variant="rounded" height={400} />
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title="Subscription"
        subtitle="Manage your plan, view usage limits, and change tiers anytime."
      />

      <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' } }}>
        {/* Current Plan */}
        <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 3, mb: 3 }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <Chip
                  label={currentPlan ? 'ACTIVE' : 'NO PLAN'}
                  color={currentPlan ? 'success' : 'default'}
                  size="small"
                  sx={{ fontWeight: 600 }}
                />
                {currentPlan && (
                  <Typography variant="caption" color="text.secondary">
                    Renews May 28, 2026
                  </Typography>
                )}
              </Box>
              <Typography variant="h4" fontWeight={500} sx={{ mb: 0.5 }}>
                {currentPlan?.name ?? 'No plan selected'}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                <Typography sx={{ fontSize: 36, fontWeight: 500 }}>
                  ${currentPlan?.pricePerMonth ?? 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">/ month</Typography>
              </Box>
            </Box>
            <Box
              sx={{
                width: 72,
                height: 72,
                borderRadius: 4,
                background: 'linear-gradient(135deg, #1976d2, #42a5f5)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <WorkspacePremiumIcon sx={{ fontSize: 40 }} />
            </Box>
          </Box>

          {features.length > 0 && (
            <>
              <Typography
                variant="overline"
                sx={{ fontWeight: 600, color: 'text.secondary', letterSpacing: '0.04em', display: 'block', mb: 1.5 }}
              >
                What&apos;s included
              </Typography>

              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5, mb: 3 }}>
                {features.map((f: string) => (
                  <Box key={f} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        bgcolor: 'success.light',
                        color: 'success.main',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        opacity: 0.8,
                      }}
                    >
                      <CheckCircleOutlineIcon sx={{ fontSize: 16 }} />
                    </Box>
                    <Typography variant="body2">{f}</Typography>
                  </Box>
                ))}
              </Box>
            </>
          )}

          <Divider sx={{ mb: 2 }} />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <AppButton
              variant="contained"
              startIcon={<ArrowUpwardIcon />}
              disabled={!org || !nextUp}
              onClick={() => openModal(nextUp?.id ?? null)}
            >
              {nextUp ? `Upgrade to ${nextUp.name}` : 'Upgrade'}
            </AppButton>
            <AppButton
              variant="outlined"
              color="inherit"
              startIcon={<ArrowDownwardIcon />}
              disabled={!org || !nextDown}
              onClick={() => openModal(nextDown?.id ?? null)}
            >
              {nextDown ? `Downgrade to ${nextDown.name}` : 'Downgrade'}
            </AppButton>
          </Box>
        </Paper>

        {/* Usage */}
        <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2.5 }}>
            Usage this month
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {usage.map((u) => {
              const pct = u.max > 0 ? (u.current / u.max) * 100 : 0;
              const Icon = USAGE_ICONS[u.label as keyof typeof USAGE_ICONS] ?? FolderOpenIcon;
              const color = USAGE_COLORS[u.label as keyof typeof USAGE_COLORS] ?? 'primary';
              const valText = u.unit ? `${u.current} ${u.unit}` : String(u.current);
              const maxText = u.unit ? `${u.max} ${u.unit}` : String(u.max);
              return (
                <Box key={u.label}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Icon sx={{ fontSize: 18, color: 'text.secondary' }} />
                      <Typography variant="body2" fontWeight={500}>{u.label}</Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={500}>
                      <Typography component="span" variant="caption" color="text.primary" fontWeight={500}>
                        {valText}
                      </Typography>
                      {' '}of {maxText}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(pct, 100)}
                    color={color}
                    sx={{ height: 8, borderRadius: 1 }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    {Math.round(pct)}% used
                  </Typography>
                </Box>
              );
            })}
          </Box>

          <Box
            sx={{
              mt: 3,
              p: 1.5,
              background: '#e5f6fd',
              borderRadius: 1.5,
              display: 'flex',
              gap: 1.25,
            }}
          >
            <InfoIcon sx={{ fontSize: 18, color: 'info.main', flexShrink: 0, mt: 0.125 }} />
            <Typography variant="caption" sx={{ lineHeight: 1.5, color: 'text.primary' }}>
              You&apos;re using{' '}
              <strong>{maxUsers > 0 ? Math.round((usersUsed / maxUsers) * 100) : 0}%</strong>{' '}
              of your members and{' '}
              <strong>{maxProjects > 0 ? Math.round((projectsUsed / maxProjects) * 100) : 0}%</strong>{' '}
              of your projects. Plenty of room.
            </Typography>
          </Box>
        </Paper>
      </Box>

      {/* ── AI Subscription ── */}
      <Paper
        elevation={0}
        sx={{
          mt: 2.5,
          p: 3,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          opacity: hasCorePlan ? 1 : 0.7,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 3 }}>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <Chip
                label={currentAiPlan ? 'AI ACTIVE' : 'NO AI'}
                color={currentAiPlan ? 'success' : 'default'}
                size="small"
                sx={{ fontWeight: 600 }}
              />
              <Typography variant="overline" color="text.secondary" fontWeight={700}>
                AI Subscription
              </Typography>
            </Box>
            <Typography variant="h5" fontWeight={500} sx={{ mb: 0.5 }}>
              {currentAiPlan?.name ?? (hasCorePlan ? 'No AI plan' : 'Choose a core plan first')}
            </Typography>
            {currentAiPlan ? (
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                <Typography sx={{ fontSize: 28, fontWeight: 500 }}>
                  ${currentAiPlan.pricePerMonth}
                </Typography>
                <Typography variant="body2" color="text.secondary">/ month, per org</Typography>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                {hasCorePlan
                  ? 'Power up your team with the AI assistant, report summaries, and more.'
                  : 'AI is sold separately and requires an active core plan.'}
              </Typography>
            )}
          </Box>

          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: 3,
              background: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <AutoAwesomeIcon sx={{ fontSize: 32 }} />
          </Box>
        </Box>

        {currentAiPlan && currentAiPlan.features && currentAiPlan.features.length > 0 && (
          <>
            <Typography
              variant="overline"
              sx={{ fontWeight: 600, color: 'text.secondary', letterSpacing: '0.04em', display: 'block', mt: 3, mb: 1.5 }}
            >
              Included AI capabilities
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 1.5 }}>
              {currentAiPlan.features.map((key: string) => (
                <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      bgcolor: 'success.light',
                      color: 'success.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      opacity: 0.8,
                    }}
                  >
                    <CheckCircleOutlineIcon sx={{ fontSize: 16 }} />
                  </Box>
                  <Typography variant="body2">{aiFeatureNames[key] ?? key}</Typography>
                </Box>
              ))}
            </Box>
          </>
        )}

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          {!currentAiPlan ? (
            <AppButton
              variant="contained"
              startIcon={<AutoAwesomeIcon />}
              disabled={!hasCorePlan || sortedAiPlans.length === 0}
              onClick={() => openAiModal(sortedAiPlans[0]?.id ?? null)}
            >
              Add AI
            </AppButton>
          ) : (
            <>
              <AppButton
                variant="contained"
                startIcon={<ArrowUpwardIcon />}
                disabled={!aiNextUp}
                onClick={() => openAiModal(aiNextUp?.id ?? null)}
              >
                {aiNextUp ? `Upgrade to ${aiNextUp.name}` : 'Upgrade'}
              </AppButton>
              <AppButton
                variant="outlined"
                color="inherit"
                startIcon={<ArrowDownwardIcon />}
                disabled={!aiNextDown}
                onClick={() => openAiModal(aiNextDown?.id ?? null)}
              >
                {aiNextDown ? `Downgrade to ${aiNextDown.name}` : 'Downgrade'}
              </AppButton>
              <AppButton
                variant="text"
                color="error"
                onClick={handleCancelAi}
                disabled={setAiPlan.isPending}
              >
                Cancel AI
              </AppButton>
            </>
          )}
        </Box>
      </Paper>

      <ChangePlanModal
        open={modalOpen}
        plans={sortedPlans}
        currentPlanId={org?.planId ?? null}
        preselectedPlanId={preselect}
        usage={{ users: usersUsed, projects: projectsUsed }}
        isLoading={setPlan.isPending}
        error={modalError}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirm}
      />

      <ChangeAiPlanModal
        open={aiModalOpen}
        plans={sortedAiPlans}
        currentAiPlanId={currentAiPlanId}
        preselectedPlanId={aiPreselect}
        featureNames={aiFeatureNames}
        isLoading={setAiPlan.isPending}
        error={aiModalError}
        onClose={() => setAiModalOpen(false)}
        onConfirm={handleAiConfirm}
      />
    </Box>
  );
}
