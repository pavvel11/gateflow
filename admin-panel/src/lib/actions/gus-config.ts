'use server';

import { createClient } from '@/lib/supabase/server';
import { encryptGUSKey, decryptGUSKey } from '@/lib/services/gus-encryption';
import { revalidatePath } from 'next/cache';

export interface GUSConfig {
  enabled: boolean;
  hasKey: boolean;
}

export interface SaveGUSKeyInput {
  apiKey: string;
  enabled: boolean;
}

interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
}

/**
 * Saves/updates GUS API key in shop_config.custom_settings
 */
export async function saveGUSAPIKey(input: SaveGUSKeyInput): Promise<ActionResponse<void>> {
  try {
    const supabase = await createClient();

    // Verify admin permissions
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        error: 'Unauthorized - no user session',
        errorCode: 'UNAUTHORIZED'
      };
    }

    const { data: adminCheck } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .single();

    if (!adminCheck) {
      return {
        success: false,
        error: 'Forbidden - admin access required',
        errorCode: 'FORBIDDEN'
      };
    }

    // Basic validation
    const trimmedKey = input.apiKey.trim();

    // If KEEP_EXISTING sentinel, only update enabled status without touching the key
    if (trimmedKey === 'KEEP_EXISTING') {
      const { error } = await supabase
        .from('integrations_config')
        .update({
          gus_api_enabled: input.enabled,
          updated_at: new Date().toISOString()
        })
        .eq('id', 1);

      if (error) {
        console.error('[saveGUSAPIKey] Failed to update enabled status:', error);
        return {
          success: false,
          error: 'Failed to update configuration',
          errorCode: 'DATABASE_ERROR'
        };
      }

      revalidatePath('/dashboard/integrations');
      return { success: true };
    }

    // Validate new key
    if (!trimmedKey) {
      return {
        success: false,
        error: 'API key is required',
        errorCode: 'INVALID_INPUT'
      };
    }

    if (trimmedKey.length < 10) {
      return {
        success: false,
        error: 'API key seems too short',
        errorCode: 'INVALID_INPUT'
      };
    }

    // Encrypt the API key
    const encrypted = await encryptGUSKey(trimmedKey);

    // Update integrations_config with encrypted GUS key
    const { error } = await supabase
      .from('integrations_config')
      .update({
        gus_api_key_encrypted: encrypted.encryptedKey,
        gus_api_key_iv: encrypted.iv,
        gus_api_key_tag: encrypted.tag,
        gus_api_enabled: input.enabled,
        updated_at: new Date().toISOString()
      })
      .eq('id', 1); // integrations_config is a singleton table

    if (error) {
      console.error('[saveGUSAPIKey] Database update error:', error);
      return {
        success: false,
        error: 'Failed to save configuration',
        errorCode: 'DATABASE_ERROR'
      };
    }

    revalidatePath('/dashboard/integrations');

    return { success: true };
  } catch (error) {
    console.error('Error saving GUS API key:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorCode: 'UNKNOWN_ERROR'
    };
  }
}

/**
 * Gets GUS configuration status (without decrypting the key)
 * Checks both .env and database for key presence
 */
export async function getGUSConfig(): Promise<ActionResponse<GUSConfig>> {
  try {
    // Check if key is in environment (METHOD 1)
    const envKey = process.env.GUS_API_KEY;
    const hasEnvKey = !!(envKey && envKey.trim().length > 0);

    // Check database for encrypted key (METHOD 2)
    const supabase = await createClient();

    const { data: config } = await supabase
      .from('integrations_config')
      .select('gus_api_key_encrypted, gus_api_enabled')
      .eq('id', 1)
      .single();

    const hasDatabaseKey = !!(config?.gus_api_key_encrypted);
    const enabled = config?.gus_api_enabled === true;

    // Key exists if either method has a key
    const hasKey = hasEnvKey || hasDatabaseKey;

    return {
      success: true,
      data: {
        enabled: hasEnvKey || enabled, // If env key exists, consider it enabled
        hasKey,
      }
    };
  } catch (error) {
    console.error('Error fetching GUS config:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorCode: 'UNKNOWN_ERROR'
    };
  }
}

/**
 * Gets decrypted GUS API key (server-side only)
 *
 * Method priority:
 * 1. GUS_API_KEY from .env (METHOD 1 - recommended for developers)
 * 2. Encrypted key from database (METHOD 2 - recommended for non-technical users)
 *
 * Returns null if not configured or if GUS is disabled
 */
export async function getDecryptedGUSAPIKey(): Promise<string | null> {
  try {
    // METHOD 1: Check if GUS_API_KEY is set in environment
    const envKey = process.env.GUS_API_KEY;
    if (envKey && envKey.trim().length > 0) {
      return envKey.trim();
    }

    // METHOD 2: Fallback to encrypted key from database
    const supabase = await createClient();

    const { data: config } = await supabase
      .from('integrations_config')
      .select('gus_api_key_encrypted, gus_api_key_iv, gus_api_key_tag, gus_api_enabled')
      .eq('id', 1)
      .single();

    // Check if GUS is enabled
    if (config?.gus_api_enabled !== true) {
      return null;
    }

    // Check if key exists
    if (!config?.gus_api_key_encrypted) {
      return null;
    }

    // Decrypt and return
    const decrypted = await decryptGUSKey({
      encrypted_key: config.gus_api_key_encrypted,
      encryption_iv: config.gus_api_key_iv,
      encryption_tag: config.gus_api_key_tag,
    });

    return decrypted;
  } catch (error) {
    console.error('Error decrypting GUS API key:', error);
    return null;
  }
}

/**
 * Deletes GUS API key from integrations_config
 */
export async function deleteGUSAPIKey(): Promise<ActionResponse<void>> {
  try {
    const supabase = await createClient();

    // Verify admin permissions
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        error: 'Unauthorized',
        errorCode: 'UNAUTHORIZED'
      };
    }

    const { data: adminCheck } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .single();

    if (!adminCheck) {
      return {
        success: false,
        error: 'Forbidden',
        errorCode: 'FORBIDDEN'
      };
    }

    // Clear GUS keys from integrations_config
    const { error } = await supabase
      .from('integrations_config')
      .update({
        gus_api_key_encrypted: null,
        gus_api_key_iv: null,
        gus_api_key_tag: null,
        gus_api_enabled: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', 1);

    if (error) {
      console.error('Failed to delete GUS API key:', error);
      return {
        success: false,
        error: 'Failed to delete configuration',
        errorCode: 'DATABASE_ERROR'
      };
    }

    revalidatePath('/dashboard/integrations');

    return { success: true };
  } catch (error) {
    console.error('Error deleting GUS API key:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorCode: 'UNKNOWN_ERROR'
    };
  }
}
