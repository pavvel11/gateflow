'use server'

import { createClient } from '@/lib/supabase/server'
import { createCurrencyService } from '@/lib/services/currencyService'

/**
 * Sync exchange rates from external API to database
 */
export async function syncExchangeRates(baseCurrency: string = 'USD'): Promise<{
  success: boolean
  message: string
  ratesCount?: number
}> {
  try {
    const supabase = await createClient()

    // Verify admin access
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) {
      return { success: false, message: 'Unauthorized' }
    }

    const { data: adminData } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', userData.user.id)
      .single()

    if (!adminData) {
      return { success: false, message: 'Admin access required' }
    }

    // Fetch rates from API
    const currencyService = createCurrencyService()
    const ratesData = await currencyService.fetchRates(baseCurrency)

    // Prepare batch insert
    const ratesToInsert = Object.entries(ratesData.rates).map(([targetCurrency, rate]) => ({
      base_currency: ratesData.base,
      target_currency: targetCurrency,
      rate,
      source: ratesData.source,
      fetched_at: new Date(ratesData.timestamp).toISOString(),
    }))

    // Insert rates into database
    const { error: insertError } = await supabase
      .from('exchange_rates')
      .insert(ratesToInsert)

    if (insertError) {
      console.error('Error inserting exchange rates:', insertError)
      return { success: false, message: `Database error: ${insertError.message}` }
    }

    // Refresh materialized view
    const { error: refreshError } = await supabase.rpc('refresh_latest_exchange_rates')

    if (refreshError) {
      console.warn('Warning: Could not refresh materialized view:', refreshError)
      // Non-critical, continue
    }

    return {
      success: true,
      message: `Successfully synced ${ratesToInsert.length} rates from ${ratesData.source}`,
      ratesCount: ratesToInsert.length,
    }
  } catch (error: any) {
    console.error('Error syncing exchange rates:', error)
    return { success: false, message: error.message || 'Unknown error' }
  }
}

/**
 * Get latest exchange rates from database
 */
export async function getLatestExchangeRates(): Promise<{
  [pair: string]: { rate: number; source: string; fetchedAt: string }
}> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('latest_exchange_rates')
    .select('base_currency, target_currency, rate, source, fetched_at')

  if (error) {
    console.error('Error fetching exchange rates:', error)
    return {}
  }

  // Convert to key-value format
  const rates: any = {}
  data?.forEach((row) => {
    const key = `${row.base_currency}/${row.target_currency}`
    rates[key] = {
      rate: row.rate,
      source: row.source,
      fetchedAt: row.fetched_at,
    }
  })

  return rates
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
