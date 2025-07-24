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
  name TEXT NOT NULL CHECK (length(name) <= 255), -- Product name limited to 255 characters
  slug TEXT UNIQUE NOT NULL CHECK (slug ~ '^[a-zA-Z0-9_-]+$' AND length(slug) BETWEEN 1 AND 100), -- URL-safe slug: alphanumeric, hyphens, underscores only
  description TEXT CHECK (length(description) <= 2000), -- Product description limited to 2000 characters
  icon TEXT CHECK (length(icon) <= 500), -- Icon URL/path limited to 500 characters
  price NUMERIC DEFAULT 0 NOT NULL CHECK (price >= 0), -- Price must be non-negative
  currency TEXT DEFAULT 'USD' NOT NULL CHECK (
    length(currency) = 3 AND 
    upper(currency) ~ '^[A-Z]{3}$' AND
    upper(currency) IN ('USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'RON', 'BGN', 'HRK', 'RUB', 'TRY', 'BRL', 'MXN', 'INR', 'KRW', 'SGD', 'HKD', 'NZD', 'ZAR', 'ILS', 'THB', 'MYR', 'PHP', 'IDR', 'VND')
  ), -- Enhanced ISO 4217 currency codes validation
  layout_template TEXT DEFAULT 'default' NOT NULL CHECK (length(layout_template) <= 100), -- Layout template name

  is_active BOOLEAN NOT NULL DEFAULT true, -- Product availability toggle
  is_featured BOOLEAN NOT NULL DEFAULT false, -- Featured product flag
  -- Temporal availability fields
  available_from TIMESTAMPTZ, -- Product becomes available from this date/time
  available_until TIMESTAMPTZ, -- Product is available until this date/time
  -- Auto-grant access duration for users
  auto_grant_duration_days INTEGER CHECK (auto_grant_duration_days > 0 AND auto_grant_duration_days <= 3650), -- Access duration: 1 day to 10 years
  -- Content delivery fields (clean implementation)
  content_delivery_type TEXT DEFAULT 'content' NOT NULL CHECK (content_delivery_type IN ('redirect', 'content')),
  content_config JSONB DEFAULT '{}' NOT NULL, -- Flexible content configuration
  tenant_id TEXT CHECK (tenant_id IS NULL OR (tenant_id ~ '^[a-zA-Z0-9_-]+$' AND length(tenant_id) BETWEEN 1 AND 50)), -- Multi-tenant ID: alphanumeric, hyphens, underscores
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Ensure temporal availability makes sense
  CONSTRAINT check_availability_dates CHECK (available_from IS NULL OR available_until IS NULL OR available_from < available_until) -- Available from must be before available until
);

COMMENT ON TABLE products IS 'Products catalog with gatekeeper integration support';
COMMENT ON COLUMN products.slug IS 'URL-safe unique identifier for gatekeeper system';
COMMENT ON COLUMN products.content_config IS 'JSON configuration for content delivery and gatekeeper integration';
COMMENT ON COLUMN products.tenant_id IS 'Multi-tenant support - allows product isolation by tenant';

-- Create user_product_access table with product_id reference for better data integrity
CREATE TABLE IF NOT EXISTS user_product_access (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL, -- Improved data integrity
  -- Temporal access fields
  access_granted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  access_expires_at TIMESTAMPTZ, -- NULL means permanent access
  access_duration_days INTEGER CHECK (access_duration_days IS NULL OR (access_duration_days > 0 AND access_duration_days <= 3650)), -- For tracking access duration in days
  tenant_id TEXT CHECK (tenant_id IS NULL OR (tenant_id ~ '^[a-zA-Z0-9_-]+$' AND length(tenant_id) BETWEEN 1 AND 50)), -- Support for multi-tenancy
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  UNIQUE (user_id, product_id), -- Ensure a user can only have one access entry per product
  
  -- Ensure temporal access makes sense
  CONSTRAINT check_access_expiration CHECK (access_expires_at IS NULL OR access_expires_at > access_granted_at)
);

-- Create a view for user access statistics
CREATE OR REPLACE VIEW user_access_stats
WITH (security_invoker=on) AS
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
CREATE OR REPLACE VIEW user_product_access_detailed
WITH (security_invoker=on) AS
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

