import { test, expect, Page } from '@playwright/test';
import { createTestAdmin, loginAsAdmin, supabaseAdmin } from './helpers/admin-auth';

/**
 * Product Creation Wizard E2E Tests
 *
 * Tests the 3-step wizard flow for creating products:
 * Step 1: Essentials (name, description, price) — required
 * Step 2: Content & Details (delivery, categories) — optional
 * Step 3: Sales & Settings (promotions, availability, etc.) — optional
 *
 * Also tests: edit mode (old modal), duplicate mode (wizard), exit confirmation.
 */

test.describe.configure({ mode: 'serial' });

let adminEmail: string;
let adminPassword: string;
let adminCleanup: () => Promise<void>;

// Track products created during tests for cleanup
const createdProductSlugs: string[] = [];

test.beforeAll(async () => {
  const admin = await createTestAdmin('wizard-e2e');
  adminEmail = admin.email;
  adminPassword = admin.password;
  adminCleanup = admin.cleanup;
});

test.afterAll(async () => {
  // Cleanup created products
  for (const slug of createdProductSlugs) {
    await supabaseAdmin.from('products').delete().eq('slug', slug);
  }
  await adminCleanup();
});

async function goToProducts(page: Page) {
  await loginAsAdmin(page, adminEmail, adminPassword);
  await page.goto('/pl/dashboard/products');
  await page.waitForLoadState('networkidle');
}

async function openWizard(page: Page) {
  const addButton = page.locator('button', { hasText: /Dodaj produkt/i });
  await addButton.click();
  // Wizard should open with step indicator
  await expect(page.getByText('Utwórz nowy produkt')).toBeVisible({ timeout: 5000 });
}

