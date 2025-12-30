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

test.describe('Currency API Configuration', () => {
  test.describe.configure({ mode: 'serial' });

  let adminEmail: string;
  const adminPassword = 'password123';

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
      password: adminPassword,
      supabaseUrl: SUPABASE_URL,
      anonKey: ANON_KEY,
    });

    await page.waitForTimeout(1000);
  };

  test.beforeAll(async () => {
    const randomStr = Math.random().toString(36).substring(7);
    adminEmail = `test-currency-config-${Date.now()}-${randomStr}@example.com`;

    // Create admin user
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

  test.beforeEach(async () => {
    // Clean up any existing currency config - reset to default ECB
    await supabaseAdmin
      .from('integrations_config')
      .update({
        currency_api_provider: 'ecb',
        currency_api_key_encrypted: null,
        currency_api_key_iv: null,
        currency_api_key_tag: null,
        currency_api_enabled: true,
      })
      .eq('id', 1);
  });

  test('should show currency settings in integrations page', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard/integrations');
    await page.waitForLoadState('networkidle');

    // Look for Currency Settings heading
    const currencyHeading = page.locator('h2', { hasText: /Currency Exchange|Ustawienia Wymiany Walut/i });
    await expect(currencyHeading).toBeVisible({ timeout: 10000 });
  });

  test('should display ECB provider by default', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard/integrations');
    await page.waitForLoadState('networkidle');

    // Wait for component to load
    await page.waitForTimeout(2000);

    // Find provider dropdown - use last one (currency settings is last)
    const providerSelect = page.locator('select#provider').last();
    await expect(providerSelect).toBeVisible({ timeout: 10000 });

    // Should be set to ECB by default
    const selectedValue = await providerSelect.inputValue();
    expect(selectedValue).toBe('ecb');
  });

  test('should save currency config to database', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard/integrations');
    await page.waitForLoadState('networkidle');

    // Wait for component to load
    await page.waitForTimeout(2000);

    // Scroll to currency settings to make sure it's in view
    const currencyHeading = page.locator('h2', { hasText: /Currency Exchange Rate API|Ustawienia Wymiany Walut/i });
    await currencyHeading.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    // Select ECB provider (doesn't need API key) - use last to get currency settings
    const providerSelect = page.locator('select#provider').or(page.locator('select[name="provider"]'));
    await providerSelect.last().selectOption('ecb');
    await page.waitForTimeout(500);

    // Click save button - last save button on page (currency settings is last)
    const saveButtons = page.locator('button', { hasText: /^Save|^Zapisz/i });
    const saveButton = saveButtons.last();
    await saveButton.click();

    // Wait for success message
    const successMessage = page.locator('text=/saved|zapisano|successfully/i').first();
    await expect(successMessage).toBeVisible({ timeout: 10000 });

    // Wait a bit for database update
    await page.waitForTimeout(2000);

    // Verify in database
    const { data: config } = await supabaseAdmin
      .from('integrations_config')
      .select('currency_api_provider, currency_api_enabled')
      .eq('id', 1)
      .single();

    console.log('Config after save:', config);
    expect(config?.currency_api_provider).toBe('ecb');
    expect(config?.currency_api_enabled).toBe(true);
  });

  test('should require API key for exchangerate-api provider', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard/integrations');
    await page.waitForLoadState('networkidle');

    // Select exchangerate-api provider
    const providerSelect = page.locator('select#provider').or(page.locator('select[name="provider"]'));
    const lastProviderSelect = providerSelect.last(); // Get last one (currency settings)
    await lastProviderSelect.selectOption('exchangerate-api');

    // Try to save without API key
    const saveButtons = page.locator('button', { hasText: /^Save|^Zapisz/i });
    const saveButton = saveButtons.last(); // Get last save button (currency settings)
    await saveButton.click();

    // Wait for response
    await page.waitForTimeout(2000);

    // Should show error about required API key (from server or client validation)
    const errorMessage = page.locator('[role="alert"], .text-red-600, .text-red-500, div').filter({ hasText: /requires an API key|API key is required|Klucz API/i });
    await expect(errorMessage.first()).toBeVisible({ timeout: 5000 });
  });

  test('should save and encrypt API key for exchangerate-api', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard/integrations');
    await page.waitForLoadState('networkidle');

    // Select exchangerate-api provider (use last to get currency settings)
    const providerSelect = page.locator('select#provider').or(page.locator('select[name="provider"]'));
    await providerSelect.last().selectOption('exchangerate-api');

    // Enter test API key
    const apiKeyInput = page.locator('input[type="password"]#currency-api-key').or(page.locator('input[id*="currency"]').and(page.locator('input[type="password"]')));
    await apiKeyInput.fill('test_api_key_12345');

    // Save (use last to get currency settings save button)
    const saveButtons = page.locator('button', { hasText: /^Save|^Zapisz/i });
    await saveButtons.last().click();

    // Wait for success
    await expect(page.locator('text=/saved|zapisano/i')).toBeVisible({ timeout: 10000 });

    // Verify in database - key should be encrypted
    const { data: config } = await supabaseAdmin
      .from('integrations_config')
      .select('currency_api_provider, currency_api_key_encrypted, currency_api_key_iv, currency_api_key_tag, currency_api_enabled')
      .eq('id', 1)
      .single();

    expect(config?.currency_api_provider).toBe('exchangerate-api');
    expect(config?.currency_api_enabled).toBe(true);
    expect(config?.currency_api_key_encrypted).toBeTruthy();
    expect(config?.currency_api_key_iv).toBeTruthy();
    expect(config?.currency_api_key_tag).toBeTruthy();

    // Encrypted key should NOT equal plain text
    expect(config?.currency_api_key_encrypted).not.toBe('test_api_key_12345');
  });

  test('should show config status (database vs env)', async ({ page }) => {
    // First save config via DB with a non-default provider
    await supabaseAdmin
      .from('integrations_config')
      .update({
        currency_api_provider: 'exchangerate-api',
        currency_api_key_encrypted: 'test_encrypted',
        currency_api_key_iv: 'test_iv',
        currency_api_key_tag: 'test_tag',
        currency_api_enabled: true,
      })
      .eq('id', 1);

    await loginAsAdmin(page);
    await page.goto('/dashboard/integrations');
    await page.waitForLoadState('networkidle');

    // Should show "Configured via Database" status
    const statusInfo = page.locator('text=/Configured via Database|skonfigurowane.*baz/i');
    await expect(statusInfo).toBeVisible({ timeout: 10000 });
  });

  test('should delete currency config from database', async ({ page }) => {
    // First save config
    await supabaseAdmin
      .from('integrations_config')
      .update({
        currency_api_provider: 'ecb',
        currency_api_key_encrypted: 'encrypted_test',
        currency_api_key_iv: 'iv_test',
        currency_api_key_tag: 'tag_test',
        currency_api_enabled: true,
      })
      .eq('id', 1);

    await loginAsAdmin(page);
    await page.goto('/dashboard/integrations');
    await page.waitForLoadState('networkidle');

    // Wait for component to load
    await page.waitForTimeout(2000);

    // Click delete configuration button (look for "Delete Configuration" text)
    const deleteButtons = page.locator('button', { hasText: /Delete Configuration|Usuń/i });
    const deleteButton = deleteButtons.last(); // Currency settings is last

    // Accept confirmation dialog
    page.on('dialog', dialog => dialog.accept());
    await deleteButton.click();

    // Wait for success
    await expect(page.locator('text=/deleted|usunięto/i')).toBeVisible({ timeout: 10000 });

    // Verify in database - should be reset
    const { data: config } = await supabaseAdmin
      .from('integrations_config')
      .select('currency_api_key_encrypted, currency_api_key_iv, currency_api_key_tag')
      .eq('id', 1)
      .single();

    expect(config?.currency_api_key_encrypted).toBeNull();
    expect(config?.currency_api_key_iv).toBeNull();
    expect(config?.currency_api_key_tag).toBeNull();
  });

  test('should show configuration status on dashboard', async ({ page }) => {
    // Save currency config with non-default provider
    await supabaseAdmin
      .from('integrations_config')
      .update({
        currency_api_provider: 'exchangerate-api',
        currency_api_key_encrypted: 'test_encrypted',
        currency_api_key_iv: 'test_iv',
        currency_api_key_tag: 'test_tag',
        currency_api_enabled: true,
      })
      .eq('id', 1);

    await loginAsAdmin(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Wait for ConfigurationStatus component to load
    await page.waitForTimeout(2000);

    // Should show currency configuration info
    const configStatus = page.locator('text=/Currency Exchange Configuration|Provider/i').first();
    await expect(configStatus).toBeVisible({ timeout: 10000 });

    // Should show provider name
    await expect(page.locator('text=/ExchangeRate-API/i')).toBeVisible();
  });

  test('should not show configuration status on dashboard when using default ECB', async ({ page }) => {
    // Set to default ECB (no custom config)
    await supabaseAdmin
      .from('integrations_config')
      .update({
        currency_api_provider: 'ecb',
        currency_api_key_encrypted: null,
        currency_api_enabled: true,
      })
      .eq('id', 1);

    await loginAsAdmin(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await page.waitForTimeout(2000);

    // Configuration status should NOT be visible for default ECB
    const configStatus = page.locator('text=/Currency Exchange Configuration/i');
    await expect(configStatus).not.toBeVisible();
  });

  test('should change provider and update config', async ({ page }) => {
    // Start with exchangerate-api
    await supabaseAdmin
      .from('integrations_config')
      .update({
        currency_api_provider: 'exchangerate-api',
        currency_api_key_encrypted: 'test_encrypted',
        currency_api_key_iv: 'test_iv',
        currency_api_key_tag: 'test_tag',
        currency_api_enabled: true,
      })
      .eq('id', 1);

    await loginAsAdmin(page);
    await page.goto('/dashboard/integrations');
    await page.waitForLoadState('networkidle');

    // Change to ECB (use last to get currency settings)
    const providerSelect = page.locator('select#provider').or(page.locator('select[name="provider"]'));
    await providerSelect.last().selectOption('ecb');

    // Save (use last to get currency settings save button)
    const saveButtons = page.locator('button', { hasText: /^Save|^Zapisz/i });
    await saveButtons.last().click();

    await expect(page.locator('text=/saved|zapisano/i')).toBeVisible({ timeout: 10000 });

    // Verify change
    const { data: config } = await supabaseAdmin
      .from('integrations_config')
      .select('currency_api_provider')
      .eq('id', 1)
      .single();

    expect(config?.currency_api_provider).toBe('ecb');
  });

  test('should preserve enabled state when changing provider', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard/integrations');
    await page.waitForLoadState('networkidle');

    // Select ECB provider and save (use last to get currency settings)
    const providerSelect = page.locator('select#provider').or(page.locator('select[name="provider"]'));
    await providerSelect.last().selectOption('ecb');

    const saveButtons = page.locator('button', { hasText: /^Save|^Zapisz/i });
    const saveButton = saveButtons.last();
    await saveButton.click();
    await page.waitForTimeout(1000);

    // Change provider to exchangerate-api with API key
    await providerSelect.last().selectOption('exchangerate-api');

    // Enter API key
    const apiKeyInput = page.locator('input[type="password"]#currency-api-key').or(page.locator('input[id*="currency"]').and(page.locator('input[type="password"]')));
    await apiKeyInput.fill('test_key_12345');

    await saveButton.click();
    await page.waitForTimeout(1000);

    // Verify enabled is still true
    const { data: config } = await supabaseAdmin
      .from('integrations_config')
      .select('currency_api_enabled, currency_api_provider')
      .eq('id', 1)
      .single();

    expect(config?.currency_api_enabled).toBe(true);
    expect(config?.currency_api_provider).toBe('exchangerate-api');
  });
});
