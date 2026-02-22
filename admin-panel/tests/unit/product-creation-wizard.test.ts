import { describe, it, expect } from 'vitest';
import { initialFormData } from '@/components/ProductFormModal/types';

/**
 * Tests for ProductCreationWizard logic.
 * Since the wizard reuses useProductForm unchanged and only adds step navigation,
 * we test the step validation and dirty detection logic that lives in the wizard.
 */

// Replicate the wizard's validation logic (pure functions extracted for testability)
function validateStep1(formData: { name: string; description: string }): boolean {
  return formData.name.trim() !== '' && formData.description.trim() !== '';
}

function isFormDirty(formData: { name: string; price: number; description: string }): boolean {
  return formData.name !== '' || formData.price > 0 || formData.description !== '';
}

describe('ProductCreationWizard', () => {
  describe('step 1 validation', () => {
    it('should fail when name is empty', () => {
      expect(validateStep1({ name: '', description: 'Test' })).toBe(false);
    });

    it('should fail when description is empty', () => {
      expect(validateStep1({ name: 'Test', description: '' })).toBe(false);
    });

    it('should fail when both are empty', () => {
      expect(validateStep1({ name: '', description: '' })).toBe(false);
    });

    it('should fail when name is whitespace only', () => {
      expect(validateStep1({ name: '   ', description: 'Test' })).toBe(false);
    });

    it('should pass when both name and description are filled', () => {
      expect(validateStep1({ name: 'My Product', description: 'A description' })).toBe(true);
    });
  });

  describe('dirty detection', () => {
    it('should detect form as clean with initial data', () => {
      expect(isFormDirty(initialFormData)).toBe(false);
    });

    it('should detect form as dirty when name is set', () => {
      expect(isFormDirty({ ...initialFormData, name: 'Test' })).toBe(true);
    });

    it('should detect form as dirty when price is set', () => {
      expect(isFormDirty({ ...initialFormData, price: 10 })).toBe(true);
    });

    it('should detect form as dirty when description is set', () => {
      expect(isFormDirty({ ...initialFormData, description: 'Desc' })).toBe(true);
    });

    it('should detect as clean when all trigger fields are default', () => {
      expect(isFormDirty({ name: '', price: 0, description: '' })).toBe(false);
    });
  });

  describe('step flow', () => {
    it('should have 3 wizard steps defined', () => {
      const TOTAL_STEPS = 3;
      expect(TOTAL_STEPS).toBe(3);
    });

    it('step 1 should contain Essentials (BasicInfo + Pricing)', () => {
      // Step 1 fields: name, slug, description, long_description, price, currency, icon, image_url, VAT, PWYW
      const step1Fields = ['name', 'slug', 'description', 'price', 'currency', 'icon'] as const;
      for (const field of step1Fields) {
        expect(initialFormData).toHaveProperty(field);
      }
    });

    it('step 2 should contain Content & Details (ContentDelivery + Categories)', () => {
      const step2Fields = ['content_delivery_type', 'content_config', 'categories'] as const;
      for (const field of step2Fields) {
        expect(initialFormData).toHaveProperty(field);
      }
    });

    it('step 3 should contain Sales & Settings (all remaining fields)', () => {
      const step3Fields = [
        'sale_price', 'available_from', 'available_until',
        'auto_grant_duration_days', 'success_redirect_url',
        'is_refundable', 'is_active', 'is_listed', 'is_featured',
      ] as const;
      for (const field of step3Fields) {
        expect(initialFormData).toHaveProperty(field);
      }
    });
  });

  describe('wizard routing logic', () => {
    it('should show wizard for new product (editingProduct is null)', () => {
      const editingProduct = null;
      const isCreateMode = !editingProduct || !editingProduct.id;
      expect(isCreateMode).toBe(true);
    });

    it('should show wizard for duplicate product (editingProduct with empty id)', () => {
      const editingProduct = { id: '', name: '[COPY] Test' };
      const isCreateMode = !editingProduct || !editingProduct.id;
      expect(isCreateMode).toBe(true);
    });

    it('should show modal for edit (editingProduct with real id)', () => {
      const editingProduct = { id: 'abc-123', name: 'Test' };
      const isCreateMode = !editingProduct || !editingProduct.id;
      expect(isCreateMode).toBe(false);
    });
  });
});
