'use server'

import { createClient } from '@/lib/supabase/server'
import { validateIntegrations, type IntegrationsInput } from '@/lib/validations/integrations'
import { revalidatePath } from 'next/cache'

export async function getIntegrationsConfig() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('integrations_config')
    .select('*')
    .single()

  if (error) {
    // If no row exists (shouldn't happen due to migration insert, but safety check)
    if (error.code === 'PGRST116') {
      return {
        cookie_consent_enabled: true,
        consent_logging_enabled: false
      } as any
    }
    throw new Error(`Failed to fetch integrations config: ${error.message}`)
  }

  return data
}

export async function updateIntegrationsConfig(values: IntegrationsInput) {
  const supabase = await createClient()
  
  // Validate input using pure TS validation
  const validation = validateIntegrations(values)
  
  if (!validation.isValid) {
    return { error: 'Invalid fields', details: validation.errors }
  }

  const { error } = await supabase
    .from('integrations_config')
    .update({
      ...values,
      updated_at: new Date().toISOString()
    })
    .eq('id', 1) // Singleton

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/integrations')
  return { success: true }
}


export async function getPublicIntegrationsConfig() {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_public_integrations_config')
  
  if (error) {
    console.error('Failed to fetch public integrations config', error)
    return null
  }
  
  return data?.[0] || null
}

