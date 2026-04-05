import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard',
};

export default function DashboardPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-gray-800">Dashboard</h1>
      <p className="text-gray-500 mt-1">
        Welcome to ConstructIQ. Your project overview will appear here.
      </p>
    </div>
  );
}
