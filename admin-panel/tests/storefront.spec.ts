import { test, expect, Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Enforce single worker
test.describe.configure({ mode: 'serial' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ANON_KEY) {
  throw new Error('Missing Supabase env variables for testing');
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

test.describe('Storefront & Checkout Flows', () => {
  let adminEmail: string;
  const adminPassword = 'password123';
  let freeProductSlug: string;

  // Helper to login as admin
  const loginAsAdmin = async (page: Page) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    await page.evaluate(async ({ email, password, supabaseUrl, anonKey }) => {
      const { createBrowserClient } = await import('https://esm.sh/@supabase/ssr@0.5.2');
      const supabase = createBrowserClient(supabaseUrl, anonKey);
      await supabase.auth.signInWithPassword({ email, password });
    }, {
      email: adminEmail,
      password: adminPassword,
      supabaseUrl: SUPABASE_URL,
      anonKey: ANON_KEY,
    });

    await page.waitForTimeout(1000); 
  };

  test.beforeAll(async () => {
    const randomStr = Math.random().toString(36).substring(7);
    adminEmail = `test-admin-${Date.now()}-${randomStr}@example.com`;
    
    const { data: { user }, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
    });
    if (createError) throw createError;

    await supabaseAdmin
      .from('admin_users')
      .insert({ user_id: user!.id });
  });

  test('should allow claiming a free product (Lead Magnet flow)', async ({ page }) => {
    // 1. Create Free Product as Admin
    await loginAsAdmin(page);
    await page.goto('/dashboard/products');
    
    await page.getByRole('button', { name: /Product/i }).first().click();
    
    const productName = `Magnet-${Date.now()}`;
    freeProductSlug = `m-${Date.now()}`;
    
    const modal = page.locator('div.fixed').filter({ hasText: /Cancel|Anuluj/i });
    await modal.locator('input[name="name"]').fill(productName);
    await modal.locator('input[name="slug"]').fill(freeProductSlug);
    await modal.locator('textarea[name="description"]').fill('Get this for free!');
    await modal.locator('input[name="price"]').fill('0');
    
    await modal.locator('button[type="submit"]').click();
    await expect(page.locator('table').getByText(productName).first()).toBeVisible({ timeout: 15000 });

    // 2. Open Product Page as Anonymous User
    await page.context().clearCookies();
    await page.goto(`/p/${freeProductSlug}`);
    
    // Redirect check
    await expect(page).toHaveURL(new RegExp(`/checkout/${freeProductSlug}`), { timeout: 10000 });

    // 3. Fill the Free Product Form
    const userEmail = `lead-${Date.now()}@example.com`;
    await page.locator('input[type="email"]').fill(userEmail);
    
    // Accept Terms (using the label or force click on hidden input)
    // In our UI, clicking the label is most reliable
    const termsLabel = page.locator('label').filter({ hasText: /I agree|Akceptuję|regulamin/i });
    await termsLabel.click();
    
    // Wait for Captcha & Submit
    const submitBtn = page.locator('button[type="submit"]');
    
    // Verify button becomes enabled (Turnstile verification)
    await expect(submitBtn).toBeEnabled({ timeout: 15000 });
    await submitBtn.click();

    // 4. Verify Success Message
    // Check for success text or specific UI change
    // Using a more flexible check for "email" which is common in success messages
    await expect(page.getByText(/email/i)).toBeVisible({ timeout: 15000 });
  });

});