-- Create rate limiting function to prevent abuse
-- CRITICAL SECURITY: Multi-layer protection against spoofing and bypass attempts
CREATE OR REPLACE FUNCTION check_rate_limit(
    function_name_param TEXT,
    max_calls INTEGER DEFAULT 100,
    time_window_seconds INTEGER DEFAULT 3600
) RETURNS BOOLEAN AS $$
DECLARE
    current_user_id UUID;
    window_start_param TIMESTAMPTZ;
    current_count INTEGER;
    client_ip TEXT;
    rate_limit_key TEXT;
    backup_rate_limit_key TEXT;
    backup_count INTEGER;
BEGIN
    -- Input validation
    IF function_name_param IS NULL OR length(function_name_param) = 0 OR length(function_name_param) > 100 THEN
        RETURN FALSE;
    END IF;
    
    -- Get current user ID
    current_user_id := auth.uid();
    
    -- Calculate window start (round down to nearest window) - moved here to avoid conflicts
    window_start_param := date_trunc('hour', NOW()) + 
                   INTERVAL '1 second' * (FLOOR(EXTRACT(EPOCH FROM NOW() - date_trunc('hour', NOW())) / time_window_seconds) * time_window_seconds);
    
    -- For anonymous users, use SECURE rate limiting to prevent bypass attacks (CRITICAL SECURITY FIX)
    IF current_user_id IS NULL THEN
        -- SECURITY: Never trust client headers - they can be easily spoofed!
        -- Use only server-side reliable sources for rate limiting
        client_ip := COALESCE(
            -- Only use inet_client_addr() which comes from actual TCP connection
            inet_client_addr()::text,
            -- Fallback to connection-based identifier that can't be spoofed
            'conn_' || pg_backend_pid()::text || '_' || extract(epoch from NOW())::bigint::text
        );
        
        -- Enhanced protection: Multiple layers of rate limiting for anonymous users
        -- Layer 1: Connection-based (primary)
        rate_limit_key := 'anon_conn_' || 
                         regexp_replace(client_ip, '[^0-9.]', '', 'g') || '_' || 
                         function_name_param;
        
        -- Layer 2: Add session entropy to prevent easy bypass
        -- Use JWT sub claim if available (can't be spoofed easily)
        IF current_setting('request.jwt.claims', true) != '' THEN
            rate_limit_key := rate_limit_key || '_' || 
                             COALESCE(
                                 current_setting('request.jwt.claims', true)::jsonb->>'sub',
                                 current_setting('request.jwt.claims', true)::jsonb->>'aud',
                                 'no_jwt'
                             );
        ELSE
            -- No JWT available - use time-based bucket to prevent complete bypass
            rate_limit_key := rate_limit_key || '_bucket_' || 
                             FLOOR(extract(epoch from NOW()) / 300)::text; -- 5-minute buckets
        END IF;
        
        -- Create deterministic UUID from rate_limit_key using MD5 hash
        current_user_id := (md5(rate_limit_key)::uuid);
        
        -- BACKUP RATE LIMITING: Global anonymous protection (CRITICAL)
        -- This prevents mass attacks even if primary rate limiting is bypassed
        backup_rate_limit_key := 'global_anon_' || function_name_param;
        
        -- Check global anonymous rate limit (stricter limits)
        INSERT INTO rate_limits (user_id, function_name, window_start, call_count)
        VALUES (
            (md5(backup_rate_limit_key)::uuid), -- Deterministic UUID from backup key
            'global_' || function_name_param, 
            window_start_param, -- Use the calculated window_start_param variable
            1
        )
        ON CONFLICT (user_id, function_name, window_start)
        DO UPDATE SET 
            call_count = rate_limits.call_count + 1,
            updated_at = NOW()
        RETURNING rate_limits.call_count INTO backup_count;
        IF backup_count > GREATEST(10, max_calls * 2) THEN -- Global limit is 200% of individual limit, minimum 10
            RETURN FALSE;
        END IF;
    END IF;
    
    -- Try to increment existing record or insert new one
    INSERT INTO rate_limits (user_id, function_name, window_start, call_count)
    VALUES (current_user_id, function_name_param, window_start_param, 1)
    ON CONFLICT (user_id, function_name, window_start)
    DO UPDATE SET 
        call_count = rate_limits.call_count + 1,
        updated_at = NOW()
    RETURNING rate_limits.call_count INTO current_count;
    
    -- Check if we're over the limit
    RETURN current_count <= max_calls;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
SET statement_timeout = '2s';

COMMENT ON FUNCTION check_rate_limit IS 'SECURE rate limiting function with anti-spoofing protection. CRITICAL: Never trust client headers like x-forwarded-for as they can be easily spoofed by attackers to bypass rate limits. Uses only server-side reliable sources.';

-- Create cleanup function for rate limits
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete rate limit records older than 24 hours
    DELETE FROM rate_limits 
    WHERE window_start < NOW() - INTERVAL '24 hours';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION cleanup_rate_limits IS 'Cleanup old rate limit records. Should be called periodically (e.g., daily cron job).';

-- Create function to cleanup old audit logs (optional - for data retention)
CREATE OR REPLACE FUNCTION cleanup_audit_logs(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Input validation
    IF retention_days < 1 OR retention_days > 3650 THEN
        RAISE EXCEPTION 'Retention days must be between 1 and 3650';
    END IF;
    
    -- Delete audit log records older than retention period
    DELETE FROM audit_log 
    WHERE performed_at < NOW() - INTERVAL '1 day' * retention_days;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION cleanup_audit_logs IS 'Cleanup old audit log records based on retention policy. Default is 90 days.';

-- Create function to view cron job status
CREATE OR REPLACE FUNCTION get_cleanup_job_status()
RETURNS TABLE(
    jobname TEXT,
    schedule TEXT,
    command TEXT,
    active BOOLEAN,
    last_run TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cron.jobname,
        cron.schedule,
        cron.command,
        cron.active,
        cron.last_run_started_at as last_run
    FROM cron.job cron
    WHERE cron.jobname LIKE '%cleanup%'
    ORDER BY cron.jobname;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION get_cleanup_job_status IS 'Get status of cleanup cron jobs for monitoring purposes';

-- Enable pg_cron extension for scheduled cleanup
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule automatic cleanup of rate limits every hour
-- This runs at the start of every hour to remove old rate limit records
SELECT cron.schedule(
    'cleanup-rate-limits', 
    '0 * * * *',  -- Every hour at minute 0
    'SELECT cleanup_rate_limits();'
);

-- Optional: Schedule weekly audit log cleanup (commented out by default)
-- Uncomment and adjust retention period as needed for your use case
-- SELECT cron.schedule(
--     'cleanup-audit-logs', 
--     '0 2 * * 0',  -- Every Sunday at 2 AM
--     'SELECT cleanup_audit_logs(90);'  -- Keep 90 days of audit logs
-- );

COMMENT ON EXTENSION pg_cron IS 'Used for automated cleanup of rate limiting data and optional audit log retention';

-- Create secure function to check user access for a single product
-- Uses auth.uid() to get the current authenticated user (SECURITY FIX)
CREATE OR REPLACE FUNCTION check_user_product_access(
    product_slug_param TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    clean_slug TEXT;
BEGIN
    -- Rate limiting: 1000 calls per hour per user (increased for checkout)
    IF NOT check_rate_limit('check_user_product_access', 1000, 3600) THEN
        RAISE EXCEPTION 'Rate limit exceeded for check_user_product_access';
    END IF;

    -- Input validation and sanitization
    IF product_slug_param IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Sanitize slug: only allow alphanumeric, hyphens, and underscores
    clean_slug := regexp_replace(product_slug_param, '[^a-zA-Z0-9_-]', '', 'g');
    
    -- Validate sanitized slug
    IF clean_slug IS NULL OR length(clean_slug) = 0 OR length(clean_slug) > 100 THEN
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
          AND p.slug = clean_slug       -- Use sanitized slug
          AND p.is_active = true
          -- Check temporal availability for products
          AND (p.available_from IS NULL OR p.available_from <= NOW())
          AND (p.available_until IS NULL OR p.available_until >= NOW())
          -- Check temporal access for user
          AND (upa.access_expires_at IS NULL OR upa.access_expires_at >= NOW())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
SET statement_timeout = '2s';

COMMENT ON FUNCTION check_user_product_access IS 'Check if authenticated user has access to a specific product by slug. Includes rate limiting and input sanitization.';

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
    clean_slug TEXT;
    safe_key TEXT;
BEGIN
    -- Rate limiting: 200 calls per hour per user (increased for checkout)
    IF NOT check_rate_limit('batch_check_user_product_access', 200, 3600) THEN
        RAISE EXCEPTION 'Rate limit exceeded for batch_check_user_product_access';
    END IF;

    -- Input validation
    IF product_slugs_param IS NULL OR array_length(product_slugs_param, 1) IS NULL THEN
        RETURN result;
    END IF;
    
    -- Limit array size to prevent DoS attacks (reduced from 50 to 20)
    IF array_length(product_slugs_param, 1) > 20 THEN
        RAISE EXCEPTION 'Too many product slugs requested (maximum 20)';
    END IF;
    
    -- Get current authenticated user ID
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RETURN result;
    END IF;
    
    -- Check access for each product slug with proper sanitization
    FOREACH slug IN ARRAY product_slugs_param
    LOOP
        -- Validate input length first
        IF slug IS NULL OR length(slug) = 0 OR length(slug) > 100 THEN
            CONTINUE; -- Skip invalid slugs completely
        END IF;
        
        -- Sanitize slug: only allow alphanumeric, hyphens, and underscores
        clean_slug := regexp_replace(slug, '[^a-zA-Z0-9_-]', '', 'g');
        
        -- Skip empty or invalid slugs after sanitization
        IF clean_slug IS NULL OR length(clean_slug) = 0 THEN
            CONTINUE;
        END IF;
        
        -- Create safe JSON key (use clean_slug for both query and key)
        safe_key := clean_slug;
        
        -- Use parameterized query to prevent SQL injection
        SELECT EXISTS (
            SELECT 1 
            FROM user_product_access upa
            JOIN products p ON upa.product_id = p.id
            WHERE upa.user_id = current_user_id
              AND p.slug = clean_slug
              AND p.is_active = true
              -- Check temporal availability for products
              AND (p.available_from IS NULL OR p.available_from <= NOW())
              AND (p.available_until IS NULL OR p.available_until >= NOW())
              -- Check temporal access for user
              AND (upa.access_expires_at IS NULL OR upa.access_expires_at >= NOW())
        ) INTO has_access;
        
        -- Use sanitized key for JSON to prevent injection
        result := result || jsonb_build_object(safe_key, has_access);
    END LOOP;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
SET statement_timeout = '2s'; -- Reduced timeout to prevent DoS

COMMENT ON FUNCTION batch_check_user_product_access IS 'Batch check user access for multiple products. Limited to 20 products per call with rate limiting.';

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
    clean_slug TEXT;
BEGIN
    -- Input validation and sanitization
    IF product_slug_param IS NULL OR length(product_slug_param) = 0 OR length(product_slug_param) > 100 THEN
        RETURN FALSE;
    END IF;
    
    -- Validate access duration
    IF access_duration_days_param IS NOT NULL AND (access_duration_days_param < 0 OR access_duration_days_param > 3650) THEN
        RETURN FALSE; -- Max 10 years
    END IF;
    
    -- Sanitize slug
    clean_slug := regexp_replace(product_slug_param, '[^a-zA-Z0-9_-]', '', 'g');
    IF clean_slug IS NULL OR length(clean_slug) = 0 THEN
        RETURN FALSE;
    END IF;
    
    -- Get current authenticated user ID
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Get product by slug (use sanitized slug)
    SELECT id, auto_grant_duration_days INTO product_record
    FROM products 
    WHERE slug = clean_slug AND is_active = true AND price = 0; -- Only allow free products
    
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
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
SET statement_timeout = '2s';

COMMENT ON FUNCTION grant_free_product_access IS 'Grant access to free products for authenticated users. Includes input validation and sanitization.';

-- Create function to get complete user profile with statistics
CREATE OR REPLACE FUNCTION get_user_profile(user_id_param UUID)
RETURNS JSONB AS $$
DECLARE
    user_info JSONB;
    user_stats JSONB;
    user_access JSONB;
    current_user_id UUID;
BEGIN
    -- Input validation
    IF user_id_param IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Get current authenticated user
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;
    
    -- Security check: only allow users to view their own profile or admins to view any profile
    IF user_id_param != current_user_id THEN
        IF NOT EXISTS (SELECT 1 FROM admin_users WHERE user_id = current_user_id) THEN
            RAISE EXCEPTION 'Unauthorized: Can only view your own profile';
        END IF;
    END IF;
    
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
    
    -- Return null if user not found
    IF user_info IS NULL THEN
        RETURN NULL;
    END IF;
    
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
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
SET statement_timeout = '5s';

COMMENT ON FUNCTION get_user_profile IS 'Get complete user profile with access statistics. Users can only view their own profile, admins can view any profile.';

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

-- Create rate limiting table for persistent rate limiting
CREATE TABLE IF NOT EXISTS rate_limits (
  user_id UUID NOT NULL,
  function_name TEXT NOT NULL CHECK (length(function_name) <= 100),
  window_start TIMESTAMPTZ NOT NULL,
  call_count INTEGER NOT NULL DEFAULT 1 CHECK (call_count > 0),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (user_id, function_name, window_start)
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

-- Rate limiting indexes
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_function ON rate_limits(user_id, function_name);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON rate_limits(window_start);

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_performed_at ON audit_log(performed_at DESC);


-- Enable Row Level Security
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_product_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for products table
CREATE POLICY "SELECT policy for products" ON products
  FOR SELECT
  USING (
    -- Admin users see everything
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = (SELECT auth.uid())
    ) OR
    -- Public users see only active products
    (is_active = true AND (available_from IS NULL OR available_from <= NOW()) AND (available_until IS NULL OR available_until >= NOW()))
  );

-- Polityki dla adminów - osobno dla każdej akcji
CREATE POLICY "Allow admin users to insert products" ON products
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Allow admin users to update products" ON products
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Allow admin users to delete products" ON products
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = (SELECT auth.uid())
    )
  );



-- RLS Policies for user_product_access table
-- Allow users to read their own access records
CREATE POLICY "Allow users to read their own product access" ON user_product_access
  FOR SELECT
  USING (
    (SELECT auth.uid()) = user_id OR
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- Allow service role to insert access records
CREATE POLICY "Allow service role to insert product access" ON user_product_access
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Combined INSERT policy for authenticated users
CREATE POLICY "Combined INSERT policy for user_product_access" ON user_product_access
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Admin users can insert anything
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = (SELECT auth.uid())
    ) OR
    -- Regular users can insert access for FREE products for themselves
    ((SELECT auth.uid()) = user_id AND
     EXISTS (SELECT 1 FROM products WHERE id = product_id AND price = 0))
  );

-- Admin UPDATE policy
CREATE POLICY "Allow admin users to update access" ON user_product_access
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- Admin DELETE policy
CREATE POLICY "Allow admin users to delete access" ON user_product_access
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = (SELECT auth.uid())
    )
  );


