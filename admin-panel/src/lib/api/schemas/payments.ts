/**
 * Payment schemas for API v1
 */

import { z } from 'zod';
import {
  UuidSchema,
  EmailSchema,
  CurrencySchema,
  DateTimeSchema,
  PaginationQuerySchema,
} from './common';

// ============================================================================
// Payment Schema
// ============================================================================

export const PaymentSchema = z.object({
  id: UuidSchema,
  user_id: UuidSchema.nullable(),
  user_email: EmailSchema,
  product_id: UuidSchema,
  product_name: z.string().openapi({ example: 'Premium Course' }),
  amount: z.number().openapi({ example: 99.00 }),
  currency: CurrencySchema,
  status: z.enum(['pending', 'completed', 'failed', 'refunded', 'partially_refunded']).openapi({ example: 'completed' }),
  payment_method: z.string().nullable().openapi({ example: 'card' }),
  stripe_payment_intent_id: z.string().nullable(),
  stripe_checkout_session_id: z.string().nullable(),
  coupon_code: z.string().nullable().openapi({ example: 'SAVE20' }),
  discount_amount: z.number().nullable().openapi({ example: 19.80 }),
  refunded_amount: z.number().nullable(),
  refund_reason: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  created_at: DateTimeSchema,
  updated_at: DateTimeSchema,
}).openapi('Payment');

export type Payment = z.infer<typeof PaymentSchema>;

// ============================================================================
// List Payments Query
// ============================================================================

export const ListPaymentsQuerySchema = PaginationQuerySchema.extend({
  status: z.enum(['pending', 'completed', 'failed', 'refunded', 'all']).default('all'),
  product_id: UuidSchema.optional(),
  user_email: z.string().optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
}).openapi('ListPaymentsQuery');

export type ListPaymentsQuery = z.infer<typeof ListPaymentsQuerySchema>;

// ============================================================================
// Payment Refund Input (for refunding a payment)
// ============================================================================

export const PaymentRefundInputSchema = z.object({
  amount: z.number().min(0.01).optional().openapi({
    description: 'Partial refund amount (omit for full refund)',
    example: 50.00,
  }),
  reason: z.string().max(500).optional().openapi({
    description: 'Reason for refund',
    example: 'Customer requested refund',
  }),
}).openapi('PaymentRefundInput');

export type PaymentRefundInput = z.infer<typeof PaymentRefundInputSchema>;

// ============================================================================
// Payment Stats
// ============================================================================

export const PaymentStatsSchema = z.object({
  total_revenue: z.number().openapi({ example: 12500.00 }),
  total_transactions: z.number().int().openapi({ example: 150 }),
  successful_transactions: z.number().int().openapi({ example: 142 }),
  failed_transactions: z.number().int().openapi({ example: 8 }),
  refunded_amount: z.number().openapi({ example: 450.00 }),
  average_order_value: z.number().openapi({ example: 88.03 }),
  currency: CurrencySchema,
}).openapi('PaymentStats');

export type PaymentStats = z.infer<typeof PaymentStatsSchema>;

// ============================================================================
// Response Schemas
// ============================================================================

export const PaymentResponseSchema = z.object({
  success: z.literal(true),
  data: PaymentSchema,
}).openapi('PaymentResponse');

export const PaymentListResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(PaymentSchema),
  pagination: z.object({
    has_more: z.boolean(),
    next_cursor: z.string().nullable(),
  }),
}).openapi('PaymentListResponse');
