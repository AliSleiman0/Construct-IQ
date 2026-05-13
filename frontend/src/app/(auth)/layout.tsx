export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <main style={{ minHeight: '100vh', backgroundColor: '#0E1726' }}>{children}</main>;
}
