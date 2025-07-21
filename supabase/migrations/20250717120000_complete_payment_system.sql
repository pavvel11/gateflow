-- Complete payment system with guest checkout and security
-- Migration: 20250717_complete_payment_system

BEGIN;

-- =============================================================================
-- ADMIN SYSTEM
-- =============================================================================

-- Create admin_users table for admin access control
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  permissions JSONB DEFAULT '{}' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create admin_actions table for audit logging (SECURITY)
CREATE TABLE IF NOT EXISTS admin_actions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50) NOT NULL,
  target_id VARCHAR(255) NOT NULL,
  details JSONB DEFAULT '{}' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =============================================================================
-- PAYMENT TRACKING TABLES
-- =============================================================================

-- Create payment_transactions table for completed payments
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Nullable for guest purchases
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  customer_email TEXT NOT NULL, -- Always store email for guest purchases
  amount NUMERIC NOT NULL, -- Amount in cents (e.g., 1000 = $10.00)
  currency TEXT NOT NULL,
  stripe_payment_intent_id TEXT, -- Stripe PaymentIntent ID
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'refunded', 'disputed')),
  refunded_amount NUMERIC DEFAULT 0, -- Refunded amount in cents
  refunded_at TIMESTAMPTZ,
  refunded_by UUID REFERENCES auth.users(id), -- Admin who processed refund
  refund_reason TEXT,
  metadata JSONB DEFAULT '{}' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =============================================================================
-- GUEST CHECKOUT SYSTEM
-- =============================================================================

-- Create guest_purchases table to track purchases by email before account creation
CREATE TABLE IF NOT EXISTS guest_purchases (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_email TEXT NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  transaction_amount NUMERIC NOT NULL, -- Amount in cents (e.g., 1000 = $10.00)
  session_id TEXT NOT NULL, -- Reference to Stripe session
  claimed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- When user creates account and claims
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (session_id) -- One purchase per session (session_id is unique per transaction)
);

-- =============================================================================
-- SECURITY SYSTEM
-- =============================================================================

-- Add rate limiting table (SECURITY)
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  identifier TEXT NOT NULL, -- IP address or user ID
  action_type TEXT NOT NULL, -- 'checkout_creation', 'guest_purchase', etc.
  request_count INTEGER DEFAULT 1 NOT NULL,
  window_start TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (identifier, action_type) -- Prevent duplicate entries
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Payment system indexes
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_product_id ON payment_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_customer_email ON payment_transactions(customer_email);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_session_id ON payment_transactions(session_id);

-- Add unique constraint on session_id to prevent duplicate transactions
ALTER TABLE payment_transactions ADD CONSTRAINT unique_session_id UNIQUE (session_id);

-- Admin system indexes
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_id ON admin_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at ON admin_actions(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_actions_target ON admin_actions(target_type, target_id);

-- Guest checkout indexes
CREATE INDEX IF NOT EXISTS idx_guest_purchases_customer_email ON guest_purchases(customer_email);
CREATE INDEX IF NOT EXISTS idx_guest_purchases_product_id ON guest_purchases(product_id);
CREATE INDEX IF NOT EXISTS idx_guest_purchases_claimed_by_user_id ON guest_purchases(claimed_by_user_id);
CREATE INDEX IF NOT EXISTS idx_guest_purchases_session_id ON guest_purchases(session_id);

-- Security indexes
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier_action ON rate_limits(identifier, action_type);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON rate_limits(window_start);

-- =============================================================================
-- ROW LEVEL SECURITY SETUP
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

-- Admin users policies
CREATE POLICY "Users can view own admin status" ON admin_users
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service role full access admin users" ON admin_users
    FOR ALL USING (auth.role() = 'service_role');

-- Admin actions policies (SECURITY)
CREATE POLICY "Admins can view admin actions" ON admin_actions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE admin_users.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can insert admin actions" ON admin_actions
    FOR INSERT WITH CHECK (
        admin_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE admin_users.user_id = auth.uid()
        )
    );

CREATE POLICY "Service role full access admin actions" ON admin_actions
    FOR ALL USING (auth.role() = 'service_role');

-- Payment transactions policies
CREATE POLICY "Users can view own payment transactions" ON payment_transactions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service role full access payment transactions" ON payment_transactions
    FOR ALL USING (auth.role() = 'service_role');

