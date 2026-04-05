'use client';

import { Box, Typography, Breadcrumbs, Link as MuiLink } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import Link from 'next/link';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  actions,
}: PageHeaderProps) {
  return (
    <Box
      sx={{
        mb: 3,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 2,
      }}
    >
      <Box>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <Breadcrumbs
            separator={<NavigateNextIcon sx={{ fontSize: 14 }} />}
            sx={{ mb: 0.5 }}
          >
            {breadcrumbs.map((crumb, index) =>
              crumb.href ? (
                <MuiLink
                  key={index}
                  component={Link}
                  href={crumb.href}
                  underline="hover"
                  color="text.secondary"
                  sx={{ fontSize: '0.8125rem' }}
                >
                  {crumb.label}
                </MuiLink>
              ) : (
                <Typography
                  key={index}
                  color="text.primary"
                  sx={{ fontSize: '0.8125rem', fontWeight: 500 }}
                >
                  {crumb.label}
                </Typography>
              ),
            )}
          </Breadcrumbs>
        )}
        <Typography variant="h4" fontWeight={700} color="text.primary">
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {actions && <Box display="flex" gap={1.5} alignItems="center">{actions}</Box>}
    </Box>
  );
}