-- RLS Policies for admin_users table
-- Allow users to check only their own admin status
CREATE POLICY "Allow users to read their own admin status" ON admin_users
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- RLS Policies for audit_log table
-- Only allow admin users to read audit logs
CREATE POLICY "Allow admin users to read audit logs" ON audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = (select auth.uid())
    )
  );

-- Allow system to insert audit logs (for triggers and functions)
CREATE POLICY "Allow system to insert audit logs" ON audit_log
  FOR INSERT
  WITH CHECK (true);

-- Combined SELECT policy for rate limits
CREATE POLICY "Combined SELECT policy for rate limits" ON rate_limits
    FOR SELECT 
    USING (
        -- Admins can view all rate limits
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE admin_users.user_id = (SELECT auth.uid())
        ) OR
        -- Users can read their own rate limits
        (SELECT auth.uid()) = user_id
    );

-- System policies for modifications
CREATE POLICY "Allow system to insert rate limits" ON rate_limits
    FOR INSERT 
    TO service_role
    WITH CHECK (true);

CREATE POLICY "Allow system to update rate limits" ON rate_limits
    FOR UPDATE 
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow system to delete rate limits" ON rate_limits
    FOR DELETE 
    TO service_role
    USING (true);


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
DECLARE
    current_user_id UUID;
    user_is_admin BOOLEAN;
    cache_key TEXT;
