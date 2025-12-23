import { verifyAdminAccess } from '@/lib/auth-server';
import DashboardLayout from '@/components/DashboardLayout';
import { ReactNode } from 'react';
import { RealtimeProvider } from '@/contexts/RealtimeContext';

export default async function Layout({ children }: { children: ReactNode }) {
  // Server-side auth check (blocking)
  // If not authorized, it redirects immediately.
  const user = await verifyAdminAccess();

  return (
    <RealtimeProvider>
      <DashboardLayout user={user} isAdmin={true}>
        {children}
      </DashboardLayout>
    </RealtimeProvider>
  );
}