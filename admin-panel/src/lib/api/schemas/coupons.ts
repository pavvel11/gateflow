/**
 * Coupon schemas for API v1
 */

import { z } from 'zod';
import {
  UuidSchema,
  CurrencySchema,
  DateTimeSchema,
  PaginationQuerySchema,
} from './common';

// ============================================================================
// Coupon Schema
// ============================================================================

export const CouponSchema = z.object({
  id: UuidSchema,
  code: z.string().openapi({ example: 'SAVE20' }),
  name: z.string().openapi({ example: '20% Off Summer Sale' }),
  discount_type: z.enum(['percentage', 'fixed']).openapi({ example: 'percentage' }),
  discount_value: z.number().openapi({ example: 20 }),
  currency: CurrencySchema.nullable(),
  is_active: z.boolean(),
  usage_limit: z.number().int().nullable().openapi({ example: 100 }),
  usage_count: z.number().int().openapi({ example: 45 }),
  min_order_amount: z.number().nullable(),
  max_discount_amount: z.number().nullable(),
  valid_from: DateTimeSchema.nullable(),
  valid_until: DateTimeSchema.nullable(),
  allowed_product_ids: z.array(UuidSchema).openapi({ example: [] }),
  first_purchase_only: z.boolean(),
  created_at: DateTimeSchema,
  updated_at: DateTimeSchema,
}).openapi('Coupon');

export type Coupon = z.infer<typeof CouponSchema>;

// ============================================================================
// Create Coupon
// ============================================================================

export const CreateCouponSchema = z.object({
  code: z.string().min(1).max(50).regex(/^[A-Z0-9_-]+$/i).openapi({
    description: 'Unique coupon code',
    example: 'SAVE20',
  }),
  name: z.string().min(1).max(255).openapi({
    description: 'Display name',
    example: '20% Off Summer Sale',
  }),
  discount_type: z.enum(['percentage', 'fixed']).openapi({
    description: 'Type of discount',
  }),
  discount_value: z.number().min(0).openapi({
    description: 'Discount value (percentage 0-100 or fixed amount)',
    example: 20,
  }),
  currency: CurrencySchema.optional().openapi({
    description: 'Required for fixed discounts',
  }),
  is_active: z.boolean().default(true),
  usage_limit: z.number().int().min(1).nullable().optional().openapi({
    description: 'Max number of uses (null = unlimited)',
  }),
  min_order_amount: z.number().min(0).nullable().optional(),
  max_discount_amount: z.number().min(0).nullable().optional().openapi({
    description: 'Cap on discount amount (for percentage discounts)',
  }),
  valid_from: z.string().datetime().nullable().optional(),
  valid_until: z.string().datetime().nullable().optional(),
  allowed_product_ids: z.array(UuidSchema).default([]).openapi({
    description: 'Limit to specific products (empty = all products)',
  }),
  first_purchase_only: z.boolean().default(false),
}).openapi('CreateCouponRequest');

export type CreateCouponInput = z.infer<typeof CreateCouponSchema>;

// ============================================================================
// Update Coupon
// ============================================================================

export const UpdateCouponSchema = CreateCouponSchema.partial().omit({ code: true }).openapi('UpdateCouponRequest');

export type UpdateCouponInput = z.infer<typeof UpdateCouponSchema>;

// ============================================================================
// List Coupons Query
// ============================================================================

export const ListCouponsQuerySchema = PaginationQuerySchema.extend({
  search: z.string().optional().openapi({
    description: 'Search by code or name',
  }),
  status: z.enum(['active', 'inactive', 'expired', 'all']).default('all'),
}).openapi('ListCouponsQuery');

export type ListCouponsQuery = z.infer<typeof ListCouponsQuerySchema>;

// ============================================================================
// Response Schemas
// ============================================================================

export const CouponResponseSchema = z.object({
  success: z.literal(true),
  data: CouponSchema,
}).openapi('CouponResponse');

export const CouponListResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(CouponSchema),
  pagination: z.object({
    has_more: z.boolean(),
    next_cursor: z.string().nullable(),
  }),
}).openapi('CouponListResponse');
