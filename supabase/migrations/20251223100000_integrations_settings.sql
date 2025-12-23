-- Create table for global integrations configuration
CREATE TABLE IF NOT EXISTS public.integrations_config (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- Singleton pattern
    
    -- MANAGED INTEGRATIONS (Standard fields)
    gtm_container_id TEXT,
    facebook_pixel_id TEXT,
    facebook_capi_token TEXT, -- Secure (Server-side only)
    facebook_test_event_code TEXT,
    google_ads_conversion_id TEXT,
    google_ads_conversion_label TEXT,
    
    -- Umami Analytics (Open Source)
    umami_website_id TEXT,
    umami_script_url TEXT DEFAULT 'https://cloud.umami.is/script.js',

    -- Global Settings
    cookie_consent_enabled BOOLEAN DEFAULT true,
    consent_logging_enabled BOOLEAN DEFAULT false,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for config
ALTER TABLE public.integrations_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage config" ON public.integrations_config
    USING (auth.uid() IN (SELECT user_id FROM public.admin_users) OR (SELECT current_setting('role') = 'service_role'))
    WITH CHECK (auth.uid() IN (SELECT user_id FROM public.admin_users) OR (SELECT current_setting('role') = 'service_role'));

-- Insert initial config
INSERT INTO public.integrations_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;


-- NEW: Script Manager Table
CREATE TABLE IF NOT EXISTS public.custom_scripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    script_location TEXT NOT NULL CHECK (script_location IN ('head', 'body')),
    script_content TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('essential', 'analytics', 'marketing')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.custom_scripts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage scripts" ON public.custom_scripts
    USING (auth.uid() IN (SELECT user_id FROM public.admin_users) OR (SELECT current_setting('role') = 'service_role'))
    WITH CHECK (auth.uid() IN (SELECT user_id FROM public.admin_users) OR (SELECT current_setting('role') = 'service_role'));


-- RPC: Get Public Config + Scripts (Combined)
CREATE OR REPLACE FUNCTION public.get_public_integrations_config()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    config_record RECORD;
    scripts_json JSONB;
BEGIN
    SELECT * INTO config_record FROM public.integrations_config WHERE id = 1;

    SELECT jsonb_agg(jsonb_build_object(
        'id', id, 'name', name, 'location', script_location, 'content', script_content, 'category', category
    )) INTO scripts_json FROM public.custom_scripts WHERE is_active = true;

    RETURN jsonb_build_object(
        'gtm_container_id', config_record.gtm_container_id,
        'facebook_pixel_id', config_record.facebook_pixel_id,
        'umami_website_id', config_record.umami_website_id,
        'umami_script_url', config_record.umami_script_url,
        'cookie_consent_enabled', config_record.cookie_consent_enabled,
        'consent_logging_enabled', config_record.consent_logging_enabled,
        'scripts', COALESCE(scripts_json, '[]'::jsonb)
    );
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_public_integrations_config() TO anon, authenticated, service_role;


-- NEW: Consent Logs Table
CREATE TABLE IF NOT EXISTS public.consent_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    anonymous_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    consent_version TEXT,
    consents JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.consent_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view logs" ON public.consent_logs FOR SELECT USING (auth.uid() IN (SELECT user_id FROM public.admin_users) OR (SELECT current_setting('role') = 'service_role'));
CREATE POLICY "Public log consent" ON public.consent_logs FOR INSERT WITH CHECK (true);


-- PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    first_name TEXT, last_name TEXT, full_name TEXT, display_name TEXT, avatar_url TEXT,
    company_name TEXT, tax_id TEXT,
    address_line1 TEXT, address_line2 TEXT, city TEXT, state TEXT, zip_code TEXT, country TEXT,
    preferred_language TEXT DEFAULT 'en', timezone TEXT DEFAULT 'UTC',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Self view" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Self update" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admin view" ON public.profiles FOR SELECT USING (auth.uid() IN (SELECT user_id FROM public.admin_users));

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = timezone('utc'::text, now()); RETURN NEW; END;
$$ language plpgsql;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Registration Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user_registration()
RETURNS TRIGGER AS $$
DECLARE
  claim_result JSON;
BEGIN
  -- Use transaction lock
  PERFORM pg_advisory_xact_lock(hashtext('handle_new_user_registration'));
  
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url') ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.admin_users (user_id) 
  SELECT NEW.id WHERE NOT EXISTS (SELECT 1 FROM public.admin_users LIMIT 1) ON CONFLICT (user_id) DO NOTHING;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'claim_guest_purchases_for_user') THEN
    SELECT public.claim_guest_purchases_for_user(NEW.id) INTO claim_result;
  END IF;
  
  PERFORM public.log_audit_entry('auth.users', 'INSERT', NULL, jsonb_build_object('email', NEW.email), NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =================================================================
-- ENTERPRISE SECURITY: SECURE ADMIN VIEWS (Fix UNRESTRICTED)
-- =================================================================

-- 1. Redefine views with security_invoker = on
-- This ensures RLS is respected if we ever grant access back to users.
-- More importantly, it removes the "Security Definer" risk.

CREATE OR REPLACE VIEW public.user_access_stats WITH (security_invoker = on) AS
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
LEFT JOIN public.user_product_access upa ON u.id = upa.user_id
LEFT JOIN public.products p ON upa.product_id = p.id
GROUP BY u.id, u.email, u.created_at, u.email_confirmed_at, u.last_sign_in_at, u.raw_user_meta_data;

CREATE OR REPLACE VIEW public.user_product_access_detailed WITH (security_invoker = on) AS
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
FROM public.user_product_access upa
JOIN public.products p ON upa.product_id = p.id;

-- Re-create simple views to ensure clean state
DROP VIEW IF EXISTS public.rate_limit_summary;
CREATE VIEW public.rate_limit_summary WITH (security_invoker = on) AS
SELECT 
    function_name,
    COUNT(*) as total_calls,
    COUNT(DISTINCT user_id) as unique_users,
    MAX(updated_at) as last_activity,
    MAX(call_count) as max_calls_per_user,
    AVG(call_count) as avg_calls_per_user
FROM public.rate_limits
GROUP BY function_name;

DROP VIEW IF EXISTS public.payment_system_health;
CREATE VIEW public.payment_system_health WITH (security_invoker = on) AS
SELECT 
    'payment_transactions'::text as table_name,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_transactions,
    COUNT(*) FILTER (WHERE status = 'refunded') as refunded_transactions,
    COUNT(*) FILTER (WHERE status = 'disputed') as disputed_transactions,
    AVG(amount) as avg_transaction_amount,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as records_last_24h,
    NOW() as snapshot_time
FROM public.payment_transactions;

-- 2. LOCK DOWN: Revoke public/authenticated access
-- Only Service Role (Backend API) should read these.
REVOKE ALL ON public.user_access_stats FROM anon, authenticated;
REVOKE ALL ON public.user_product_access_detailed FROM anon, authenticated;
REVOKE ALL ON public.rate_limit_summary FROM anon, authenticated;
REVOKE ALL ON public.payment_system_health FROM anon, authenticated;

-- 3. Explicitly Grant to Service Role
GRANT SELECT ON public.user_access_stats TO service_role;
GRANT SELECT ON public.user_product_access_detailed TO service_role;
GRANT SELECT ON public.rate_limit_summary TO service_role;
GRANT SELECT ON public.payment_system_health TO service_role;

-- 4. FIX Permissions for security_invoker = on
-- Since the view runs as the invoker (service_role), it needs direct access to auth.users.
GRANT SELECT ON auth.users TO service_role;

-- 5. RPC Helper for Dashboard Stats (High Performance)
-- This allows the dashboard to get aggregate numbers quickly via a secure function call.
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    total_users INTEGER;
    total_products INTEGER;
    total_revenue NUMERIC;
    active_users_7d INTEGER;
BEGIN
    -- Check Admin
    IF NOT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    -- Calculate Stats
    SELECT COUNT(*) INTO total_users FROM auth.users;
    SELECT COUNT(*) INTO total_products FROM public.products WHERE is_active = true;
    SELECT COALESCE(SUM(amount), 0) INTO total_revenue FROM public.payment_transactions WHERE status = 'completed';
    
    SELECT COUNT(DISTINCT user_id) INTO active_users_7d 
    FROM public.user_product_access 
    WHERE created_at > NOW() - INTERVAL '7 days';

    RETURN jsonb_build_object(
        'totalProducts', total_products,
        'totalUsers', total_users,
        'totalAccess', (SELECT COUNT(*) FROM public.user_product_access),
        'activeUsers', active_users_7d,
        'totalRevenue', total_revenue
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_stats() TO authenticated;