test.describe('Product Creation Wizard', () => {

  test('should open wizard when clicking Add Product', async ({ page }) => {
    await goToProducts(page);
    await openWizard(page);

    // Step indicator should show 3 steps
    await expect(page.getByRole('button', { name: /Podstawy/i })).toBeVisible();

    // Step 1 hint banner should be visible
    await expect(page.getByText(/Możesz utworzyć produkt teraz/)).toBeVisible();

    // Create Product and Continue Setup buttons should be visible
    await expect(page.getByRole('button', { name: /Utwórz produkt/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Dalej/i })).toBeVisible();

    // Cancel button on step 1
    await expect(page.getByRole('button', { name: /Anuluj/i })).toBeVisible();
  });

  test('should create product from step 1 (fast path)', async ({ page }) => {
    await goToProducts(page);
    await openWizard(page);

    const uniqueSuffix = Date.now();
    const productName = `Wizard Fast ${uniqueSuffix}`;
    createdProductSlugs.push(`wizard-fast-${uniqueSuffix}`);

    // Fill name
    await page.fill('input#name', productName);
    await page.waitForTimeout(300);

    // Fill description
    await page.fill('textarea#description', 'Created quickly from step 1');

    // Fill price
    await page.fill('input#price', '49,99');

    // Click Create Product
    await page.getByRole('button', { name: /Utwórz produkt/i }).click();

    // Wait for modal to close (product created)
    await expect(page.getByText('Utwórz nowy produkt')).not.toBeVisible({ timeout: 15000 });

    // Product should appear in the list
    await page.waitForTimeout(1000);
    await expect(page.locator('table td').getByText(productName).first()).toBeVisible({ timeout: 10000 });
  });

  test('should navigate through all 3 steps', async ({ page }) => {
    await goToProducts(page);
    await openWizard(page);

    // Fill step 1 minimum
    await page.fill('input#name', 'Nav Test Product');
    await page.fill('textarea#description', 'Navigation test');
    await page.fill('input#price', '10');

    // Click Continue Setup → Step 2
    await page.getByRole('button', { name: /Dalej/i }).click();

    // Should be on step 2 — step indicator highlights step 2
    await expect(page.getByRole('button', { name: /Treść i szczegóły|Content & Details/i })).toBeVisible();

    // Back button should be visible (not Cancel)
    await expect(page.getByRole('button', { name: /Wstecz/i })).toBeVisible();

    // Click Continue Setup → Step 3
    await page.getByRole('button', { name: /Dalej/i }).click();

    // Should be on step 3 — step indicator highlights step 3
    await expect(page.getByRole('button', { name: /Sprzedaż i ustawienia|Sales & Settings/i })).toBeVisible();

    // No Continue Setup on last step
    await expect(page.getByRole('button', { name: /Dalej/i })).not.toBeVisible();

    // Back and Create Product should be visible
    await expect(page.getByRole('button', { name: /Wstecz/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Utwórz produkt/i })).toBeVisible();

    // Go back to step 2
    await page.getByRole('button', { name: /Wstecz/i }).click();
    await expect(page.getByRole('button', { name: /Treść i szczegóły|Content & Details/i })).toBeVisible();

    // Go back to step 1
    await page.getByRole('button', { name: /Wstecz/i }).click();
    await expect(page.getByRole('button', { name: /Podstawy/i })).toBeVisible();

    // Close without creating
    await page.getByRole('button', { name: /Anuluj/i }).click();
    // Exit confirmation should appear (form is dirty)
    await expect(page.getByText(/Odrzucić zmiany/i)).toBeVisible();
    await page.getByRole('button', { name: /Odrzuć/i }).click();
  });

  test('should create product after going through all steps', async ({ page }) => {
    await goToProducts(page);
    await openWizard(page);

    const slug = `wizard-full-${Date.now()}`;
    createdProductSlugs.push(slug);

    // Step 1: Essentials
    await page.fill('input#name', 'Wizard Full Product');
    await page.fill('textarea#description', 'Product created through all 3 steps');
    await page.fill('input#price', '99');

    // Continue to step 2
    await page.getByRole('button', { name: /Dalej/i }).click();
    await page.waitForTimeout(500);

    // Step 2: Content & Details — just pass through
    await page.getByRole('button', { name: /Dalej/i }).click();
    await page.waitForTimeout(500);

    // Step 3: Sales & Settings — create from last step
    await expect(page.getByRole('button', { name: /Sprzedaż i ustawienia|Sales & Settings/i })).toBeVisible();
    await page.getByRole('button', { name: /Utwórz produkt/i }).click();

    // Wait for modal to close
    await expect(page.getByText('Utwórz nowy produkt')).not.toBeVisible({ timeout: 15000 });

    // Product should appear in list
    await page.waitForTimeout(1000);
    await expect(page.locator('table td').getByText('Wizard Full Product').first()).toBeVisible({ timeout: 10000 });
  });

  test('should not advance from step 1 without required fields', async ({ page }) => {
    await goToProducts(page);
    await openWizard(page);

    // Try to continue without filling anything
    await page.getByRole('button', { name: /Dalej/i }).click();

    // Should still be on step 1
    await expect(page.getByRole('button', { name: /Podstawy/i })).toBeVisible();
    await expect(page.getByText(/Możesz utworzyć produkt teraz/)).toBeVisible();
  });

  test('should show exit confirmation when form is dirty', async ({ page }) => {
    await goToProducts(page);
    await openWizard(page);

    // Type something (makes form dirty)
    await page.fill('input#name', 'Dirty form test');

    // Click cancel
    await page.getByRole('button', { name: /Anuluj/i }).click();

    // Exit confirmation should appear
    await expect(page.getByText(/Odrzucić zmiany/i)).toBeVisible();
    await expect(page.getByText(/Masz niezapisane dane produktu/i)).toBeVisible();

    // Click "Keep Editing" — should go back to wizard
    await page.getByRole('button', { name: /Kontynuuj edycję/i }).click();

    // Wizard should still be open with data preserved
    await expect(page.getByText('Utwórz nowy produkt')).toBeVisible();
    const nameValue = await page.inputValue('input#name');
    expect(nameValue).toBe('Dirty form test');
  });

  test('should NOT show exit confirmation when form is clean', async ({ page }) => {
    await goToProducts(page);
    await openWizard(page);

    // Don't fill anything, just close
    // Click the X close button on the modal
    await page.locator('button[aria-label="Close modal"]').click();

    // Should close immediately without confirmation
    await expect(page.getByText('Utwórz nowy produkt')).not.toBeVisible({ timeout: 3000 });
  });
});

