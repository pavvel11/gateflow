'use server'

import { createClient } from '@/lib/supabase/server'

export interface ShopConfig {
  id: string
  default_currency: string
  shop_name: string
  contact_email?: string | null
  tax_rate?: number | null
  custom_settings: Record<string, any>
  created_at: string
  updated_at: string
}

/**
 * Get shop configuration (singleton)
 */
export async function getShopConfig(): Promise<ShopConfig | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('shop_config')
    .select('*')
    .single()

  if (error) {
    console.error('Error fetching shop config:', error)
    return null
  }

  return data as ShopConfig
}

/**
 * Get default shop currency
 */
export async function getDefaultCurrency(): Promise<string> {
  const config = await getShopConfig()
  return config?.default_currency || 'USD'
}

/**
 * Update shop configuration
 */
export async function updateShopConfig(updates: Partial<Omit<ShopConfig, 'id' | 'created_at' | 'updated_at'>>): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('shop_config')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', (await getShopConfig())?.id)

  if (error) {
    console.error('Error updating shop config:', error)
    return false
  }

  return true
}

/**
 * Set default shop currency
 */
export async function setDefaultCurrency(currency: string): Promise<boolean> {
  return updateShopConfig({ default_currency: currency })
}
