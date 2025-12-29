'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface ShopConfig {
  id: string
  default_currency: string
  shop_name: string
  contact_email?: string | null
  tax_rate?: number | null

  // Branding & Whitelabel
  logo_url?: string | null
  primary_color?: string | null
  secondary_color?: string | null
  accent_color?: string | null
  font_family?: 'system' | 'inter' | 'roboto' | 'montserrat' | 'poppins' | 'playfair' | null

  // EU Omnibus Directive (2019/2161)
  omnibus_enabled: boolean

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

  // Get current config first
  const config = await getShopConfig()
  if (!config) {
    console.error('No shop config found to update')
    return false
  }

  const { error } = await supabase
    .from('shop_config')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', config.id)

  if (error) {
    console.error('Error updating shop config:', error)
    return false
  }

  // Revalidate all dashboard pages that might use shop config
  revalidatePath('/dashboard', 'layout')

  return true
}

/**
 * Set default shop currency
 */
export async function setDefaultCurrency(currency: string): Promise<boolean> {
  return updateShopConfig({ default_currency: currency })
}
