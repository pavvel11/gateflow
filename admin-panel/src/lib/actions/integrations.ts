'use server'

import { createClient } from '@/lib/supabase/server'
import { validateIntegrations, validateScript, type IntegrationsInput, type CustomScriptInput } from '@/lib/validations/integrations'
import { validateLicense, extractDomainFromUrl } from '@/lib/license/verify'
import { revalidatePath } from 'next/cache'

// --- GLOBAL CONFIG ---

export async function getIntegrationsConfig() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('integrations_config').select('*').single()
  
  if (error && error.code === 'PGRST116') {
    return { cookie_consent_enabled: true, consent_logging_enabled: false } as any
  }
  return data
}

export async function updateIntegrationsConfig(values: IntegrationsInput) {
  const supabase = await createClient()
  const validation = validateIntegrations(values)
  if (!validation.isValid) return { error: 'Invalid fields', details: validation.errors }

  // Validate GateFlow license if provided
  if (values.gateflow_license) {
    // Get current site URL from environment
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
    const currentDomain = siteUrl ? extractDomainFromUrl(siteUrl) : null;

    const licenseValidation = validateLicense(values.gateflow_license, currentDomain || undefined);

    if (!licenseValidation.valid) {
      return {
        error: 'Invalid license',
        details: {
          gateflow_license: [licenseValidation.error || 'License validation failed']
        }
      };
    }
  }

  const { error } = await supabase.from('integrations_config')
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq('id', 1)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/integrations')
  return { success: true }
}

// --- SCRIPT MANAGER ---

export async function getScripts() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('custom_scripts').select('*').order('created_at', { ascending: false })
  if (error) return []
  return data
}

export async function addScript(values: CustomScriptInput) {
  const supabase = await createClient()
  const validation = validateScript(values)
  if (!validation.isValid) return { error: 'Invalid script', details: validation.errors }

  const { error } = await supabase.from('custom_scripts').insert(values)
  if (error) return { error: error.message }
  
  revalidatePath('/dashboard/integrations')
  return { success: true }
}

export async function deleteScript(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('custom_scripts').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/integrations')
  return { success: true }
}

export async function toggleScript(id: string, is_active: boolean) {
  const supabase = await createClient()
  const { error } = await supabase.from('custom_scripts').update({ is_active }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/integrations')
  return { success: true }
}

// --- PUBLIC API ---

export async function getPublicIntegrationsConfig() {
  const supabase = await createClient()
  // RPC returns a JSON object with config + scripts array
  const { data, error } = await supabase.rpc('get_public_integrations_config')
  
  if (error) {
    console.error('Failed to fetch public integrations config', error)
    return null
  }
  
  return data // Returns JSON object directly
}