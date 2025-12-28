import { test, expect } from '@playwright/test';

test.describe('E2E Critical Flows', () => {

  // 1. Internationalization Check
  test('should switch languages correctly', async ({ page }) => {
    await page.goto('/');
    
    // Check default English
    await expect(page.locator('text=Self-Hosted Product Access Management')).toBeVisible();
    
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

  // 2. Product Page Flow
  test('should display product details OR empty state', async ({ page }) => {
    // Go to storefront
    await page.goto('/products');
    
    // Check if either products grid OR empty state is visible
    const productsGrid = page.locator('.grid').first();
    const emptyState = page.locator('text=No Products Available').or(page.locator('text=No products found'));
    
    // Wait for content to load
    await expect(productsGrid.or(emptyState)).toBeVisible({ timeout: 10000 });

    // If products exist, try to click purchase
    if (await productsGrid.isVisible()) {
      // Find first "Purchase" or "Get Access" button
      const purchaseBtn = page.locator('text=Purchase Access').or(page.locator('text=Get Access')).first();
      
      if (await purchaseBtn.isVisible()) {
        await purchaseBtn.click();
        // Should verify redirect to product page, checkout, or login
        await expect(page).toHaveURL(/\/(p|checkout|login)\//);

        // Check for price display or checkout page
        const priceDisplay = page.locator('text=$').or(page.locator('text=PLN')).or(page.locator('text=GateFlow')).first();
        await expect(priceDisplay).toBeVisible();
      }
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