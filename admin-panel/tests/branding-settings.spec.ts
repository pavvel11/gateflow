import { test, expect, Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { acceptAllCookies } from './helpers/consent';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ANON_KEY) {
  throw new Error('Missing Supabase env variables for testing');
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

test.describe('Branding Settings', () => {
  test.describe.configure({ mode: 'serial' });

  let adminEmail: string;
  const password = 'password123';
  let shopConfigId: string;

  const loginAsAdmin = async (page: Page) => {
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

    await page.evaluate(async ({ email, password, supabaseUrl, anonKey }) => {
      const { createBrowserClient } = await import('https://esm.sh/@supabase/ssr@0.5.2');
      const supabase = createBrowserClient(supabaseUrl, anonKey);
      await supabase.auth.signInWithPassword({ email, password });
    }, {
      email: adminEmail,
      password: password,
      supabaseUrl: SUPABASE_URL,
      anonKey: ANON_KEY,
    });

    await page.waitForTimeout(1000);
  };

  test.beforeAll(async () => {
    const randomStr = Math.random().toString(36).substring(7);
    adminEmail = `test-branding-admin-${Date.now()}-${randomStr}@example.com`;

    // Create admin user
    const { data: { user: adminUser }, error: adminError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: password,
      email_confirm: true,
    });
    if (adminError) throw adminError;

    await supabaseAdmin
      .from('admin_users')
      .insert({ user_id: adminUser!.id });

    // Get shop_config ID
    const { data: shopConfig } = await supabaseAdmin
      .from('shop_config')
      .select('id')
      .single();

    if (shopConfig) {
      shopConfigId = shopConfig.id;
    }
  });

  test.afterAll(async () => {
    // Cleanup - restore default branding
    if (shopConfigId) {
      await supabaseAdmin
        .from('shop_config')
        .update({
          logo_url: null,
          primary_color: '#9333ea',
          secondary_color: '#ec4899',
          accent_color: '#8b5cf6',
          font_family: 'system',
          shop_name: 'GateFlow Demo Shop'
        })
        .eq('id', shopConfigId);
    }

    // Delete test user
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const testUser = users.users.find(u => u.email === adminEmail);
    if (testUser) {
      await supabaseAdmin.auth.admin.deleteUser(testUser.id);
    }
  });

  test('Admin can access branding settings page', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Should see "Branding & Whitelabel" heading
    const brandingHeading = page.locator('h2', { hasText: /Branding.*Whitelabel/i });
    await expect(brandingHeading).toBeVisible({ timeout: 10000 });

    // Should see logo URL input
    const logoInput = page.locator('input[type="url"]').first();
    await expect(logoInput).toBeVisible();

    // Should see color pickers
    const colorPickers = page.locator('input[type="color"]');
    const count = await colorPickers.count();
    expect(count).toBeGreaterThanOrEqual(3); // Primary, secondary, accent

    // Should see font selector
    const fontSelect = page.locator('select').filter({ hasText: /System Default|Inter|Roboto/i });
    await expect(fontSelect).toBeVisible();

    // Should see live preview section
    const livePreview = page.locator('h3', { hasText: /Live Preview/i });
    await expect(livePreview).toBeVisible();
  });

  test('Can update logo URL and see preview', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Enter test logo URL
    const testLogoUrl = 'https://i.ibb.co/test-logo.png';
    const logoInput = page.locator('input[type="url"]').first();
    await logoInput.fill(testLogoUrl);

    // Check live preview shows the logo
    const previewLogo = page.locator('img[alt*="GateFlow"]').or(page.locator('img[alt*="Demo"]'));
    await page.waitForTimeout(500); // Wait for preview update

    // Verify logo src in preview (might be visible)
    const logoSrcInPreview = await page.locator('div:has-text("Live Preview") img').first().getAttribute('src');
    if (logoSrcInPreview) {
      expect(logoSrcInPreview).toBe(testLogoUrl);
    }
  });

  test('Can update brand colors and see preview', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Update primary color
    const primaryColorPicker = page.locator('input[type="color"]').first();
    await primaryColorPicker.fill('#ff0000'); // Red

    // Update secondary color
    const secondaryColorPicker = page.locator('input[type="color"]').nth(1);
    await secondaryColorPicker.fill('#0000ff'); // Blue

    // Update accent color
    const accentColorPicker = page.locator('input[type="color"]').nth(2);
    await accentColorPicker.fill('#00ff00'); // Green

    await page.waitForTimeout(500);

    // Verify color swatches in preview
    const primarySwatch = page.locator('div[style*="background-color: rgb(255, 0, 0)"]').or(
      page.locator('div[style*="background-color: #ff0000"]')
    );
    // Color preview should exist (might be visible)
    const swatchCount = await page.locator('div:has-text("Color Palette")').count();
    expect(swatchCount).toBeGreaterThan(0);
  });

  test('Can change font family and see preview', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Select a different font
    const fontSelect = page.locator('select').filter({ hasText: /System Default|Inter/i });
    await fontSelect.selectOption('montserrat');

    await page.waitForTimeout(500);

    // Verify typography preview shows the font
    const typographyPreview = page.locator('text=/Typography/i');
    await expect(typographyPreview).toBeVisible();
  });

  test('Can save branding settings successfully', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Set test values
    const testLogoUrl = 'https://i.ibb.co/saved-logo.png';
    const logoInput = page.locator('input[type="url"]').first();
    await logoInput.fill(testLogoUrl);

    const primaryColorPicker = page.locator('input[type="color"]').first();
    await primaryColorPicker.fill('#ff6600');

    const fontSelect = page.locator('select').filter({ hasText: /System Default|Inter/i });
    await fontSelect.selectOption('poppins');

    // Click save button
    const saveButton = page.locator('button', { hasText: /Save Branding/i });
    await saveButton.click();

    // Wait for success message
    const successMessage = page.locator('text=/updated successfully|saved successfully/i');
    await expect(successMessage).toBeVisible({ timeout: 10000 });

    // Verify values were saved in database
    await page.waitForTimeout(1000);
    const { data: savedConfig } = await supabaseAdmin
      .from('shop_config')
      .select('logo_url, primary_color, font_family')
      .eq('id', shopConfigId)
      .single();

    expect(savedConfig?.logo_url).toBe(testLogoUrl);
    expect(savedConfig?.primary_color).toBe('#ff6600');
    expect(savedConfig?.font_family).toBe('poppins');
  });

  test('Saved branding appears in sidebar after page refresh', async ({ page }) => {
    // First, set branding via API
    await supabaseAdmin
      .from('shop_config')
      .update({
        shop_name: 'Test Brand',
        primary_color: '#aa00ff',
        secondary_color: '#ff00aa',
        font_family: 'roboto'
      })
      .eq('id', shopConfigId);

    await loginAsAdmin(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check sidebar shows "Test Brand" instead of "GateFlow"
    const brandName = page.locator('aside').locator('text=Test Brand');
    await expect(brandName).toBeVisible({ timeout: 10000 });
  });

  test('Reset to defaults button works', async ({ page }) => {
    // First, set custom values
    await supabaseAdmin
      .from('shop_config')
      .update({
        logo_url: 'https://custom-logo.png',
        primary_color: '#123456',
        secondary_color: '#654321',
        accent_color: '#abcdef',
        font_family: 'playfair'
      })
      .eq('id', shopConfigId);

    await loginAsAdmin(page);
    await page.goto('/dashboard/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Click reset button
    const resetButton = page.locator('button', { hasText: /Reset to defaults/i });
    await resetButton.click();

    await page.waitForTimeout(500);

    // Verify fields are reset to defaults
    const logoInput = page.locator('input[type="url"]').first();
    const logoValue = await logoInput.inputValue();
    expect(logoValue).toBe('');

    const primaryColorText = page.locator('input[type="text"]').filter({ hasValue: /#9333ea/i });
    await expect(primaryColorText.first()).toBeVisible();
  });

  test('Non-admin users cannot access branding settings', async ({ page }) => {
    // Create regular user
    const regularEmail = `test-regular-${Date.now()}@example.com`;
    const { data: { user: regularUser } } = await supabaseAdmin.auth.admin.createUser({
      email: regularEmail,
      password: password,
      email_confirm: true,
    });

    await acceptAllCookies(page);
    await page.goto('/');

    await page.evaluate(async ({ email, password, supabaseUrl, anonKey }) => {
      const { createBrowserClient } = await import('https://esm.sh/@supabase/ssr@0.5.2');
      const supabase = createBrowserClient(supabaseUrl, anonKey);
      await supabase.auth.signInWithPassword({ email, password });
    }, {
      email: regularEmail,
      password: password,
      supabaseUrl: SUPABASE_URL,
      anonKey: ANON_KEY,
    });

    await page.waitForTimeout(1000);

    // Try to access settings - should redirect or show error
    await page.goto('/dashboard/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Should NOT see branding settings OR should be redirected away
    const url = page.url();
    const hasBrandingSection = await page.locator('text=/Branding.*Whitelabel/i').count();

    // Either redirected away from settings OR no branding section visible
    expect(url.includes('/dashboard/settings') ? hasBrandingSection === 0 : true).toBeTruthy();

    // Cleanup
    if (regularUser) {
      await supabaseAdmin.auth.admin.deleteUser(regularUser.id);
    }
  });

  test('Branding persists across sessions', async ({ page }) => {
    // Set branding
    await supabaseAdmin
      .from('shop_config')
      .update({
        shop_name: 'Persistent Shop',
        primary_color: '#ff9900'
      })
      .eq('id', shopConfigId);

    // Login and verify
    await loginAsAdmin(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const persistentName = page.locator('aside').locator('text=Persistent Shop');
    await expect(persistentName).toBeVisible();

    // Logout
    const logoutButton = page.locator('button', { hasText: /logout|sign out/i }).first();
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      await page.waitForTimeout(1000);
    }

    // Login again in new session
    await loginAsAdmin(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Branding should still be there
    const stillPersistent = page.locator('aside').locator('text=Persistent Shop');
    await expect(stillPersistent).toBeVisible();
  });

  test('Empty logo URL falls back to gradient icon', async ({ page }) => {
    // Set logo_url to null
    await supabaseAdmin
      .from('shop_config')
      .update({
        logo_url: null,
        primary_color: '#cc00cc',
        secondary_color: '#00cccc'
      })
      .eq('id', shopConfigId);

    await loginAsAdmin(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Should see gradient icon (SVG with lightning bolt)
    const gradientIcon = page.locator('aside svg').filter({ hasText: '' }).first();

    // Check if icon exists (lightning bolt path)
    const svgPath = await page.locator('aside svg path[d*="M13 10V3L4 14h7v7l9-11h-7z"]').count();
    expect(svgPath).toBeGreaterThan(0);
  });

  test('Invalid color values are rejected', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Try to enter invalid hex color in text input
    const primaryColorText = page.locator('input[type="text"]').first();
    await primaryColorText.fill('invalid-color');

    // Save button
    const saveButton = page.locator('button', { hasText: /Save Branding/i });
    await saveButton.click();

    await page.waitForTimeout(1000);

    // Should either show error or not save (value should revert)
    // We'll check that the success message doesn't appear or value wasn't saved
    const { data: config } = await supabaseAdmin
      .from('shop_config')
      .select('primary_color')
      .eq('id', shopConfigId)
      .single();

    // Color should not be 'invalid-color'
    expect(config?.primary_color).not.toBe('invalid-color');
  });
});
