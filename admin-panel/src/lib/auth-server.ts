import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export type AuthUser = {
  id: string;
  email: string;
};

export async function verifyAdminAccess(): Promise<AuthUser> {
  const supabase = await createClient();

  // 1. Check Auth Session
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user || !user.email) {
    redirect('/login');
  }

  // 2. Check Admin Status in Database
  // We assume 'admin_users' table holds the admin registry
  const { data: adminNode, error: adminError } = await supabase
    .from('admin_users')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (adminError || !adminNode) {
    // User is logged in but not an admin
    console.warn(`Unauthorized access attempt by ${user.email}`);
    redirect('/'); // Redirect to home or specific access-denied page
  }

  return {
    id: user.id,
    email: user.email,
  };
}