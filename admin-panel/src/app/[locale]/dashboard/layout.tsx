import { verifyAdminAccess } from '@/lib/auth-server';
import DashboardLayout from '@/components/DashboardLayout';
import { ReactNode } from 'react';
import { RealtimeProvider } from '@/contexts/RealtimeContext';
import { UserPreferencesProvider } from '@/contexts/UserPreferencesContext';
import { getDefaultCurrency, getShopConfig } from '@/lib/actions/shop-config';

export default async function Layout({ children }: { children: ReactNode }) {
  // Parallel fetch: auth check + shop config
  // verifyAdminAccess() redirects if not authorized (throws NEXT_REDIRECT)
  const [user, shopConfig] = await Promise.all([
    verifyAdminAccess(),
    getShopConfig(),
  ]);
  const shopDefaultCurrency = shopConfig?.default_currency || 'USD';

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
        <DashboardLayout user={user} isAdmin={true} shopConfig={shopConfig}>
          {children}
        </DashboardLayout>
      </RealtimeProvider>
    </UserPreferencesProvider>
  );
}