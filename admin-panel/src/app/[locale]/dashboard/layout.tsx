import { verifyAdminAccess } from '@/lib/auth-server';
import DashboardLayout from '@/components/DashboardLayout';
import { ReactNode } from 'react';
import { RealtimeProvider } from '@/contexts/RealtimeContext';
import { UserPreferencesProvider } from '@/contexts/UserPreferencesContext';
import { getDefaultCurrency } from '@/lib/actions/shop-config';

export default async function Layout({ children }: { children: ReactNode }) {
  // Server-side auth check (blocking)
  // If not authorized, it redirects immediately.
  const user = await verifyAdminAccess();

  // Get shop's default currency
  const shopDefaultCurrency = await getDefaultCurrency();

  // Extract initial preferences safely
  const initialHideValues = user.user_metadata?.preferences?.hideValues || false;

  // If user has a saved currency preference, use it; otherwise use shop default
  const userSavedCurrency = user.user_metadata?.preferences?.displayCurrency;
  const initialDisplayCurrency = userSavedCurrency !== undefined ? userSavedCurrency : shopDefaultCurrency;

  // Default to 'converted' mode with shop's default currency instead of 'grouped'
  const userSavedMode = user.user_metadata?.preferences?.currencyViewMode;
  const initialCurrencyViewMode = userSavedMode || 'converted';

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