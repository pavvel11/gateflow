import { createClient } from '@/lib/supabase/server';

export async function claimGuestPurchases(userId: string) {
  const supabase = await createClient();
  
  try {
    // Call the RPC function to claim guest purchases
    const { data, error } = await supabase.rpc('claim_guest_purchases_for_user', {
      p_user_id: userId
    });
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
    
  } catch {
    return { success: false, error: 'Failed to process guest purchases' };
  }
}
