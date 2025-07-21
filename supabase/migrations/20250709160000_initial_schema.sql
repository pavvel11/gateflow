-- Create initial database structure for GateFlow Admin Panel
-- Migration: 20250709160000_initial_schema
-- Updated: Consolidated all admin functionality into single migration
-- Based on existing gateflow_setup.sql and user_product_access_setup.sql

BEGIN;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create products table 
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- Required for gatekeeper system
  description TEXT,
  icon TEXT, -- Used by gatekeeper for UI
  price NUMERIC DEFAULT 0 NOT NULL,
  currency TEXT DEFAULT 'USD' NOT NULL, -- Currency for price (USD, EUR, GBP, etc.)
  theme TEXT DEFAULT 'dark' NOT NULL, -- Used by gatekeeper for theming
  layout_template TEXT DEFAULT 'default' NOT NULL, -- Used by gatekeeper layouts

  is_active BOOLEAN NOT NULL DEFAULT true, -- Admin panel functionality
  is_featured BOOLEAN NOT NULL DEFAULT false, -- Featured product checkbox
  -- Temporal availability fields
  available_from TIMESTAMPTZ, -- Product becomes available from this date/time
  available_until TIMESTAMPTZ, -- Product is available until this date/time
  -- Auto-grant access duration for users
  auto_grant_duration_days INTEGER, -- Default access duration when users gain access automatically
  -- Content delivery fields (clean implementation)
  content_delivery_type TEXT DEFAULT 'content' NOT NULL CHECK (content_delivery_type IN ('redirect', 'content')),
  content_config JSONB DEFAULT '{}' NOT NULL, -- Flexible content configuration
  tenant_id TEXT, -- Support for multi-tenancy
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create user_product_access table with product_id reference for better data integrity
CREATE TABLE IF NOT EXISTS user_product_access (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL, -- Improved data integrity
  -- Temporal access fields
  access_granted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  access_expires_at TIMESTAMPTZ, -- NULL means permanent access
  access_duration_days INTEGER, -- For tracking access duration in days
  tenant_id TEXT, -- Support for multi-tenancy
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (user_id, product_id) -- Ensure a user can only have one access entry per product
);

-- Create a view for user access statistics
CREATE OR REPLACE VIEW user_access_stats AS
SELECT 
    u.id as user_id,
    u.email,
    u.created_at as user_created_at,
    u.email_confirmed_at,
    u.last_sign_in_at,
    u.raw_user_meta_data,
    COUNT(upa.id) as total_products,
    COALESCE(SUM(p.price), 0) as total_value,
    MAX(upa.created_at) as last_access_granted_at,
    MIN(upa.created_at) as first_access_granted_at
FROM auth.users u
LEFT JOIN user_product_access upa ON u.id = upa.user_id
LEFT JOIN products p ON upa.product_id = p.id
GROUP BY u.id, u.email, u.created_at, u.email_confirmed_at, u.last_sign_in_at, u.raw_user_meta_data;

-- Create a more detailed user product access view for admin panels
CREATE OR REPLACE VIEW user_product_access_detailed AS
SELECT 
    upa.id,
    upa.user_id,
    upa.product_id,
    p.slug as product_slug,
    p.name as product_name,
    p.description as product_description,
    p.price as product_price,
    p.currency as product_currency,
    p.icon as product_icon,
    p.theme as product_theme,
    p.is_active as product_is_active,
    upa.access_granted_at,
    upa.access_expires_at,
    upa.access_duration_days,
    upa.created_at as access_created_at,
    p.created_at as product_created_at,
    p.updated_at as product_updated_at,
    upa.tenant_id
FROM user_product_access upa
JOIN products p ON upa.product_id = p.id;

