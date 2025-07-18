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

-- Create payment_sessions table for tracking checkout sessions
CREATE TABLE IF NOT EXISTS payment_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL, -- Stripe checkout session ID
  provider_type TEXT NOT NULL DEFAULT 'stripe', -- Future: support other providers
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Nullable for guest checkouts
  customer_email TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  metadata JSONB DEFAULT '{}' NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create webhook_events table for idempotency and audit trail
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id TEXT UNIQUE NOT NULL, -- Stripe event ID
  provider_type TEXT NOT NULL DEFAULT 'stripe',
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create payment_transactions table for completed payments
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id TEXT REFERENCES payment_sessions(session_id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Nullable for guest purchases
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  customer_email TEXT NOT NULL, -- Always store email for guest purchases
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL,
  stripe_payment_intent_id TEXT, -- Stripe PaymentIntent ID
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'refunded', 'disputed')),
  refunded_amount NUMERIC DEFAULT 0,
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
  transaction_amount NUMERIC NOT NULL,
  session_id TEXT NOT NULL, -- Reference to Stripe session
  claimed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- When user creates account and claims
  access_expires_at TIMESTAMPTZ, -- Copy from product settings
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (customer_email, product_id) -- One purchase per email per product
);

-- Add email verification token system for guest purchases (SECURITY)
CREATE TABLE IF NOT EXISTS guest_purchase_verifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  guest_purchase_id UUID REFERENCES guest_purchases(id) ON DELETE CASCADE NOT NULL,
  verification_token TEXT UNIQUE NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE NOT NULL,
  verification_expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
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
-- PRODUCT ENHANCEMENTS
-- =============================================================================

-- Add stripe_price_id to products table if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'stripe_price_id') THEN
        ALTER TABLE products ADD COLUMN stripe_price_id TEXT;
    END IF;
END $$;

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Payment system indexes
CREATE INDEX IF NOT EXISTS idx_payment_sessions_session_id ON payment_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_payment_sessions_user_id ON payment_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_sessions_product_id ON payment_sessions(product_id);
CREATE INDEX IF NOT EXISTS idx_payment_sessions_status ON payment_sessions(status);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_product_id ON payment_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_customer_email ON payment_transactions(customer_email);

-- Admin system indexes
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_id ON admin_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at ON admin_actions(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_actions_target ON admin_actions(target_type, target_id);

-- Guest checkout indexes
CREATE INDEX IF NOT EXISTS idx_guest_purchases_customer_email ON guest_purchases(customer_email);
CREATE INDEX IF NOT EXISTS idx_guest_purchases_product_id ON guest_purchases(product_id);
CREATE INDEX IF NOT EXISTS idx_guest_purchases_claimed_by_user_id ON guest_purchases(claimed_by_user_id);

-- Security indexes
CREATE INDEX IF NOT EXISTS idx_guest_purchase_verifications_token ON guest_purchase_verifications(verification_token);
CREATE INDEX IF NOT EXISTS idx_guest_purchase_verifications_expires ON guest_purchase_verifications(verification_expires_at);
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier_action ON rate_limits(identifier, action_type);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON rate_limits(window_start);

-- =============================================================================
-- ROW LEVEL SECURITY SETUP
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_purchase_verifications ENABLE ROW LEVEL SECURITY;
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

-- Payment sessions policies
CREATE POLICY "Users can view own payment sessions" ON payment_sessions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service role full access payment sessions" ON payment_sessions
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

-- Webhook events policies
CREATE POLICY "Service role full access webhook events" ON webhook_events
    FOR ALL USING (auth.role() = 'service_role');

-- Guest purchases policies
CREATE POLICY "Users can view own claimed guest purchases" ON guest_purchases
    FOR SELECT USING (claimed_by_user_id = auth.uid());

CREATE POLICY "Service role full access guest purchases" ON guest_purchases
    FOR ALL USING (auth.role() = 'service_role');

-- Guest purchase verifications policies (SECURITY)
CREATE POLICY "Users can read their own verification tokens" ON guest_purchase_verifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM guest_purchases 
      WHERE guest_purchases.id = guest_purchase_verifications.guest_purchase_id 
      AND guest_purchases.customer_email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "Admins can read all verification tokens" ON guest_purchase_verifications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.user_id = auth.uid()
    )
  );

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

