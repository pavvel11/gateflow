import { test, expect } from '@playwright/test';

test.describe('Accessibility & Auth Redirection', () => {
  
  test('profile page should redirect to login if not authenticated', async ({ page }) => {
    // Note: We use /en/ prefix because internationalization might be active
    await page.goto('/en/profile');
    // It should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('integrations page should redirect to login if not authenticated', async ({ page }) => {
    await page.goto('/en/dashboard/integrations');
    await expect(page).toHaveURL(/\/login/);
  });
});
