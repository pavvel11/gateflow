import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SupabaseClient } from '@supabase/supabase-js';

export type AuthUser = {
  id: string;
  email: string;
};

/**
 * Verifies admin access for Server Components (Page/Layout).
 * Redirects on failure.
 */
export async function verifyAdminAccess(): Promise<AuthUser> {
  const supabase = await createClient();

  // 1. Check Auth Session
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user || !user.email) {
    redirect('/login');
  }

  // 2. Check Admin Status in Database
  const { data: adminNode, error: adminError } = await supabase
    .from('admin_users')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (adminError || !adminNode) {
    // User is logged in but not an admin
    console.warn(`Unauthorized access attempt by ${user.email}`);
    redirect('/'); 
  }

  return {
    id: user.id,
    email: user.email,
  };
}

/**
 * Verifies admin access for API Routes.
 * Throws specific errors to be caught by the route handler.
 */
export async function requireAdminApi(supabase: SupabaseClient) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Unauthorized');
  }

  const { data: admin, error: adminError } = await supabase
    .from('admin_users')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (adminError || !admin) {
    throw new Error('Forbidden');
  }

  return { user, admin };
}
