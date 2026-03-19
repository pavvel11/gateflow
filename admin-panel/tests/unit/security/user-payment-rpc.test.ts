/**
 * ============================================================================
 * SECURITY TEST: User Payment & Profile RPC Functions
 * ============================================================================
 *
 * Tests five database functions via Supabase RPC calls using
 * service_role client for setup and authenticated clients for
 * authorization checks.
 *
 * Requires: local Supabase running (npx supabase start + db reset)
 *
 * Functions under test:
 * - seller_main.get_user_payment_history(user_id_param)
 * - seller_main.get_user_purchases_with_refund_status(user_id_param)
 * - seller_main.get_payment_statistics(start_date, end_date)
 * - seller_main.get_user_profile(user_id_param)
 * - seller_main.migrate_guest_payment_data_to_profile(p_user_id)
 *
 * @see supabase/migrations/20250101000000_core_schema.sql
 * @see supabase/migrations/20250102000000_payment_system.sql
 * @see supabase/migrations/20250103000000_features.sql
 * @see supabase/migrations/20260310180000_proxy_functions.sql
 * ============================================================================
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';

// ===== SUPABASE CLIENT SETUP =====

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';

const LOCAL_SERVICE_ROLE_KEY = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';
const LOCAL_ANON_KEY = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';

const isLocalDev =
  (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') &&
  SUPABASE_URL.includes('127.0.0.1');

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || (isLocalDev ? LOCAL_SERVICE_ROLE_KEY : '');
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || (isLocalDev ? LOCAL_ANON_KEY : '');

if (!SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required.');
}
if (!ANON_KEY) {
  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required.');
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ===== HELPER FUNCTIONS =====

const cleanupIds = {
  transactions: [] as string[],
  refundRequests: [] as string[],
  users: [] as string[],
  userProductAccess: [] as Array<{ userId: string; productId: string }>,
  guestPurchases: [] as string[],
};

async function getTestProduct() {
  const { data } = await supabaseAdmin
    .from('products')
    .select('id, name, price, currency, slug, icon, is_refundable, refund_period_days')
    .eq('is_active', true)
    .not('price', 'is', null)
    .gt('price', 0)
    .limit(1)
    .single();
  if (!data) throw new Error('No active product with price found for testing');
  return data;
}

function uniqueId() {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

async function createTestTransaction(
  productId: string,
  overrides: Record<string, unknown> = {},
) {
  const uid = uniqueId();
  const { data, error } = await supabaseAdmin
    .from('payment_transactions')
    .insert({
      session_id: `cs_test_upr_${uid}`,
      product_id: productId,
      customer_email: 'upr-test@example.com',
      amount: 4999,
      currency: 'usd',
      status: 'completed',
      stripe_payment_intent_id: `pi_test_upr_${uid}`,
      ...overrides,
    })
    .select()
    .single();
  if (error) throw new Error(`Failed to create test transaction: ${error.message}`);
  cleanupIds.transactions.push(data.id);
  return data;
}

async function createTestAdminUser(): Promise<{
  userId: string;
  client: SupabaseClient;
}> {
  const randomStr = Math.random().toString(36).substring(2, 9);
  const email = `upr-admin-${Date.now()}-${randomStr}@example.com`;
  const password = 'password123';

  const {
    data: { user },
    error: createError,
  } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError || !user) throw new Error(`Failed to create admin user: ${createError?.message}`);

  await supabaseAdmin.from('admin_users').insert({ user_id: user.id });
  cleanupIds.users.push(user.id);

  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  await client.auth.signInWithPassword({ email, password });

  return { userId: user.id, client };
}

async function createTestRegularUser(
  emailPrefix = 'upr-user',
): Promise<{
  userId: string;
  email: string;
  client: SupabaseClient;
}> {
  const randomStr = Math.random().toString(36).substring(2, 9);
  const email = `${emailPrefix}-${Date.now()}-${randomStr}@example.com`;
  const password = 'password123';

  const {
    data: { user },
    error: createError,
  } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError || !user) throw new Error(`Failed to create regular user: ${createError?.message}`);
  cleanupIds.users.push(user.id);

  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  await client.auth.signInWithPassword({ email, password });

  return { userId: user.id, email, client };
}

async function createTestRefundRequest(
  transactionId: string,
  productId: string,
  overrides: Record<string, unknown> = {},
) {
  const { data, error } = await supabaseAdmin
    .from('refund_requests')
    .insert({
      transaction_id: transactionId,
      customer_email: 'upr-test@example.com',
      product_id: productId,
      requested_amount: 4999,
      currency: 'usd',
      status: 'pending',
      reason: 'Test refund request',
      ...overrides,
    })
    .select()
    .single();
  if (error) throw new Error(`Failed to create refund request: ${error.message}`);
  cleanupIds.refundRequests.push(data.id);
  return data;
}

async function createTestGuestPurchase(
  productId: string,
  email: string,
  overrides: Record<string, unknown> = {},
) {
  const uid = uniqueId();
  const { data, error } = await supabaseAdmin
    .from('guest_purchases')
    .insert({
      session_id: `cs_test_guest_${uid}`,
      product_id: productId,
      customer_email: email,
      amount: 4999,
      currency: 'usd',
      ...overrides,
    })
    .select()
    .single();
  if (error) throw new Error(`Failed to create guest purchase: ${error.message}`);
  cleanupIds.guestPurchases.push(data.id);
  return data;
}

async function cleanup() {
  for (const id of cleanupIds.refundRequests) {
    await supabaseAdmin.from('refund_requests').delete().eq('id', id);
  }
  for (const { userId, productId } of cleanupIds.userProductAccess) {
    await supabaseAdmin
      .from('user_product_access')
      .delete()
      .eq('user_id', userId)
      .eq('product_id', productId);
  }
  for (const id of cleanupIds.guestPurchases) {
    await supabaseAdmin.from('guest_purchases').delete().eq('id', id);
  }
  for (const id of cleanupIds.transactions) {
    await supabaseAdmin.from('payment_transactions').delete().eq('id', id);
  }
  // Delete profiles before users (profiles FK to auth.users)
  for (const id of cleanupIds.users) {
    await supabaseAdmin.from('profiles').delete().eq('id', id);
    await supabaseAdmin.from('admin_users').delete().eq('user_id', id);
    await supabaseAdmin.auth.admin.deleteUser(id);
  }
  cleanupIds.transactions = [];
  cleanupIds.refundRequests = [];
  cleanupIds.users = [];
  cleanupIds.userProductAccess = [];
  cleanupIds.guestPurchases = [];
}

// ===== TESTS =====

let testProduct: Awaited<ReturnType<typeof getTestProduct>>;
let adminUser: { userId: string; client: SupabaseClient };

beforeAll(async () => {
  testProduct = await getTestProduct();
  adminUser = await createTestAdminUser();
});

afterAll(async () => {
  await cleanup();
});

afterEach(async () => {
  // Clean up per-test data but keep shared fixtures (product, admin)
  for (const id of cleanupIds.refundRequests) {
    await supabaseAdmin.from('refund_requests').delete().eq('id', id);
  }
  for (const { userId, productId } of cleanupIds.userProductAccess) {
    await supabaseAdmin
      .from('user_product_access')
      .delete()
      .eq('user_id', userId)
      .eq('product_id', productId);
  }
  for (const id of cleanupIds.guestPurchases) {
    await supabaseAdmin.from('guest_purchases').delete().eq('id', id);
  }
  for (const id of cleanupIds.transactions) {
    await supabaseAdmin.from('payment_transactions').delete().eq('id', id);
  }
  const perTestUsers = cleanupIds.users.filter((id) => id !== adminUser.userId);
  for (const id of perTestUsers) {
    await supabaseAdmin.from('profiles').delete().eq('id', id);
    await supabaseAdmin.from('admin_users').delete().eq('user_id', id);
    await supabaseAdmin.auth.admin.deleteUser(id);
  }
  cleanupIds.transactions = [];
  cleanupIds.refundRequests = [];
  cleanupIds.userProductAccess = [];
  cleanupIds.guestPurchases = [];
  cleanupIds.users = cleanupIds.users.filter((id) => id === adminUser.userId);
});

// =============================================================================
// get_user_payment_history
// =============================================================================

describe('get_user_payment_history RPC', () => {
  it('1. Returns payments for authenticated user', async () => {
    const user = await createTestRegularUser();
    const tx = await createTestTransaction(testProduct.id, {
      user_id: user.userId,
      customer_email: user.email,
    });

    const { data, error } = await user.client.rpc('get_user_payment_history', {
      user_id_param: user.userId,
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(1);

    const payment = data.find((p: Record<string, unknown>) => p.transaction_id === tx.id);
    expect(payment).toBeDefined();
    expect(payment.product_name).toBe(testProduct.name);
    expect(payment.product_slug).toBe(testProduct.slug);
    // Amount is converted from cents to dollars in the function
    expect(Number(payment.amount)).toBeCloseTo(tx.amount / 100, 2);
    expect(payment.currency).toBe(tx.currency);
    expect(payment.status).toBe('completed');
    expect(payment.payment_date).toBeDefined();
  });

  it('2. Returns empty array for user with no payments', async () => {
    const user = await createTestRegularUser();

    const { data, error } = await user.client.rpc('get_user_payment_history', {
      user_id_param: user.userId,
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(0);
  });

  it('3. Regular user cannot see another user\'s payment history', async () => {
    const userA = await createTestRegularUser('upr-a');
    const userB = await createTestRegularUser('upr-b');
    await createTestTransaction(testProduct.id, {
      user_id: userA.userId,
      customer_email: userA.email,
    });

    // userB tries to view userA's payments
    const { error } = await userB.client.rpc('get_user_payment_history', {
      user_id_param: userA.userId,
    });

    expect(error).not.toBeNull();
    expect(error!.message).toContain('Unauthorized');
  });

  it('4. Admin can view another user\'s payment history', async () => {
    const user = await createTestRegularUser();
    await createTestTransaction(testProduct.id, {
      user_id: user.userId,
      customer_email: user.email,
    });

    const { data, error } = await adminUser.client.rpc('get_user_payment_history', {
      user_id_param: user.userId,
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(1);
  });

  it('5. Includes refund info when payment is refunded', async () => {
    const user = await createTestRegularUser();
    const refundedAmount = 2500;
    await createTestTransaction(testProduct.id, {
      user_id: user.userId,
      customer_email: user.email,
      status: 'refunded',
      refunded_amount: refundedAmount,
    });

    const { data, error } = await user.client.rpc('get_user_payment_history', {
      user_id_param: user.userId,
    });

    expect(error).toBeNull();
    expect(data.length).toBeGreaterThanOrEqual(1);

    const refundedPayment = data.find((p: Record<string, unknown>) => p.status === 'refunded');
    expect(refundedPayment).toBeDefined();
    // refunded_amount is converted from cents to dollars
    expect(Number(refundedPayment.refunded_amount)).toBeCloseTo(refundedAmount / 100, 2);
  });

  it('6. Results are ordered by payment_date descending (newest first)', async () => {
    const user = await createTestRegularUser();

    // Create two transactions sequentially to ensure different timestamps
    await createTestTransaction(testProduct.id, {
      user_id: user.userId,
      customer_email: user.email,
    });
    // Small delay to ensure different timestamps
    await new Promise((r) => setTimeout(r, 50));
    await createTestTransaction(testProduct.id, {
      user_id: user.userId,
      customer_email: user.email,
    });

    const { data, error } = await user.client.rpc('get_user_payment_history', {
      user_id_param: user.userId,
    });

    expect(error).toBeNull();
    expect(data.length).toBeGreaterThanOrEqual(2);

    // Verify descending order
    for (let i = 1; i < data.length; i++) {
      const prev = new Date(data[i - 1].payment_date).getTime();
      const curr = new Date(data[i].payment_date).getTime();
      expect(prev).toBeGreaterThanOrEqual(curr);
    }
  });

  it('7. Rejects null user_id_param', async () => {
    const { error } = await adminUser.client.rpc('get_user_payment_history', {
      user_id_param: null as unknown as string,
    });

    // Function raises exception for null user_id
    expect(error).not.toBeNull();
  });
});

// =============================================================================
// get_user_purchases_with_refund_status
// =============================================================================

describe('get_user_purchases_with_refund_status RPC', () => {
  it('1. Returns purchases with product details and refund eligibility', async () => {
    const user = await createTestRegularUser();
    await createTestTransaction(testProduct.id, {
      user_id: user.userId,
      customer_email: user.email,
    });

    const { data, error } = await user.client.rpc('get_user_purchases_with_refund_status', {
      user_id_param: user.userId,
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(1);

    const purchase = data[0];
    expect(purchase.product_id).toBe(testProduct.id);
    expect(purchase.product_name).toBe(testProduct.name);
    expect(purchase.product_slug).toBe(testProduct.slug);
    expect(purchase.currency).toBe('usd');
    expect(purchase.status).toBe('completed');
    expect(purchase.days_since_purchase).toBeDefined();
    expect(typeof purchase.refund_eligible).toBe('boolean');
    // is_refundable comes from the product
    expect(typeof purchase.is_refundable).toBe('boolean');
  });

  it('2. Shows refund request status when refund request exists', async () => {
    const user = await createTestRegularUser();
    const tx = await createTestTransaction(testProduct.id, {
      user_id: user.userId,
      customer_email: user.email,
    });

    await createTestRefundRequest(tx.id, testProduct.id, {
      user_id: user.userId,
      customer_email: user.email,
      status: 'pending',
    });

    const { data, error } = await user.client.rpc('get_user_purchases_with_refund_status', {
      user_id_param: user.userId,
    });

    expect(error).toBeNull();
    const purchaseWithRefund = data.find(
      (p: Record<string, unknown>) => p.transaction_id === tx.id,
    );
    expect(purchaseWithRefund).toBeDefined();
    expect(purchaseWithRefund.refund_request_status).toBe('pending');
    expect(purchaseWithRefund.refund_request_id).toBeDefined();
  });

  it('3. Shows approved refund request status', async () => {
    const user = await createTestRegularUser();
    const tx = await createTestTransaction(testProduct.id, {
      user_id: user.userId,
      customer_email: user.email,
    });

    await createTestRefundRequest(tx.id, testProduct.id, {
      user_id: user.userId,
      customer_email: user.email,
      status: 'approved',
    });

    const { data, error } = await user.client.rpc('get_user_purchases_with_refund_status', {
      user_id_param: user.userId,
    });

    expect(error).toBeNull();
    const purchase = data.find((p: Record<string, unknown>) => p.transaction_id === tx.id);
    expect(purchase).toBeDefined();
    expect(purchase.refund_request_status).toBe('approved');
  });

  it('4. Shows rejected refund request status', async () => {
    const user = await createTestRegularUser();
    const tx = await createTestTransaction(testProduct.id, {
      user_id: user.userId,
      customer_email: user.email,
    });

    await createTestRefundRequest(tx.id, testProduct.id, {
      user_id: user.userId,
      customer_email: user.email,
      status: 'rejected',
    });

    const { data, error } = await user.client.rpc('get_user_purchases_with_refund_status', {
      user_id_param: user.userId,
    });

    expect(error).toBeNull();
    const purchase = data.find((p: Record<string, unknown>) => p.transaction_id === tx.id);
    expect(purchase).toBeDefined();
    expect(purchase.refund_request_status).toBe('rejected');
  });

  it('5. Returns empty result for user with no purchases', async () => {
    const user = await createTestRegularUser();

    const { data, error } = await user.client.rpc('get_user_purchases_with_refund_status', {
      user_id_param: user.userId,
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(0);
  });

  it('6. Regular user cannot see another user\'s purchases (returns empty, no error)', async () => {
    const userA = await createTestRegularUser('upr-a');
    const userB = await createTestRegularUser('upr-b');
    await createTestTransaction(testProduct.id, {
      user_id: userA.userId,
      customer_email: userA.email,
    });

    // The function silently returns empty for unauthorized access (no exception)
    const { data, error } = await userB.client.rpc('get_user_purchases_with_refund_status', {
      user_id_param: userA.userId,
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(0);
  });

  it('7. Defaults to auth.uid() when user_id_param is null', async () => {
    const user = await createTestRegularUser();
    await createTestTransaction(testProduct.id, {
      user_id: user.userId,
      customer_email: user.email,
    });

    const { data, error } = await user.client.rpc('get_user_purchases_with_refund_status', {
      user_id_param: null as unknown as string,
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(1);
  });

  it('8. Refund-ineligible when status is refunded', async () => {
    const user = await createTestRegularUser();
    await createTestTransaction(testProduct.id, {
      user_id: user.userId,
      customer_email: user.email,
      status: 'refunded',
      refunded_amount: 4999,
    });

    const { data, error } = await user.client.rpc('get_user_purchases_with_refund_status', {
      user_id_param: user.userId,
    });

    expect(error).toBeNull();
    const refundedPurchase = data.find((p: Record<string, unknown>) => p.status === 'refunded');
    expect(refundedPurchase).toBeDefined();
    expect(refundedPurchase.refund_eligible).toBe(false);
  });
});

// =============================================================================
// get_payment_statistics
// =============================================================================

describe('get_payment_statistics RPC', () => {
  it('1. Returns correct statistics for admin', async () => {
    // Create a transaction within the date range
    await createTestTransaction(testProduct.id);

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const { data, error } = await adminUser.client.rpc('get_payment_statistics', {
      start_date: thirtyDaysAgo.toISOString(),
      end_date: now.toISOString(),
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.period_start).toBeDefined();
    expect(data.period_end).toBeDefined();
    expect(typeof data.total_transactions).toBe('number');
    expect(data.total_transactions).toBeGreaterThanOrEqual(1);
    expect(data.total_revenue_range).toBeDefined();
    expect(data.transaction_status).toBeDefined();
    expect(typeof data.transaction_status.completed).toBe('number');
    expect(typeof data.transaction_status.refunded).toBe('number');
    expect(typeof data.transaction_status.disputed).toBe('number');
    expect(data.guest_purchase_summary).toBeDefined();
    expect(typeof data.guest_purchase_summary.total_guest_purchases).toBe('number');
    expect(data.generated_at).toBeDefined();
  });

  it('2. Handles zero transactions in date range', async () => {
    // Use a date range in the far past where no transactions exist
    const farPast = new Date('2020-01-01T00:00:00Z');
    const farPastEnd = new Date('2020-01-02T00:00:00Z');

    const { data, error } = await adminUser.client.rpc('get_payment_statistics', {
      start_date: farPast.toISOString(),
      end_date: farPastEnd.toISOString(),
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.total_transactions).toBe(0);
    expect(data.total_revenue_range).toBe('No revenue');
    expect(data.transaction_status.completed).toBe(0);
    expect(data.transaction_status.refunded).toBe(0);
    expect(data.transaction_status.disputed).toBe(0);
  });

  it('3. Rejects non-admin users', async () => {
    const user = await createTestRegularUser();

    const { error } = await user.client.rpc('get_payment_statistics', {
      start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      end_date: new Date().toISOString(),
    });

    expect(error).not.toBeNull();
    expect(error!.message).toContain('Unauthorized');
  });

  it('4. Rejects start_date after end_date', async () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const { error } = await adminUser.client.rpc('get_payment_statistics', {
      start_date: now.toISOString(),
      end_date: yesterday.toISOString(),
    });

    expect(error).not.toBeNull();
    expect(error!.message).toContain('Start date must be before');
  });

  it('5. Rejects date range exceeding 1 year', async () => {
    const now = new Date();
    const twoYearsAgo = new Date(now.getTime() - 2 * 365 * 24 * 60 * 60 * 1000);

    const { error } = await adminUser.client.rpc('get_payment_statistics', {
      start_date: twoYearsAgo.toISOString(),
      end_date: now.toISOString(),
    });

    expect(error).not.toBeNull();
    expect(error!.message).toContain('Date range too large');
  });

  it('6. Rejects future dates', async () => {
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const farFuture = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    const { error } = await adminUser.client.rpc('get_payment_statistics', {
      start_date: future.toISOString(),
      end_date: farFuture.toISOString(),
    });

    expect(error).not.toBeNull();
    expect(error!.message).toContain('future');
  });

  it('7. Rejects dates more than 10 years in the past', async () => {
    const elevenYearsAgo = new Date(Date.now() - 11 * 365 * 24 * 60 * 60 * 1000);
    const tenYearsAgo = new Date(Date.now() - 10 * 365 * 24 * 60 * 60 * 1000);

    const { error } = await adminUser.client.rpc('get_payment_statistics', {
      start_date: elevenYearsAgo.toISOString(),
      end_date: tenYearsAgo.toISOString(),
    });

    expect(error).not.toBeNull();
    expect(error!.message).toContain('10 years');
  });

  it('8. Includes guest purchase summary with claimed percentage', async () => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const { data, error } = await adminUser.client.rpc('get_payment_statistics', {
      start_date: thirtyDaysAgo.toISOString(),
      end_date: now.toISOString(),
    });

    expect(error).toBeNull();
    expect(data.guest_purchase_summary).toBeDefined();
    expect(typeof data.guest_purchase_summary.total_guest_purchases).toBe('number');
    expect(typeof data.guest_purchase_summary.claimed_percentage).toBe('number');
  });
});

// =============================================================================
// get_user_profile
// =============================================================================

describe('get_user_profile RPC', () => {
  it('1. Returns profile for own user', async () => {
    const user = await createTestRegularUser();

    const { data, error } = await user.client.rpc('get_user_profile', {
      user_id_param: user.userId,
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.user).toBeDefined();
    expect(data.user.id).toBe(user.userId);
    expect(data.user.email).toBe(user.email);
    expect(data.user.created_at).toBeDefined();
    // access should be an array (possibly empty)
    expect(Array.isArray(data.access)).toBe(true);
  });

  it('2. Returns null for non-existent user', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';

    const { data, error } = await adminUser.client.rpc('get_user_profile', {
      user_id_param: nonExistentId,
    });

    expect(error).toBeNull();
    expect(data).toBeNull();
  });

  it('3. Returns null for null user_id_param', async () => {
    const { data, error } = await adminUser.client.rpc('get_user_profile', {
      user_id_param: null as unknown as string,
    });

    expect(error).toBeNull();
    expect(data).toBeNull();
  });

  it('4. Regular user cannot view another user\'s profile', async () => {
    const userA = await createTestRegularUser('upr-profA');
    const userB = await createTestRegularUser('upr-profB');

    const { error } = await userB.client.rpc('get_user_profile', {
      user_id_param: userA.userId,
    });

    expect(error).not.toBeNull();
    expect(error!.message).toContain('Unauthorized');
  });

  it('5. Admin can view another user\'s profile', async () => {
    const user = await createTestRegularUser();

    const { data, error } = await adminUser.client.rpc('get_user_profile', {
      user_id_param: user.userId,
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.user.id).toBe(user.userId);
    expect(data.user.email).toBe(user.email);
  });

  it('6. Profile includes access details when user has product access', async () => {
    const user = await createTestRegularUser();

    // Grant product access
    await supabaseAdmin.from('user_product_access').insert({
      user_id: user.userId,
      product_id: testProduct.id,
    });
    cleanupIds.userProductAccess.push({
      userId: user.userId,
      productId: testProduct.id,
    });

    const { data, error } = await user.client.rpc('get_user_profile', {
      user_id_param: user.userId,
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(Array.isArray(data.access)).toBe(true);
    expect(data.access.length).toBeGreaterThanOrEqual(1);

    const productAccess = data.access.find(
      (a: Record<string, unknown>) => a.product_id === testProduct.id,
    );
    expect(productAccess).toBeDefined();
    expect(productAccess.product_name).toBe(testProduct.name);
    expect(productAccess.product_slug).toBe(testProduct.slug);
  });

  it('7. Unauthenticated request fails', async () => {
    const anonClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error } = await anonClient.rpc('get_user_profile', {
      user_id_param: adminUser.userId,
    });

    expect(error).not.toBeNull();
  });
});

// =============================================================================
// migrate_guest_payment_data_to_profile
// =============================================================================

describe('migrate_guest_payment_data_to_profile RPC', () => {
  it('1. Migrates billing data from guest payment to profile', async () => {
    const user = await createTestRegularUser('upr-migrate');

    // Create a guest payment with metadata (before the user existed conceptually)
    await createTestTransaction(testProduct.id, {
      customer_email: user.email,
      user_id: null, // guest purchase
      status: 'completed',
      metadata: {
        full_name: 'Jan Kowalski',
        first_name: 'Jan',
        last_name: 'Kowalski',
        needs_invoice: 'true',
        nip: '1234567890',
        company_name: 'Test Company',
        address: 'ul. Testowa 1',
        city: 'Warszawa',
        postal_code: '00-001',
        country: 'PL',
      },
    });

    // Call the migration function via service_role (it's only granted to service_role)
    const { data, error } = await supabaseAdmin.rpc('migrate_guest_payment_data_to_profile', {
      p_user_id: user.userId,
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.success).toBe(true);
    expect(data.data_migrated).toBe(true);
    expect(data.email).toBe(user.email);

    // Verify profile was updated
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, first_name, last_name, tax_id, company_name, address_line1, city, zip_code, country')
      .eq('id', user.userId)
      .single();

    expect(profile).toBeDefined();
    expect(profile!.full_name).toBe('Jan Kowalski');
    expect(profile!.first_name).toBe('Jan');
    expect(profile!.last_name).toBe('Kowalski');
    expect(profile!.tax_id).toBe('1234567890');
    expect(profile!.company_name).toBe('Test Company');
    expect(profile!.address_line1).toBe('ul. Testowa 1');
    expect(profile!.city).toBe('Warszawa');
    expect(profile!.zip_code).toBe('00-001');
    expect(profile!.country).toBe('PL');
  });

  it('2. Does not overwrite existing profile data when payment metadata is empty', async () => {
    const user = await createTestRegularUser('upr-nooverwrite');

    // Set existing profile data
    await supabaseAdmin
      .from('profiles')
      .update({
        full_name: 'Existing Name',
        first_name: 'Existing',
        last_name: 'Name',
        company_name: 'Existing Company',
      })
      .eq('id', user.userId);

    // Create guest payment WITHOUT metadata fields (empty metadata)
    await createTestTransaction(testProduct.id, {
      customer_email: user.email,
      user_id: null,
      status: 'completed',
      metadata: {},
    });

    const { data, error } = await supabaseAdmin.rpc('migrate_guest_payment_data_to_profile', {
      p_user_id: user.userId,
    });

    expect(error).toBeNull();
    expect(data.success).toBe(true);

    // Verify existing data was preserved (CASE WHEN ... ELSE keeps original)
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, first_name, last_name, company_name')
      .eq('id', user.userId)
      .single();

    expect(profile!.full_name).toBe('Existing Name');
    expect(profile!.first_name).toBe('Existing');
    expect(profile!.last_name).toBe('Name');
    expect(profile!.company_name).toBe('Existing Company');
  });

  it('3. Does not migrate company data when needs_invoice is not true', async () => {
    const user = await createTestRegularUser('upr-noinvoice');

    await createTestTransaction(testProduct.id, {
      customer_email: user.email,
      user_id: null,
      status: 'completed',
      metadata: {
        full_name: 'Jan Bez Faktury',
        nip: '9999999999',
        company_name: 'Should Not Appear',
        address: 'Should Not Appear',
        // needs_invoice is missing (not 'true')
      },
    });

    const { data, error } = await supabaseAdmin.rpc('migrate_guest_payment_data_to_profile', {
      p_user_id: user.userId,
    });

    expect(error).toBeNull();
    expect(data.success).toBe(true);

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, tax_id, company_name, address_line1')
      .eq('id', user.userId)
      .single();

    // Name should be migrated
    expect(profile!.full_name).toBe('Jan Bez Faktury');
    // Company data should NOT be migrated (needs_invoice != 'true')
    expect(profile!.tax_id).toBeNull();
    expect(profile!.company_name).toBeNull();
    expect(profile!.address_line1).toBeNull();
  });

  it('4. Handles non-existent user gracefully', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000099';

    const { data, error } = await supabaseAdmin.rpc('migrate_guest_payment_data_to_profile', {
      p_user_id: nonExistentId,
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.success).toBe(false);
    expect(data.error).toBe('User not found');
  });

  it('5. Handles user with no guest payments (no metadata to migrate)', async () => {
    const user = await createTestRegularUser('upr-noguest');

    const { data, error } = await supabaseAdmin.rpc('migrate_guest_payment_data_to_profile', {
      p_user_id: user.userId,
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.success).toBe(true);
    expect(data.data_migrated).toBe(false);
  });

  it('6. Uses the LATEST guest payment when multiple exist', async () => {
    const user = await createTestRegularUser('upr-latest');

    // Create older payment
    await createTestTransaction(testProduct.id, {
      customer_email: user.email,
      user_id: null,
      status: 'completed',
      metadata: {
        full_name: 'Old Name',
        first_name: 'Old',
      },
    });

    // Small delay to ensure different timestamps
    await new Promise((r) => setTimeout(r, 50));

    // Create newer payment
    await createTestTransaction(testProduct.id, {
      customer_email: user.email,
      user_id: null,
      status: 'completed',
      metadata: {
        full_name: 'New Name',
        first_name: 'New',
      },
    });

    const { data, error } = await supabaseAdmin.rpc('migrate_guest_payment_data_to_profile', {
      p_user_id: user.userId,
    });

    expect(error).toBeNull();
    expect(data.success).toBe(true);
    expect(data.data_migrated).toBe(true);

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, first_name')
      .eq('id', user.userId)
      .single();

    expect(profile!.full_name).toBe('New Name');
    expect(profile!.first_name).toBe('New');
  });

  it('7. Only considers completed guest payments (ignores non-completed)', async () => {
    const user = await createTestRegularUser('upr-pending');

    // Create a pending payment (should be ignored)
    await createTestTransaction(testProduct.id, {
      customer_email: user.email,
      user_id: null,
      status: 'pending',
      metadata: {
        full_name: 'Pending Name',
      },
    });

    const { data, error } = await supabaseAdmin.rpc('migrate_guest_payment_data_to_profile', {
      p_user_id: user.userId,
    });

    expect(error).toBeNull();
    expect(data.success).toBe(true);
    expect(data.data_migrated).toBe(false);
  });

  it('8. Authenticated user cannot call this function (service_role only)', async () => {
    const user = await createTestRegularUser('upr-auth-denied');

    const { error } = await user.client.rpc('migrate_guest_payment_data_to_profile', {
      p_user_id: user.userId,
    });

    // Should fail because EXECUTE is only granted to service_role
    expect(error).not.toBeNull();
  });
});
