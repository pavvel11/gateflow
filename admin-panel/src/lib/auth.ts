import { createClient } from '@/lib/supabase/server';

export async function isAdmin(userId?: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    
    // If no userId provided, get current user
    let targetUserId = userId;
    if (!targetUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return false; // No authenticated user
      }
      targetUserId = user.id;
    }

    // Check if user is admin using the database function
    const { data, error } = await supabase
      .rpc('is_admin', { user_id_param: targetUserId });

    if (error) {
      console.error('Error checking admin status:', error);
      return false;
    }

    return data || false;
  } catch (error) {
    console.error('Error in isAdmin:', error);
    return false;
  }
}

export async function requireAdmin() {
  const adminStatus = await isAdmin();
  if (!adminStatus) {
    throw new Error('Admin access required');
  }
  return adminStatus;
}

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }
  
  return user;
}