-- Create secure function to check user access for a single product
-- Uses auth.uid() to get the current authenticated user (SECURITY FIX)
CREATE OR REPLACE FUNCTION check_user_product_access(
    product_slug_param TEXT
) RETURNS BOOLEAN AS $$
BEGIN
    -- Input validation
    IF product_slug_param IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Get current authenticated user ID
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;
    
    RETURN EXISTS (
        SELECT 1 
        FROM user_product_access upa
        JOIN products p ON upa.product_id = p.id
        WHERE upa.user_id = auth.uid()  -- Use authenticated user ID
          AND p.slug = product_slug_param
          AND p.is_active = true
          -- Check temporal availability for products
          AND (p.available_from IS NULL OR p.available_from <= NOW())
          AND (p.available_until IS NULL OR p.available_until >= NOW())
          -- Check temporal access for user
          AND (upa.access_expires_at IS NULL OR upa.access_expires_at >= NOW())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create secure function to batch check user access for multiple products
-- Uses auth.uid() to get the current authenticated user (SECURITY FIX)
CREATE OR REPLACE FUNCTION batch_check_user_product_access(
    product_slugs_param TEXT[]
) RETURNS JSONB AS $$
DECLARE
    result JSONB := '{}';
    slug TEXT;
    has_access BOOLEAN;
    current_user_id UUID;
BEGIN
    -- Input validation
    IF product_slugs_param IS NULL THEN
        RETURN result;
    END IF;
    
    -- Get current authenticated user ID
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RETURN result;
    END IF;
    
    -- Check access for each product slug
    FOREACH slug IN ARRAY product_slugs_param
    LOOP
        SELECT check_user_product_access(slug) INTO has_access;
        result := result || jsonb_build_object(slug, has_access);
    END LOOP;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create secure function to grant product access
-- Uses auth.uid() to get the current authenticated user (SECURITY FIX)
CREATE OR REPLACE FUNCTION grant_free_product_access(
    product_slug_param TEXT,
    access_duration_days_param INTEGER DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    product_record RECORD;
    current_user_id UUID;
    access_expires_at TIMESTAMPTZ;
BEGIN
    -- Input validation
    IF product_slug_param IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Get current authenticated user ID
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Get product by slug
    SELECT id, auto_grant_duration_days INTO product_record
    FROM products 
    WHERE slug = product_slug_param AND is_active = true AND price = 0; -- Only allow free products
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Calculate access expiration
    IF access_duration_days_param IS NOT NULL THEN
        access_expires_at := NOW() + INTERVAL '1 day' * access_duration_days_param;
    ELSIF product_record.auto_grant_duration_days IS NOT NULL THEN
        access_expires_at := NOW() + INTERVAL '1 day' * product_record.auto_grant_duration_days;
    ELSE
        access_expires_at := NULL; -- Permanent access
    END IF;
    
    -- Insert or update user access
    INSERT INTO user_product_access (user_id, product_id, access_expires_at, access_duration_days)
    VALUES (current_user_id, product_record.id, access_expires_at, COALESCE(access_duration_days_param, product_record.auto_grant_duration_days))
    ON CONFLICT (user_id, product_id) 
    DO UPDATE SET 
        access_expires_at = EXCLUDED.access_expires_at,
        access_duration_days = EXCLUDED.access_duration_days,
        access_granted_at = NOW();
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get complete user profile with statistics
CREATE OR REPLACE FUNCTION get_user_profile(user_id_param UUID)
RETURNS JSONB AS $$
DECLARE
    user_info JSONB;
    user_stats JSONB;
    user_access JSONB;
BEGIN
    -- Get user info from auth.users
    SELECT jsonb_build_object(
        'id', id,
        'email', email,
        'created_at', created_at,
        'email_confirmed_at', email_confirmed_at,
        'last_sign_in_at', last_sign_in_at,
        'user_metadata', raw_user_meta_data
    ) INTO user_info
    FROM auth.users
    WHERE id = user_id_param;
    
    -- Get user statistics
    SELECT jsonb_build_object(
        'total_products', total_products,
        'total_value', total_value,
        'last_access_granted_at', last_access_granted_at,
        'first_access_granted_at', first_access_granted_at
    ) INTO user_stats
    FROM user_access_stats
    WHERE user_id = user_id_param;
    
    -- Get user access details
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', id,
            'product_id', product_id,
            'product_name', product_name,
            'product_slug', product_slug,
            'product_price', product_price,
            'product_currency', product_currency,
            'product_icon', product_icon,
            'product_is_active', product_is_active,
            'granted_at', access_created_at
        )
    ) INTO user_access
    FROM user_product_access_detailed
    WHERE user_id = user_id_param;
    
    -- Return the combined user profile
    RETURN jsonb_build_object(
        'user', user_info,
        'stats', user_stats,
        'access', COALESCE(user_access, '[]'::jsonb)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create admin_users table to track who is an admin
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create audit table for security monitoring
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  old_values JSONB,
  new_values JSONB,
  user_id UUID REFERENCES auth.users(id),
  performed_by UUID REFERENCES auth.users(id),
  performed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  ip_address INET,
  user_agent TEXT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_is_featured ON products(is_featured);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);
