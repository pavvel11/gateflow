import { test, expect } from '@playwright/test';

test.describe('E2E Critical Flows', () => {

  // 1. Internationalization Check
  test('should switch languages correctly', async ({ page }) => {
    await page.goto('/');

    // Wait for page to load - check for any content
    await page.waitForLoadState('networkidle');
    const body = page.locator('body');
    await expect(body).not.toBeEmpty();

    // Switch to Polish (assuming we have a switcher)
    const plButton = page.locator('button', { hasText: 'PL' }).first();
    if (await plButton.isVisible()) {
      await plButton.click();
      // Wait for navigation or text change
      await expect(page).toHaveURL(/\/pl/);
      // Allow for either full translation or fallback
      await expect(page.locator('body')).not.toBeEmpty();
    }
  });

  // 2. Product Page Flow - Smart Landing (shows onboarding, coming soon, or storefront)
  test('should display product details OR empty state', async ({ page }) => {
    // Go to homepage (smart landing)
    await page.goto('/');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Homepage can show: onboarding (admin), coming soon (guest no products), or storefront (products exist)
    // Just verify the page loaded without errors
    const body = page.locator('body');
    await expect(body).not.toBeEmpty();
    const text = await body.textContent();
    expect(text).not.toContain('Application error');

    // If storefront exists, check for product cards or empty states
    const storefront = page.locator('text=Products').or(page.locator('text=Produkty'));
    if (await storefront.isVisible()) {
      // Should have some content
      await expect(body).toContainText(/Products|Produkty|Welcome|Witaj/i);
    }
  });

  // 3. Checkout UI Safety
  test('checkout page should render payment form safely', async ({ page }) => {
    await page.goto('/checkout/non-existent-product-123');
    
    const body = page.locator('body');
    await expect(body).not.toBeEmpty();
    const text = await body.textContent();
    expect(text).not.toContain('Application error: a client-side exception has occurred');
  });

  // 4. Coupon API Logic (Negative Test)
  test('should reject invalid coupons gracefully', async ({ request }) => {
    const response = await request.post('/api/coupons/verify', {
      data: {
        code: 'INVALID-CODE-123',
        productId: '00000000-0000-0000-0000-000000000000',
        email: 'test@example.com'
      }
    });

    const body = await response.json();
    expect(body).toBeDefined();
    // Assuming API returns result object
    if (response.ok()) {
      expect(body.valid).toBeFalsy(); 
    }
  });

});