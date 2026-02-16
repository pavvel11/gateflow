'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { isDemoMode, DEMO_MODE_ERROR } from '@/lib/demo-guard';

export async function updateUserPreferences(preferences: {
  hideValues?: boolean;
  displayCurrency?: string | null;
  currencyViewMode?: 'grouped' | 'converted';
}) {
  if (isDemoMode()) throw new Error(DEMO_MODE_ERROR)
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('Unauthorized');
  }

  // Merge with existing metadata
  const currentMeta = user.user_metadata || {};
  const newMeta = {
    ...currentMeta,
    preferences: {
      ...(currentMeta.preferences || {}),
      ...preferences
    }
  };

  const { error } = await supabase.auth.updateUser({
    data: newMeta
  });

  if (error) {
    console.error('Error updating user preferences:', error);
    throw new Error('Failed to update preferences');
  }

  revalidatePath('/dashboard');
  return { success: true };
}
