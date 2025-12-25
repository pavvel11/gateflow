import { verifyAdminAccess } from '@/lib/auth-server';
import DashboardLayout from '@/components/DashboardLayout';
import { ReactNode } from 'react';
import { RealtimeProvider } from '@/contexts/RealtimeContext';
import { UserPreferencesProvider } from '@/contexts/UserPreferencesContext';

export default async function Layout({ children }: { children: ReactNode }) {
  // Server-side auth check (blocking)
  // If not authorized, it redirects immediately.
  const user = await verifyAdminAccess();

  // Extract initial preferences safely
  const initialHideValues = user.user_metadata?.preferences?.hideValues || false;
  const initialDisplayCurrency = user.user_metadata?.preferences?.displayCurrency || null;
  const initialCurrencyViewMode = user.user_metadata?.preferences?.currencyViewMode || 'grouped';

  return (
    <UserPreferencesProvider
      initialHideValues={initialHideValues}
      initialDisplayCurrency={initialDisplayCurrency}
      initialCurrencyViewMode={initialCurrencyViewMode}
    >
      <RealtimeProvider>
        <DashboardLayout user={user} isAdmin={true}>
          {children}
        </DashboardLayout>
      </RealtimeProvider>
    </UserPreferencesProvider>
  );
}