/**
 * SECURITY TEST: IDOR in /api/users/[id]/profile
 *
 * This test verifies that users can only access their own profile
 * unless they are admins.
 *
 * Vulnerability: Any authenticated user can read any other user's profile
 * by simply changing the [id] parameter.
 */

import { test, expect, Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Helper to login via browser and get cookies set
async function loginViaBrowser(page: Page, email: string, password: string) {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  await page.evaluate(async ({ email, password, supabaseUrl, anonKey }) => {
    const { createBrowserClient } = await import('https://esm.sh/@supabase/ssr@0.5.2');
    const supabase = createBrowserClient(supabaseUrl, anonKey);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  }, { email, password, supabaseUrl: SUPABASE_URL, anonKey: ANON_KEY });

  await page.waitForTimeout(500); // Wait for cookies to be set
}

test.describe('IDOR - User Profile Access Control', () => {
  test.describe.configure({ mode: 'serial' });

  let userAId: string;
  let userBId: string;
  let adminUserId: string;
  let userAEmail: string;
  let userBEmail: string;
  let adminEmail: string;
  const password = 'TestPassword123!';

  test.beforeAll(async () => {
    const suffix = Date.now().toString();
    userAEmail = `idor-user-a-${suffix}@example.com`;
    userBEmail = `idor-user-b-${suffix}@example.com`;
    adminEmail = `idor-admin-${suffix}@example.com`;

    // Create User A (regular user)
    const { data: userAData, error: userAError } = await supabaseAdmin.auth.admin.createUser({
      email: userAEmail,
      password,
      email_confirm: true,
    });
    if (userAError) throw userAError;
    userAId = userAData.user!.id;

    // Create User B (regular user)
    const { data: userBData, error: userBError } = await supabaseAdmin.auth.admin.createUser({
      email: userBEmail,
      password,
      email_confirm: true,
    });
    if (userBError) throw userBError;
    userBId = userBData.user!.id;

    // Create Admin user
    const { data: adminData, error: adminError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password,
      email_confirm: true,
    });
    if (adminError) throw adminError;
    adminUserId = adminData.user!.id;

    // Make the admin user an admin
    await supabaseAdmin.from('admin_users').insert({ user_id: adminUserId });

    console.log(`Created test users:`);
    console.log(`  User A: ${userAId}`);
    console.log(`  User B: ${userBId}`);
    console.log(`  Admin: ${adminUserId}`);
  });

  test.afterAll(async () => {
    // Cleanup
    if (adminUserId) {
      await supabaseAdmin.from('admin_users').delete().eq('user_id', adminUserId);
    }
    if (userAId) await supabaseAdmin.auth.admin.deleteUser(userAId);
    if (userBId) await supabaseAdmin.auth.admin.deleteUser(userBId);
    if (adminUserId) await supabaseAdmin.auth.admin.deleteUser(adminUserId);
  });

  test('User should be able to access their OWN profile', async ({ page }) => {
    // Login as User A
    await loginViaBrowser(page, userAEmail, password);

    // User A accesses their own profile - should work
    const response = await page.evaluate(async (userId) => {
      const res = await fetch(`/api/users/${userId}/profile`);
      return { status: res.status, ok: res.ok };
    }, userAId);

    console.log(`\nUser A accessing OWN profile:`);
    console.log(`  Status: ${response.status}`);

    expect(response.status).toBe(200);
  });

  test('SECURITY: User should NOT be able to access ANOTHER user\'s profile', async ({ page }) => {
    // Login as User A
    await loginViaBrowser(page, userAEmail, password);

    // User A tries to access User B's profile - should be FORBIDDEN
    const response = await page.evaluate(async (userId) => {
      const res = await fetch(`/api/users/${userId}/profile`);
      return { status: res.status, ok: res.ok };
    }, userBId);

    console.log(`\nUser A accessing User B's profile (IDOR test):`);
    console.log(`  Status: ${response.status}`);
    console.log(`  Expected: 403 (Forbidden)`);

    if (response.status === 200) {
      console.log(`  VULNERABILITY CONFIRMED: User can access other user's profile!`);
    }

    // This test PASSES when the vulnerability is FIXED
    expect(response.status).toBe(403);
  });

  test('Admin should be able to access ANY user\'s profile', async ({ page }) => {
    // Login as Admin
    await loginViaBrowser(page, adminEmail, password);

    // Admin accesses User B's profile - should work
    const response = await page.evaluate(async (userId) => {
      const res = await fetch(`/api/users/${userId}/profile`);
      return { status: res.status, ok: res.ok };
    }, userBId);

    console.log(`\nAdmin accessing User B's profile:`);
    console.log(`  Status: ${response.status}`);
    console.log(`  Expected: 200 (OK)`);

    expect(response.status).toBe(200);
  });

  test('Unauthenticated request should be rejected', async ({ page }) => {
    // Don't login - just make request
    await page.goto('/');

    const response = await page.evaluate(async (userId) => {
      const res = await fetch(`/api/users/${userId}/profile`);
      return { status: res.status };
    }, userAId);

    console.log(`\nUnauthenticated request:`);
    console.log(`  Status: ${response.status}`);

    expect(response.status).toBe(401);
  });
});
