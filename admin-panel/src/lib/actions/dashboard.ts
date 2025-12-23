'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminApi } from '@/lib/auth-server'

export async function getDashboardStats() {
  const supabase = await createClient()
  
  // Use the secure RPC call which checks for admin status internally
  const { data, error } = await supabase.rpc('get_dashboard_stats')
  
  if (error) {
    console.error('Error fetching dashboard stats:', error)
    return null
  }
  
  return data
}

export async function getRecentActivity() {
  const supabase = await createClient()
  
  // Verify admin
  try {
    await requireAdminApi(supabase)
  } catch {
    return []
  }

  const adminClient = createAdminClient()

  // 1. Get recent access grants
  const { data: accessGrants } = await adminClient
    .from('user_product_access')
    .select(`
      id,
      created_at,
      user_id,
      product_id,
      products(name)
    `)
    .order('created_at', { ascending: false })
    .limit(10)

  // 2. Get user emails from restricted view using adminClient
  const userIds = [...new Set((accessGrants || []).map(g => g.user_id))]
  const { data: users } = await adminClient
    .from('user_access_stats')
    .select('user_id, email')
    .in('user_id', userIds)

  const userEmailMap = new Map((users || []).map(u => [u.user_id, u.email]))

  // 3. Get recent products
  const { data: recentProducts } = await adminClient
    .from('products')
    .select('id, name, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  return {
    accessGrants: (accessGrants || []).map(g => ({
      ...g,
      user_email: userEmailMap.get(g.user_id) || g.user_id
    })),
    recentProducts: recentProducts || []
  }
}
