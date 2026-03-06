import { createAdminClient } from '@/lib/supabase/admin';
import { validateLicense, extractDomainFromUrl } from '@/lib/license/verify';
import VariantSelectorClient from './VariantSelectorClient';

interface PageProps {
  params: Promise<{ groupId: string; locale: string }>;
}

export default async function VariantSelectorPage({ params }: PageProps) {
  const { groupId } = await params;

  // Check Sellf license validity (controls "Powered by" branding)
  const adminSupabase: any = createAdminClient();
  const { data: integrationsConfig } = await adminSupabase
    .from('integrations_config')
    .select('sellf_license')
    .eq('id', 1)
    .single() as { data: { sellf_license: string | null } | null };

  const siteUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL;
  const currentDomain = siteUrl ? extractDomainFromUrl(siteUrl) : null;
  const licenseResult = validateLicense(integrationsConfig?.sellf_license || '', currentDomain || undefined);
  const licenseValid = licenseResult.valid;

  return <VariantSelectorClient groupId={groupId} licenseValid={licenseValid} />;
}
