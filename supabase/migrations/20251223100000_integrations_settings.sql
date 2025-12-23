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
    
    -- Global Settings
    cookie_consent_enabled BOOLEAN DEFAULT true,
    consent_logging_enabled BOOLEAN DEFAULT false,

    -- Note: Old custom_head_code fields removed in favor of custom_scripts table

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
    name TEXT NOT NULL,               -- e.g. "Hotjar"
    script_location TEXT NOT NULL CHECK (script_location IN ('head', 'body')),
    script_content TEXT NOT NULL,     -- The actual JS/HTML code
    category TEXT NOT NULL CHECK (category IN ('essential', 'analytics', 'marketing')), -- GDPR Category
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for scripts
ALTER TABLE public.custom_scripts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage scripts" ON public.custom_scripts
    USING (auth.uid() IN (SELECT user_id FROM public.admin_users) OR (SELECT current_setting('role') = 'service_role'))
    WITH CHECK (auth.uid() IN (SELECT user_id FROM public.admin_users) OR (SELECT current_setting('role') = 'service_role'));

-- Public access to scripts via RPC only (controlled exposure)


-- RPC: Get Public Config + Scripts
-- Returns complex JSON object to avoid multiple requests
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
    -- Get base config
    SELECT 
        gtm_container_id,
        facebook_pixel_id,
        cookie_consent_enabled,
        consent_logging_enabled
    INTO config_record
    FROM public.integrations_config 
    WHERE id = 1;

    -- Get active scripts as JSON array
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', id,
            'name', name,
            'location', script_location,
            'content', script_content,
            'category', category
        )
    )
    INTO scripts_json
    FROM public.custom_scripts
    WHERE is_active = true;

    -- Return combined object
    RETURN jsonb_build_object(
        'gtm_container_id', config_record.gtm_container_id,
        'facebook_pixel_id', config_record.facebook_pixel_id,
        'cookie_consent_enabled', config_record.cookie_consent_enabled,
        'consent_logging_enabled', config_record.consent_logging_enabled,
        'scripts', COALESCE(scripts_json, '[]'::jsonb)
    );
END;
$$;

-- Grant execute
GRANT EXECUTE ON FUNCTION public.get_public_integrations_config() TO anon, authenticated, service_role;


-- NEW: Consent Logs Table (Unchanged)
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


-- PROFILES (Unchanged)
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

-- Trigger Update Function (if not exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ language plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Registration Trigger (Unchanged)
CREATE OR REPLACE FUNCTION public.handle_new_user_registration()
RETURNS TRIGGER
SET search_path = public, auth
AS $$
DECLARE
  claim_result JSON;
  lock_acquired BOOLEAN;
BEGIN
  SELECT pg_try_advisory_lock(hashtext('handle_new_user_registration')) INTO lock_acquired;
  IF NOT lock_acquired THEN RAISE EXCEPTION 'Lock error'; END IF;
  
  BEGIN
    INSERT INTO public.profiles (id, full_name, avatar_url)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url') ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.admin_users (user_id) 
    SELECT NEW.id WHERE NOT EXISTS (SELECT 1 FROM public.admin_users LIMIT 1) ON CONFLICT (user_id) DO NOTHING;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'claim_guest_purchases_for_user') THEN
      PERFORM public.claim_guest_purchases_for_user(NEW.id);
    END IF;
    
    PERFORM public.log_audit_entry('auth.users', 'INSERT', NULL, jsonb_build_object('email', NEW.email), NEW.id);
  EXCEPTION WHEN OTHERS THEN
      PERFORM pg_advisory_unlock(hashtext('handle_new_user_registration'));
      RAISE;
  END;
  PERFORM pg_advisory_unlock(hashtext('handle_new_user_registration'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;