-- Check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id_param UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
    target_user_id UUID;
BEGIN
    -- Use provided user_id or current authenticated user
    target_user_id := COALESCE(user_id_param, auth.uid());
    
    -- Check if user exists in admin_users table
    RETURN EXISTS (
        SELECT 1 FROM admin_users 
        WHERE user_id = target_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Complete payment transaction function
CREATE OR REPLACE FUNCTION complete_payment_transaction(
    session_id_param TEXT,
    customer_email_param TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    payment_session RECORD;
    product_record RECORD;
    user_record RECORD;
    final_user_id UUID;
    access_expires_at TIMESTAMPTZ;
BEGIN
    -- Get payment session with validation
    SELECT * INTO payment_session
    FROM payment_sessions
    WHERE session_id = session_id_param
      AND status = 'pending'
      AND expires_at > NOW();
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid or expired payment session';
    END IF;
    
    -- Get product details
    SELECT * INTO product_record
    FROM products
    WHERE id = payment_session.product_id
      AND is_active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product not found or inactive';
    END IF;
    
    -- Determine the user ID - use existing user_id from session or find by email
    IF payment_session.user_id IS NOT NULL THEN
        final_user_id := payment_session.user_id;
    ELSE
        -- Try to find existing user by email
        SELECT * INTO user_record
        FROM auth.users
        WHERE email = customer_email_param;
        
        IF FOUND THEN
            final_user_id := user_record.id;
        ELSE
            -- For guest checkout, we'll store the transaction without user_id
            final_user_id := NULL;
        END IF;
    END IF;
    
    -- Calculate access expiration
    IF product_record.auto_grant_duration_days IS NOT NULL THEN
        access_expires_at := NOW() + (product_record.auto_grant_duration_days || ' days')::INTERVAL;
    ELSE
        access_expires_at := NULL; -- Permanent access
    END IF;
    
    -- Update payment session status
    UPDATE payment_sessions
    SET status = 'completed',
        user_id = final_user_id,
        completed_at = NOW(),
        updated_at = NOW()
    WHERE session_id = session_id_param;
    
    -- Create payment transaction record
    INSERT INTO payment_transactions (
        session_id,
        user_id,
        product_id,
        customer_email,
        amount,
        currency,
        metadata
    ) VALUES (
        session_id_param,
        final_user_id,
        payment_session.product_id,
        customer_email_param,
        payment_session.amount,
        payment_session.currency,
        payment_session.metadata
    );
    
    -- If user exists, grant direct access
    IF final_user_id IS NOT NULL THEN
        -- Grant product access
        INSERT INTO user_product_access (
            user_id,
            product_id,
            granted_at,
            access_expires_at
        ) VALUES (
            final_user_id,
            payment_session.product_id,
            NOW(),
            access_expires_at
        )
        ON CONFLICT (user_id, product_id)
        DO UPDATE SET
            granted_at = NOW(),
            access_expires_at = CASE 
                WHEN EXCLUDED.access_expires_at IS NULL THEN NULL
                WHEN user_product_access.access_expires_at IS NULL THEN EXCLUDED.access_expires_at
                ELSE GREATEST(user_product_access.access_expires_at, EXCLUDED.access_expires_at)
            END;
    ELSE
        -- Store as guest purchase for later claiming
        INSERT INTO guest_purchases (
            customer_email,
            product_id,
            transaction_amount,
            session_id,
            access_expires_at
        ) VALUES (
            customer_email_param,
            payment_session.product_id,
            payment_session.amount,
            session_id_param,
            access_expires_at
        )
        ON CONFLICT (customer_email, product_id)
        DO UPDATE SET
            transaction_amount = EXCLUDED.transaction_amount,
            session_id = EXCLUDED.session_id,
            access_expires_at = CASE 
                WHEN EXCLUDED.access_expires_at IS NULL THEN NULL
                WHEN guest_purchases.access_expires_at IS NULL THEN EXCLUDED.access_expires_at
                ELSE GREATEST(guest_purchases.access_expires_at, EXCLUDED.access_expires_at)
            END;
    END IF;
    
    RETURN TRUE;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Transaction failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

-- Enhanced claim function with email verification requirement (SECURITY)
CREATE OR REPLACE FUNCTION claim_guest_purchases_verified(
  user_email TEXT,
  user_id_param UUID,
  verification_token_param TEXT DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
  claimed_count INTEGER := 0;
  guest_purchase_record RECORD;
BEGIN
  -- Enhanced security: only claim verified guest purchases
  FOR guest_purchase_record IN
    SELECT gp.*, gpv.email_verified
    FROM guest_purchases gp
    LEFT JOIN guest_purchase_verifications gpv ON gp.id = gpv.guest_purchase_id
    WHERE gp.customer_email = user_email
      AND gp.claimed_by_user_id IS NULL
      AND (gpv.email_verified = TRUE OR verification_token_param IS NOT NULL)
  LOOP
    -- If verification token provided, verify it
    IF verification_token_param IS NOT NULL THEN
      UPDATE guest_purchase_verifications 
      SET email_verified = TRUE, verified_at = NOW()
      WHERE guest_purchase_id = guest_purchase_record.id 
        AND guest_purchase_verifications.verification_token = verification_token_param
        AND verification_expires_at > NOW();
    END IF;

    -- Only proceed if email is verified
    IF guest_purchase_record.email_verified OR verification_token_param IS NOT NULL THEN
      -- Update guest purchase
      UPDATE guest_purchases 
      SET claimed_by_user_id = user_id_param, claimed_at = NOW()
      WHERE id = guest_purchase_record.id;

      -- Grant product access
      INSERT INTO user_product_access (user_id, product_id, granted_at)
      VALUES (user_id_param, guest_purchase_record.product_id, NOW())
      ON CONFLICT (user_id, product_id) DO NOTHING;

      claimed_count := claimed_count + 1;
    END IF;
  END LOOP;

  RETURN claimed_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced guest purchase creation with verification (SECURITY)
CREATE OR REPLACE FUNCTION create_guest_purchase_with_verification(
  product_id_param UUID,
  customer_email_param TEXT,
  transaction_amount_param NUMERIC,
  session_id_param TEXT
) RETURNS TABLE (
  guest_purchase_id UUID,
  verification_token TEXT
) AS $$
DECLARE
  new_guest_purchase_id UUID;
  new_verification_token TEXT;
BEGIN
  -- Generate verification token
  new_verification_token := encode(gen_random_bytes(32), 'base64');
  
  -- Create guest purchase
  INSERT INTO guest_purchases (
    product_id, 
    customer_email, 
    transaction_amount, 
    session_id
  )
  VALUES (
    product_id_param, 
    customer_email_param, 
    transaction_amount_param, 
    session_id_param
  )
  RETURNING id INTO new_guest_purchase_id;
  
  -- Create verification record
  INSERT INTO guest_purchase_verifications (
    guest_purchase_id,
    verification_token,
    verification_expires_at
  )
  VALUES (
    new_guest_purchase_id,
    new_verification_token,
    NOW() + INTERVAL '7 days'
  );
  
  RETURN QUERY SELECT new_guest_purchase_id, new_verification_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
        pt.amount,
        pt.currency,
        pt.created_at,
        pt.status,
        pt.refunded_amount
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
