'use server'

import { createClient } from '@/lib/supabase/server'
import { createCurrencyService, type ExchangeRates } from '@/lib/services/currencyService'

/**
 * Fetch exchange rates (cached by Next.js for 1 hour)
 * This is a server action that uses Next.js fetch cache
 */
export async function getExchangeRates(baseCurrency: string = 'USD'): Promise<ExchangeRates | null> {
  try {
    const currencyService = createCurrencyService()
    const rates = await currencyService.fetchRates(baseCurrency)
    return rates
  } catch (error: any) {
    console.error('Error fetching exchange rates:', error)
    return null
  }
}

/**
 * Convert amount from one currency to another using cached rates
 */
export async function convertCurrencyAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number | null> {
  try {
    if (fromCurrency === toCurrency) return amount

    const currencyService = createCurrencyService()

    console.log(`[convertCurrencyAmount] Converting ${amount} from ${fromCurrency} to ${toCurrency}`)

    // Fetch rates with 'from' as base currency
    const rates = await currencyService.fetchRates(fromCurrency)

    if (!rates) {
      console.error(`[convertCurrencyAmount] No rates returned for base ${fromCurrency}`)
      return null
    }

    if (!rates.rates[toCurrency]) {
      console.error(`[convertCurrencyAmount] No rate found for ${fromCurrency} → ${toCurrency}. Available rates:`, Object.keys(rates.rates))
      return null
    }

    const convertedAmount = currencyService.convert(amount, fromCurrency, toCurrency, rates)
    console.log(`[convertCurrencyAmount] Converted ${amount} ${fromCurrency} → ${Math.round(convertedAmount)} ${toCurrency} (rate: ${rates.rates[toCurrency]})`)
    return Math.round(convertedAmount) // Round to nearest cent
  } catch (error: any) {
    console.error(`[convertCurrencyAmount] Error converting ${amount} from ${fromCurrency} to ${toCurrency}:`, error.message)
    return null
  }
}

/**
 * Get all unique currencies used in transactions
 */
export async function getUsedCurrencies(): Promise<string[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('payment_transactions')
    .select('currency')
    .eq('status', 'completed')

  if (error) {
    console.error('Error fetching currencies:', error)
    return []
  }

  // Get unique currencies
  const currencies = [...new Set(data?.map((row) => row.currency) || [])]
  return currencies.sort()
}
