import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'ConstructIQ',
    template: '%s | ConstructIQ',
  },
  description: 'AI-powered construction management platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body id="root">{children}</body>
    </html>
  );
}
