import { verifyAdminAccess } from '@/lib/auth-server';
import DashboardLayout from '@/components/DashboardLayout';
import { ReactNode } from 'react';

export default async function Layout({ children }: { children: ReactNode }) {
  // Server-side auth check (blocking)
  // If not authorized, it redirects immediately.
  const user = await verifyAdminAccess();

  return (
    <DashboardLayout user={user} isAdmin={true}>
      {children}
    </DashboardLayout>
  );
}