-- Order Bumps System
-- Migration: 20251128150000_order_bumps
-- Description: Add order bump functionality to increase average order value (AOV)
-- Business Impact: Enable one-click upsells during checkout with complementary products

BEGIN;

-- =============================================================================
-- ORDER BUMPS TABLE
-- =============================================================================

-- Order bumps allow administrators to offer complementary products during checkout
-- Example: Main product is a course ($99), bump is a bonus workbook ($7)
-- The bump appears as a checkbox on the checkout page
CREATE TABLE IF NOT EXISTS order_bumps (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

  -- Product relationships
  main_product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  bump_product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,

  -- Bump configuration
  bump_price NUMERIC CHECK (bump_price IS NULL OR bump_price >= 0),
  -- NULL = use bump_product's default price
  -- Non-NULL = special discounted price for this bump offer

  bump_title TEXT NOT NULL CHECK (length(bump_title) BETWEEN 1 AND 255),
  -- Example: "Yes, add the Quick Start Guide for just $7!"

  bump_description TEXT CHECK (bump_description IS NULL OR length(bump_description) <= 1000),
  -- Optional longer description explaining the bump value

  -- Access duration override
  access_duration_days INTEGER CHECK (access_duration_days IS NULL OR access_duration_days >= 0),
  -- NULL = inherit from product (default)
  -- 0 = unlimited access
  -- > 0 = specific duration in days

  -- Display and activation
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  -- For future multi-bump support (currently only first bump will be shown)

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Business logic constraints
  CONSTRAINT no_self_bump CHECK (main_product_id != bump_product_id),
  -- A product cannot be bumped to itself

  CONSTRAINT unique_bump_pair UNIQUE (main_product_id, bump_product_id)
  -- Each product pair can only have one bump configuration
);

COMMENT ON TABLE order_bumps IS 'Order bump configurations for one-click upsells during checkout';
COMMENT ON COLUMN order_bumps.bump_price IS 'Special discounted price for bump (NULL = use product default price)';
COMMENT ON COLUMN order_bumps.bump_title IS 'Checkbox label shown on checkout page';
COMMENT ON COLUMN order_bumps.display_order IS 'Order of display (for future multi-bump support)';

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Primary lookup: Get bumps for a specific product
CREATE INDEX IF NOT EXISTS idx_order_bumps_main_product
ON order_bumps(main_product_id, is_active, display_order);

-- Reverse lookup: Which products use this as a bump
CREATE INDEX IF NOT EXISTS idx_order_bumps_bump_product
ON order_bumps(bump_product_id);

-- Time-based queries for analytics
CREATE INDEX IF NOT EXISTS idx_order_bumps_created_at
ON order_bumps USING BRIN (created_at);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE order_bumps ENABLE ROW LEVEL SECURITY;

-- Admins can view all bumps
CREATE POLICY "Admins can view order bumps" ON order_bumps
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = (SELECT auth.uid())
    )
  );

-- Admins can insert bumps
CREATE POLICY "Admins can insert order bumps" ON order_bumps
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = (SELECT auth.uid())
    )
  );

-- Admins can update bumps
CREATE POLICY "Admins can update order bumps" ON order_bumps
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = (SELECT auth.uid())
    )
  );

-- Admins can delete bumps
CREATE POLICY "Admins can delete order bumps" ON order_bumps
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = (SELECT auth.uid())
    )
  );

-- Public can view active order bumps (needed for checkout price calculation)
CREATE POLICY "Public can view active order bumps" ON order_bumps
  FOR SELECT
  TO public
  USING (is_active = true);

-- Service role has full access (for API operations)
CREATE POLICY "Service role can manage order bumps" ON order_bumps
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- DATABASE FUNCTIONS
-- =============================================================================

-- Get active order bumps for a product (public facing, used by checkout)
-- Returns bump configuration with product details
CREATE OR REPLACE FUNCTION get_product_order_bumps(
  product_id_param UUID
) RETURNS TABLE (
  bump_id UUID,
  bump_product_id UUID,
  bump_product_name TEXT,
  bump_product_description TEXT,
  bump_product_icon TEXT,
  bump_price NUMERIC,
  original_price NUMERIC, -- NEW: Original price to calculate savings
  bump_access_duration INTEGER, -- NEW: Access duration in days
  bump_currency TEXT,
  bump_title TEXT,
  bump_description TEXT,
  display_order INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ob.id as bump_id,
    ob.bump_product_id,
    p.name as bump_product_name,
    p.description as bump_product_description,
    p.icon as bump_product_icon,
    COALESCE(ob.bump_price, p.price) as bump_price,
    p.price as original_price, -- Return original price
    COALESCE(ob.access_duration_days, p.auto_grant_duration_days) as bump_access_duration, -- Return effective access duration
    p.currency as bump_currency,
    ob.bump_title,
    ob.bump_description,
    ob.display_order
  FROM public.order_bumps ob
  INNER JOIN public.products p ON p.id = ob.bump_product_id
  WHERE ob.main_product_id = product_id_param
    AND ob.is_active = true
    AND p.is_active = true
    -- Both bump configuration and product must be active
  ORDER BY ob.display_order ASC, ob.created_at ASC
  LIMIT 1; -- For now, only return first bump
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp;

-- Grant execute to all authenticated users and anon (needed for checkout page)
GRANT EXECUTE ON FUNCTION get_product_order_bumps TO authenticated, anon;

-- Admin function: Get all bumps for a product (including inactive)
CREATE OR REPLACE FUNCTION admin_get_product_order_bumps(
  product_id_param UUID
) RETURNS TABLE (
  bump_id UUID,
  bump_product_id UUID,
  bump_product_name TEXT,
  bump_price NUMERIC,
  bump_title TEXT,
  bump_description TEXT,
  is_active BOOLEAN,
  display_order INTEGER,
  access_duration_days INTEGER, -- NEW: Access duration override
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  -- Security check: Only admins can call this
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = (SELECT auth.uid())
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  RETURN QUERY
  SELECT
    ob.id as bump_id,
    ob.bump_product_id,
    p.name as bump_product_name,
    ob.bump_price,
    ob.bump_title,
    ob.bump_description,
    ob.is_active,
    ob.display_order,
    ob.access_duration_days, -- Return access duration override
    ob.created_at,
    ob.updated_at
  FROM public.order_bumps ob
  INNER JOIN public.products p ON p.id = ob.bump_product_id
  WHERE ob.main_product_id = product_id_param
  ORDER BY ob.display_order ASC, ob.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION admin_get_product_order_bumps TO authenticated;

-- =============================================================================
-- TRIGGER FOR UPDATED_AT
-- =============================================================================

-- Create trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_order_bumps_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_order_bumps_updated_at
  BEFORE UPDATE ON order_bumps
  FOR EACH ROW
  EXECUTE FUNCTION update_order_bumps_updated_at();

-- =============================================================================
-- PAYMENT TRANSACTIONS METADATA ENHANCEMENT
-- =============================================================================

-- Add comment explaining metadata usage for order bumps
COMMENT ON COLUMN payment_transactions.metadata IS
'JSONB metadata including Stripe session details. For order bumps, includes: {"bump_product_ids": ["uuid1", "uuid2"], "is_bump": true}';

COMMIT;
