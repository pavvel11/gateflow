-- Abandoned Cart Recovery System
-- Adds support for tracking pending and abandoned payment attempts

BEGIN;

-- 1. Add new payment statuses: 'pending' and 'abandoned'
ALTER TABLE payment_transactions
  DROP CONSTRAINT IF EXISTS payment_transactions_status_check;

ALTER TABLE payment_transactions
  ADD CONSTRAINT payment_transactions_status_check
  CHECK (status IN ('pending', 'completed', 'refunded', 'disputed', 'abandoned'));

-- 2. Add abandoned_at timestamp to track when payment was abandoned
ALTER TABLE payment_transactions
  ADD COLUMN IF NOT EXISTS abandoned_at TIMESTAMPTZ;

-- 3. Add expires_at to mark when pending payment expires (typically 24h)
ALTER TABLE payment_transactions
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- 4. Create index for finding pending/abandoned payments efficiently
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status_created
  ON payment_transactions(status, created_at DESC)
  WHERE status IN ('pending', 'abandoned');

-- 5. Create index for expired pending payments
CREATE INDEX IF NOT EXISTS idx_payment_transactions_expires
  ON payment_transactions(expires_at)
  WHERE status = 'pending' AND expires_at IS NOT NULL;

-- 6. Add index for customer email to find all carts by email
CREATE INDEX IF NOT EXISTS idx_payment_transactions_customer_email_status
  ON payment_transactions(customer_email, status, created_at DESC);

-- 7. Function to mark expired pending payments as abandoned
CREATE OR REPLACE FUNCTION mark_expired_pending_payments()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER := 0;
BEGIN
  UPDATE payment_transactions
  SET
    status = 'abandoned',
    abandoned_at = NOW(),
    updated_at = NOW()
  WHERE status = 'pending'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION mark_expired_pending_payments() TO service_role;

-- 8. Function to get abandoned carts (admin only)
CREATE OR REPLACE FUNCTION get_abandoned_carts(
  days_ago INTEGER DEFAULT 7,
  limit_count INTEGER DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  customer_email TEXT,
  product_id UUID,
  product_name TEXT,
  amount NUMERIC,
  currency TEXT,
  created_at TIMESTAMPTZ,
  abandoned_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  metadata JSONB
) AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Admin only';
  END IF;

  RETURN QUERY
  SELECT
    pt.id,
    pt.customer_email,
    pt.product_id,
    p.name AS product_name,
    pt.amount,
    pt.currency,
    pt.created_at,
    pt.abandoned_at,
    pt.expires_at,
    pt.metadata
  FROM payment_transactions pt
  LEFT JOIN products p ON pt.product_id = p.id
  WHERE pt.status IN ('pending', 'abandoned')
    AND pt.created_at > NOW() - (days_ago || ' days')::INTERVAL
  ORDER BY pt.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_abandoned_carts(INTEGER, INTEGER) TO authenticated;

-- 9. Function to get abandoned cart statistics
CREATE OR REPLACE FUNCTION get_abandoned_cart_stats(
  days_ago INTEGER DEFAULT 7
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Admin only';
  END IF;

  SELECT jsonb_build_object(
    'total_abandoned', COUNT(*) FILTER (WHERE status = 'abandoned'),
    'total_pending', COUNT(*) FILTER (WHERE status = 'pending'),
    'total_value', COALESCE(SUM(amount) FILTER (WHERE status IN ('pending', 'abandoned')), 0),
    'avg_cart_value', COALESCE(AVG(amount) FILTER (WHERE status IN ('pending', 'abandoned')), 0),
    'period_days', days_ago
  ) INTO result
  FROM payment_transactions
  WHERE status IN ('pending', 'abandoned')
    AND created_at > NOW() - (days_ago || ' days')::INTERVAL;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_abandoned_cart_stats(INTEGER) TO authenticated;

-- 10. Add RLS policies for pending/abandoned transactions
-- Note: DROP IF EXISTS required before CREATE for policies (no IF NOT EXISTS support)
DROP POLICY IF EXISTS "Service role can manage all payment statuses" ON payment_transactions;
CREATE POLICY "Service role can manage all payment statuses"
  ON payment_transactions
  FOR ALL
  TO service_role
  USING (true);

-- Allow authenticated users to see their own pending payments
DROP POLICY IF EXISTS "Users can view their own pending payments" ON payment_transactions;
CREATE POLICY "Users can view their own pending payments"
  ON payment_transactions
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    AND status IN ('pending', 'completed', 'refunded')
  );

-- 11. Add comment explaining the status flow
COMMENT ON COLUMN payment_transactions.status IS
'Payment status flow:
- pending: Payment Intent created, awaiting payment
- completed: Payment successful
- abandoned: Payment expired or user left without paying
- refunded: Payment was refunded
- disputed: Payment disputed (chargeback)';

