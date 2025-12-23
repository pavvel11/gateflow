-- Create table for global integrations configuration
CREATE TABLE IF NOT EXISTS public.integrations_config (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- Singleton pattern
    
    -- MANAGED INTEGRATIONS (Required for Server-Side Tracking / CAPI)
    -- Google Tag Manager
    gtm_container_id TEXT,
    
    -- Meta (Facebook)
    facebook_pixel_id TEXT,
    facebook_capi_token TEXT, -- Secure (Server-side only)
    facebook_test_event_code TEXT, -- For testing CAPI
    
    -- Google Ads
    google_ads_conversion_id TEXT,
    google_ads_conversion_label TEXT,
    
    -- Cookie Consent
    cookie_consent_enabled BOOLEAN DEFAULT true, -- Default to TRUE (Privacy by Default)
    consent_logging_enabled BOOLEAN DEFAULT false, -- Default to FALSE (Optional audit logging)

    -- RAW CODE INJECTION (For flexibility - Hotjar, Chats, Custom Pixels)
    custom_head_code TEXT, -- Injected into <head>
    custom_body_code TEXT, -- Injected into start of <body>

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.integrations_config ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can manage the configuration
CREATE POLICY "Admins can manage integrations config" ON public.integrations_config
    FOR ALL
    USING (
        auth.uid() IN (SELECT user_id FROM public.admin_users) OR
        (SELECT current_setting('role') = 'service_role')
    )
    WITH CHECK (
        auth.uid() IN (SELECT user_id FROM public.admin_users) OR
        (SELECT current_setting('role') = 'service_role')
    );

-- Function to get public config (safe fields only)
CREATE OR REPLACE FUNCTION public.get_public_integrations_config()
RETURNS TABLE (
    gtm_container_id TEXT,
    facebook_pixel_id TEXT,
    cookie_consent_enabled BOOLEAN,
    consent_logging_enabled BOOLEAN,
    custom_head_code TEXT,
    custom_body_code TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ic.gtm_container_id,
        ic.facebook_pixel_id,
        ic.cookie_consent_enabled,
        ic.consent_logging_enabled,
        ic.custom_head_code,
        ic.custom_body_code
    FROM public.integrations_config ic
    WHERE ic.id = 1;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_public_integrations_config() TO anon, authenticated, service_role;

-- Insert the initial row if it doesn't exist
INSERT INTO public.integrations_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;


-- NEW: Consent Logs Table for GDPR Compliance Audit
CREATE TABLE IF NOT EXISTS public.consent_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID, -- Optional linkage to registered user
    anonymous_id TEXT, -- Session/Cookie ID
    ip_address TEXT, -- Audit requirement
    user_agent TEXT,
    consent_version TEXT, -- Which version of terms they accepted
    consents JSONB, -- e.g. {"analytics": true, "marketing": false}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.consent_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view logs
CREATE POLICY "Admins can view consent logs" ON public.consent_logs
    FOR SELECT
    USING (
        auth.uid() IN (SELECT user_id FROM public.admin_users) OR
        (SELECT current_setting('role') = 'service_role')
    );

-- Anyone can insert logs (public API endpoint will write to this)
CREATE POLICY "Anyone can insert consent logs" ON public.consent_logs
    FOR INSERT
    WITH CHECK (true);


-- ===========================================================================
-- NEW: User Profiles Table (Personal & Company Data)
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    
    -- Personal Info
    first_name TEXT,
    last_name TEXT,
    full_name TEXT, -- Computed or manually set
    display_name TEXT,
    avatar_url TEXT,
    
    -- Company / Invoicing Info
    company_name TEXT,
    tax_id TEXT, -- NIP in Poland
    
    -- Address
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    country TEXT, -- ISO Alpha-2 code recommended
    
    -- Preferences
    preferred_language TEXT DEFAULT 'en',
    timezone TEXT DEFAULT 'UTC',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (auth.uid() IN (SELECT user_id FROM public.admin_users));

-- Trigger to update updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Modify the registration trigger to also create a profile
-- We need to update the existing function handle_new_user_registration()
-- Since it's already in the initial schema, we'll redefine it here to include profile creation.

CREATE OR REPLACE FUNCTION public.handle_new_user_registration()
RETURNS TRIGGER
SET search_path = public, auth
AS $$
DECLARE
  claim_result JSON;
  lock_acquired BOOLEAN;
BEGIN
  -- Use advisory lock to prevent race condition
  SELECT pg_try_advisory_lock(hashtext('handle_new_user_registration')) INTO lock_acquired;
  
  IF NOT lock_acquired THEN
    RAISE EXCEPTION 'Could not acquire lock for user registration - try again';
  END IF;
  
  BEGIN
    -- 1. Create Public Profile
    INSERT INTO public.profiles (id, full_name, avatar_url)
    VALUES (
      NEW.id, 
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'avatar_url'
    ) ON CONFLICT (id) DO NOTHING;

    -- 2. First User Admin: Atomic check and insert
    INSERT INTO public.admin_users (user_id) 
    SELECT NEW.id 
    WHERE NOT EXISTS (SELECT 1 FROM public.admin_users LIMIT 1)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- 3. Guest Purchase Claims: Claim guest purchases for this user
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'claim_guest_purchases_for_user') THEN
      SELECT public.claim_guest_purchases_for_user(NEW.id) INTO claim_result;
      
      -- Log the guest purchase claim result
      IF claim_result->>'success' = 'true' AND (claim_result->>'claimed_count')::INTEGER > 0 THEN
        PERFORM public.log_audit_entry(
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
    
    -- 4. Audit Logging
    PERFORM public.log_audit_entry(
      'auth.users',
      'INSERT',
      NULL,
      jsonb_build_object('email', NEW.email, 'id', NEW.id),
      NEW.id
    );

  EXCEPTION
    WHEN OTHERS THEN
      PERFORM pg_advisory_unlock(hashtext('handle_new_user_registration'));
      RAISE;
  END;
  
  PERFORM pg_advisory_unlock(hashtext('handle_new_user_registration'));
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