test.describe('Edit mode uses modal (not wizard)', () => {

  let editProductId: string;
  const editSlug = `edit-mode-test-${Date.now()}`;

  test.beforeAll(async () => {
    // Create a product to edit
    const { data, error } = await supabaseAdmin
      .from('products')
      .insert({
        name: 'Edit Mode Test Product',
        slug: editSlug,
        price: 50,
        currency: 'PLN',
        description: 'Product for edit mode test',
        is_active: true,
        icon: '📦',
      })
      .select()
      .single();

    if (error) throw error;
    editProductId = data.id;
    createdProductSlugs.push(editSlug);
  });

  test('should open old modal (not wizard) when editing a product', async ({ page }) => {
    await goToProducts(page);

    // Find the edit button for our product
    const productRow = page.locator('tr, [data-product-id]').filter({ hasText: 'Edit Mode Test Product' });

    // Click the actions menu or edit button
    const editButton = productRow.locator('button[title*="Edytuj"], button[title*="Edit"]').first();

    if (await editButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await editButton.click();
    } else {
      // Try clicking 3-dot menu first
      const menuButton = productRow.locator('button').last();
      await menuButton.click();
      await page.waitForTimeout(300);
      const editOption = page.locator('button, a, [role="menuitem"]').filter({ hasText: /Edytuj|Edit/i }).first();
      await editOption.click();
    }

    // Should show "Edytuj produkt" (edit), NOT "Utwórz nowy produkt" (wizard)
    await expect(page.getByText('Edytuj produkt')).toBeVisible({ timeout: 5000 });

    // Wizard step indicator should NOT be present
    await expect(page.getByRole('button', { name: /Podstawy/i })).not.toBeVisible();

    // Close modal
    await page.locator('button[aria-label="Close modal"]').click();
  });
});

test.describe('Duplicate mode uses wizard', () => {

  let sourceProductId: string;
  const sourceSlug = `dup-source-${Date.now()}`;

  test.beforeAll(async () => {
    // Create a product to duplicate
    const { data, error } = await supabaseAdmin
      .from('products')
      .insert({
        name: 'Duplicate Source Product',
        slug: sourceSlug,
        price: 75,
        currency: 'PLN',
        description: 'Source product for duplicate test',
        is_active: true,
        icon: '🎯',
      })
      .select()
      .single();

    if (error) throw error;
    sourceProductId = data.id;
    createdProductSlugs.push(sourceSlug);
  });

  test('should open wizard with pre-filled data when duplicating', async ({ page }) => {
    await goToProducts(page);

    // Find the product row
    const productRow = page.locator('tr, [data-product-id]').filter({ hasText: 'Duplicate Source Product' });

    // Try to find duplicate button
    const dupButton = productRow.locator('button[title*="Duplikuj"], button[title*="Duplicate"]').first();

    if (await dupButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dupButton.click();
    } else {
      // Try 3-dot menu
      const menuButton = productRow.locator('button').last();
      await menuButton.click();
      await page.waitForTimeout(300);
      const dupOption = page.locator('button, a, [role="menuitem"]').filter({ hasText: /Duplikuj|Duplicate/i }).first();
      await dupOption.click();
    }

    // Should show wizard (not edit modal) because duplicate has empty ID
    await expect(page.getByText('Utwórz nowy produkt')).toBeVisible({ timeout: 5000 });

    // Name should be pre-filled with [COPY] prefix
    const nameValue = await page.inputValue('input#name');
    expect(nameValue).toContain('[COPY]');
    expect(nameValue).toContain('Duplicate Source Product');

    // Close wizard
    await page.getByRole('button', { name: /Anuluj/i }).click();
    // Exit confirmation (form is dirty from pre-fill)
    const exitModal = page.getByText(/Odrzucić zmiany/i);
    if (await exitModal.isVisible({ timeout: 2000 }).catch(() => false)) {
      await page.getByRole('button', { name: /Odrzuć/i }).click();
    }
  });
});
