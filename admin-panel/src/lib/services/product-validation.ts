/**
 * Product validation service
 * Centralizes product validation logic to avoid duplication across checkout flows
 */

import { createClient } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';
import { DisposableEmailService } from './disposable-email';

export interface ValidatedProduct {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  is_active: boolean;
  available_from: string | null;
  available_until: string | null;
  auto_grant_duration_days?: number | null;
  // Pay What You Want fields
  allow_custom_price?: boolean;
  custom_price_min?: number;
}

export interface UserAccessInfo {
  hasAccess: boolean;
  accessExpiresAt: string | null;
  isExpired: boolean;
}

export class ProductValidationService {
  private supabase: Awaited<ReturnType<typeof createClient>>;

  constructor(supabase: Awaited<ReturnType<typeof createClient>>) {
    this.supabase = supabase;
  }

  /**
   * Get and validate product for checkout
   */
  async validateProduct(productId: string): Promise<ValidatedProduct> {
    if (!productId || typeof productId !== 'string') {
      throw new Error('Product ID is required');
    }

    const { data: product, error } = await this.supabase
      .from('products')
      .select('id, slug, name, description, price, currency, is_active, available_from, available_until, auto_grant_duration_days, allow_custom_price, custom_price_min')
      .eq('id', productId)
      .eq('is_active', true)
      .single();

    if (error || !product) {
      throw new Error('Product not found or inactive');
    }

    // Validate product price (skip for Pay What You Want products)
    if (product.price <= 0 && !product.allow_custom_price) {
      throw new Error('Invalid product price');
    }

    return product;
  }

  /**
   * Check if product is temporally available for purchase
   */
  static validateTemporalAvailability(product: ValidatedProduct): void {
    const now = new Date();
    const availableFrom = product.available_from ? new Date(product.available_from) : null;
    const availableUntil = product.available_until ? new Date(product.available_until) : null;
    
    const isTemporallyAvailable = (!availableFrom || availableFrom <= now) && 
                                 (!availableUntil || availableUntil > now);
    
    if (!isTemporallyAvailable) {
      throw new Error('Product not available for purchase');
    }
  }

  /**
   * Check if user already has access to the product
   */
  async checkUserAccess(userId: string, productId: string): Promise<UserAccessInfo> {
    const { data: existingAccess } = await this.supabase
      .from('user_product_access')
      .select('access_expires_at')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .single();

    if (!existingAccess) {
      return {
        hasAccess: false,
        accessExpiresAt: null,
        isExpired: false
      };
    }

    const expiresAt = existingAccess.access_expires_at 
      ? new Date(existingAccess.access_expires_at) 
      : null;
    const isExpired = expiresAt && expiresAt < new Date();

    return {
      hasAccess: !isExpired,
      accessExpiresAt: existingAccess.access_expires_at,
      isExpired: Boolean(isExpired)
    };
  }

  /**
   * Complete product validation for checkout (combines all checks)
   */
  async validateForCheckout(
    productId: string, 
    user?: User | null
  ): Promise<{ product: ValidatedProduct; userAccess: UserAccessInfo | null }> {
    // 1. Validate product exists and is active
    const product = await this.validateProduct(productId);

    // 2. Check temporal availability
    ProductValidationService.validateTemporalAvailability(product);

    // 3. Check user access if user is logged in
    let userAccess: UserAccessInfo | null = null;
    if (user) {
      userAccess = await this.checkUserAccess(user.id, productId);
      
      // Throw error if user already has valid access
      if (userAccess.hasAccess) {
        throw new Error('You already have access to this product');
      }
    }

    return { product, userAccess };
  }

  /**
   * Validate email format and check for disposable domains
   */
  static async validateEmail(email: string, allowDisposable: boolean = false): Promise<boolean> {
    // Use our enhanced disposable email service
    const validation = await DisposableEmailService.validateEmail(email, allowDisposable);
    return validation.isValid;
  }

  /**
   * Validate email format only (basic regex check)
   */
  static validateEmailFormat(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Calculate access expiry date
   */
  static calculateAccessExpiry(durationDays?: number | null): string | null {
    if (!durationDays) return null;
    
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + durationDays);
    return expiryDate.toISOString();
  }
}
