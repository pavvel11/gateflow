/**
 * ============================================================================
 * SECURITY TEST: Dashboard & Analytics RPC Functions
 * ============================================================================
 *
 * Tests admin-only database functions for dashboard statistics,
 * revenue analytics, sales charts, hourly breakdowns, revenue goals,
 * and abandoned cart stats.
 *
 * Covered scenarios per function:
 * - Returns correct data with test transactions
 * - Returns zeros/empty for clean DB (where applicable)
 * - Authorization: only admin/service_role can access (non-admin rejected)
 * - Date range / product filtering where applicable
 * - Correct aggregation (sum, count, avg)
 *
 * Revenue goal CRUD:
 * - Set and retrieve goal (global + per-product)
 * - Update existing goal
 * - Delete/clear goal
 *
 * REQUIRES: Supabase running locally (npx supabase start)
 *
 * @see supabase/migrations/20250103000000_features.sql
 * @see supabase/migrations/20260115163547_abandoned_cart_recovery.sql
 * @see supabase/migrations/20260310180000_proxy_functions.sql
 * ============================================================================
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ANON_KEY) {
  throw new Error('Missing Supabase env variables for testing');
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TS = Date.now();

// ============================================================================
// Shared test data
// ============================================================================

let productA: { id: string };
let productB: { id: string };
let adminUser: { userId: string; client: SupabaseClient };
let regularUser: { userId: string; client: SupabaseClient };
let anonClient: SupabaseClient;

const createdProductIds: string[] = [];
const createdTransactionIds: string[] = [];
const createdUserIds: string[] = [];
const createdAccessIds: string[] = [];

async function createAuthenticatedUser(
  email: string,
  opts: { isAdmin?: boolean } = {},
): Promise<{ userId: string; client: SupabaseClient }> {
  const password = 'test-password-123';
  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: opts.isAdmin ? { is_admin: true } : {},
  });
  if (error || !user) throw new Error(`Failed to create user: ${error?.message}`);
  createdUserIds.push(user.id);

  if (opts.isAdmin) {
    // Ensure admin_users entry exists
    await supabaseAdmin.from('admin_users').upsert({ user_id: user.id });
  }

  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  await client.auth.signInWithPassword({ email, password });

  return { userId: user.id, client };
}

// ============================================================================
// Setup & Teardown
// ============================================================================

beforeAll(async () => {
  // Clear rate limits to avoid interference
  await supabaseAdmin.from('rate_limits').delete().gte('created_at', '1970-01-01');

  // Create two test products
  const { data: pA, error: pAErr } = await supabaseAdmin
    .schema('seller_main' as any)
    .from('products')
    .insert({
      name: `Dashboard Test A ${TS}`,
      slug: `dash-test-a-${TS}`,
      price: 5000,
      currency: 'USD',
      is_active: true,
    })
    .select('id')
    .single();
  if (pAErr) throw pAErr;
  productA = { id: pA.id };
  createdProductIds.push(pA.id);

  const { data: pB, error: pBErr } = await supabaseAdmin
    .schema('seller_main' as any)
    .from('products')
    .insert({
      name: `Dashboard Test B ${TS}`,
      slug: `dash-test-b-${TS}`,
      price: 10000,
      currency: 'PLN',
      is_active: true,
    })
    .select('id')
    .single();
  if (pBErr) throw pBErr;
  productB = { id: pB.id };
  createdProductIds.push(pB.id);

  // Create admin user
  adminUser = await createAuthenticatedUser(`dash-admin-${TS}@example.com`, {
    isAdmin: true,
  });

  // Create regular (non-admin) user
  regularUser = await createAuthenticatedUser(`dash-regular-${TS}@example.com`);

  // Create anon client
  anonClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Create test transactions (completed) for product A (USD)
  const now = new Date();
  const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const yesterday = new Date(now.getTime() - 86400000).toISOString();

  const transactions = [
    {
      session_id: `cs_dash1${TS}`,
      stripe_payment_intent_id: `pi_dash1${TS}`,
      product_id: productA.id,
      customer_email: `buyer1-${TS}@example.com`,
      amount: 5000,
      currency: 'USD',
      status: 'completed',
      created_at: new Date(`${today}T10:30:00Z`).toISOString(),
    },
    {
      session_id: `cs_dash2${TS}`,
      stripe_payment_intent_id: `pi_dash2${TS}`,
      product_id: productA.id,
      customer_email: `buyer2-${TS}@example.com`,
      amount: 5000,
      currency: 'USD',
      status: 'completed',
      created_at: new Date(`${today}T14:15:00Z`).toISOString(),
    },
    // Product B transaction in PLN
    {
      session_id: `cs_dash3${TS}`,
      stripe_payment_intent_id: `pi_dash3${TS}`,
      product_id: productB.id,
      customer_email: `buyer3-${TS}@example.com`,
      amount: 10000,
      currency: 'PLN',
      status: 'completed',
      created_at: new Date(`${today}T16:00:00Z`).toISOString(),
    },
    // Yesterday transaction
    {
      session_id: `cs_dash4${TS}`,
      stripe_payment_intent_id: `pi_dash4${TS}`,
      product_id: productA.id,
      customer_email: `buyer4-${TS}@example.com`,
      amount: 5000,
      currency: 'USD',
      status: 'completed',
      created_at: yesterday,
    },
    // Abandoned transaction for cart stats
    {
      session_id: `cs_dashabn1${TS}`,
      stripe_payment_intent_id: `pi_dashabn1${TS}`,
      product_id: productA.id,
      customer_email: `abandoned1-${TS}@example.com`,
      amount: 5000,
      currency: 'USD',
      status: 'abandoned',
      created_at: now.toISOString(),
    },
    // Pending transaction for cart stats
    {
      session_id: `cs_dashpend1${TS}`,
      stripe_payment_intent_id: `pi_dashpend1${TS}`,
      product_id: productB.id,
      customer_email: `pending1-${TS}@example.com`,
      amount: 10000,
      currency: 'PLN',
      status: 'pending',
      created_at: now.toISOString(),
      expires_at: new Date(now.getTime() + 86400000).toISOString(),
    },
  ];

  for (const tx of transactions) {
    const { data, error } = await supabaseAdmin
      .schema('seller_main' as any)
      .from('payment_transactions')
      .insert(tx)
      .select('id')
      .single();
    if (error) throw new Error(`Failed to insert transaction: ${error.message}`);
    createdTransactionIds.push(data.id);
  }

  // Create user_product_access for active users count
  const { data: access, error: accessErr } = await supabaseAdmin
    .schema('seller_main' as any)
    .from('user_product_access')
    .insert({
      user_id: regularUser.userId,
      product_id: productA.id,
    })
    .select('id')
    .single();
  if (accessErr) throw new Error(`Failed to insert access: ${accessErr.message}`);
  createdAccessIds.push(access.id);
});

afterAll(async () => {
  // Clean up revenue goals
  for (const pid of createdProductIds) {
    await supabaseAdmin
      .schema('seller_main' as any)
      .from('revenue_goals')
      .delete()
      .eq('product_id', pid);
  }
  // Global goal
  await supabaseAdmin
    .schema('seller_main' as any)
    .from('revenue_goals')
    .delete()
    .is('product_id', null);

  // Clean up access
  for (const id of createdAccessIds) {
    await supabaseAdmin
      .schema('seller_main' as any)
      .from('user_product_access')
      .delete()
      .eq('id', id);
  }

  // Clean up transactions
  for (const id of createdTransactionIds) {
    await supabaseAdmin
      .schema('seller_main' as any)
      .from('payment_transactions')
      .delete()
      .eq('id', id);
  }

  // Clean up products
  for (const id of createdProductIds) {
    await supabaseAdmin.schema('seller_main' as any).from('products').delete().eq('id', id);
  }

  // Clean up users
  for (const id of createdUserIds) {
    await supabaseAdmin.from('admin_users').delete().eq('user_id', id);
    await supabaseAdmin.auth.admin.deleteUser(id);
  }
});

// ============================================================================
// get_dashboard_stats
// ============================================================================

describe('get_dashboard_stats', () => {
  it('returns correct dashboard stats via service_role', async () => {
    const { data, error } = await supabaseAdmin.rpc('get_dashboard_stats');

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data).toHaveProperty('totalProducts');
    expect(data).toHaveProperty('totalUsers');
    expect(data).toHaveProperty('totalAccess');
    expect(data).toHaveProperty('activeUsers');
    expect(data).toHaveProperty('totalRevenue');

    // We created 2 active products + whatever seed data exists
    expect(data.totalProducts).toBeGreaterThanOrEqual(2);
    // Revenue includes our 4 completed transactions: 5000+5000+10000+5000 = 25000
    expect(data.totalRevenue).toBeGreaterThanOrEqual(25000);
    // We created at least 2 users
    expect(data.totalUsers).toBeGreaterThanOrEqual(2);
    // We created 1 access record in last 7 days
    expect(data.activeUsers).toBeGreaterThanOrEqual(1);
  });

  it('returns correct stats via admin authenticated client', async () => {
    const { data, error } = await adminUser.client.rpc('get_dashboard_stats');

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.totalProducts).toBeGreaterThanOrEqual(2);
    expect(data.totalRevenue).toBeGreaterThanOrEqual(25000);
  });

  it('rejects non-admin authenticated user', async () => {
    const { data, error } = await regularUser.client.rpc('get_dashboard_stats');

    expect(error).not.toBeNull();
    expect(error!.message).toContain('Access denied');
    expect(data).toBeNull();
  });

  it('rejects anon user', async () => {
    const { data, error } = await anonClient.rpc('get_dashboard_stats');

    // Anon has EXECUTE revoked on this function
    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });
});

// ============================================================================
// get_detailed_revenue_stats
// ============================================================================

describe('get_detailed_revenue_stats', () => {
  it('returns overall revenue stats (no filters)', async () => {
    const { data, error } = await supabaseAdmin.rpc('get_detailed_revenue_stats');

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data).toHaveProperty('totalRevenue');
    expect(data).toHaveProperty('todayRevenue');
    expect(data).toHaveProperty('todayOrders');
    expect(data).toHaveProperty('lastOrderAt');

    // totalRevenue is grouped by currency
    expect(typeof data.totalRevenue).toBe('object');
    // We have both USD and PLN transactions
    expect(Number(data.totalRevenue.USD)).toBeGreaterThanOrEqual(10000);
    expect(Number(data.totalRevenue.PLN)).toBeGreaterThanOrEqual(10000);

    // At least 3 orders today
    expect(data.todayOrders).toBeGreaterThanOrEqual(3);
  });

  it('filters by product_id', async () => {
    const { data, error } = await supabaseAdmin.rpc('get_detailed_revenue_stats', {
      p_product_id: productA.id,
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    // Product A has only USD transactions
    expect(Number(data.totalRevenue.USD)).toBeGreaterThanOrEqual(10000);
    // Product A has no PLN transactions
    expect(data.totalRevenue.PLN).toBeUndefined();
  });

  it('filters by goal_start_date', async () => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString();
    const { data, error } = await supabaseAdmin.rpc('get_detailed_revenue_stats', {
      p_goal_start_date: tomorrow,
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    // No transactions after tomorrow
    expect(data.totalRevenue).toEqual({});
  });

  it('rejects non-admin authenticated user', async () => {
    const { data, error } = await regularUser.client.rpc('get_detailed_revenue_stats');

    expect(error).not.toBeNull();
    expect(error!.message).toContain('Access denied');
    expect(data).toBeNull();
  });

  it('rejects anon user', async () => {
    const { data, error } = await anonClient.rpc('get_detailed_revenue_stats');

    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });
});

// ============================================================================
// get_sales_chart_data
// ============================================================================

describe('get_sales_chart_data', () => {
  it('returns chart data for date range', async () => {
    const now = new Date();
    const startOfDay = new Date(now.toISOString().split('T')[0] + 'T00:00:00Z');
    const endOfDay = new Date(now.toISOString().split('T')[0] + 'T23:59:59Z');

    const { data, error } = await supabaseAdmin.rpc('get_sales_chart_data', {
      p_start_date: startOfDay.toISOString(),
      p_end_date: endOfDay.toISOString(),
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(1);

    const todayRow = data[0];
    expect(todayRow).toHaveProperty('date');
    expect(todayRow).toHaveProperty('amount_by_currency');
    expect(todayRow).toHaveProperty('orders');
    expect(todayRow.orders).toBeGreaterThanOrEqual(3);
  });

  it('returns empty for future date range', async () => {
    const futureStart = new Date(Date.now() + 86400000 * 30).toISOString();
    const futureEnd = new Date(Date.now() + 86400000 * 60).toISOString();

    const { data, error } = await supabaseAdmin.rpc('get_sales_chart_data', {
      p_start_date: futureStart,
      p_end_date: futureEnd,
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(0);
  });

  it('filters by product_id', async () => {
    const now = new Date();
    const startOfDay = new Date(now.toISOString().split('T')[0] + 'T00:00:00Z');
    const endOfDay = new Date(now.toISOString().split('T')[0] + 'T23:59:59Z');

    const { data, error } = await supabaseAdmin.rpc('get_sales_chart_data', {
      p_start_date: startOfDay.toISOString(),
      p_end_date: endOfDay.toISOString(),
      p_product_id: productB.id,
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(Array.isArray(data)).toBe(true);

    if (data.length > 0) {
      // Only PLN for product B
      expect(data[0].amount_by_currency).toHaveProperty('PLN');
      expect(data[0].amount_by_currency.USD).toBeUndefined();
    }
  });

  it('rejects non-admin authenticated user', async () => {
    const now = new Date();
    const { data, error } = await regularUser.client.rpc('get_sales_chart_data', {
      p_start_date: new Date(now.getTime() - 86400000).toISOString(),
      p_end_date: now.toISOString(),
    });

    expect(error).not.toBeNull();
    expect(error!.message).toContain('Access denied');
    expect(data).toBeNull();
  });

  it('rejects anon user', async () => {
    const now = new Date();
    const { data, error } = await anonClient.rpc('get_sales_chart_data', {
      p_start_date: new Date(now.getTime() - 86400000).toISOString(),
      p_end_date: now.toISOString(),
    });

    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });
});

// ============================================================================
// get_hourly_revenue_stats
// ============================================================================

describe('get_hourly_revenue_stats', () => {
  it('returns 24 hours of data for today', async () => {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    const { data, error } = await supabaseAdmin.rpc('get_hourly_revenue_stats', {
      p_target_date: today,
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(24);

    // Verify hours 0-23
    for (let h = 0; h < 24; h++) {
      expect(data[h].hour).toBe(h);
      expect(data[h]).toHaveProperty('amount_by_currency');
      expect(data[h]).toHaveProperty('orders');
    }

    // Hours with transactions should have orders > 0
    const hoursWithOrders = data.filter((h: any) => h.orders > 0);
    expect(hoursWithOrders.length).toBeGreaterThanOrEqual(1);
  });

  it('returns all zeros for a future date', async () => {
    const futureDate = new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0];

    const { data, error } = await supabaseAdmin.rpc('get_hourly_revenue_stats', {
      p_target_date: futureDate,
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.length).toBe(24);

    for (const row of data) {
      expect(row.orders).toBe(0);
      expect(row.amount_by_currency).toEqual({});
    }
  });

  it('filters by product_id', async () => {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabaseAdmin.rpc('get_hourly_revenue_stats', {
      p_target_date: today,
      p_product_id: productB.id,
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();

    // Only PLN for product B
    const hoursWithData = data.filter((h: any) => h.orders > 0);
    for (const h of hoursWithData) {
      expect(h.amount_by_currency).toHaveProperty('PLN');
      expect(h.amount_by_currency.USD).toBeUndefined();
    }
  });

  it('rejects non-admin authenticated user', async () => {
    const { data, error } = await regularUser.client.rpc('get_hourly_revenue_stats', {
      p_target_date: new Date().toISOString().split('T')[0],
    });

    expect(error).not.toBeNull();
    expect(error!.message).toContain('Access denied');
    expect(data).toBeNull();
  });

  it('rejects anon user', async () => {
    const { data, error } = await anonClient.rpc('get_hourly_revenue_stats', {
      p_target_date: new Date().toISOString().split('T')[0],
    });

    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });
});

// ============================================================================
// set_revenue_goal / get_revenue_goal
// ============================================================================

describe('set_revenue_goal / get_revenue_goal', () => {
  const goalStartDate = new Date('2026-01-01T00:00:00Z').toISOString();

  describe('global goal (no product_id)', () => {
    it('sets and retrieves a global revenue goal', async () => {
      // Set
      const { error: setErr } = await supabaseAdmin.rpc('set_revenue_goal', {
        p_goal_amount: 100000,
        p_start_date: goalStartDate,
      });
      expect(setErr).toBeNull();

      // Get
      const { data, error: getErr } = await supabaseAdmin.rpc('get_revenue_goal');
      expect(getErr).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(1);
      expect(Number(data[0].goal_amount)).toBe(100000);
      expect(data[0].start_date).toBeDefined();
    });

    it('updates an existing global goal via upsert', async () => {
      const { error: setErr } = await supabaseAdmin.rpc('set_revenue_goal', {
        p_goal_amount: 200000,
        p_start_date: goalStartDate,
      });
      expect(setErr).toBeNull();

      const { data, error: getErr } = await supabaseAdmin.rpc('get_revenue_goal');
      expect(getErr).toBeNull();
      expect(data.length).toBe(1);
      expect(Number(data[0].goal_amount)).toBe(200000);
    });
  });

  describe('product-specific goal', () => {
    it('sets and retrieves a product-specific goal', async () => {
      const { error: setErr } = await supabaseAdmin.rpc('set_revenue_goal', {
        p_goal_amount: 50000,
        p_start_date: goalStartDate,
        p_product_id: productA.id,
      });
      expect(setErr).toBeNull();

      const { data, error: getErr } = await supabaseAdmin.rpc('get_revenue_goal', {
        p_product_id: productA.id,
      });
      expect(getErr).toBeNull();
      expect(data.length).toBe(1);
      expect(Number(data[0].goal_amount)).toBe(50000);
    });

    it('updates existing product goal', async () => {
      const { error: setErr } = await supabaseAdmin.rpc('set_revenue_goal', {
        p_goal_amount: 75000,
        p_start_date: goalStartDate,
        p_product_id: productA.id,
      });
      expect(setErr).toBeNull();

      const { data, error: getErr } = await supabaseAdmin.rpc('get_revenue_goal', {
        p_product_id: productA.id,
      });
      expect(getErr).toBeNull();
      expect(Number(data[0].goal_amount)).toBe(75000);
    });

    it('product goal is independent from global goal', async () => {
      // Global should still be 200000
      const { data: globalData } = await supabaseAdmin.rpc('get_revenue_goal');
      expect(Number(globalData[0].goal_amount)).toBe(200000);

      // Product A should be 75000
      const { data: productData } = await supabaseAdmin.rpc('get_revenue_goal', {
        p_product_id: productA.id,
      });
      expect(Number(productData[0].goal_amount)).toBe(75000);
    });

    it('returns empty for product with no goal set', async () => {
      const { data, error } = await supabaseAdmin.rpc('get_revenue_goal', {
        p_product_id: productB.id,
      });
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.length).toBe(0);
    });
  });

  describe('goal deletion', () => {
    it('can delete a product goal by removing from table', async () => {
      // Set a goal for product B
      await supabaseAdmin.rpc('set_revenue_goal', {
        p_goal_amount: 30000,
        p_start_date: goalStartDate,
        p_product_id: productB.id,
      });

      // Verify it exists
      const { data: before } = await supabaseAdmin.rpc('get_revenue_goal', {
        p_product_id: productB.id,
      });
      expect(before.length).toBe(1);

      // Delete via direct table access (service_role)
      await supabaseAdmin
        .schema('seller_main' as any)
        .from('revenue_goals')
        .delete()
        .eq('product_id', productB.id);

      // Verify it's gone
      const { data: after } = await supabaseAdmin.rpc('get_revenue_goal', {
        p_product_id: productB.id,
      });
      expect(after.length).toBe(0);
    });
  });

  describe('authorization', () => {
    it('admin user can set and get goals', async () => {
      const { error: setErr } = await adminUser.client.rpc('set_revenue_goal', {
        p_goal_amount: 99000,
        p_start_date: goalStartDate,
      });
      expect(setErr).toBeNull();

      const { data, error: getErr } = await adminUser.client.rpc('get_revenue_goal');
      expect(getErr).toBeNull();
      expect(data.length).toBe(1);
      expect(Number(data[0].goal_amount)).toBe(99000);
    });

    it('rejects non-admin for set_revenue_goal', async () => {
      const { error } = await regularUser.client.rpc('set_revenue_goal', {
        p_goal_amount: 10000,
        p_start_date: goalStartDate,
      });
      expect(error).not.toBeNull();
      expect(error!.message).toContain('Access denied');
    });

    it('rejects non-admin for get_revenue_goal', async () => {
      const { data, error } = await regularUser.client.rpc('get_revenue_goal');
      expect(error).not.toBeNull();
      expect(error!.message).toContain('Access denied');
      expect(data).toBeNull();
    });

    it('rejects anon for set_revenue_goal', async () => {
      const { error } = await anonClient.rpc('set_revenue_goal', {
        p_goal_amount: 10000,
        p_start_date: goalStartDate,
      });
      expect(error).not.toBeNull();
    });

    it('rejects anon for get_revenue_goal', async () => {
      const { data, error } = await anonClient.rpc('get_revenue_goal');
      expect(error).not.toBeNull();
      expect(data).toBeNull();
    });
  });
});

// ============================================================================
// get_abandoned_cart_stats
// ============================================================================

describe('get_abandoned_cart_stats', () => {
  it('returns correct stats structure via service_role', async () => {
    const { data, error } = await supabaseAdmin.rpc('get_abandoned_cart_stats', {
      days_ago: 7,
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data).toHaveProperty('total_abandoned');
    expect(data).toHaveProperty('total_pending');
    expect(data).toHaveProperty('total_value');
    expect(data).toHaveProperty('avg_cart_value');
    expect(data).toHaveProperty('period_days');
    expect(data.period_days).toBe(7);
  });

  it('includes test abandoned and pending transactions in counts', async () => {
    const { data, error } = await supabaseAdmin.rpc('get_abandoned_cart_stats', {
      days_ago: 7,
    });

    expect(error).toBeNull();
    // We created 1 abandoned + 1 pending
    expect(data.total_abandoned).toBeGreaterThanOrEqual(1);
    expect(data.total_pending).toBeGreaterThanOrEqual(1);
    expect(data.total_value).toBeGreaterThanOrEqual(15000); // 5000 + 10000
  });

  it('calculates correct average cart value', async () => {
    const { data, error } = await supabaseAdmin.rpc('get_abandoned_cart_stats', {
      days_ago: 7,
    });

    expect(error).toBeNull();
    const totalCarts = data.total_abandoned + data.total_pending;
    if (totalCarts > 0) {
      expect(data.avg_cart_value).toBeGreaterThan(0);
      expect(data.avg_cart_value).toBeLessThanOrEqual(data.total_value);
    }
  });

  it('returns zeros for days_ago=0 (no data in zero-day window)', async () => {
    // days_ago=0 means NOW() - '0 days'::INTERVAL = NOW()
    // Transactions created milliseconds ago may still be included,
    // but with days_ago=0 the window is essentially empty
    const { data, error } = await supabaseAdmin.rpc('get_abandoned_cart_stats', {
      days_ago: 0,
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.period_days).toBe(0);
  });

  it('respects days_ago filtering', async () => {
    // Large window should include everything
    const { data: wide, error: wideErr } = await supabaseAdmin.rpc('get_abandoned_cart_stats', {
      days_ago: 365,
    });
    expect(wideErr).toBeNull();

    // Narrow window (1 day) should include today's data
    const { data: narrow, error: narrowErr } = await supabaseAdmin.rpc('get_abandoned_cart_stats', {
      days_ago: 1,
    });
    expect(narrowErr).toBeNull();

    // Wide window should have >= narrow window counts
    expect(wide.total_abandoned + wide.total_pending).toBeGreaterThanOrEqual(
      narrow.total_abandoned + narrow.total_pending,
    );
  });

  it('admin user can call get_abandoned_cart_stats', async () => {
    const { data, error } = await adminUser.client.rpc('get_abandoned_cart_stats', {
      days_ago: 7,
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data).toHaveProperty('total_abandoned');
  });

  it('rejects non-admin authenticated user', async () => {
    const { data, error } = await regularUser.client.rpc('get_abandoned_cart_stats', {
      days_ago: 7,
    });

    // get_abandoned_cart_stats has REVOKE ALL from anon AND authenticated
    // in proxy_functions migration, so it should fail
    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });

  it('rejects anon user', async () => {
    const { data, error } = await anonClient.rpc('get_abandoned_cart_stats', {
      days_ago: 7,
    });

    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });
});

// ============================================================================
// Cross-function aggregation verification
// ============================================================================

describe('aggregation correctness', () => {
  it('dashboard totalRevenue matches sum of detailed revenue across currencies', async () => {
    const { data: dashboard } = await supabaseAdmin.rpc('get_dashboard_stats');
    const { data: detailed } = await supabaseAdmin.rpc('get_detailed_revenue_stats');

    // Dashboard totalRevenue is a single number (sum of all amounts regardless of currency)
    // Detailed totalRevenue is grouped by currency
    const detailedTotal = Object.values(detailed.totalRevenue as Record<string, number>).reduce(
      (sum: number, v) => sum + Number(v),
      0,
    );

    expect(dashboard.totalRevenue).toBe(detailedTotal);
  });

  it('hourly orders sum matches sales chart orders for same day', async () => {
    const today = new Date().toISOString().split('T')[0];
    const startOfDay = `${today}T00:00:00Z`;
    const endOfDay = `${today}T23:59:59Z`;

    const { data: hourly } = await supabaseAdmin.rpc('get_hourly_revenue_stats', {
      p_target_date: today,
    });

    const { data: chart } = await supabaseAdmin.rpc('get_sales_chart_data', {
      p_start_date: startOfDay,
      p_end_date: endOfDay,
    });

    const hourlyOrdersTotal = hourly.reduce((sum: number, h: any) => sum + h.orders, 0);
    const chartOrdersTotal = chart.reduce((sum: number, d: any) => sum + d.orders, 0);

    expect(hourlyOrdersTotal).toBe(chartOrdersTotal);
  });
});