COMMENT ON COLUMN payment_transactions.abandoned_at IS
'Timestamp when payment was marked as abandoned (either manually or automatically after expiration)';

COMMENT ON COLUMN payment_transactions.expires_at IS
'When this pending payment expires (typically 24 hours after creation). NULL for non-pending statuses.';

-- 12. Modify process_stripe_payment_completion_with_bump to update pending transactions
-- This ensures that when payment succeeds, we update the existing pending transaction
-- instead of creating a duplicate
CREATE OR REPLACE FUNCTION public.process_stripe_payment_completion_with_bump(
  session_id_param TEXT,
  product_id_param UUID,
  customer_email_param TEXT,
  amount_total NUMERIC,
  currency_param TEXT,
  stripe_payment_intent_id TEXT DEFAULT NULL,
  user_id_param UUID DEFAULT NULL,
  bump_product_id_param UUID DEFAULT NULL,
  coupon_id_param UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  current_user_id UUID;
  product_record RECORD;
  bump_product_record RECORD;
  existing_user_id UUID;
  access_expires_at TIMESTAMPTZ := NULL;
  bump_access_expires_at TIMESTAMPTZ := NULL;
  bump_found BOOLEAN := false;
  transaction_id_var UUID;
  pending_transaction_id UUID;
BEGIN
  bump_product_record := NULL;
  bump_found := false;

  -- Rate limiting
  IF NOT public.check_rate_limit('process_stripe_payment_completion', 100, 3600) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Rate limit exceeded');
  END IF;

  -- Input validation
  IF session_id_param IS NULL OR length(session_id_param) = 0 OR length(session_id_param) > 255 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid session ID');
  END IF;

  -- Accept both Checkout Session (cs_) and Payment Intent (pi_) formats
  IF NOT (session_id_param ~* '^(cs_|pi_)[a-zA-Z0-9_]+$') THEN
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

  -- Authorization
  IF user_id_param IS NOT NULL THEN
    IF (select auth.role()) = 'service_role' THEN
      current_user_id := user_id_param;
    ELSIF auth.uid() = user_id_param THEN
      current_user_id := user_id_param;
    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
    END IF;
  ELSE
    current_user_id := NULL;
  END IF;

  -- Idempotency check: Check if already completed
  IF EXISTS (SELECT 1 FROM public.payment_transactions WHERE session_id = session_id_param AND status = 'completed') THEN
    IF EXISTS (SELECT 1 FROM public.guest_purchases WHERE session_id = session_id_param) THEN
      RETURN jsonb_build_object(
        'success', true,
        'scenario', 'guest_purchase_new_user_with_bump',
        'access_granted', false,
        'is_guest_purchase', true,
        'send_magic_link', true,
        'customer_email', customer_email_param,
        'message', 'Payment already processed (idempotent)'
      );
    ELSE
      RETURN jsonb_build_object(
        'success', true,
        'scenario', 'already_processed_idempotent',
        'access_granted', true,
        'already_had_access', true,
        'message', 'Payment already processed (idempotent)'
      );
    END IF;
  END IF;

  -- Get product with price and currency for validation
  SELECT id, auto_grant_duration_days, price, currency INTO product_record
  FROM public.products
  WHERE id = product_id_param AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Product not found or inactive');
  END IF;

  -- SECURITY: Validate currency matches product currency
  IF product_record.currency IS NOT NULL THEN
    IF upper(currency_param) != upper(product_record.currency) THEN
      RAISE EXCEPTION 'Currency mismatch: expected %, got %',
        product_record.currency, currency_param;
    END IF;
  END IF;

  -- Get bump product if provided
  IF bump_product_id_param IS NOT NULL THEN
    SELECT
      p.id,
      COALESCE(ob.access_duration_days, p.auto_grant_duration_days) as auto_grant_duration_days,
      COALESCE(ob.bump_price, p.price) as price,
      p.currency
    INTO bump_product_record
    FROM public.products p
    JOIN public.order_bumps ob ON ob.bump_product_id = p.id AND ob.main_product_id = product_id_param
    WHERE p.id = bump_product_id_param AND p.is_active = true;

    IF FOUND THEN
      bump_found := true;
    END IF;
  END IF;

  -- [Price validation logic continues - not modified]
  IF product_record.price IS NOT NULL THEN
    DECLARE
      bump_price NUMERIC := NULL;
    BEGIN
      IF bump_found THEN
        bump_price := bump_product_record.price;
      END IF;

      IF coupon_id_param IS NULL THEN
        IF bump_price IS NOT NULL THEN
          IF amount_total != ((product_record.price + bump_price) * 100) THEN
            RAISE EXCEPTION 'Amount mismatch with bump';
          END IF;
        ELSE
          IF amount_total != (product_record.price * 100) THEN
            RAISE EXCEPTION 'Amount mismatch';
          END IF;
        END IF;
      ELSE
        -- With coupon, just ensure amount is reasonable (not zero or negative)
        IF amount_total <= 0 THEN
          RAISE EXCEPTION 'Invalid amount with coupon: must be positive';
        END IF;
      END IF;
    END;
  END IF;

  -- Find existing user
  SELECT id INTO existing_user_id FROM auth.users WHERE email = customer_email_param;

  -- Calculate expiration
  IF product_record.auto_grant_duration_days IS NOT NULL THEN
    access_expires_at := NOW() + (product_record.auto_grant_duration_days || ' days')::INTERVAL;
  END IF;

  IF bump_found THEN
    IF bump_product_record.auto_grant_duration_days IS NOT NULL AND bump_product_record.auto_grant_duration_days > 0 THEN
      bump_access_expires_at := NOW() + (bump_product_record.auto_grant_duration_days || ' days')::INTERVAL;
    ELSE
      bump_access_expires_at := NULL;
    END IF;
  END IF;

  BEGIN
    -- **MODIFIED**: Check for existing pending transaction and update it
    SELECT pt.id INTO pending_transaction_id
    FROM public.payment_transactions pt
    WHERE pt.stripe_payment_intent_id = process_stripe_payment_completion_with_bump.stripe_payment_intent_id
      AND pt.status = 'pending'
    LIMIT 1;

    IF pending_transaction_id IS NOT NULL THEN
      -- Update existing pending transaction to completed
      UPDATE public.payment_transactions
      SET
        status = 'completed',
        user_id = current_user_id,
        customer_email = customer_email_param,
        metadata = metadata || jsonb_build_object(
          'has_bump', bump_found,
          'bump_product_id', bump_product_id_param,
          'has_coupon', coupon_id_param IS NOT NULL,
          'coupon_id', coupon_id_param,
          'converted_from_pending', true
        ),
        updated_at = NOW()
      WHERE id = pending_transaction_id
      RETURNING id INTO transaction_id_var;
    ELSE
      -- No pending transaction found - insert new record
      INSERT INTO public.payment_transactions (
        session_id, user_id, product_id, customer_email, amount, currency,
        stripe_payment_intent_id, status, metadata
      ) VALUES (
        session_id_param, current_user_id, product_id_param, customer_email_param,
        amount_total, upper(currency_param), stripe_payment_intent_id, 'completed',
        jsonb_build_object(
          'has_bump', bump_found,
          'bump_product_id', bump_product_id_param,
          'has_coupon', coupon_id_param IS NOT NULL,
          'coupon_id', coupon_id_param
        )
      ) RETURNING id INTO transaction_id_var;
    END IF;

    -- [Rest of the function continues unchanged - increment sales, handle coupons, grant access, etc.]
    PERFORM public.increment_sale_quantity_sold(product_id_param);

    IF coupon_id_param IS NOT NULL THEN
      DELETE FROM public.coupon_reservations
      WHERE coupon_id = coupon_id_param
        AND customer_email = customer_email_param
        AND expires_at > NOW();

      IF NOT FOUND THEN
        RAISE EXCEPTION 'No valid coupon reservation found';
      END IF;

      UPDATE public.coupons
      SET current_usage_count = COALESCE(current_usage_count, 0) + 1
      WHERE id = coupon_id_param
        AND is_active = true
        AND (usage_limit_global IS NULL OR COALESCE(current_usage_count, 0) < usage_limit_global);

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Coupon limit reached despite reservation';
      END IF;

      INSERT INTO public.coupon_redemptions (
        coupon_id, user_id, customer_email, transaction_id, discount_amount
      ) VALUES (
        coupon_id_param,
        COALESCE(current_user_id, existing_user_id),
        customer_email_param,
        transaction_id_var,
        0
      );
    END IF;

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

      PERFORM public.grant_product_access_service_role(existing_user_id, product_id_param);
      IF bump_found THEN
        PERFORM public.grant_product_access_service_role(existing_user_id, bump_product_id_param);
      END IF;

      RETURN jsonb_build_object(
        'success', true,
        'scenario', 'guest_purchase_existing_user_with_bump',
        'access_granted', true,
        'bump_access_granted', bump_found,
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
        VALUES (customer_email_param, bump_product_id_param, 0, session_id_param);
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

  EXCEPTION
    WHEN unique_violation THEN
      RETURN jsonb_build_object('success', false, 'error', 'Payment already recorded (race condition)');
    WHEN OTHERS THEN
      RAISE;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.process_stripe_payment_completion_with_bump TO service_role, authenticated;

COMMIT;
