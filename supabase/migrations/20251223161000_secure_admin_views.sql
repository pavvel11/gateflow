-- Secure admin views by revoking public access and enforcing admin-only internal checks.
-- This fixes the "UNRESTRICTED" status in Supabase and prevents data leakage.

-- 1. Revoke all privileges from public/anonymous roles
REVOKE ALL ON public.user_access_stats FROM anon;
REVOKE ALL ON public.user_product_access_detailed FROM anon;
REVOKE ALL ON public.rate_limit_summary FROM anon;
REVOKE ALL ON public.payment_system_health FROM anon;

-- 2. Ensure they are Security Definer (security_invoker = off)
ALTER VIEW public.user_access_stats SET (security_invoker = off);
ALTER VIEW public.user_product_access_detailed SET (security_invoker = off);
ALTER VIEW public.rate_limit_summary SET (security_invoker = off);
ALTER VIEW public.payment_system_health SET (security_invoker = off);

-- 3. Grant SELECT back to roles that need it via managed API
GRANT SELECT ON public.user_access_stats TO authenticated, service_role;
GRANT SELECT ON public.user_product_access_detailed TO authenticated, service_role;
GRANT SELECT ON public.rate_limit_summary TO authenticated, service_role;
GRANT SELECT ON public.payment_system_health TO authenticated, service_role;

-- 4. Redefine views with internal security check (Extra Layer of Protection)
CREATE OR REPLACE VIEW public.user_access_stats AS
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
WHERE (SELECT public.is_admin()) -- ONLY ADMINS SEE DATA
GROUP BY u.id, u.email, u.created_at, u.email_confirmed_at, u.last_sign_in_at, u.raw_user_meta_data;

CREATE OR REPLACE VIEW public.user_product_access_detailed AS
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
JOIN public.products p ON upa.product_id = p.id
WHERE (SELECT public.is_admin()); -- ONLY ADMINS SEE DATA

DROP VIEW IF EXISTS public.rate_limit_summary;
CREATE VIEW public.rate_limit_summary AS
SELECT 
    function_name,
    COUNT(*) as total_calls,
    COUNT(DISTINCT user_id) as unique_users,
    MAX(updated_at) as last_activity,
    MAX(call_count) as max_calls_per_user,
    AVG(call_count) as avg_calls_per_user
FROM public.rate_limits
WHERE (SELECT public.is_admin()) -- ONLY ADMINS SEE DATA
GROUP BY function_name;

DROP VIEW IF EXISTS public.payment_system_health;
CREATE VIEW public.payment_system_health AS
SELECT 
    'payment_transactions'::text as table_name,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_transactions,
    COUNT(*) FILTER (WHERE status = 'refunded') as refunded_transactions,
    COUNT(*) FILTER (WHERE status = 'disputed') as disputed_transactions,
    AVG(amount) as avg_transaction_amount,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as records_last_24h,
    NOW() as snapshot_time
FROM public.payment_transactions
WHERE (SELECT public.is_admin()); -- ONLY ADMINS SEE DATA

GRANT SELECT ON public.rate_limit_summary TO authenticated, service_role;
GRANT SELECT ON public.payment_system_health TO authenticated, service_role;

-- 5. Corrected handle_new_user_registration function
-- Uses robust locking and fully qualified names.
CREATE OR REPLACE FUNCTION public.handle_new_user_registration()
RETURNS TRIGGER
AS $$
DECLARE
  claim_result JSON;
BEGIN
  -- Use transaction-level advisory lock (waits instead of failing)
  PERFORM pg_advisory_xact_lock(hashtext('handle_new_user_registration'));
  
  -- 1. Create Public Profile
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id, 
    (NEW.raw_user_meta_data->>'full_name'),
    (NEW.raw_user_meta_data->>'avatar_url')
  ) ON CONFLICT (id) DO NOTHING;

  -- 2. First User Admin
  INSERT INTO public.admin_users (user_id) 
  SELECT NEW.id 
  WHERE NOT EXISTS (SELECT 1 FROM public.admin_users LIMIT 1)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- 3. Guest Purchase Claims
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'claim_guest_purchases_for_user') THEN
    SELECT public.claim_guest_purchases_for_user(NEW.id) INTO claim_result;
  END IF;
  
  -- 4. Audit Logging
  PERFORM public.log_audit_entry(
    'auth.users',
    'INSERT',
    NULL,
    jsonb_build_object('email', NEW.email, 'id', NEW.id),
    NEW.id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;