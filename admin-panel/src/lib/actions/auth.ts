// lib/actions/auth.ts
// Authentication actions with guest purchase claiming

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * Claim guest purchases when user signs up or signs in (SECURE VERSION)
 * Should be called after successful authentication
 */
export async function claimGuestPurchases(userEmail: string, userId: string) {
  const supabase = await createClient();
  
  try {
    // Call the database function to claim guest purchases
    const { data, error } = await supabase.rpc('claim_guest_purchases_for_user', {
      p_user_id: userId,
    });
    
    if (error) {
      return { success: false, claimedCount: 0 };
    }
    
    // Parse the result (function returns json object)
    const result = data as { success: boolean; claimed_count: number; message?: string };
    
    // Revalidate relevant pages if purchases were claimed
    if (result.success && result.claimed_count > 0) {
      revalidatePath('/dashboard/products');
      revalidatePath('/my-products');
    }
    
    return { 
      success: result.success, 
      claimedCount: result.claimed_count || 0 
    };
  } catch {
    return { success: false, claimedCount: 0 };
  }
}

/**
 * Check if user has any guest purchases available to claim
 */
export async function checkGuestPurchases(userEmail: string) {
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase
      .from('guest_purchases')
      .select('product_id, products(name, slug)')
      .eq('customer_email', userEmail)
      .is('claimed_by_user_id', null);
    
    if (error) {
      return [];
    }
    
    return data || [];
  } catch {
    return [];
  }
}
