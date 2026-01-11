/**
 * Analytics schemas for API v1
 */

import { z } from 'zod';
import {
  UuidSchema,
  CurrencySchema,
  DateTimeSchema,
} from './common';

// ============================================================================
// Dashboard Analytics
// ============================================================================

export const DashboardQuerySchema = z.object({
  product_id: UuidSchema.optional().openapi({
    description: 'Filter stats by product',
  }),
}).openapi('DashboardQuery');

export const RecentActivitySchema = z.object({
  date: z.string().openapi({ example: '2025-01-15' }),
  transactions: z.number().int().openapi({ example: 12 }),
  revenue: z.number().openapi({ example: 1250.00 }),
}).openapi('RecentActivity');

export const DashboardSchema = z.object({
  revenue: z.object({
    today: z.number().openapi({ example: 450.00 }),
    this_week: z.number().openapi({ example: 2800.00 }),
    this_month: z.number().openapi({ example: 12500.00 }),
    total: z.number().openapi({ example: 85000.00 }),
    total_refunded: z.number().openapi({ example: 1200.00 }),
    net_revenue: z.number().openapi({ example: 83800.00 }),
    by_currency: z.record(z.string(), z.number()).openapi({
      example: { PLN: 60000, USD: 25000 },
    }),
  }),
  transactions: z.object({
    today: z.number().int().openapi({ example: 5 }),
    this_week: z.number().int().openapi({ example: 32 }),
    this_month: z.number().int().openapi({ example: 145 }),
    total: z.number().int().openapi({ example: 980 }),
  }),
  products: z.object({
    active: z.number().int().openapi({ example: 12 }),
    total: z.number().int().openapi({ example: 15 }),
  }),
  users: z.object({
    total: z.number().int().openapi({ example: 540 }),
    with_access: z.number().int().openapi({ example: 320 }),
  }),
  refunds: z.object({
    pending_count: z.number().int().openapi({ example: 3 }),
    total_refunded: z.number().openapi({ example: 1200.00 }),
  }),
  recent_activity: z.array(RecentActivitySchema),
  generated_at: DateTimeSchema,
  filters: z.object({
    product_id: UuidSchema.nullable(),
  }),
}).openapi('Dashboard');

export type Dashboard = z.infer<typeof DashboardSchema>;

// ============================================================================
// Revenue Analytics
// ============================================================================

export const RevenuePeriodSchema = z.enum([
  'day',
  'week',
  'month',
  'quarter',
  'year',
  'all',
]).openapi('RevenuePeriod');

export const RevenueGroupBySchema = z.enum([
  'day',
  'week',
  'month',
]).openapi('RevenueGroupBy');

export const RevenueQuerySchema = z.object({
  period: RevenuePeriodSchema.default('month'),
  start_date: z.string().datetime().optional().openapi({
    description: 'Overrides period if provided',
  }),
  end_date: z.string().datetime().optional(),
  product_id: UuidSchema.optional(),
  group_by: RevenueGroupBySchema.optional().openapi({
    description: 'Grouping interval (default based on period)',
  }),
}).openapi('RevenueQuery');

export const CurrencyStatsSchema = z.object({
  revenue: z.number().openapi({ example: 8500.00 }),
  transactions: z.number().int().openapi({ example: 95 }),
  refunded: z.number().openapi({ example: 250.00 }),
}).openapi('CurrencyStats');

export const RevenueBreakdownSchema = z.object({
  date: z.string().openapi({ example: '2025-01-15' }),
  revenue: z.number().openapi({ example: 850.00 }),
  transactions: z.number().int().openapi({ example: 8 }),
  by_currency: z.record(z.string(), z.number()).openapi({
    example: { PLN: 650, USD: 200 },
  }),
}).openapi('RevenueBreakdown');

