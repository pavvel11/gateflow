import { test, expect, Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { waitForEmail, extractMagicLink, deleteAllMessages } from './helpers/mailpit';
import { acceptAllCookies } from './helpers/consent';

// Enforce single worker because we modify global DB state (products)
test.describe.configure({ mode: 'serial' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ANON_KEY) {
  throw new Error('Missing Supabase env variables for testing');
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

test.describe('Funnel Mechanics (Time Access & OTO)', () => {
  
  test.beforeAll(async () => {
    // Clear emails
    try { await deleteAllMessages(); } catch {}
  });

  test('should grant temporary access for free product with auto_grant_duration', async ({ page }) => {
    const slug = `temp-access-${Date.now()}`;
    const durationDays = 7;

    // 1. Create Free Product with Duration
    const { data: product } = await supabaseAdmin.from('products').insert({
      name: 'Temporary Access Product',
      slug,
      price: 0,
      currency: 'USD',
      description: 'Free for 7 days',
      is_active: true,
      content_delivery_type: 'content',
      auto_grant_duration_days: durationDays,
      content_config: { content_items: [] }
    }).select().single();

    expect(product).toBeDefined();

    // 2. Claim Product
    await acceptAllCookies(page);
    await page.goto(`/p/${slug}`);
    
    const email = `temp-user-${Date.now()}@example.com`;
    await page.locator('input[type="email"]').fill(email);
    const terms = page.locator('label').filter({ hasText: /agree|akceptuję/i });
    if (await terms.count() > 0) await terms.click();
    
    // Wait for Captcha
    await page.waitForTimeout(3000);
    const submitBtn = page.getByRole('button', { name: /Get|Odbierz|Send|Wyślij/i });
    await expect(submitBtn).toBeEnabled({ timeout: 15000 });
    await submitBtn.click();

    // 3. Wait for Success & Login
    await expect(page.getByText(/check your email|sprawdź swoją skrzynkę/i).first()).toBeVisible({ timeout: 15000 });

    const message = await waitForEmail(email, { timeout: 15000 });
    const magicLink = extractMagicLink(message.Text!);
    if (!magicLink) throw new Error('Magic link not found');
    
    // Fix link for local container networking if needed, but standard should work
    await page.goto(magicLink);
    
    // Wait for redirect to product page (access confirmed)
    await expect(page).toHaveURL(new RegExp(`/p/${slug}`), { timeout: 20000 });

    // 4. Verify Access Expiration in DB
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
    const newUser = users.find(u => u.email === email);
    expect(newUser).toBeDefined();

    const { data: access } = await supabaseAdmin.from('user_product_access')
      .select('*')
      .eq('user_id', newUser!.id)
      .eq('product_id', product!.id)
      .single();

    expect(access).toBeDefined();
    expect(access.access_duration_days).toBe(durationDays);
    expect(access.access_expires_at).not.toBeNull();

    // Calculate expected expiration (approximate)
    const now = new Date();
    const expiresAt = new Date(access.access_expires_at);
    const diffDays = (expiresAt.getTime() - now.getTime()) / (1000 * 3600 * 24);
    
    expect(diffDays).toBeGreaterThan(6.9);
    expect(diffDays).toBeLessThan(7.1);
  });

  test('should display access duration for Order Bump in checkout', async ({ page }) => {
    const mainSlug = `main-bump-${Date.now()}`;
    const bumpSlug = `offer-bump-${Date.now()}`;
    
    // 1. Create Main Product
    const { data: mainProduct } = await supabaseAdmin.from('products').insert({
      name: 'Main Product',
      slug: mainSlug,
      price: 10,
      currency: 'USD',
      is_active: true
    }).select().single();

    // 2. Create Bump Product
    const { data: bumpProduct } = await supabaseAdmin.from('products').insert({
      name: 'Bump Offer',
      slug: bumpSlug,
      price: 5,
      currency: 'USD',
      is_active: true
    }).select().single();

    // 3. Create Order Bump Link with Duration
    await supabaseAdmin.from('order_bumps').insert({
      main_product_id: mainProduct!.id,
      bump_product_id: bumpProduct!.id,
      bump_title: 'Special Offer',
      bump_description: 'Get this too!',
      bump_price: 5,
      access_duration_days: 30, // 30 days access
      is_active: true
    });

    // 4. Go to Checkout
    await acceptAllCookies(page);
    await page.goto(`/checkout/${mainSlug}`);

    // 5. Check for Duration Text in Bump Box
    const bumpBox = page.locator('div').filter({ hasText: 'Special Offer' }).first();
    await expect(bumpBox).toBeVisible();
    
    // Check for "30 Days Access" or "Dostęp na 30 dni"
    // The exact text depends on implementation. Looking for "30" and "days" or "dni"
    await expect(bumpBox).toContainText(/30/);
    await expect(bumpBox).toContainText(/day|dni|dostęp/i);
  });

  test('should display Lifetime Access for Order Bump in checkout', async ({ page }) => {
    const mainSlug = `main-lifetime-${Date.now()}`;
    const bumpSlug = `bump-lifetime-${Date.now()}`;
    
    const { data: mainProduct } = await supabaseAdmin.from('products').insert({
      name: 'Main Product',
      slug: mainSlug,
      price: 10,
      is_active: true
    }).select().single();

    const { data: bumpProduct } = await supabaseAdmin.from('products').insert({
      name: 'Bump Product',
      slug: bumpSlug,
      price: 5,
      is_active: true
    }).select().single();

    await supabaseAdmin.from('order_bumps').insert({
      main_product_id: mainProduct!.id,
      bump_product_id: bumpProduct!.id,
      bump_title: 'Lifetime Bump',
      bump_description: 'Get this forever',
      bump_price: 5,
      access_duration_days: null, // Lifetime
      is_active: true
    });

    await acceptAllCookies(page);
    await page.goto(`/checkout/${mainSlug}`);

    const bumpBox = page.locator('div').filter({ hasText: 'Lifetime Bump' }).first();
    await expect(bumpBox).toBeVisible();
    
    // Check for "Lifetime" text (localized or English)
    await expect(bumpBox).toContainText(/lifetime|dożywotni|stały/i);
  });

  test('should redirect to OTO page after purchase', async ({ page }) => {
    const otoSlug = `oto-page-${Date.now()}`;
    const redirectUrl = `http://localhost:3000/p/${otoSlug}`; 
    const productSlug = `redirect-prod-${Date.now()}`;

    // 1. Create Target Product (OTO)
    await supabaseAdmin.from('products').insert({
      name: 'OTO Product',
      slug: otoSlug,
      price: 99,
      is_active: true
    });

    // 2. Create Trigger Product (Free) with Redirect
    const { data: product } = await supabaseAdmin.from('products').insert({
      name: 'Trigger Product',
      slug: productSlug,
      price: 0,
      is_active: true,
      content_delivery_type: 'content',
      success_redirect_url: redirectUrl,
      pass_params_to_redirect: true
    }).select().single();

    // 3. Claim Product
    await acceptAllCookies(page);
    await page.goto(`/p/${productSlug}`);
    
    // Wait for redirect to checkout (since product is free and user is guest)
    await expect(page).toHaveURL(new RegExp(`/checkout/${productSlug}`), { timeout: 10000 });
    
    const email = `oto-user-${Date.now()}@example.com`;
    await page.locator('input[type="email"]').fill(email);
    const terms = page.locator('label').filter({ hasText: /agree|akceptuję/i });
    if (await terms.count() > 0) await terms.click();
    
    await page.waitForTimeout(3000);
    const submitBtn = page.getByRole('button', { name: /Get|Odbierz|Send|Wyślij/i });
    await expect(submitBtn).toBeEnabled({ timeout: 15000 });
    await submitBtn.click();

    // 4. Process Login & Redirect
    const message = await waitForEmail(email, { timeout: 15000 });
    const magicLink = extractMagicLink(message.Text!);
    
    await page.goto(magicLink!);
    
    // 5. Verify Redirect to OTO (or its checkout)
    // The redirect happens, but product page might redirect further to checkout
    await expect(page).toHaveURL(new RegExp(`${otoSlug}|checkout/${otoSlug}`), { timeout: 20000 });
  });

});