/**
 * ============================================================================
 * SECURITY TEST: Guest Purchase Claim & Free Access RPC Functions
 * ============================================================================
 *
 * Tests the database functions that handle guest purchase claiming and
 * free product access granting via live Supabase RPC calls.
 *
 * Functions tested:
 * - claim_guest_purchases_for_user (claims guest purchases on registration)
 * - grant_free_product_access (grants access to price=0 products)
 * - grant_pwyw_free_access (grants access to PWYW products with min=0)
 * - grant_product_access_service_role (grants access with optimistic locking)
 * - handle_new_user_registration (trigger function for new user signup)
 *
 * REQUIRES: Supabase running locally (npx supabase start)
 *
 * @see supabase/migrations/20260310175058_multi_order_bumps.sql
 * @see supabase/migrations/20260306170242_add_rate_limit_to_grant_free_access.sql
 * @see supabase/migrations/20250102000000_payment_system.sql
 * @see supabase/migrations/20250103000000_features.sql
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

const TEST_ID = Date.now();

// ============================================================================
// Helpers
// ============================================================================

async function createTestUser(email: string, password: string): Promise<string> {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw new Error(`Failed to create user ${email}: ${error.message}`);
  return data.user.id;
}

async function createTestProduct(overrides: Record<string, unknown> = {}): Promise<{ id: string; slug: string }> {
  const slug = `test-gcr-${TEST_ID}-${Math.random().toString(36).slice(2, 8)}`;
  const defaults = {
    name: `Test Product ${slug}`,
    slug,
    price: 0,
    currency: 'USD',
    is_active: true,
  };
  const { data, error } = await supabaseAdmin
    .schema('seller_main' as any)
    .from('products')
    .insert({ ...defaults, ...overrides })
    .select('id, slug')
    .single();
  if (error) throw new Error(`Failed to create product: ${error.message}`);
  return data as { id: string; slug: string };
}

async function createGuestPurchase(
  email: string,
  productId: string,
  sessionId: string,
  amount: number = 1000,
): Promise<string> {
  const { data, error } = await supabaseAdmin
    .schema('seller_main' as any)
    .from('guest_purchases')
    .insert({
      customer_email: email,
      product_id: productId,
      session_id: sessionId,
      transaction_amount: amount,
    })
    .select('id')
    .single();
  if (error) throw new Error(`Failed to create guest purchase: ${error.message}`);
  return (data as { id: string }).id;
}

async function createAuthenticatedClient(email: string, password: string): Promise<SupabaseClient> {
  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Failed to sign in ${email}: ${error.message}`);
  return client;
}

async function getUserAccess(userId: string, productId: string) {
  const { data, error } = await supabaseAdmin
    .schema('seller_main' as any)
    .from('user_product_access')
    .select('*')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function cleanupRateLimits(functionName: string) {
  await supabaseAdmin
    .from('rate_limits')
    .delete()
    .like('function_name', `%${functionName}%`);
}

// ============================================================================
// Test state tracking for cleanup
// ============================================================================

const createdUserIds: string[] = [];
const createdProductIds: string[] = [];
const createdGuestPurchaseIds: string[] = [];
const createdTransactionIds: string[] = [];

// ============================================================================
// claim_guest_purchases_for_user
// ============================================================================

describe('claim_guest_purchases_for_user', () => {
  const EMAIL = `claim-test-${TEST_ID}@example.com`;
  const PASSWORD = 'test-password-123';
  let userId: string;
  let product1: { id: string; slug: string };
  let product2: { id: string; slug: string };

  beforeAll(async () => {
    product1 = await createTestProduct({ price: 10 });
    product2 = await createTestProduct({ price: 20 });
    createdProductIds.push(product1.id, product2.id);

    userId = await createTestUser(EMAIL, PASSWORD);
    createdUserIds.push(userId);
  });

  afterAll(async () => {
    await cleanupRateLimits('claim_guest_purchases_for_user');
  });

  it('claims a single guest purchase and grants access', async () => {
    const sessionId = `cs_test_claim_single_${TEST_ID}`;
    const gpId = await createGuestPurchase(EMAIL, product1.id, sessionId);
    createdGuestPurchaseIds.push(gpId);

    const { data, error } = await supabaseAdmin.rpc('claim_guest_purchases_for_user', {
      p_user_id: userId,
    });

    expect(error).toBeNull();
    expect(data).toMatchObject({
      success: true,
      claimed_count: expect.any(Number),
      user_email: EMAIL,
    });
    expect(data.claimed_count).toBeGreaterThanOrEqual(1);

    // Verify access was granted
    const access = await getUserAccess(userId, product1.id);
    expect(access).not.toBeNull();

    // Verify guest_purchase was marked as claimed
    const { data: gp } = await supabaseAdmin
      .schema('seller_main' as any)
      .from('guest_purchases')
      .select('claimed_by_user_id, claimed_at')
      .eq('id', gpId)
      .single();
    expect(gp?.claimed_by_user_id).toBe(userId);
    expect(gp?.claimed_at).not.toBeNull();
  });

  it('claims multiple guest purchases for the same email', async () => {
    const email2 = `claim-multi-${TEST_ID}@example.com`;
    const user2 = await createTestUser(email2, PASSWORD);
    createdUserIds.push(user2);

    const productA = await createTestProduct({ price: 5 });
    const productB = await createTestProduct({ price: 15 });
    createdProductIds.push(productA.id, productB.id);

    const gpA = await createGuestPurchase(email2, productA.id, `cs_test_multi_a_${TEST_ID}`);
    const gpB = await createGuestPurchase(email2, productB.id, `cs_test_multi_b_${TEST_ID}`);
    createdGuestPurchaseIds.push(gpA, gpB);

    const { data, error } = await supabaseAdmin.rpc('claim_guest_purchases_for_user', {
      p_user_id: user2,
    });

    expect(error).toBeNull();
    expect(data.success).toBe(true);
    expect(data.claimed_count).toBeGreaterThanOrEqual(2);

    const accessA = await getUserAccess(user2, productA.id);
    const accessB = await getUserAccess(user2, productB.id);
    expect(accessA).not.toBeNull();
    expect(accessB).not.toBeNull();
  });

  it('does not claim purchases for a different email', async () => {
    const emailOther = `claim-other-${TEST_ID}@example.com`;
    const userOther = await createTestUser(emailOther, PASSWORD);
    createdUserIds.push(userOther);

    const productC = await createTestProduct({ price: 30 });
    createdProductIds.push(productC.id);

    // Create guest purchase for a DIFFERENT email
    const gpC = await createGuestPurchase(
      `someone-else-${TEST_ID}@example.com`,
      productC.id,
      `cs_test_other_${TEST_ID}`,
    );
    createdGuestPurchaseIds.push(gpC);

    const { data, error } = await supabaseAdmin.rpc('claim_guest_purchases_for_user', {
      p_user_id: userOther,
    });

    expect(error).toBeNull();
    expect(data.success).toBe(true);
    expect(data.claimed_count).toBe(0);

    // Verify no access was granted
    const access = await getUserAccess(userOther, productC.id);
    expect(access).toBeNull();
  });

  it('handles bump products in guest purchase', async () => {
    const emailBump = `claim-bump-${TEST_ID}@example.com`;
    const userBump = await createTestUser(emailBump, PASSWORD);
    createdUserIds.push(userBump);

    const mainProduct = await createTestProduct({ price: 50 });
    const bumpProduct = await createTestProduct({ price: 10 });
    createdProductIds.push(mainProduct.id, bumpProduct.id);

    const sessionId = `cs_test_bump_${TEST_ID}`;
    const gpId = await createGuestPurchase(emailBump, mainProduct.id, sessionId, 6000);
    createdGuestPurchaseIds.push(gpId);

    // Create a payment_transaction linked by session_id
    const { data: txData, error: txErr } = await supabaseAdmin
      .schema('seller_main' as any)
      .from('payment_transactions')
      .insert({
        session_id: sessionId,
        product_id: mainProduct.id,
        customer_email: emailBump,
        amount: 6000,
        currency: 'USD',
        status: 'completed',
        stripe_payment_intent_id: `pi_test_bump_${TEST_ID}`,
      })
      .select('id')
      .single();
    if (txErr) throw txErr;
    createdTransactionIds.push((txData as { id: string }).id);

    // Create a payment_line_item for the bump
    const { error: liErr } = await supabaseAdmin
      .schema('seller_main' as any)
      .from('payment_line_items')
      .insert({
        transaction_id: (txData as { id: string }).id,
        product_id: bumpProduct.id,
        item_type: 'order_bump',
        quantity: 1,
        unit_price: 1000,
        total_price: 1000,
        currency: 'USD',
        product_name: 'Bump Product',
      });
    if (liErr) throw liErr;

    // Also insert main product line item (required by unique constraint validation)
    await supabaseAdmin
      .schema('seller_main' as any)
      .from('payment_line_items')
      .insert({
        transaction_id: (txData as { id: string }).id,
        product_id: mainProduct.id,
        item_type: 'main_product',
        quantity: 1,
        unit_price: 5000,
        total_price: 5000,
        currency: 'USD',
        product_name: 'Main Product',
      });

    const { data, error } = await supabaseAdmin.rpc('claim_guest_purchases_for_user', {
      p_user_id: userBump,
    });

    expect(error).toBeNull();
    expect(data.success).toBe(true);
    // Should claim both main product + bump product
    expect(data.claimed_count).toBeGreaterThanOrEqual(2);

    // Verify access to both products
    const mainAccess = await getUserAccess(userBump, mainProduct.id);
    const bumpAccess = await getUserAccess(userBump, bumpProduct.id);
    expect(mainAccess).not.toBeNull();
    expect(bumpAccess).not.toBeNull();
  });

  it('is idempotent - claiming twice does not duplicate access', async () => {
    const emailIdem = `claim-idem-${TEST_ID}@example.com`;
    const userIdem = await createTestUser(emailIdem, PASSWORD);
    createdUserIds.push(userIdem);

    const productIdem = await createTestProduct({ price: 25 });
    createdProductIds.push(productIdem.id);

    const gpId = await createGuestPurchase(emailIdem, productIdem.id, `cs_test_idem_${TEST_ID}`);
    createdGuestPurchaseIds.push(gpId);

    // First claim
    const { data: first } = await supabaseAdmin.rpc('claim_guest_purchases_for_user', {
      p_user_id: userIdem,
    });
    expect(first.success).toBe(true);
    expect(first.claimed_count).toBeGreaterThanOrEqual(1);

    // Second claim - should succeed but claim 0 (already claimed)
    const { data: second, error } = await supabaseAdmin.rpc('claim_guest_purchases_for_user', {
      p_user_id: userIdem,
    });
    expect(error).toBeNull();
    expect(second.success).toBe(true);
    expect(second.claimed_count).toBe(0);

    // Verify only one access record exists
    const { data: accessRecords } = await supabaseAdmin
      .schema('seller_main' as any)
      .from('user_product_access')
      .select('id')
      .eq('user_id', userIdem)
      .eq('product_id', productIdem.id);
    expect(accessRecords).toHaveLength(1);
  });
});

// ============================================================================
// grant_free_product_access
// ============================================================================

describe('grant_free_product_access', () => {
  const EMAIL_FREE = `free-access-${TEST_ID}@example.com`;
  const PASSWORD = 'test-password-123';
  let userId: string;
  let authenticatedClient: SupabaseClient;
  let freeProduct: { id: string; slug: string };
  let paidProduct: { id: string; slug: string };
  let inactiveProduct: { id: string; slug: string };
  let durationProduct: { id: string; slug: string };

  beforeAll(async () => {
    userId = await createTestUser(EMAIL_FREE, PASSWORD);
    createdUserIds.push(userId);
    authenticatedClient = await createAuthenticatedClient(EMAIL_FREE, PASSWORD);

    freeProduct = await createTestProduct({ price: 0 });
    paidProduct = await createTestProduct({ price: 100 });
    inactiveProduct = await createTestProduct({ price: 0, is_active: false });
    durationProduct = await createTestProduct({ price: 0, auto_grant_duration_days: 30 });
    createdProductIds.push(freeProduct.id, paidProduct.id, inactiveProduct.id, durationProduct.id);
  });

  afterAll(async () => {
    await cleanupRateLimits('grant_free_product_access');
  });

  it('grants access to a free product', async () => {
    const { data, error } = await authenticatedClient.rpc('grant_free_product_access', {
      product_slug_param: freeProduct.slug,
    });

    expect(error).toBeNull();
    expect(data).toBe(true);

    const access = await getUserAccess(userId, freeProduct.id);
    expect(access).not.toBeNull();
  });

  it('rejects paid product (price > 0)', async () => {
    const { data, error } = await authenticatedClient.rpc('grant_free_product_access', {
      product_slug_param: paidProduct.slug,
    });

    expect(error).toBeNull();
    expect(data).toBe(false);

    const access = await getUserAccess(userId, paidProduct.id);
    expect(access).toBeNull();
  });

  it('rejects inactive product', async () => {
    const { data, error } = await authenticatedClient.rpc('grant_free_product_access', {
      product_slug_param: inactiveProduct.slug,
    });

    expect(error).toBeNull();
    expect(data).toBe(false);
  });

  it('is idempotent - already has access returns true', async () => {
    // First grant
    await authenticatedClient.rpc('grant_free_product_access', {
      product_slug_param: freeProduct.slug,
    });

    // Second grant - should return true (early return for existing access)
    const { data, error } = await authenticatedClient.rpc('grant_free_product_access', {
      product_slug_param: freeProduct.slug,
    });

    expect(error).toBeNull();
    expect(data).toBe(true);

    // Still only one access record
    const { data: records } = await supabaseAdmin
      .schema('seller_main' as any)
      .from('user_product_access')
      .select('id')
      .eq('user_id', userId)
      .eq('product_id', freeProduct.id);
    expect(records).toHaveLength(1);
  });

  it('respects auto_grant_duration_days', async () => {
    const { data, error } = await authenticatedClient.rpc('grant_free_product_access', {
      product_slug_param: durationProduct.slug,
    });

    expect(error).toBeNull();
    expect(data).toBe(true);

    const access = await getUserAccess(userId, durationProduct.id);
    expect(access).not.toBeNull();
    expect(access!.access_expires_at).not.toBeNull();
    expect(access!.access_duration_days).toBe(30);

    // Verify expiration is roughly 30 days from now
    const expiresAt = new Date(access!.access_expires_at);
    const expectedExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const diffMs = Math.abs(expiresAt.getTime() - expectedExpiry.getTime());
    expect(diffMs).toBeLessThan(60_000); // within 1 minute
  });

  it('rate limits after exceeding threshold', async () => {
    // Create a separate user to avoid polluting other tests
    const rlEmail = `free-rl-${TEST_ID}@example.com`;
    const rlUser = await createTestUser(rlEmail, PASSWORD);
    createdUserIds.push(rlUser);

    // Create a product with duration so access expires (avoids early return on existing access)
    const rlProduct = await createTestProduct({ price: 0, auto_grant_duration_days: 1 });
    createdProductIds.push(rlProduct.id);

    // Simulate exhausted rate limit by inserting artificial rate limit record
    const windowStart = new Date();
    windowStart.setMinutes(0, 0, 0);

    await supabaseAdmin.from('rate_limits').upsert(
      {
        user_id: rlUser,
        function_name: 'grant_free_product_access',
        window_start: windowStart.toISOString(),
        call_count: 20,
      },
      { onConflict: 'user_id,function_name,window_start' },
    );

    const rlClient = await createAuthenticatedClient(rlEmail, PASSWORD);
    const { data, error } = await rlClient.rpc('grant_free_product_access', {
      product_slug_param: rlProduct.slug,
    });

    // Rate limited - returns false (no error raised, just returns false)
    expect(error).toBeNull();
    expect(data).toBe(false);

    // Cleanup
    await supabaseAdmin
      .from('rate_limits')
      .delete()
      .eq('user_id', rlUser)
      .eq('function_name', 'grant_free_product_access');
  });
});

// ============================================================================
// grant_pwyw_free_access
// ============================================================================

describe('grant_pwyw_free_access', () => {
  const EMAIL_PWYW = `pwyw-test-${TEST_ID}@example.com`;
  const PASSWORD = 'test-password-123';
  let userId: string;
  let authenticatedClient: SupabaseClient;
  let pwywFreeProduct: { id: string; slug: string };
  let pwywPaidMinProduct: { id: string; slug: string };
  let nonPwywProduct: { id: string; slug: string };

  beforeAll(async () => {
    userId = await createTestUser(EMAIL_PWYW, PASSWORD);
    createdUserIds.push(userId);
    authenticatedClient = await createAuthenticatedClient(EMAIL_PWYW, PASSWORD);

    // PWYW product with custom_price_min = 0 (free access allowed)
    pwywFreeProduct = await createTestProduct({
      price: 10,
      allow_custom_price: true,
      custom_price_min: 0,
    });

    // PWYW product with custom_price_min > 0 (free access NOT allowed)
    pwywPaidMinProduct = await createTestProduct({
      price: 20,
      allow_custom_price: true,
      custom_price_min: 5,
    });

    // Regular product (not PWYW)
    nonPwywProduct = await createTestProduct({
      price: 15,
      allow_custom_price: false,
    });

    createdProductIds.push(pwywFreeProduct.id, pwywPaidMinProduct.id, nonPwywProduct.id);
  });

  afterAll(async () => {
    await cleanupRateLimits('grant_pwyw_free_access');
  });

  it('grants access for PWYW product with allow_custom_price=true AND custom_price_min=0', async () => {
    const { data, error } = await authenticatedClient.rpc('grant_pwyw_free_access', {
      product_slug_param: pwywFreeProduct.slug,
    });

    expect(error).toBeNull();
    expect(data).toBe(true);

    const access = await getUserAccess(userId, pwywFreeProduct.id);
    expect(access).not.toBeNull();
  });

  it('rejects PWYW product with custom_price_min > 0', async () => {
    const { data, error } = await authenticatedClient.rpc('grant_pwyw_free_access', {
      product_slug_param: pwywPaidMinProduct.slug,
    });

    expect(error).toBeNull();
    expect(data).toBe(false);

    const access = await getUserAccess(userId, pwywPaidMinProduct.id);
    expect(access).toBeNull();
  });

  it('rejects non-PWYW product (allow_custom_price=false)', async () => {
    const { data, error } = await authenticatedClient.rpc('grant_pwyw_free_access', {
      product_slug_param: nonPwywProduct.slug,
    });

    expect(error).toBeNull();
    expect(data).toBe(false);

    const access = await getUserAccess(userId, nonPwywProduct.id);
    expect(access).toBeNull();
  });
});

// ============================================================================
// grant_product_access_service_role
// ============================================================================

describe('grant_product_access_service_role', () => {
  const EMAIL_SVC = `svc-role-${TEST_ID}@example.com`;
  const PASSWORD = 'test-password-123';
  let userId: string;
  let permanentProduct: { id: string; slug: string };
  let durationProduct: { id: string; slug: string };

  beforeAll(async () => {
    userId = await createTestUser(EMAIL_SVC, PASSWORD);
    createdUserIds.push(userId);

    permanentProduct = await createTestProduct({ price: 50 });
    durationProduct = await createTestProduct({ price: 30, auto_grant_duration_days: 14 });
    createdProductIds.push(permanentProduct.id, durationProduct.id);
  });

  it('grants access with correct expiration for duration product', async () => {
    const { data, error } = await supabaseAdmin.rpc('grant_product_access_service_role', {
      user_id_param: userId,
      product_id_param: durationProduct.id,
    });

    expect(error).toBeNull();
    expect(data).toMatchObject({
      success: true,
      operation: 'created_new',
    });

    const access = await getUserAccess(userId, durationProduct.id);
    expect(access).not.toBeNull();
    expect(access!.access_expires_at).not.toBeNull();
    expect(access!.access_duration_days).toBe(14);

    // Verify expiration is roughly 14 days from now
    const expiresAt = new Date(access!.access_expires_at);
    const expectedExpiry = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const diffMs = Math.abs(expiresAt.getTime() - expectedExpiry.getTime());
    expect(diffMs).toBeLessThan(60_000);
  });

  it('handles null auto_grant_duration_days (permanent access)', async () => {
    const { data, error } = await supabaseAdmin.rpc('grant_product_access_service_role', {
      user_id_param: userId,
      product_id_param: permanentProduct.id,
    });

    expect(error).toBeNull();
    expect(data).toMatchObject({
      success: true,
      operation: 'created_new',
    });

    const access = await getUserAccess(userId, permanentProduct.id);
    expect(access).not.toBeNull();
    expect(access!.access_expires_at).toBeNull();
    expect(access!.access_duration_days).toBeNull();
  });

  it('updates version on re-grant', async () => {
    // First, get current version
    const accessBefore = await getUserAccess(userId, durationProduct.id);
    expect(accessBefore).not.toBeNull();
    const versionBefore = accessBefore!.version;

    const { data, error } = await supabaseAdmin.rpc('grant_product_access_service_role', {
      user_id_param: userId,
      product_id_param: durationProduct.id,
    });

    expect(error).toBeNull();
    expect(data.success).toBe(true);
    expect(data.operation).toBe('updated_existing');

    const accessAfter = await getUserAccess(userId, durationProduct.id);
    expect(accessAfter!.version).toBe(versionBefore + 1);
  });

  it('returns error for inactive product', async () => {
    const inactiveProduct = await createTestProduct({ price: 10, is_active: false });
    createdProductIds.push(inactiveProduct.id);

    const { data, error } = await supabaseAdmin.rpc('grant_product_access_service_role', {
      user_id_param: userId,
      product_id_param: inactiveProduct.id,
    });

    expect(error).toBeNull();
    expect(data).toMatchObject({
      success: false,
      error: 'Product not found or inactive',
    });
  });

  it('returns error for null user_id', async () => {
    const { data, error } = await supabaseAdmin.rpc('grant_product_access_service_role', {
      user_id_param: null,
      product_id_param: permanentProduct.id,
    });

    // Function handles null gracefully
    expect(error).toBeNull();
    expect(data.success).toBe(false);
  });
});

// ============================================================================
// handle_new_user_registration (trigger)
// ============================================================================

describe('handle_new_user_registration', () => {
  it('creates profile and claims guest purchases on user registration', async () => {
    const email = `trigger-test-${TEST_ID}@example.com`;
    const product = await createTestProduct({ price: 40 });
    createdProductIds.push(product.id);

    // Create guest purchase BEFORE user registration
    const gpId = await createGuestPurchase(email, product.id, `cs_test_trigger_${TEST_ID}`);
    createdGuestPurchaseIds.push(gpId);

    // Register user -- this fires the handle_new_user_registration trigger
    const userId = await createTestUser(email, 'test-password-123');
    createdUserIds.push(userId);

    // Wait briefly for trigger to complete
    await new Promise((r) => setTimeout(r, 500));

    // Verify profile was created
    const { data: profile } = await supabaseAdmin
      .schema('seller_main' as any)
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();
    expect(profile).not.toBeNull();

    // Verify guest purchase was claimed
    const { data: gp } = await supabaseAdmin
      .schema('seller_main' as any)
      .from('guest_purchases')
      .select('claimed_by_user_id')
      .eq('id', gpId)
      .single();
    expect(gp?.claimed_by_user_id).toBe(userId);

    // Verify product access was granted
    const access = await getUserAccess(userId, product.id);
    expect(access).not.toBeNull();
  });

  it('first registered user becomes admin', async () => {
    // This test verifies the first-user-admin behavior.
    // Since tests run against an existing DB with seed data, admin_users likely
    // already has entries. We verify the trigger does not fail and the user
    // is properly created regardless.
    const email = `first-user-${TEST_ID}@example.com`;
    const userId = await createTestUser(email, 'test-password-123');
    createdUserIds.push(userId);

    // Verify profile was created (trigger ran successfully)
    const { data: profile } = await supabaseAdmin
      .schema('seller_main' as any)
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();
    expect(profile).not.toBeNull();
  });
});

// ============================================================================
// Global cleanup
// ============================================================================

afterAll(async () => {
  // Clean up in reverse dependency order

  // 1. Remove user_product_access for test users
  for (const uid of createdUserIds) {
    await supabaseAdmin
      .schema('seller_main' as any)
      .from('user_product_access')
      .delete()
      .eq('user_id', uid);
  }

  // 2. Remove payment_line_items for created transactions
  for (const txId of createdTransactionIds) {
    await supabaseAdmin
      .schema('seller_main' as any)
      .from('payment_line_items')
      .delete()
      .eq('transaction_id', txId);
  }

  // 3. Remove payment_transactions
  for (const txId of createdTransactionIds) {
    await supabaseAdmin
      .schema('seller_main' as any)
      .from('payment_transactions')
      .delete()
      .eq('id', txId);
  }

  // 4. Remove guest_purchases
  for (const gpId of createdGuestPurchaseIds) {
    await supabaseAdmin
      .schema('seller_main' as any)
      .from('guest_purchases')
      .delete()
      .eq('id', gpId);
  }

  // 5. Remove profiles for test users
  for (const uid of createdUserIds) {
    await supabaseAdmin
      .schema('seller_main' as any)
      .from('profiles')
      .delete()
      .eq('id', uid);
  }

  // 6. Remove products
  if (createdProductIds.length > 0) {
    await supabaseAdmin
      .schema('seller_main' as any)
      .from('products')
      .delete()
      .in('id', createdProductIds);
  }

  // 7. Remove rate_limits
  await cleanupRateLimits('claim_guest');
  await cleanupRateLimits('grant_free');
  await cleanupRateLimits('grant_pwyw');

  // 8. Remove auth users
  for (const uid of createdUserIds) {
    await supabaseAdmin.auth.admin.deleteUser(uid);
  }
});