export const RevenueSchema = z.object({
  summary: z.object({
    total_revenue: z.number().openapi({ example: 12500.00 }),
    total_refunded: z.number().openapi({ example: 450.00 }),
    net_revenue: z.number().openapi({ example: 12050.00 }),
    total_transactions: z.number().int().openapi({ example: 145 }),
    average_order_value: z.number().openapi({ example: 86.21 }),
    by_currency: z.record(z.string(), CurrencyStatsSchema).openapi({
      example: {
        PLN: { revenue: 8500, transactions: 95, refunded: 250 },
        USD: { revenue: 4000, transactions: 50, refunded: 200 },
      },
    }),
  }),
  breakdown: z.array(RevenueBreakdownSchema),
  comparison: z.object({
    previous_period: z.object({
      start: DateTimeSchema,
      end: DateTimeSchema,
      revenue: z.number().openapi({ example: 10200.00 }),
      transactions: z.number().int().openapi({ example: 120 }),
    }),
    revenue_change_percent: z.number().openapi({ example: 22.55 }),
    transaction_change_percent: z.number().openapi({ example: 20.83 }),
  }),
  filters: z.object({
    period: RevenuePeriodSchema,
    start_date: DateTimeSchema,
    end_date: DateTimeSchema,
    product_id: UuidSchema.nullable(),
    group_by: RevenueGroupBySchema.nullable(),
  }),
  generated_at: DateTimeSchema,
}).openapi('Revenue');

export type Revenue = z.infer<typeof RevenueSchema>;

// ============================================================================
// Top Products Analytics
// ============================================================================

export const TopProductsSortBySchema = z.enum([
  'revenue',
  'sales',
]).openapi('TopProductsSortBy');

export const TopProductsQuerySchema = z.object({
  period: RevenuePeriodSchema.default('month'),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  sort_by: TopProductsSortBySchema.default('revenue'),
}).openapi('TopProductsQuery');

export const TopProductSchema = z.object({
  product_id: UuidSchema,
  name: z.string().openapi({ example: 'Premium Course' }),
  slug: z.string().openapi({ example: 'premium-course' }),
  is_active: z.boolean(),
  current_price: z.number().openapi({ example: 99.00 }),
  current_currency: CurrencySchema,
  revenue: z.number().openapi({ example: 5940.00 }),
  sales_count: z.number().int().openapi({ example: 60 }),
  average_price: z.number().openapi({ example: 99.00 }),
  by_currency: z.record(z.string(), z.object({
    revenue: z.number(),
    count: z.number().int(),
  })),
  rank: z.number().int().openapi({ example: 1 }),
  revenue_share: z.number().openapi({
    description: 'Percentage of total revenue',
    example: 47.52,
  }),
  sales_share: z.number().openapi({
    description: 'Percentage of total sales',
    example: 41.38,
  }),
}).openapi('TopProduct');

export type TopProduct = z.infer<typeof TopProductSchema>;

export const TopProductsSchema = z.object({
  products: z.array(TopProductSchema),
  summary: z.object({
    total_products: z.number().int().openapi({ example: 10 }),
    total_revenue: z.number().openapi({ example: 12500.00 }),
    total_sales: z.number().int().openapi({ example: 145 }),
  }),
  filters: z.object({
    period: RevenuePeriodSchema,
    start_date: DateTimeSchema,
    limit: z.number().int(),
    sort_by: TopProductsSortBySchema,
  }),
  generated_at: DateTimeSchema,
}).openapi('TopProducts');

export type TopProducts = z.infer<typeof TopProductsSchema>;

// ============================================================================
// Response Schemas
// ============================================================================

export const DashboardResponseSchema = z.object({
  success: z.literal(true),
  data: DashboardSchema,
}).openapi('DashboardResponse');

export const RevenueResponseSchema = z.object({
  success: z.literal(true),
  data: RevenueSchema,
}).openapi('RevenueResponse');

export const TopProductsResponseSchema = z.object({
  success: z.literal(true),
  data: TopProductsSchema,
}).openapi('TopProductsResponse');
