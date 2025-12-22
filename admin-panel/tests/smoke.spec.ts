import { test, expect } from '@playwright/test';

test.describe('Smoke Tests - Public Pages', () => {
  
  test('landing page should load and have no missing translations', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/GateFlow/);
    
    // Check for "missing translation" markers common in next-intl
    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain('MISSING_MESSAGE');
    expect(bodyText).not.toContain('translation missing');
  });

  test('login page should be accessible', async ({ page }) => {
    await page.goto('/login');
    // Check if the login form is present
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('products page should load', async ({ page }) => {
    await page.goto('/products');
    // Check if hero title is present (storefront translations)
    const header = page.locator('h1');
    await expect(header).toBeVisible();
  });
});
