import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Enforce single worker for admin tests
test.describe.configure({ mode: 'serial' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase env variables for testing');
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

test.describe('GUS API Admin Configuration', () => {
  let adminUser: any;
  let adminSession: any;

  test.beforeAll(async () => {
    // Create test admin user
    const email = `gus-admin-${Date.now()}@test.com`;
    const password = 'TestPassword123!';

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) throw authError;
    adminUser = authData.user;

    // Add to admin_users table
    const { error: adminError } = await supabaseAdmin
      .from('admin_users')
      .insert({ user_id: adminUser.id });

    if (adminError) throw adminError;

    // Create session for the user
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });

    if (sessionError) throw sessionError;
  });

  test.afterAll(async () => {
    // Cleanup: delete test admin user
    if (adminUser) {
      await supabaseAdmin.from('admin_users').delete().eq('user_id', adminUser.id);
      await supabaseAdmin.auth.admin.deleteUser(adminUser.id);
    }

    // Clear GUS API key from shop_config
    const { data: config } = await supabaseAdmin
      .from('shop_config')
      .select('id, custom_settings')
      .single();

    if (config) {
      const customSettings = (config.custom_settings as Record<string, any>) || {};
      const {
        gus_api_key_encrypted,
        gus_api_key_iv,
        gus_api_key_tag,
        gus_api_enabled,
        gus_api_updated_at,
        ...remainingSettings
      } = customSettings;

      await supabaseAdmin
        .from('shop_config')
        .update({ custom_settings: remainingSettings })
        .eq('id', config.id);
    }
  });

  test('should display GUS settings in integrations page', async ({ page }) => {
    // Login as admin
    await page.goto('/pl/auth/login');
    await page.fill('input[type="email"]', adminUser.email);
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });

    // Navigate to integrations
    await page.goto('/pl/dashboard/integrations');
    await page.waitForLoadState('networkidle');

    // Check for GUS settings section
    await expect(page.locator('text=Integracja GUS REGON API')).toBeVisible();
    await expect(page.locator('text=Klucz API GUS REGON')).toBeVisible();
  });

  test('should save GUS API key and enable integration', async ({ page }) => {
    // Login as admin
    await page.goto('/pl/auth/login');
    await page.fill('input[type="email"]', adminUser.email);
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });

    // Navigate to integrations
    await page.goto('/pl/dashboard/integrations');
    await page.waitForLoadState('networkidle');

    // Fill in API key (fake key for testing)
    const apiKeyInput = page.locator('input#gus-api-key');
    await apiKeyInput.fill('test-gus-api-key-12345678901234567890');

    // Enable integration
    const enableCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: /Włącz automatyczne/ });
    if (!(await enableCheckbox.isChecked())) {
      await enableCheckbox.check();
    }

    // Save configuration
    await page.click('button:has-text("Zapisz konfigurację")');

    // Wait for success message
    await expect(page.locator('text=Konfiguracja GUS została pomyślnie zapisana')).toBeVisible({ timeout: 5000 });

    // Verify in database
    const { data: config } = await supabaseAdmin
      .from('shop_config')
      .select('custom_settings')
      .single();

    const customSettings = (config?.custom_settings as Record<string, any>) || {};
    expect(customSettings.gus_api_key_encrypted).toBeDefined();
    expect(customSettings.gus_api_key_iv).toBeDefined();
    expect(customSettings.gus_api_key_tag).toBeDefined();
    expect(customSettings.gus_api_enabled).toBe(true);
  });

  test('should display active status when API key is configured', async ({ page }) => {
    // Login as admin
    await page.goto('/pl/auth/login');
    await page.fill('input[type="email"]', adminUser.email);
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });

    // Navigate to integrations
    await page.goto('/pl/dashboard/integrations');
    await page.waitForLoadState('networkidle');

    // Check for active status banner
    await expect(page.locator('text=GUS API jest aktywny')).toBeVisible();
    await expect(page.locator('text=Dane firm będą automatycznie pobierane')).toBeVisible();
  });

  test('should delete GUS API key', async ({ page }) => {
    // Login as admin
    await page.goto('/pl/auth/login');
    await page.fill('input[type="email"]', adminUser.email);
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });

    // Navigate to integrations
    await page.goto('/pl/dashboard/integrations');
    await page.waitForLoadState('networkidle');

    // Click delete button
    page.on('dialog', dialog => dialog.accept()); // Accept confirmation dialog
    await page.click('button:has-text("Usuń klucz API")');

    // Wait for success message
    await expect(page.locator('text=Klucz API GUS został pomyślnie usunięty')).toBeVisible({ timeout: 5000 });

    // Verify in database
    const { data: config } = await supabaseAdmin
      .from('shop_config')
      .select('custom_settings')
      .single();

    const customSettings = (config?.custom_settings as Record<string, any>) || {};
    expect(customSettings.gus_api_key_encrypted).toBeUndefined();
    expect(customSettings.gus_api_enabled).toBeUndefined();
  });

  test('should show validation error for short API key', async ({ page }) => {
    // Login as admin
    await page.goto('/pl/auth/login');
    await page.fill('input[type="email"]', adminUser.email);
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });

    // Navigate to integrations
    await page.goto('/pl/dashboard/integrations');
    await page.waitForLoadState('networkidle');

    // Fill in too short API key
    const apiKeyInput = page.locator('input#gus-api-key');
    await apiKeyInput.fill('short');

    // Try to save
    await page.click('button:has-text("Zapisz konfigurację")');

    // Should show error
    await expect(page.locator('text=API key seems too short')).toBeVisible({ timeout: 5000 });
  });
});
