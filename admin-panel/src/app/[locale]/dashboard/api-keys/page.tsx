import ApiKeysPageContent from '@/components/ApiKeysPageContent';
import { getCurrentTier } from '@/lib/license/features';
import { hasFeature } from '@/lib/license/features';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'API Keys - Sellf Admin',
};

export default function ApiKeysPage() {
  const tier = getCurrentTier();
  const scopesLocked = !hasFeature(tier, 'api-key-scopes');
  return <ApiKeysPageContent scopesLocked={scopesLocked} />;
}
