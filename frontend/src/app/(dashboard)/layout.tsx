import { AppProviders } from '@/providers';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppProviders>{children}</AppProviders>;
}
