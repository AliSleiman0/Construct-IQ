import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Project Portal | ConstructIQ',
  description: 'Track your construction project progress',
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
