// lib/actions/auth.ts
// Authentication actions with guest purchase claiming

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * Claim guest purchases when user signs up or signs in (SECURE VERSION)
 * Should be called after successful authentication
 */
export async function claimGuestPurchases(userEmail: string, userId: string, verificationToken?: string) {
  const supabase = await createClient();
  
  try {
    // Call the enhanced database function with email verification
    const { data, error } = await supabase.rpc('claim_guest_purchases_verified', {
      user_email: userEmail,
      user_id_param: userId,
      verification_token_param: verificationToken || null,
    });
    
    if (error) {
      console.error('Failed to claim guest purchases:', error);
      return { success: false, claimedCount: 0 };
    }
    
    // Revalidate relevant pages if purchases were claimed
    if (data > 0) {
      revalidatePath('/dashboard/products');
      revalidatePath('/my-products');
    }
    
    return { 
      success: true, 
      claimedCount: data || 0 
    };
  } catch (error) {
    console.error('Error claiming guest purchases:', error);
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
      console.error('Failed to check guest purchases:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error checking guest purchases:', error);
    return [];
  }
}
