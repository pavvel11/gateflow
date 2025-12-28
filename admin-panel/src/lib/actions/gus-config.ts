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

    // Get existing shop_config
    const { data: config } = await supabase
      .from('shop_config')
      .select('id, custom_settings')
      .single();

    if (!config) {
      return {
        success: false,
        error: 'Shop configuration not found',
        errorCode: 'CONFIG_NOT_FOUND'
      };
    }

    const customSettings = (config.custom_settings as Record<string, any>) || {};

    // Update custom_settings with encrypted GUS key
    const updatedSettings = {
      ...customSettings,
      gus_api_key_encrypted: encrypted.encryptedKey,
      gus_api_key_iv: encrypted.iv,
      gus_api_key_tag: encrypted.tag,
      gus_api_enabled: input.enabled,
      gus_api_updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('shop_config')
      .update({
        custom_settings: updatedSettings,
        updated_at: new Date().toISOString()
      })
      .eq('id', config.id);

    if (error) {
      console.error('Failed to save GUS API key:', error);
      return {
        success: false,
        error: 'Failed to save configuration',
        errorCode: 'DATABASE_ERROR'
      };
    }

    revalidatePath('/dashboard/settings');

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
      .from('shop_config')
      .select('custom_settings')
      .single();

    const customSettings = (config?.custom_settings as Record<string, any>) || {};

    const hasDatabaseKey = !!customSettings.gus_api_key_encrypted;
    const enabled = customSettings.gus_api_enabled === true;

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
      .from('shop_config')
      .select('custom_settings')
      .single();

    const customSettings = (config?.custom_settings as Record<string, any>) || {};

    // Check if GUS is enabled
    if (customSettings.gus_api_enabled !== true) {
      return null;
    }

    // Check if key exists
    if (!customSettings.gus_api_key_encrypted) {
      return null;
    }

    // Decrypt and return
    const decrypted = await decryptGUSKey({
      encrypted_key: customSettings.gus_api_key_encrypted,
      encryption_iv: customSettings.gus_api_key_iv,
      encryption_tag: customSettings.gus_api_key_tag,
    });

    return decrypted;
  } catch (error) {
    console.error('Error decrypting GUS API key:', error);
    return null;
  }
}

/**
 * Deletes GUS API key from shop_config
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

    // Get existing shop_config
    const { data: config } = await supabase
      .from('shop_config')
      .select('id, custom_settings')
      .single();

    if (!config) {
      return {
        success: false,
        error: 'Shop configuration not found',
        errorCode: 'CONFIG_NOT_FOUND'
      };
    }

    const customSettings = (config.custom_settings as Record<string, any>) || {};

    // Remove GUS keys from custom_settings
    const {
      gus_api_key_encrypted,
      gus_api_key_iv,
      gus_api_key_tag,
      gus_api_enabled,
      gus_api_updated_at,
      ...remainingSettings
    } = customSettings;

    const { error } = await supabase
      .from('shop_config')
      .update({
        custom_settings: remainingSettings,
        updated_at: new Date().toISOString()
      })
      .eq('id', config.id);

    if (error) {
      console.error('Failed to delete GUS API key:', error);
      return {
        success: false,
        error: 'Failed to delete configuration',
        errorCode: 'DATABASE_ERROR'
      };
    }

    revalidatePath('/dashboard/settings');

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
