'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { useTranslations, useLocale } from 'next-intl';
import { formatPrice } from '@/lib/constants';
import { useConfig } from '@/components/providers/config-provider';
import SellfBranding from '@/components/SellfBranding';

interface Variant {
  id: string;
  name: string;
  slug: string;
  variant_name: string | null;
  display_order: number;
  is_featured: boolean;
  price: number;
  currency: string;
  description: string | null;
  image_url: string | null;
  icon: string | null;
  is_active: boolean;
  allow_custom_price: boolean;
  custom_price_min: number | null;
}

// Check if string is a valid UUID
const isUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

interface VariantSelectorClientProps {
  groupId: string;
  licenseValid: boolean;
}

export default function VariantSelectorClient({ groupId, licenseValid }: VariantSelectorClientProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('variants');
  const config = useConfig();

  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVariants = async () => {
      try {
        const supabase = createBrowserClient(
          config.supabaseUrl,
          config.supabaseAnonKey
        );

        const isId = isUUID(groupId);
        const { data, error: fetchError } = isId
          ? await supabase.rpc('get_variant_group', { p_group_id: groupId })
          : await supabase.rpc('get_variant_group_by_slug', { p_slug: groupId });

        if (fetchError) {
          console.error('[VariantSelectorClient] Error fetching variants:', fetchError);
          setError(t('loadError'));
          return;
        }

        const activeVariants = data.filter((v: Variant) => v.is_active);

        if (!activeVariants || activeVariants.length === 0) {
          setError(t('noVariants'));
          return;
        }

        setVariants(activeVariants);
      } catch (err) {
        console.error('[VariantSelectorClient] Error:', err);
        setError(t('errorOccurred'));
      } finally {
        setLoading(false);
      }
    };

    if (groupId) {
      fetchVariants();
    }
  }, [groupId, config.supabaseUrl, config.supabaseAnonKey]);

  const handleSelectVariant = (slug: string) => {
    router.push(`/${locale}/checkout/${slug}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-sf-deep flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sf-accent"></div>
      </div>
    );
  }

  if (error || variants.length === 0) {
    return (
      <div className="min-h-screen bg-sf-deep flex items-center justify-center px-4">
        <div
          data-testid="variant-not-found"
          className="bg-sf-base border border-sf-border rounded-2xl shadow-[var(--sf-shadow-accent)] p-10 max-w-sm w-full text-center"
        >
          <div className="mx-auto mb-6 w-14 h-14 rounded-xl bg-sf-raised border border-sf-border flex items-center justify-center">
            <svg className="w-7 h-7 text-sf-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-sf-heading mb-2">
            {t('notFound.title')}
          </h1>
          <p className="text-sm text-sf-body leading-relaxed">
            {t('notFound.description')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sf-deep py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-sf-heading mb-3">
            {t('title')}
          </h1>
          <p className="text-lg text-sf-body">
            {t('subtitle')}
          </p>
        </div>

        {/* Variants Grid */}
        <div className="space-y-4">
          {variants.map((variant) => (
            <div
              key={variant.id}
              onClick={() => handleSelectVariant(variant.slug)}
              className={`
                relative bg-sf-base rounded-2xl shadow-[var(--sf-shadow-accent)]
                transition-all duration-300 cursor-pointer border-2
                ${variant.is_featured
                  ? 'border-sf-accent ring-2 ring-sf-accent-soft'
                  : 'border-transparent hover:border-sf-border-accent'
                }
              `}
            >
              {/* Featured badge */}
              {variant.is_featured && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-sf-accent-bg text-white text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wider shadow-[var(--sf-shadow-accent)]">
                    {t('popular')}
                  </span>
                </div>
              )}

              <div className="p-6 flex flex-col sm:flex-row items-center gap-5">
                {/* Icon / Image */}
                {(variant.image_url || variant.icon) && (
                  <div className="flex-shrink-0">
                    {variant.image_url ? (
                      <img
                        src={variant.image_url}
                        alt={variant.variant_name || variant.name}
                        className="w-16 h-16 object-cover rounded-xl"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-sf-raised flex items-center justify-center border border-sf-border">
                        <span className="text-3xl leading-none">{variant.icon}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Variant Info */}
                <div className="flex-grow min-w-0 text-center sm:text-left">
                  <h3 className="text-lg font-bold text-sf-heading mb-1 leading-snug">
                    {variant.variant_name || variant.name}
                  </h3>
                  {variant.description && (
                    <p className="text-sf-body text-sm line-clamp-2 mb-2">
                      {variant.description}
                    </p>
                  )}
                  {/* PWYW badge */}
                  {variant.allow_custom_price && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-sf-accent-soft text-sf-accent border border-sf-border-accent">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {t('payWhatYouWant')}
                    </span>
                  )}
                </div>

                {/* Price and CTA */}
                <div className="flex-shrink-0 flex flex-col items-center sm:items-end gap-2">
                  {variant.allow_custom_price ? (
                    /* PWYW pricing */
                    <div className="text-center sm:text-right">
                      <div className="flex items-baseline gap-1.5 justify-center sm:justify-end">
                        <span className="text-2xl md:text-3xl font-bold text-sf-heading">
                          {formatPrice(variant.price, variant.currency)} {variant.currency}
                        </span>
                      </div>
                      <div className="text-xs text-sf-muted mt-0.5">
                        {t('suggestedPrice')}
                      </div>
                      {variant.custom_price_min !== null && (
                        <div className="text-xs text-sf-body mt-1 font-medium">
                          {t('minimumFrom', { price: `${formatPrice(variant.custom_price_min, variant.currency)} ${variant.currency}` })}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Fixed pricing */
                    <div className="text-2xl md:text-3xl font-bold text-sf-heading text-center sm:text-right">
                      {formatPrice(variant.price, variant.currency)} {variant.currency}
                    </div>
                  )}

                  <button
                    className={`
                      px-6 py-2.5 rounded-full font-semibold transition-all duration-200 active:scale-[0.98] whitespace-nowrap
                      ${variant.is_featured
                        ? 'bg-sf-accent-bg text-white hover:bg-sf-accent-hover shadow-[var(--sf-shadow-accent)]'
                        : 'bg-sf-raised text-sf-heading hover:bg-sf-hover'
                      }
                    `}
                  >
                    {t('select')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <p className="text-center text-sm text-sf-muted mt-8 pb-10">
          {t('securePayment')}
        </p>
      </div>

      {/* Sellf branding — hidden when a valid license is active */}
      {!licenseValid && <SellfBranding />}
    </div>
  );
}
