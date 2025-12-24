-- Consolidated Migration: Real-time Analytics Dashboard Functions and Realtime Setup
-- Date: 2025-12-23

-- 1. Function: Get Detailed Revenue Stats
-- Returns comprehensive revenue metrics for the dashboard with multi-currency support
CREATE OR REPLACE FUNCTION public.get_detailed_revenue_stats(
    p_product_id UUID DEFAULT NULL,
    p_goal_start_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_total_revenue_by_currency JSONB;
    v_today_revenue_by_currency JSONB;
    v_today_orders INTEGER;
    v_last_order_at TIMESTAMPTZ;
BEGIN
    -- Check Admin
    IF NOT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    -- Total Revenue by Currency (All time or since goal start, completed)
    SELECT COALESCE(jsonb_object_agg(currency, total), '{}'::jsonb) INTO v_total_revenue_by_currency
    FROM (
        SELECT
            pt.currency,
            SUM(pt.amount) as total
        FROM public.payment_transactions pt
        WHERE pt.status = 'completed'
          AND (p_product_id IS NULL OR pt.product_id = p_product_id)
          AND (p_goal_start_date IS NULL OR pt.created_at >= p_goal_start_date)
        GROUP BY pt.currency
    ) sub;

    -- Today's stats by Currency (Since midnight server time)
    SELECT
        COALESCE(jsonb_object_agg(currency, total), '{}'::jsonb),
        COALESCE(SUM(order_count), 0)::INTEGER
    INTO v_today_revenue_by_currency, v_today_orders
    FROM (
        SELECT
            pt.currency,
            SUM(pt.amount) as total,
            COUNT(*) as order_count
        FROM public.payment_transactions pt
        WHERE pt.status = 'completed'
          AND pt.created_at >= CURRENT_DATE
          AND (p_product_id IS NULL OR pt.product_id = p_product_id)
        GROUP BY pt.currency
    ) sub;

    -- Last Order Time
    SELECT pt.created_at INTO v_last_order_at
    FROM public.payment_transactions pt
    WHERE pt.status = 'completed'
      AND (p_product_id IS NULL OR pt.product_id = p_product_id)
    ORDER BY pt.created_at DESC
    LIMIT 1;

    RETURN jsonb_build_object(
        'totalRevenue', v_total_revenue_by_currency,
        'todayRevenue', v_today_revenue_by_currency,
        'todayOrders', v_today_orders,
        'lastOrderAt', v_last_order_at
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_detailed_revenue_stats(UUID, TIMESTAMPTZ) TO authenticated;

-- ... rest of the file remains same ...
-- 2. Function: Get Sales Chart Data with Multi-Currency Support
CREATE OR REPLACE FUNCTION public.get_sales_chart_data(
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ,
    p_product_id UUID DEFAULT NULL
)
RETURNS TABLE (
    date TEXT,
    amount_by_currency JSONB,
    orders INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    -- Check Admin
    IF NOT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    RETURN QUERY
    SELECT
        TO_CHAR(pt.created_at, 'YYYY-MM-DD') as date,
        COALESCE(jsonb_object_agg(pt.currency, currency_total), '{}'::jsonb) as amount_by_currency,
        SUM(currency_orders)::INTEGER as orders
    FROM (
        SELECT
            pt.created_at,
            pt.currency,
            SUM(pt.amount) as currency_total,
            COUNT(*) as currency_orders
        FROM public.payment_transactions pt
        WHERE pt.status = 'completed'
          AND pt.created_at >= p_start_date
          AND pt.created_at <= p_end_date
          AND (p_product_id IS NULL OR pt.product_id = p_product_id)
        GROUP BY TO_CHAR(pt.created_at, 'YYYY-MM-DD'), pt.currency, pt.created_at
    ) pt
    GROUP BY 1
    ORDER BY 1 ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_sales_chart_data(TIMESTAMPTZ, TIMESTAMPTZ, UUID) TO authenticated;

-- 3. Function: Get Hourly Revenue Stats with Multi-Currency Support
CREATE OR REPLACE FUNCTION public.get_hourly_revenue_stats(
    p_target_date DATE DEFAULT CURRENT_DATE,
    p_product_id UUID DEFAULT NULL
)
RETURNS TABLE (
    hour INTEGER,
    amount_by_currency JSONB,
    orders INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    -- Check Admin
    IF NOT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    -- Generate series 0-23 to ensure all hours are returned even if 0 sales
    RETURN QUERY
    WITH hours AS (
        SELECT generate_series(0, 23) AS h
    ),
    sales AS (
        SELECT
            EXTRACT(HOUR FROM pt.created_at)::INTEGER as sale_hour,
            pt.currency,
            SUM(pt.amount) as total_amount,
            COUNT(*) as total_orders
        FROM public.payment_transactions pt
        WHERE pt.status = 'completed'
          AND pt.created_at::DATE = p_target_date
          AND (p_product_id IS NULL OR pt.product_id = p_product_id)
        GROUP BY 1, 2
    ),
    aggregated_sales AS (
        SELECT
            sale_hour,
            jsonb_object_agg(currency, total_amount) as amount_by_currency,
            SUM(total_orders)::INTEGER as total_orders
        FROM sales
        GROUP BY sale_hour
    )
    SELECT
        hours.h,
        COALESCE(aggregated_sales.amount_by_currency, '{}'::jsonb),
        COALESCE(aggregated_sales.total_orders, 0)::INTEGER
    FROM hours
    LEFT JOIN aggregated_sales ON hours.h = aggregated_sales.sale_hour
    ORDER BY hours.h ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_hourly_revenue_stats(DATE, UUID) TO authenticated;

-- 4. Realtime Setup
ALTER TABLE payment_transactions REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'payment_transactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE payment_transactions;
  END IF;
END $$;
