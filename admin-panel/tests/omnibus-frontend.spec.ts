import { test, expect, Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { acceptAllCookies } from './helpers/consent';

// Enforce single worker for database consistency
test.describe.configure({ mode: 'serial' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ANON_KEY) {
  throw new Error('Missing Supabase env variables for testing');
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Helper to login as admin
const loginAsAdmin = async (page: Page, adminEmail: string, adminPassword: string) => {
  await acceptAllCookies(page);

  await page.addInitScript(() => {
    const addStyle = () => {
      if (document.head) {
        const style = document.createElement('style');
        style.innerHTML = '#klaro { display: none !important; }';
        document.head.appendChild(style);
      } else {
        setTimeout(addStyle, 10);
      }
    };
    addStyle();
  });

  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  // Retry logic for ESM import (can fail due to network)
  let retries = 3;
  while (retries > 0) {
    try {
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
      break; // Success, exit loop
    } catch (error) {
      retries--;
      if (retries === 0) throw error; // Re-throw if all retries exhausted
      await page.waitForTimeout(1000); // Wait before retry
    }
  }

  await page.waitForTimeout(1000);
};

test.describe('Omnibus Frontend - Client Side', () => {
  let testProductId: string;
  let testProductSlug: string;

  test.beforeEach(async () => {
    // Ensure Omnibus is enabled globally before each test
    const { data: shopConfig } = await supabaseAdmin
      .from('shop_config')
      .select('id')
      .single();

    await supabaseAdmin
      .from('shop_config')
      .update({ omnibus_enabled: true })
      .eq('id', shopConfig!.id);

    await new Promise(resolve => setTimeout(resolve, 500));
  });

  test.beforeAll(async () => {
    // Create a test product with HIGHER initial price
    testProductSlug = `omnibus-frontend-${Date.now()}`;
    const { data: product, error } = await supabaseAdmin
      .from('products')
      .insert({
        name: 'Omnibus Frontend Test Product',
        slug: testProductSlug,
        price: 100, // Start with higher price
        currency: 'USD',
        description: 'Product for Omnibus frontend testing',
        is_active: true,
        omnibus_exempt: false
      })
      .select()
      .single();

    if (error) throw error;
    testProductId = product.id;

    // Wait for trigger to create initial price history (100 USD)
    await new Promise(resolve => setTimeout(resolve, 500));

    // Now drop the price to create a discount scenario
    // This will create a NEW price history entry at 80 USD
    await supabaseAdmin
      .from('products')
      .update({ price: 60 }) // Drop to 60 - this is LOWER than historical 100
      .eq('id', testProductId);

    // Wait for trigger to create new price history entry and close old one
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  test.afterAll(async () => {
    // Cleanup
    if (testProductId) {
      await supabaseAdmin
        .from('products')
        .delete()
        .eq('id', testProductId);
    }
  });

  test('should display OmnibusPrice on ProductShowcase when current price < lowest price', async ({ page }) => {
    await page.goto(`/pl/checkout/${testProductSlug}`, { timeout: 60000 });
    await page.waitForLoadState('domcontentloaded', { timeout: 60000 });

    // Wait for OmnibusPrice component to load and fetch data
    await page.waitForTimeout(3000);

    // Check if OmnibusPrice component is visible
    const omnibusPrice = page.locator('[data-testid="omnibus-price"]');

    // Take screenshot for debugging
    await page.screenshot({ path: 'test-results/omnibus-debug.png', fullPage: true });

    await expect(omnibusPrice).toBeVisible({ timeout: 10000 });

    // Verify it shows the correct lowest price text
    const priceText = await omnibusPrice.textContent();
    expect(priceText).toContain('100'); // Should show $100 as lowest price from last 30 days
    expect(priceText).toMatch(/najniższa cena|lowest price/i); // Polish or English text
  });

  test('should NOT display OmnibusPrice when Omnibus globally disabled', async ({ page }) => {
    // Disable Omnibus globally
    const { data: shopConfig } = await supabaseAdmin
      .from('shop_config')
      .select('id')
      .single();

    await supabaseAdmin
      .from('shop_config')
      .update({ omnibus_enabled: false })
      .eq('id', shopConfig!.id);

    await new Promise(resolve => setTimeout(resolve, 500));

    await page.goto(`/pl/checkout/${testProductSlug}`, { timeout: 60000 });
    await page.waitForLoadState('domcontentloaded', { timeout: 60000 });
    await page.waitForTimeout(2000);

    // OmnibusPrice should NOT be visible
    const omnibusPrice = page.locator('[data-testid="omnibus-price"]');
    await expect(omnibusPrice).not.toBeVisible();

    // Re-enable for other tests
    await supabaseAdmin
      .from('shop_config')
      .update({ omnibus_enabled: true })
      .eq('id', shopConfig!.id);

    await new Promise(resolve => setTimeout(resolve, 500));
  });

  test('should NOT display OmnibusPrice when product is exempt', async ({ page }) => {
    // Mark product as exempt
    await supabaseAdmin
      .from('products')
      .update({ omnibus_exempt: true })
      .eq('id', testProductId);

    await new Promise(resolve => setTimeout(resolve, 500));

    await page.goto(`/pl/checkout/${testProductSlug}`, { timeout: 60000 });
    await page.waitForLoadState('domcontentloaded', { timeout: 60000 });
    await page.waitForTimeout(2000);

    // OmnibusPrice should NOT be visible
    const omnibusPrice = page.locator('[data-testid="omnibus-price"]');
    await expect(omnibusPrice).not.toBeVisible();

    // Remove exemption for other tests
    await supabaseAdmin
      .from('products')
      .update({ omnibus_exempt: false })
      .eq('id', testProductId);

    await new Promise(resolve => setTimeout(resolve, 500));
  });

  test('should NOT display OmnibusPrice when current price >= lowest price', async ({ page }) => {
    // Update product price to be higher than historical lowest (no discount)
    await supabaseAdmin
      .from('products')
      .update({ price: 120 }) // Higher than historical $100
      .eq('id', testProductId);

    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for trigger

    await page.goto(`/pl/checkout/${testProductSlug}`, { timeout: 60000 });
    await page.waitForLoadState('domcontentloaded', { timeout: 60000 });
    await page.waitForTimeout(2000);

    // OmnibusPrice should NOT be visible (no discount)
    const omnibusPrice = page.locator('[data-testid="omnibus-price"]');
    await expect(omnibusPrice).not.toBeVisible();

    // Restore original price for other tests
    await supabaseAdmin
      .from('products')
      .update({ price: 80 })
      .eq('id', testProductId);

    await new Promise(resolve => setTimeout(resolve, 1000));
  });
});

test.describe('Omnibus Frontend - Admin Side', () => {
  let adminEmail: string;
  const adminPassword = 'password123';
  let testProductId: string;
  let testProductSlug: string;

  test.beforeAll(async () => {
    // Create admin user
    const randomStr = Math.random().toString(36).substring(7);
    adminEmail = `omnibus-admin-${Date.now()}-${randomStr}@example.com`;

    const { data: { user }, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
    });
    if (createError) throw createError;

    await supabaseAdmin
      .from('admin_users')
      .insert({ user_id: user!.id });

    // Create a test product
    testProductSlug = `omnibus-admin-test-${Date.now()}`;
    const { data: product, error } = await supabaseAdmin
      .from('products')
      .insert({
        name: 'Omnibus Admin Test Product',
        slug: testProductSlug,
        price: 50,
        currency: 'USD',
        description: 'Product for admin testing',
        is_active: true,
        omnibus_exempt: false
      })
      .select()
      .single();

    if (error) throw error;
    testProductId = product.id;

    await new Promise(resolve => setTimeout(resolve, 500));
  });

  test.afterAll(async () => {
    // Cleanup
    if (testProductId) {
      await supabaseAdmin
        .from('products')
        .delete()
        .eq('id', testProductId);
    }
  });

  test('should be able to toggle omnibus_exempt in ProductFormModal', async ({ page }) => {
    await loginAsAdmin(page, adminEmail, adminPassword);
    await page.goto('/dashboard/products');

    // Find and edit the product
    const row = page.locator('tr', { hasText: 'Omnibus Admin Test Product' }).first();
    await row.locator('button[aria-label*="Edit"]').first().click();

    // Wait for modal
    const modal = page.locator('div.fixed').filter({ hasText: /Cancel|Anuluj/i });
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Find omnibus_exempt checkbox
    const omnibusCheckbox = modal.locator('input[name="omnibus_exempt"]');
    await expect(omnibusCheckbox).toBeVisible();

    // Initially should be unchecked (false)
    await expect(omnibusCheckbox).not.toBeChecked();

    // Check the checkbox
    await omnibusCheckbox.check();
    await expect(omnibusCheckbox).toBeChecked();

    // Save
    await modal.locator('button[type="submit"]').click();
    await expect(modal).not.toBeVisible({ timeout: 5000 });

    // Verify in database
    const { data: updatedProduct } = await supabaseAdmin
      .from('products')
      .select('omnibus_exempt')
      .eq('id', testProductId)
      .single();

    expect(updatedProduct!.omnibus_exempt).toBe(true);

    // Reopen modal and verify checkbox is still checked
    await row.locator('button[aria-label*="Edit"]').first().click();
    await expect(modal).toBeVisible({ timeout: 5000 });
    await expect(modal.locator('input[name="omnibus_exempt"]')).toBeChecked();

    // Uncheck and save
    await modal.locator('input[name="omnibus_exempt"]').uncheck();
    await modal.locator('button[type="submit"]').click();
    await expect(modal).not.toBeVisible({ timeout: 5000 });

    // Verify unchecked in database
    const { data: finalProduct } = await supabaseAdmin
      .from('products')
      .select('omnibus_exempt')
      .eq('id', testProductId)
      .single();

    expect(finalProduct!.omnibus_exempt).toBe(false);
  });

  test('should be able to toggle Omnibus globally in Settings', async ({ page }) => {
    await loginAsAdmin(page, adminEmail, adminPassword);
    await page.goto('/dashboard/settings');

    // Wait for OmnibusSettings component to load
    await page.waitForSelector('text=/Dyrektywa Omnibus|EU Omnibus Directive/i', { timeout: 10000 });

    // Find the toggle switch
    const toggleSwitch = page.locator('button[role="switch"]').filter({ hasText: '' }); // Toggle has no text, just switch
    const toggleContainer = page.locator('div', { hasText: /Włącz śledzenie|Enable Omnibus/i });
    const actualToggle = toggleContainer.locator('button[role="switch"]').first();

    // Get initial state
    const initialState = await actualToggle.getAttribute('aria-checked');
    const wasEnabled = initialState === 'true';

    // Toggle it
    await actualToggle.click();
    await page.waitForTimeout(2000); // Wait for save

    // Verify in database
    const { data: shopConfig1 } = await supabaseAdmin
      .from('shop_config')
      .select('omnibus_enabled')
      .single();

    expect(shopConfig1!.omnibus_enabled).toBe(!wasEnabled);

    // Re-find toggle after state change
    const toggleContainer2 = page.locator('div', { hasText: /Włącz śledzenie|Enable Omnibus/i });
    const actualToggle2 = toggleContainer2.locator('button[role="switch"]').first();

    // Toggle back
    await actualToggle2.click();
    await page.waitForTimeout(2000); // Wait for save

    // Verify restored
    const { data: shopConfig2 } = await supabaseAdmin
      .from('shop_config')
      .select('omnibus_enabled')
      .single();

    expect(shopConfig2!.omnibus_enabled).toBe(wasEnabled);
  });

  test('should create price history entry when product price is updated', async ({ page }) => {
    await loginAsAdmin(page, adminEmail, adminPassword);
    await page.goto('/dashboard/products');

    // Get initial price history count
    const { data: initialHistory } = await supabaseAdmin
      .from('product_price_history')
      .select('*')
      .eq('product_id', testProductId);

    const initialCount = initialHistory?.length || 0;

    // Edit product and change price
    const row = page.locator('tr', { hasText: 'Omnibus Admin Test Product' }).first();
    await row.locator('button[aria-label*="Edit"]').first().click();

    const modal = page.locator('div.fixed').filter({ hasText: /Cancel|Anuluj/i });
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Change price
    const priceInput = modal.locator('input[name="price"]');
    await priceInput.fill('75.50');

    // Save
    await modal.locator('button[type="submit"]').click();
    await expect(modal).not.toBeVisible({ timeout: 5000 });

    // Wait for trigger to execute
    await page.waitForTimeout(1500);

    // Verify new price history entry was created
    const { data: newHistory } = await supabaseAdmin
      .from('product_price_history')
      .select('*')
      .eq('product_id', testProductId)
      .order('effective_from', { ascending: false });

    expect(newHistory!.length).toBe(initialCount + 1);

    // Verify the latest entry has the new price
    expect(parseFloat(newHistory![0].price)).toBe(75.50);
    expect(newHistory![0].effective_until).toBeNull(); // Current price

    // Verify the previous entry was closed
    if (initialCount > 0) {
      expect(newHistory![1].effective_until).not.toBeNull();
    }
  });
});
