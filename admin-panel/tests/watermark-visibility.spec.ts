import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase env variables for testing');
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Test licenses (generated with scripts/generate-license.js)
const TEST_LICENSES = {
  unlimited: 'GF-test.example.com-UNLIMITED-MEUCIQC41EQb2yL1YkbzaL3ldDFF2RBeFtJFcDpjSiFfTGrijAIgPV_vJSaPXzW1PDGRWbfjHH36UnaxATWdiqw3fOsHKm8',
  expired: 'GF-test.example.com-20251231-MEYCIQD72nhrdBnsS8QtmoWSZi3Vo6-qjYAZov-m9SkgySi-UgIhAMifv_hXfcFMCuSuMoQuw0u7baCsMCI78ou-39wwiYg_',
  future: 'GF-test.example.com-20301231-MEUCIHmdrjO3fwcD897aWGOyMviulkAdPpC-z5YF-c63NsnwAiEAmcnjj9QmoHPz0t18eh1okgbDJlwrJ7H5TNv47HC6nik',
  invalid: 'INVALID-LICENSE-FORMAT',
};

// Test page URL - served by http-server on port 3002 (configured in playwright.config.ts)
// Requires ?testProduct param and optionally ?apiUrl for gatekeeper source
const TEST_PAGE_URL = 'http://localhost:3002/element-protection.html?testProduct=test-product&apiUrl=http://localhost:3000';

test.describe('Watermark Visibility Based on License', () => {
  test.describe.configure({ mode: 'serial' });

  const setLicense = async (license: string | null) => {
    await supabaseAdmin
      .from('integrations_config')
      .update({ gateflow_license: license })
      .eq('id', 1);
  };

  const clearGeneratorCache = async (page: typeof import('@playwright/test').Page.prototype) => {
    // Clear the generator cache to force re-generation with new license
    await page.goto('/api/gatekeeper?clearCache=true');
  };

  test.afterAll(async () => {
    // Clean up - remove license
    await setLicense(null);
  });

  test('Generated script contains LICENSE_VALID: true for valid unlimited license', async ({ page }) => {
    // Set valid license
    await setLicense(TEST_LICENSES.unlimited);

    // Clear cache and get the script directly
    const response = await page.goto('/api/gatekeeper?clearCache=true');
    const scriptContent = await response?.text();

    // Should contain LICENSE_VALID: true
    expect(scriptContent).toContain('LICENSE_VALID: true');
  });

  test('Generated script contains LICENSE_VALID: true for valid future license', async ({ page }) => {
    // Set valid future license (expires 2030-12-31)
    await setLicense(TEST_LICENSES.future);

    // Clear cache and get the script directly
    const response = await page.goto('/api/gatekeeper?clearCache=true');
    const scriptContent = await response?.text();

    // Should contain LICENSE_VALID: true
    expect(scriptContent).toContain('LICENSE_VALID: true');
  });

  test('Generated script contains LICENSE_VALID: false when no license is set', async ({ page }) => {
    // Remove license
    await setLicense(null);

    // Clear cache and get the script directly
    const response = await page.goto('/api/gatekeeper?clearCache=true');
    const scriptContent = await response?.text();

    // Should contain LICENSE_VALID: false
    expect(scriptContent).toContain('LICENSE_VALID: false');
  });

  test('Generated script contains LICENSE_VALID: false for expired license', async ({ page }) => {
    // Set expired license (expired 2025-12-31, before current date 2026-01-05)
    await setLicense(TEST_LICENSES.expired);

    // Clear cache and get the script directly
    const response = await page.goto('/api/gatekeeper?clearCache=true');
    const scriptContent = await response?.text();

    // Should contain LICENSE_VALID: false (expired)
    expect(scriptContent).toContain('LICENSE_VALID: false');
  });

  test('Generated script contains LICENSE_VALID: false for invalid license format', async ({ page }) => {
    // Set invalid license
    await setLicense(TEST_LICENSES.invalid);

    // Clear cache and get the script directly
    const response = await page.goto('/api/gatekeeper?clearCache=true');
    const scriptContent = await response?.text();

    // Should contain LICENSE_VALID: false (invalid format)
    expect(scriptContent).toContain('LICENSE_VALID: false');
  });

  test('Watermark is HIDDEN when valid license is set (visual test)', async ({ page }) => {
    // Set valid unlimited license
    await setLicense(TEST_LICENSES.unlimited);

    // Clear cache first
    await clearGeneratorCache(page);

    // Load test page from http-server (uses gatekeeper from localhost:3000)
    await page.goto(TEST_PAGE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Watermark container should NOT exist (check inner visible element)
    const watermark = page.locator('#gateflow-watermark > div');
    await expect(watermark).toHaveCount(0);
  });

  test('Watermark is SHOWN when no license is set (visual test)', async ({ page }) => {
    // Remove license
    await setLicense(null);

    // Clear cache first
    await clearGeneratorCache(page);

    // Load test page from http-server
    await page.goto(TEST_PAGE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Watermark inner div SHOULD be visible (position: fixed element)
    const watermark = page.locator('#gateflow-watermark > div');
    await expect(watermark).toBeVisible();

    // Should contain GateFlow branding
    await expect(watermark).toContainText('GateFlow');
  });
});
