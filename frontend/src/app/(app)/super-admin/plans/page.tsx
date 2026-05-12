'use client';

import {
  Box, Card, CardContent, Typography, List, ListItem,
  ListItemIcon, ListItemText, Chip, CircularProgress,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import { PageHeader } from '@/components/shared/PageHeader';
import { usePlans } from '@/features/plans/hooks/usePlans';

export default function PlansPage() {
  const { data: plans = [], isLoading } = usePlans();

  if (isLoading) {
    return <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <PageHeader
        title="Subscription Plans"
        subtitle="Define pricing tiers and feature sets available to tenants."
      />

      {(plans as any[]).length === 0 ? (
        <Typography color="text.secondary" sx={{ mt: 4, textAlign: 'center' }}>
          No plans found. Create plans via the API or seed data.
        </Typography>
      ) : (
        <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)' } }}>
          {(plans as any[]).map((plan: any) => (
            <Card key={plan._id} elevation={0}
              sx={{ border: '1px solid', borderColor: plan.isPopular ? 'primary.main' : 'divider', borderRadius: 2, position: 'relative' }}>
              {plan.isPopular && (
                <Chip label="Most popular" color="primary" size="small"
                  sx={{ position: 'absolute', top: 16, right: 16, fontWeight: 700, fontSize: '0.7rem' }} />
              )}
              <CardContent sx={{ p: 3 }}>
                <Typography variant="overline" color="text.secondary" fontWeight={700}>
                  {plan.tier ?? plan.name}
                </Typography>
                <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5, mb: 0.5 }}>
                  ${plan.pricePerMonth}
                  <Typography component="span" variant="body2" color="text.secondary" ml={0.5}>/mo</Typography>
                </Typography>
                {plan.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {plan.description}
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary">
                  Up to {plan.maxUsers} users · {plan.maxProjects} projects
                </Typography>
                {(plan.features ?? []).length > 0 && (
                  <List dense disablePadding sx={{ mt: 2 }}>
                    {(plan.features as string[]).map((f, i) => (
                      <ListItem key={i} disableGutters sx={{ py: 0.25 }}>
                        <ListItemIcon sx={{ minWidth: 28 }}>
                          <CheckIcon fontSize="small" color="success" />
                        </ListItemIcon>
                        <ListItemText primary={f} primaryTypographyProps={{ variant: 'body2' }} />
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  );
}
