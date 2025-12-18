-- Order Bumps Payment Processing Enhancement
-- Migration: 20251128151000_order_bumps_payment_processing
-- Description: Update payment processing to handle order bumps

BEGIN;

CREATE OR REPLACE FUNCTION process_stripe_payment_completion_with_bump(
    session_id_param TEXT,
    product_id_param UUID,
    customer_email_param TEXT,
    amount_total NUMERIC,
    currency_param TEXT,
    stripe_payment_intent_id TEXT DEFAULT NULL,
    user_id_param UUID DEFAULT NULL,
    bump_product_id_param UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    current_user_id UUID;
    product_record RECORD;
    bump_product_record RECORD;
    existing_user_id UUID;
    access_expires_at TIMESTAMPTZ := NULL;
    bump_access_expires_at TIMESTAMPTZ := NULL;
    bump_found BOOLEAN := false;
BEGIN
    -- Initialize record variable
    bump_product_record := NULL;
    bump_found := false;

    -- SECURITY: Rate limiting (100 calls per hour)
    IF NOT public.check_rate_limit('process_stripe_payment_completion', 100, 3600) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Rate limit exceeded. Please wait before processing another payment.');
    END IF;

    -- Input validation
    IF session_id_param IS NULL OR length(session_id_param) = 0 OR length(session_id_param) > 255 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid session ID');
    END IF;

    IF NOT (session_id_param ~* '^cs_[a-zA-Z0-9_]+$') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid session ID format');
    END IF;

    IF product_id_param IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Product ID is required');
    END IF;

    IF NOT public.validate_email_format(customer_email_param) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Valid email address is required');
    END IF;

    IF amount_total IS NULL OR amount_total <= 0 OR amount_total > 99999999 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid amount');
    END IF;

    -- Authorization check
    IF user_id_param IS NOT NULL THEN
        IF (select auth.role()) = 'service_role' THEN
            current_user_id := user_id_param;
        ELSIF auth.uid() = user_id_param THEN
            current_user_id := user_id_param;
        ELSE
            RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Cannot process payment for another user');
        END IF;
    ELSE
        current_user_id := NULL;
    END IF;

    -- IDEMPOTENCY CHECK: Return early if already processed
    IF EXISTS (SELECT 1 FROM public.payment_transactions WHERE session_id = session_id_param) THEN
        RETURN jsonb_build_object(
            'success', true,
            'scenario', 'already_processed_idempotent',
            'access_granted', true,
            'already_had_access', true,
            'message', 'Payment already processed (idempotent)'
        );
    END IF;

    -- Get product details
    SELECT id, auto_grant_duration_days
    INTO product_record
    FROM public.products
    WHERE id = product_id_param AND is_active = true;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Product not found or inactive');
    END IF;

    -- Get bump product details if provided
    IF bump_product_id_param IS NOT NULL THEN
        SELECT 
            p.id, 
            COALESCE(ob.access_duration_days, p.auto_grant_duration_days) as auto_grant_duration_days
        INTO bump_product_record
        FROM public.products p
        JOIN public.order_bumps ob ON ob.bump_product_id = p.id AND ob.main_product_id = product_id_param
        WHERE p.id = bump_product_id_param AND p.is_active = true;

        IF FOUND THEN
            bump_found := true;
        END IF;
    END IF;

    -- Try to find existing user by email
    SELECT id INTO existing_user_id
    FROM auth.users
    WHERE email = customer_email_param;

    -- Calculate access expiration
    IF product_record.auto_grant_duration_days IS NOT NULL THEN
        access_expires_at := NOW() + (product_record.auto_grant_duration_days || ' days')::INTERVAL;
    END IF;

    IF bump_found THEN
        -- If duration is > 0, set expiration. If 0 or NULL, it's unlimited (NULL)
        IF bump_product_record.auto_grant_duration_days IS NOT NULL AND bump_product_record.auto_grant_duration_days > 0 THEN
            bump_access_expires_at := NOW() + (bump_product_record.auto_grant_duration_days || ' days')::INTERVAL;
        ELSE
            bump_access_expires_at := NULL;
        END IF;
    END IF;

    -- Wrap database modifications in a transaction block
    BEGIN
        -- Record payment transaction
        INSERT INTO public.payment_transactions (
            session_id, user_id, product_id, customer_email, amount, currency, stripe_payment_intent_id, status, metadata
        ) VALUES (
            session_id_param, current_user_id, product_id_param, customer_email_param, amount_total, upper(currency_param), 
            stripe_payment_intent_id, 'completed',
            jsonb_build_object('has_bump', bump_found, 'bump_product_id', bump_product_id_param)
        );

        -- SCENARIO 1: Logged-in user
        IF current_user_id IS NOT NULL THEN
            PERFORM public.grant_product_access_service_role(current_user_id, product_id_param);
            IF bump_found THEN
                PERFORM public.grant_product_access_service_role(current_user_id, bump_product_id_param);
            END IF;

            RETURN jsonb_build_object(
                'success', true,
                'scenario', 'logged_in_user_with_bump',
                'access_granted', true,
                'bump_access_granted', bump_found,
                'customer_email', customer_email_param
            );

        -- SCENARIO 2: Guest purchase, user exists
        ELSIF existing_user_id IS NOT NULL THEN
            INSERT INTO public.guest_purchases (customer_email, product_id, transaction_amount, session_id)
            VALUES (customer_email_param, product_id_param, amount_total, session_id_param);
            
            IF bump_found THEN
                INSERT INTO public.guest_purchases (customer_email, product_id, transaction_amount, session_id)
                VALUES (customer_email_param, bump_product_id_param, 0, session_id_param || '_bump');
            END IF;

            RETURN jsonb_build_object(
                'success', true,
                'scenario', 'guest_purchase_user_exists_with_bump',
                'access_granted', false,
                'is_guest_purchase', true,
                'send_magic_link', true,
                'customer_email', customer_email_param
            );

        -- SCENARIO 3: Guest purchase, new user
        ELSE
            INSERT INTO public.guest_purchases (customer_email, product_id, transaction_amount, session_id)
            VALUES (customer_email_param, product_id_param, amount_total, session_id_param);
            
            IF bump_found THEN
                INSERT INTO public.guest_purchases (customer_email, product_id, transaction_amount, session_id)
                VALUES (customer_email_param, bump_product_id_param, 0, session_id_param || '_bump');
            END IF;

            RETURN jsonb_build_object(
                'success', true,
                'scenario', 'guest_purchase_new_user_with_bump',
                'access_granted', false,
                'is_guest_purchase', true,
                'send_magic_link', true,
                'customer_email', customer_email_param
            );
        END IF;

    EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Database Error: ' || SQLERRM,
            'code', SQLSTATE
        );
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
SET statement_timeout = '30s';

GRANT EXECUTE ON FUNCTION process_stripe_payment_completion_with_bump TO service_role, authenticated;

COMMIT;