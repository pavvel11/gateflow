'use client';

/**
 * OmnibusPrice Component
 * Displays lowest price from last 30 days as required by EU Omnibus Directive (2019/2161)
 */

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

interface OmnibusPriceProps {
  productId: string;
  currentPrice: number;
  currency: string;
}

interface LowestPriceData {
  lowestPrice: number | null;
  currency: string | null;
  effectiveFrom: string | null;
}

export default function OmnibusPrice({
  productId,
  currentPrice,
  currency
}: OmnibusPriceProps) {
  const t = useTranslations('omnibus');
  const [lowestPriceData, setLowestPriceData] = useState<LowestPriceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLowestPrice() {
      try {
        const response = await fetch(`/api/products/${productId}/lowest-price`);
        if (response.ok) {
          const data = await response.json();
          setLowestPriceData(data);
        }
      } catch (error) {
        console.error('Failed to fetch Omnibus price:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchLowestPrice();
  }, [productId]);

  // Don't show anything while loading
  if (loading) {
    return null;
  }

  // Don't show if no lowest price data (feature disabled, product exempt, or no price history)
  if (!lowestPriceData || lowestPriceData.lowestPrice === null) {
    return null;
  }

  // Only show if current price is lower than historical lowest (i.e., there's a discount)
  if (currentPrice >= lowestPriceData.lowestPrice) {
    return null;
  }

  // Format price using Intl.NumberFormat
  const formatter = new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: lowestPriceData.currency || currency,
  });

  return (
    <div className="text-sm text-gray-600 dark:text-gray-400 mt-2" data-testid="omnibus-price">
      {t('lowestPriceLast30Days', {
        price: formatter.format(lowestPriceData.lowestPrice)
      })}
    </div>
  );
}
