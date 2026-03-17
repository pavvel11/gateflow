-- Extend is_admin_cached to also recognize seller owners as admins.
-- Seller admins need to see the admin dashboard navigation.

CREATE OR REPLACE FUNCTION public.is_admin_cached()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    current_user_id UUID;
    user_is_admin BOOLEAN;
    cache_key TEXT;
BEGIN
    current_user_id := (SELECT auth.uid());
    IF current_user_id IS NULL THEN
        RETURN FALSE;
    END IF;

    cache_key := 'app.user_is_admin_' || replace(current_user_id::TEXT, '-', '_');

    BEGIN
        user_is_admin := current_setting(cache_key, true)::boolean;
        IF user_is_admin IS NOT NULL THEN
            RETURN user_is_admin;
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            NULL;
    END;

    -- Check admin_users (platform admin) OR sellers (seller admin)
    SELECT EXISTS(
        SELECT 1 FROM public.admin_users WHERE user_id = current_user_id
    ) OR EXISTS(
        SELECT 1 FROM public.sellers WHERE user_id = current_user_id AND status = 'active'
    ) INTO user_is_admin;

    PERFORM set_config(cache_key, user_is_admin::TEXT, false);

    RETURN user_is_admin;
END;
$$;