CREATE INDEX IF NOT EXISTS idx_user_product_access_user_id ON user_product_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_product_access_product_id ON user_product_access(product_id);
CREATE INDEX IF NOT EXISTS idx_user_product_access_unique ON user_product_access(user_id, product_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);

CREATE INDEX IF NOT EXISTS idx_products_tenant_id ON products(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_product_access_tenant_id ON user_product_access(tenant_id) WHERE tenant_id IS NOT NULL;

-- Optimization indexes for user access
CREATE INDEX IF NOT EXISTS idx_user_product_access_expires_at ON user_product_access(access_expires_at) WHERE access_expires_at IS NOT NULL;



-- Enable Row Level Security
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_product_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for products table
-- Allow public read access for all products (needed by gatekeeper.js)
CREATE POLICY "Allow public read access for everyone" ON products
  FOR SELECT
  USING (true);

-- Allow admin users to manage products
CREATE POLICY "Allow admin users to manage products" ON products
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for user_product_access table
-- Allow users to read their own access records
CREATE POLICY "Allow users to read their own product access" ON user_product_access
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow service role to insert access records (used by Edge Functions and admin panel)
CREATE POLICY "Allow service role to insert product access" ON user_product_access
  FOR INSERT
  WITH CHECK (true);

-- Allow authenticated users to insert access for FREE products (gatekeeper auto-grant)
CREATE POLICY "Allow authenticated users to insert access for free products" ON user_product_access
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM products WHERE id = product_id AND price = 0)
  );

-- Allow authenticated users full access to user_product_access (admin panel)
CREATE POLICY "Allow admin users to manage access" ON user_product_access
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for admin_users table
-- Allow users to check only their own admin status
CREATE POLICY "Allow users to read their own admin status" ON admin_users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);


