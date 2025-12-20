-- Smart & Frictionless Discount Codes System
-- Migration: 20251128170000_smart_coupons
-- Description: Infrastructure for modern coupon system with auto-apply and email targeting

BEGIN;

-- =============================================================================
-- COUPONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code TEXT NOT NULL CHECK (length(code) >= 3),
  
  -- Discount configuration
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
  currency TEXT CHECK (
    (discount_type = 'fixed' AND (currency IS NULL OR length(currency) = 3)) OR
    (discount_type = 'percentage' AND currency IS NULL)
  ),
  
  -- Constraints and Targeting
  allowed_emails JSONB DEFAULT '[]'::JSONB NOT NULL, -- Array of emails for exclusive/auto access
  allowed_product_ids JSONB DEFAULT '[]'::JSONB NOT NULL, -- Array of product UUIDs (empty = all)
  
  -- Usage Limits
  usage_limit_global INTEGER, -- NULL = unlimited
  usage_limit_per_user INTEGER DEFAULT 1, -- How many times a single user/email can use this
  current_usage_count INTEGER DEFAULT 0 NOT NULL,
  
  -- Validity
  starts_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true NOT NULL,
  exclude_order_bumps BOOLEAN DEFAULT false NOT NULL, -- If true, discount applies only to main product, ignoring bumps
  
  -- Metadata
  name TEXT, -- Internal name for admin
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Uniqueness
  CONSTRAINT unique_coupon_code UNIQUE (code),
  
  -- Logical constraint: Percentage must be <= 100
  CONSTRAINT valid_percentage CHECK (
    discount_type != 'percentage' OR (discount_value <= 100)
  )
);

-- =============================================================================
-- COUPON REDEMPTIONS TABLE (History)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  coupon_id UUID REFERENCES public.coupons(id) ON DELETE RESTRICT NOT NULL,
  
  -- User info (linked user or guest email)
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_email TEXT NOT NULL,
  
  -- Transaction link
  transaction_id UUID REFERENCES public.payment_transactions(id) ON DELETE CASCADE,
  
  -- Snapshot of deal
  discount_amount NUMERIC NOT NULL,
  redeemed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_email ON coupon_redemptions(customer_email);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_user ON coupon_redemptions(user_id);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_redemptions ENABLE ROW LEVEL SECURITY;

-- Admins: Full access
CREATE POLICY "Admins full access coupons" ON coupons
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

CREATE POLICY "Admins full access redemptions" ON coupon_redemptions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

-- Service Role: Full access
CREATE POLICY "Service role full access coupons" ON coupons FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access redemptions" ON coupon_redemptions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Public/Users: NO DIRECT ACCESS TO COUPONS TABLE
-- Verification must happen via SECURITY DEFINER function to hide logic/limits

-- Users can see their own redemptions
CREATE POLICY "Users view own redemptions" ON coupon_redemptions
  FOR SELECT USING (auth.uid() = user_id);

-- =============================================================================
-- DATABASE FUNCTIONS
-- =============================================================================

-- Verify if a coupon is valid for a specific context
CREATE OR REPLACE FUNCTION verify_coupon(
  code_param TEXT,
  product_id_param UUID,
  customer_email_param TEXT DEFAULT NULL,
  currency_param TEXT DEFAULT 'USD'
) RETURNS JSONB AS $$
DECLARE
  coupon_record RECORD;
  user_usage_count INTEGER;
BEGIN
  -- Find coupon
  SELECT * INTO coupon_record
  FROM public.coupons
  WHERE code = code_param AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid code');
  END IF;
  
  -- Check expiration
  IF coupon_record.expires_at IS NOT NULL AND coupon_record.expires_at < NOW() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Code expired');
  END IF;
  
  IF coupon_record.starts_at > NOW() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Code not active yet');
  END IF;
  
  -- Check global usage limit
  IF coupon_record.usage_limit_global IS NOT NULL AND coupon_record.current_usage_count >= coupon_record.usage_limit_global THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Code usage limit reached');
  END IF;
  
  -- Check currency (for fixed amount)
  IF coupon_record.discount_type = 'fixed' AND coupon_record.currency IS NOT NULL AND coupon_record.currency != currency_param THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Code invalid for this currency');
  END IF;
  
  -- Check product restriction
  IF jsonb_array_length(coupon_record.allowed_product_ids) > 0 THEN
    IF NOT (coupon_record.allowed_product_ids @> to_jsonb(product_id_param)) THEN
      RETURN jsonb_build_object('valid', false, 'error', 'Code not valid for this product');
    END IF;
  END IF;
  
  -- Check email restriction (Exclusive coupons)
  IF jsonb_array_length(coupon_record.allowed_emails) > 0 THEN
    IF customer_email_param IS NULL OR NOT (coupon_record.allowed_emails @> to_jsonb(customer_email_param)) THEN
      RETURN jsonb_build_object('valid', false, 'error', 'Code not authorized for this email');
    END IF;
  END IF;
  
  -- Check user usage limit
  IF customer_email_param IS NOT NULL THEN
    SELECT COUNT(*) INTO user_usage_count
    FROM public.coupon_redemptions
    WHERE coupon_id = coupon_record.id AND customer_email = customer_email_param;
    
    IF user_usage_count >= coupon_record.usage_limit_per_user THEN
      RETURN jsonb_build_object('valid', false, 'error', 'You have already used this code');
    END IF;
  END IF;
  
  -- Valid!
  RETURN jsonb_build_object(
    'valid', true,
    'id', coupon_record.id,
    'code', coupon_record.code,
    'discount_type', coupon_record.discount_type,
    'discount_value', coupon_record.discount_value,
    'exclude_order_bumps', coupon_record.exclude_order_bumps
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Find available coupons for a specific email (Auto-apply logic)
CREATE OR REPLACE FUNCTION find_auto_apply_coupon(
  customer_email_param TEXT,
  product_id_param UUID
) RETURNS JSONB AS $$
DECLARE
  coupon_record RECORD;
BEGIN
  -- Search for active coupons that specifically target this email
  -- Priority: Most recent first
  SELECT * INTO coupon_record
  FROM public.coupons
  WHERE is_active = true
    AND (allowed_emails @> to_jsonb(customer_email_param))
    AND (
      jsonb_array_length(allowed_product_ids) = 0 OR 
      allowed_product_ids @> to_jsonb(product_id_param)
    )
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (starts_at <= NOW())
    AND (usage_limit_global IS NULL OR current_usage_count < usage_limit_global)
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  RETURN jsonb_build_object(
    'found', true,
    'code', coupon_record.code,
    'discount_type', coupon_record.discount_type,
    'discount_value', coupon_record.discount_value,
    'exclude_order_bumps', coupon_record.exclude_order_bumps
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION find_auto_apply_coupon TO anon, authenticated, service_role;

COMMIT;
