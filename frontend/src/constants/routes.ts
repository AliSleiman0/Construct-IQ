/**
 * Cross-cutting routes only. Role-specific routes live under their role prefix
 * (e.g., `/super-admin/...`, `/admin/...`) and are defined in `config/sidebar-nav.ts`.
 */
export const ROUTES = {
  LANDING: '/',
  LOGIN: '/login',
  PROFILE: '/profile',
  SETTINGS: '/settings',
  PROJECTS: '/projects',
  PROJECT_DETAIL: (id: string) => `/projects/${id}`,
  CLIENT_PORTAL: (token: string) => `/portal/${token}`,
} as const;