BEGIN
    -- Get current authenticated user
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Create session-specific cache key
    cache_key := 'app.user_is_admin_' || replace(current_user_id::TEXT, '-', '_');
    
    -- Try to get from session cache first
    BEGIN
        user_is_admin := current_setting(cache_key, true)::boolean;
        IF user_is_admin IS NOT NULL THEN
            RETURN user_is_admin;
        END IF;
    EXCEPTION 
        WHEN OTHERS THEN
            -- Cache miss, continue to DB lookup
            NULL;
    END;
    
    -- Check admin status from database
    SELECT EXISTS(
        SELECT 1 FROM admin_users 
        WHERE user_id = current_user_id
    ) INTO user_is_admin;
    
    -- Set session cache (expires with session)
    PERFORM set_config(cache_key, user_is_admin::TEXT, false);
    
    RETURN user_is_admin;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Create function to clear admin cache (useful for logout)
CREATE OR REPLACE FUNCTION clear_admin_cache()
RETURNS VOID AS $$
DECLARE
    current_user_id UUID;
    cache_key TEXT;
BEGIN
    -- Get current authenticated user
    current_user_id := auth.uid();
    IF current_user_id IS NOT NULL THEN
        -- Clear the session-specific cache
        cache_key := 'app.user_is_admin_' || replace(current_user_id::TEXT, '-', '_');
        PERFORM set_config(cache_key, NULL, false);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Create function to handle all new user registration logic
