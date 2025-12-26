import { useState, useCallback } from 'react';
import { convertCurrencyAmount } from '@/lib/actions/currency';
import { CurrencyAmount } from '@/lib/actions/analytics';

/**
 * Hook to convert CurrencyAmount objects to a single target currency
 */
export function useCurrencyConversion() {
  const [converting, setConverting] = useState(false);

  /**
   * Convert a CurrencyAmount object to a single currency
   * Returns the total amount in the target currency
   */
  const convertToSingleCurrency = useCallback(async (
    amounts: CurrencyAmount,
    targetCurrency: string
  ): Promise<number> => {
    if (!amounts || Object.keys(amounts).length === 0) {
      return 0;
    }

    // If only one currency and it matches target, return directly
    const currencies = Object.keys(amounts);
    if (currencies.length === 1 && currencies[0] === targetCurrency) {
      return amounts[targetCurrency];
    }

    setConverting(true);
    try {
      let total = 0;

      // Convert each currency amount to target currency
      for (const [currency, amount] of Object.entries(amounts)) {
        if (currency === targetCurrency) {
          // Same currency, no conversion needed
          total += amount;
        } else {
          // Convert to target currency
          const converted = await convertCurrencyAmount(amount, currency, targetCurrency);
          if (converted !== null) {
            total += converted;
          } else {
            console.error(`Failed to convert ${amount} from ${currency} to ${targetCurrency} - skipping this amount`);
            // CRITICAL: Do NOT add raw amount as it's in different currency!
            // This would cause incorrect totals (e.g., adding GBP cents to USD total)
            // Instead, skip this amount and log error
            // TODO: Consider implementing fallback conversion logic or showing error to user
          }
        }
      }

      return total;
    } finally {
      setConverting(false);
    }
  }, []);

  /**
   * Convert array of CurrencyAmount objects
   * Useful for chart data
   */
  const convertMultipleCurrencies = useCallback(async (
    amountsArray: CurrencyAmount[],
    targetCurrency: string
  ): Promise<number[]> => {
    setConverting(true);
    try {
      const results = await Promise.all(
        amountsArray.map(amounts => convertToSingleCurrency(amounts, targetCurrency))
      );
      return results;
    } finally {
      setConverting(false);
    }
  }, [convertToSingleCurrency]);

  return {
    convertToSingleCurrency,
    convertMultipleCurrencies,
    converting
  };
}