-- Check if user is admin (optimized)
CREATE OR REPLACE FUNCTION is_admin(user_id_param UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
    current_user_id UUID;
    target_user_id UUID;
BEGIN
    -- Get current authenticated user (cache result)
    current_user_id := auth.uid();
    
    -- Early return if no authenticated user
    IF current_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Use provided user_id or current authenticated user
    target_user_id := COALESCE(user_id_param, current_user_id);
    
    -- Security: Only allow users to check their own admin status
    -- Early return if trying to check another user's status
    IF user_id_param IS NOT NULL AND user_id_param != current_user_id THEN
        RETURN FALSE;
    END IF;
    
    -- Direct EXISTS check with index usage
    RETURN EXISTS (
        SELECT 1 FROM admin_users 
        WHERE user_id = target_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Create cached version for better performance when called repeatedly
CREATE OR REPLACE FUNCTION is_admin_cached()
RETURNS BOOLEAN AS $$
BEGIN
    -- Use connection-level cache for admin status
    -- This avoids repeated DB lookups in the same connection
    RETURN COALESCE(
        current_setting('app.user_is_admin', true)::boolean,
        (
            SELECT CASE 
                WHEN EXISTS(SELECT 1 FROM admin_users WHERE user_id = auth.uid())
                THEN true 
                ELSE false 
            END
        )
    );
EXCEPTION 
    WHEN OTHERS THEN
        -- Set cache and return result
        PERFORM set_config('app.user_is_admin', 
            CASE 
                WHEN EXISTS(SELECT 1 FROM admin_users WHERE user_id = auth.uid())
                THEN 'true' 
                ELSE 'false' 
            END, 
            true
        );
        RETURN current_setting('app.user_is_admin')::boolean;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Create function to clear admin cache (useful for logout)
CREATE OR REPLACE FUNCTION clear_admin_cache()
RETURNS VOID AS $$
BEGIN
    -- Clear the connection-level cache
    PERFORM set_config('app.user_is_admin', NULL, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;


-- Create function to handle all new user registration logic
CREATE OR REPLACE FUNCTION handle_new_user_registration()
RETURNS TRIGGER
SET search_path = 'public, auth'
AS $$
DECLARE
  claim_result JSON;
  admin_count INTEGER;
BEGIN
  -- Use advisory lock to prevent race condition
  -- Use consistent hash of function name to avoid conflicts
  PERFORM pg_advisory_lock(hashtext('handle_new_user_registration'));
  
  BEGIN
    -- 1. First User Admin: Check if there are no existing admin users and make first user admin
    SELECT COUNT(*) INTO admin_count FROM public.admin_users;
    
    IF admin_count = 0 THEN
      -- Make this user an admin (bypass RLS with SECURITY DEFINER)
      INSERT INTO public.admin_users (user_id) VALUES (NEW.id);
    ELSE
    END IF;
    
    -- 2. Guest Purchase Claims: Claim guest purchases for this user (if function exists)
    -- This will be available after the payment system migration
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'claim_guest_purchases_for_user') THEN
      SELECT public.claim_guest_purchases_for_user(NEW.id) INTO claim_result;
      
      -- Log the guest purchase claim result
      IF claim_result->>'success' = 'true' AND (claim_result->>'claimed_count')::INTEGER > 0 THEN
        INSERT INTO public.audit_log (
          table_name, 
          operation, 
          new_values, 
          user_id,
          performed_at
        ) VALUES (
          'guest_purchases',
          'UPDATE',
          jsonb_build_object(
            'user_id', NEW.id,
            'email', NEW.email, 
            'claimed_count', claim_result->>'claimed_count',
            'message', claim_result->>'message'
          ),
          NEW.id,
          NOW()
        );
      END IF;
    END IF;
    
    -- 3. Audit Logging: Log registration event for security monitoring
    INSERT INTO public.audit_log (
      table_name, 
      operation, 
      new_values, 
      user_id,
      performed_at
    ) VALUES (
      'auth.users',
      'INSERT',
      jsonb_build_object('email', NEW.email, 'id', NEW.id),
      NEW.id,
      NOW()
    );

  EXCEPTION
    WHEN OTHERS THEN
      -- Release lock on error
      PERFORM pg_advisory_unlock(hashtext('handle_new_user_registration'));
      RAISE;
  END;
  
  -- Release advisory lock
  PERFORM pg_advisory_unlock(hashtext('handle_new_user_registration'));
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for comprehensive user registration handling
CREATE TRIGGER user_registration_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_registration();

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ language plpgsql;

-- Create simple audit function for critical tables
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (table_name, operation, old_values, user_id)
    VALUES (TG_TABLE_NAME, TG_OP, row_to_json(OLD), auth.uid());
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log (table_name, operation, old_values, new_values, user_id)
    VALUES (TG_TABLE_NAME, TG_OP, row_to_json(OLD), row_to_json(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (table_name, operation, new_values, user_id)
    VALUES (TG_TABLE_NAME, TG_OP, row_to_json(NEW), auth.uid());
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for products table
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create audit triggers for critical tables
CREATE TRIGGER audit_admin_users
  AFTER INSERT OR UPDATE OR DELETE ON admin_users
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_user_product_access
  AFTER INSERT OR UPDATE OR DELETE ON user_product_access
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_function();

COMMIT;