CREATE OR REPLACE FUNCTION handle_new_user_registration()
RETURNS TRIGGER
SET search_path = public, auth
AS $$
DECLARE
  claim_result JSON;
  admin_count INTEGER;
  lock_acquired BOOLEAN;
BEGIN
  -- Use advisory lock with timeout to prevent race condition
  SELECT pg_try_advisory_lock(hashtext('handle_new_user_registration')) INTO lock_acquired;
  
  IF NOT lock_acquired THEN
    RAISE EXCEPTION 'Could not acquire lock for user registration - try again';
  END IF;
  
  BEGIN
    -- 1. First User Admin: Atomic check and insert to prevent race condition
    INSERT INTO public.admin_users (user_id) 
    SELECT NEW.id 
    WHERE NOT EXISTS (SELECT 1 FROM public.admin_users LIMIT 1)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- 2. Guest Purchase Claims: Claim guest purchases for this user (if function exists)
    -- This will be available after the payment system migration
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'claim_guest_purchases_for_user') THEN
      SELECT public.claim_guest_purchases_for_user(NEW.id) INTO claim_result;
      
      -- Log the guest purchase claim result
      IF claim_result->>'success' = 'true' AND (claim_result->>'claimed_count')::INTEGER > 0 THEN
        PERFORM log_audit_entry(
          'guest_purchases',
          'UPDATE',
          NULL,
          jsonb_build_object(
            'user_id', NEW.id,
            'email', NEW.email, 
            'claimed_count', claim_result->>'claimed_count',
            'message', claim_result->>'message'
          ),
          NEW.id
        );
      END IF;
    END IF;
    
    -- 3. Audit Logging: Log registration event for security monitoring
    PERFORM log_audit_entry(
      'auth.users',
      'INSERT',
      NULL,
      jsonb_build_object('email', NEW.email, 'id', NEW.id),
      NEW.id
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
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

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
$$ language plpgsql
SET search_path = '';

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
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- Secure function to log audit entries with proper validation
CREATE OR REPLACE FUNCTION log_audit_entry(
    table_name_param TEXT,
    operation_param TEXT,
    old_values_param JSONB DEFAULT NULL,
    new_values_param JSONB DEFAULT NULL,
    user_id_param UUID DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    -- Input validation
    IF table_name_param IS NULL OR length(table_name_param) = 0 OR length(table_name_param) > 100 THEN
        RAISE EXCEPTION 'Invalid table name: must be 1-100 characters';
    END IF;
    
    IF operation_param IS NULL OR operation_param NOT IN ('INSERT', 'UPDATE', 'DELETE') THEN
        RAISE EXCEPTION 'Invalid operation: must be INSERT, UPDATE, or DELETE';
    END IF;
    
    -- Validate JSONB size (prevent DoS)
    IF pg_column_size(old_values_param) > 65536 THEN -- 64KB limit
        RAISE EXCEPTION 'Old values too large (max 64KB)';
    END IF;
    
    IF pg_column_size(new_values_param) > 65536 THEN -- 64KB limit
        RAISE EXCEPTION 'New values too large (max 64KB)';
    END IF;
    
    -- Insert audit entry
    INSERT INTO public.audit_log (
        table_name, 
        operation, 
        old_values, 
        new_values, 
        user_id,
        performed_at
    ) VALUES (
        table_name_param,
        operation_param,
        old_values_param,
        new_values_param,
        COALESCE(user_id_param, auth.uid()),
        NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
SET statement_timeout = '2s';

-- Grant execute permissions to the service role and authenticated users
GRANT EXECUTE ON FUNCTION log_audit_entry TO service_role, authenticated;

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

-- 
-- CRON JOB MANAGEMENT
-- 
-- The following cron jobs are automatically scheduled:
-- 1. cleanup-rate-limits: Runs every hour to clean old rate limit records
-- 
-- To view job status: SELECT * FROM get_cleanup_job_status();
-- To manually run cleanup: SELECT cleanup_rate_limits();
-- To unschedule job: SELECT cron.unschedule('cleanup-rate-limits');
-- 
-- For audit log cleanup (optional):
-- To enable: SELECT cron.schedule('cleanup-audit-logs', '0 2 * * 0', 'SELECT cleanup_audit_logs(90);');
-- To manually run: SELECT cleanup_audit_logs(90);
--

COMMIT;