-- Admins can update payment transactions for refunds (SECURITY)
CREATE POLICY "Admins can update payment transactions for refunds" ON payment_transactions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE admin_users.user_id = auth.uid()
        )
    );

-- Guest purchases policies
CREATE POLICY "Users can view own claimed guest purchases" ON guest_purchases
    FOR SELECT USING (claimed_by_user_id = auth.uid());

CREATE POLICY "Service role full access guest purchases" ON guest_purchases
    FOR ALL USING (auth.role() = 'service_role');

-- Rate limiting policies (SECURITY)
CREATE POLICY "Users can read their own rate limits" ON rate_limits
  FOR SELECT USING (
    identifier = auth.uid()::text OR 
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access rate limits" ON rate_limits
  FOR ALL USING (auth.role() = 'service_role');

-- =============================================================================
-- DATABASE FUNCTIONS
-- =============================================================================
-- Rate limiting function (SECURITY)
CREATE OR REPLACE FUNCTION check_rate_limit(
  identifier_param TEXT,
  action_type_param TEXT,
  max_requests INTEGER DEFAULT 10,
  window_minutes INTEGER DEFAULT 60
) RETURNS BOOLEAN AS $$
DECLARE
  current_count INTEGER;
  window_start_time TIMESTAMPTZ;
BEGIN
  window_start_time := NOW() - INTERVAL '1 minute' * window_minutes;
  
  -- Clean up old records
  DELETE FROM rate_limits 
  WHERE window_start < window_start_time;
  
  -- Get current count for this identifier and action
  SELECT COALESCE(SUM(request_count), 0) INTO current_count
  FROM rate_limits
  WHERE identifier = identifier_param
    AND action_type = action_type_param
    AND window_start >= window_start_time;
  
  -- Check if limit exceeded
  IF current_count >= max_requests THEN
    RETURN FALSE;
  END IF;
  
  -- Increment counter
  INSERT INTO rate_limits (identifier, action_type, request_count)
  VALUES (identifier_param, action_type_param, 1)
  ON CONFLICT (identifier, action_type)
  DO UPDATE SET 
    request_count = rate_limits.request_count + 1,
    window_start = CASE 
      WHEN rate_limits.window_start < window_start_time THEN NOW()
      ELSE rate_limits.window_start
    END;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Create service role version of grant_product_access function
-- This version is used by triggers and service role operations
-- Enhanced logic: extends existing access or removes limits based on product configuration
-- Optimized: Single query with UPSERT and conditional logic
CREATE OR REPLACE FUNCTION grant_product_access_service_role(
    user_id_param UUID,
    product_id_param UUID
) RETURNS BOOLEAN AS $$
DECLARE
    product_auto_duration INTEGER;
    existing_expires_at TIMESTAMPTZ;
    access_record_exists BOOLEAN := FALSE;
    new_expires_at TIMESTAMPTZ := NULL;
    final_duration INTEGER := NULL;
BEGIN
    -- Single query to get product info and existing access in one go
    SELECT 
        p.auto_grant_duration_days,
        upa.access_expires_at,
        (upa.user_id IS NOT NULL) -- Check if access record exists
    INTO 
        product_auto_duration,
        existing_expires_at,
        access_record_exists
    FROM public.products p
    LEFT JOIN public.user_product_access upa ON (
        upa.user_id = user_id_param AND 
        upa.product_id = product_id_param
    )
    WHERE p.id = product_id_param AND p.is_active = true;

    -- If product doesn't exist, return false
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Calculate new expiration based on optimized business logic
    IF access_record_exists THEN
        -- User has access record
        IF existing_expires_at IS NULL THEN
            -- User has PERMANENT access - NEVER downgrade
            new_expires_at := NULL;
            final_duration := NULL;
        ELSIF existing_expires_at > NOW() THEN
            -- User has active LIMITED access
            IF product_auto_duration IS NOT NULL THEN
                -- Extend existing access
                new_expires_at := existing_expires_at + (product_auto_duration || ' days')::INTERVAL;
                final_duration := product_auto_duration;
            ELSE
                -- Upgrade to permanent
                new_expires_at := NULL;
                final_duration := NULL;
            END IF;
        ELSE
            -- User's access expired - standard logic
            IF product_auto_duration IS NOT NULL THEN
                new_expires_at := NOW() + (product_auto_duration || ' days')::INTERVAL;
                final_duration := product_auto_duration;
            ELSE
                new_expires_at := NULL;
                final_duration := NULL;
            END IF;
        END IF;
    ELSE
        -- No access record - create new with standard logic
        IF product_auto_duration IS NOT NULL THEN
            new_expires_at := NOW() + (product_auto_duration || ' days')::INTERVAL;
            final_duration := product_auto_duration;
        ELSE
            new_expires_at := NULL;
            final_duration := NULL;
        END IF;
    END IF;

    -- Single UPSERT operation with conditional update logic
    INSERT INTO public.user_product_access (
        user_id, 
        product_id, 
        access_duration_days, 
        access_expires_at,
        access_granted_at
    )
    VALUES (
        user_id_param, 
        product_id_param, 
        final_duration, 
        new_expires_at,
        NOW()
    )
    ON CONFLICT (user_id, product_id) DO UPDATE SET
        access_granted_at = NOW(),
        access_duration_days = EXCLUDED.access_duration_days,
        access_expires_at = CASE
            -- Never downgrade from permanent to limited
            WHEN user_product_access.access_expires_at IS NULL THEN NULL
            -- Otherwise use calculated value
            ELSE EXCLUDED.access_expires_at
        END;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to the service role
GRANT EXECUTE ON FUNCTION grant_product_access_service_role TO service_role;

-- Create optimized payment processing function
-- Reuses existing grant_product_access_service_role for consistency
CREATE OR REPLACE FUNCTION process_stripe_payment_completion(
    session_id_param TEXT,
    product_id_param UUID,
    customer_email_param TEXT,
    amount_total NUMERIC,
    currency_param TEXT,
    stripe_payment_intent_id TEXT DEFAULT NULL,
    user_id_param UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    current_user_id UUID;
    product_record RECORD;
    existing_user_id UUID;
    access_expires_at TIMESTAMPTZ := NULL;
    scenario TEXT;
    result JSONB;
    grant_success BOOLEAN;
BEGIN
    -- Use passed user_id parameter instead of auth.uid() for service role compatibility
    current_user_id := user_id_param;

    -- Validate required parameters
    IF session_id_param IS NULL OR product_id_param IS NULL OR customer_email_param IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Missing required parameters');
    END IF;

    -- Single query to get product details and check if transaction exists
    SELECT 
        p.id, p.name, p.slug, p.auto_grant_duration_days, p.price, p.currency as product_currency,
        EXISTS(SELECT 1 FROM public.payment_transactions pt WHERE pt.session_id = session_id_param) as transaction_exists
    INTO product_record
    FROM public.products p
    WHERE p.id = product_id_param AND p.is_active = true;

    -- Check if product exists
    IF product_record.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Product not found or inactive');
    END IF;

    -- Calculate access expiry once (for response)
    IF product_record.auto_grant_duration_days IS NOT NULL THEN
        access_expires_at := NOW() + (product_record.auto_grant_duration_days || ' days')::INTERVAL;
    END IF;

    -- Insert payment transaction if it doesn't exist (idempotent)
    IF NOT product_record.transaction_exists THEN
        INSERT INTO public.payment_transactions (
            session_id, user_id, product_id, customer_email, amount, currency, 
            stripe_payment_intent_id, status, metadata
        ) VALUES (
            session_id_param, current_user_id, product_id_param, customer_email_param, amount_total, currency_param,
            stripe_payment_intent_id, 'completed',
            jsonb_build_object(
                'stripe_session_id', session_id_param,
                'product_slug', product_record.slug,
                'amount_display', (amount_total / 100.0)::text || ' ' || upper(currency_param)
            )
        );
    END IF;

    -- SCENARIO 1: User is logged in
    IF current_user_id IS NOT NULL THEN
        scenario := 'logged_in_user';
        
        -- Use existing service role function to grant access
        SELECT grant_product_access_service_role(current_user_id, product_id_param) INTO grant_success;
        
        IF NOT grant_success THEN
            RETURN jsonb_build_object('success', false, 'error', 'Failed to grant access to logged-in user');
        END IF;

        RETURN jsonb_build_object(
            'success', true,
            'access_granted', true,
            'already_had_access', false, -- Service role function handles this internally
            'scenario', scenario,
            'access_expires_at', access_expires_at,
            'requires_login', false,
            'send_magic_link', false,
            'customer_email', customer_email_param
        );
    END IF;

    -- SCENARIO 2 & 3: No current user - single query to check if email exists
    SELECT id INTO existing_user_id FROM auth.users WHERE email = customer_email_param;

    IF existing_user_id IS NOT NULL THEN
        -- SCENARIO 2: Email exists - grant access to that user using service role function
        scenario := 'existing_user_email';
        
        SELECT grant_product_access_service_role(existing_user_id, product_id_param) INTO grant_success;
        
        IF NOT grant_success THEN
            RETURN jsonb_build_object('success', false, 'error', 'Failed to grant access to existing user');
        END IF;

        result := jsonb_build_object(
            'success', true,
            'access_granted', true,
            'already_had_access', false,
            'scenario', scenario,
            'access_expires_at', access_expires_at,
            'requires_login', true,
            'send_magic_link', true,
            'customer_email', customer_email_param
        );
    ELSE
        -- SCENARIO 3: Email not in database - save as guest purchase
        scenario := 'guest_purchase';
        
        INSERT INTO public.guest_purchases (customer_email, product_id, session_id, transaction_amount)
        VALUES (customer_email_param, product_id_param, session_id_param, amount_total)
        ON CONFLICT (session_id) DO NOTHING;

        result := jsonb_build_object(
            'success', true,
            'access_granted', false,
            'already_had_access', false,
            'scenario', scenario,
            'access_expires_at', access_expires_at,
            'requires_login', true,
            'send_magic_link', true,
            'is_guest_purchase', true,
            'customer_email', customer_email_param
        );
    END IF;

    RETURN result;

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Database error during payment processing: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to the service role
GRANT EXECUTE ON FUNCTION process_stripe_payment_completion TO service_role;

-- Function to claim guest purchases when user logs in
CREATE OR REPLACE FUNCTION claim_guest_purchases_for_user(
  p_user_id UUID
) RETURNS json AS $$
DECLARE
  user_email_var TEXT;
  claimed_count INTEGER := 0;
  guest_purchase_record RECORD;
BEGIN
  -- Get user's email
  SELECT email INTO user_email_var 
  FROM auth.users 
  WHERE id = p_user_id;
  
  IF user_email_var IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;
  
  -- Find and claim all unclaimed guest purchases for this email
  FOR guest_purchase_record IN
    SELECT *
    FROM public.guest_purchases
    WHERE customer_email = user_email_var
      AND claimed_by_user_id IS NULL
  LOOP
    -- Update guest purchase to mark as claimed
    UPDATE public.guest_purchases
    SET claimed_by_user_id = p_user_id,
        claimed_at = NOW()
    WHERE id = guest_purchase_record.id;
    
    -- Grant access to the product using service role function
    PERFORM public.grant_product_access_service_role(p_user_id, guest_purchase_record.product_id);
    
    claimed_count := claimed_count + 1;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'claimed_count', claimed_count,
    'message', 'Claimed ' || claimed_count || ' guest purchases'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public, auth';

-- Note: User registration trigger is handled in the initial schema migration
-- to avoid conflicts with the first_user_admin_trigger

-- Get user's payment history
CREATE OR REPLACE FUNCTION get_user_payment_history(
    user_id_param UUID
) RETURNS TABLE (
    transaction_id UUID,
    product_name TEXT,
    product_slug TEXT,
    amount NUMERIC,
    currency TEXT,
    payment_date TIMESTAMPTZ,
    status TEXT,
    refunded_amount NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pt.id,
        p.name,
        p.slug,
        pt.amount / 100.0, -- Convert cents to dollars for display
        pt.currency,
        pt.created_at,
        pt.status,
        pt.refunded_amount / 100.0 -- Convert cents to dollars for display
    FROM payment_transactions pt
    JOIN products p ON pt.product_id = p.id
    WHERE pt.user_id = user_id_param
    ORDER BY pt.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- TRIGGERS FOR AUTOMATION (SECURITY)
-- =============================================================================

-- Function to automatically set refunded_at when status changes to refunded
CREATE OR REPLACE FUNCTION update_refunded_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'refunded' AND OLD.status != 'refunded' THEN
        NEW.refunded_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for refunded_at automation
CREATE TRIGGER trigger_update_refunded_at
    BEFORE UPDATE ON payment_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_refunded_at();

COMMIT;


