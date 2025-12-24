-- Consolidated Migration: Real-time Analytics Dashboard Functions and Realtime Setup
-- Date: 2025-12-23

-- 1. Function: Get Detailed Revenue Stats
-- Returns comprehensive revenue metrics for the dashboard
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
    v_total_revenue NUMERIC;
    v_today_revenue NUMERIC;
    v_today_orders INTEGER;
    v_last_order_at TIMESTAMPTZ;
BEGIN
    -- Check Admin
    IF NOT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    -- Total Revenue (All time or since goal start, completed)
    SELECT COALESCE(SUM(pt.amount), 0) INTO v_total_revenue 
    FROM public.payment_transactions pt
    WHERE pt.status = 'completed'
      AND (p_product_id IS NULL OR pt.product_id = p_product_id)
      AND (p_goal_start_date IS NULL OR pt.created_at >= p_goal_start_date);

    -- Today's stats (Since midnight server time)
    SELECT 
        COALESCE(SUM(pt.amount), 0),
        COUNT(*)
    INTO v_today_revenue, v_today_orders
    FROM public.payment_transactions pt
    WHERE pt.status = 'completed' 
      AND pt.created_at >= CURRENT_DATE
      AND (p_product_id IS NULL OR pt.product_id = p_product_id);

    -- Last Order Time
    SELECT pt.created_at INTO v_last_order_at
    FROM public.payment_transactions pt
    WHERE pt.status = 'completed'
      AND (p_product_id IS NULL OR pt.product_id = p_product_id)
    ORDER BY pt.created_at DESC
    LIMIT 1;

    RETURN jsonb_build_object(
        'totalRevenue', v_total_revenue,
        'todayRevenue', v_today_revenue,
        'todayOrders', v_today_orders,
        'lastOrderAt', v_last_order_at
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_detailed_revenue_stats(UUID, TIMESTAMPTZ) TO authenticated;

-- ... rest of the file remains same ...
-- 2. Function: Get Sales Chart Data
CREATE OR REPLACE FUNCTION public.get_sales_chart_data(
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ,
    p_product_id UUID DEFAULT NULL
)
RETURNS TABLE (
    date TEXT,
    amount NUMERIC,
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
        SUM(pt.amount) as amount,
        COUNT(*)::INTEGER as orders
    FROM public.payment_transactions pt
    WHERE pt.status = 'completed'
      AND pt.created_at >= p_start_date
      AND pt.created_at <= p_end_date
      AND (p_product_id IS NULL OR pt.product_id = p_product_id)
    GROUP BY 1
    ORDER BY 1 ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_sales_chart_data(TIMESTAMPTZ, TIMESTAMPTZ, UUID) TO authenticated;

-- 3. Function: Get Hourly Revenue Stats
CREATE OR REPLACE FUNCTION public.get_hourly_revenue_stats(
    p_target_date DATE DEFAULT CURRENT_DATE,
    p_product_id UUID DEFAULT NULL
)
RETURNS TABLE (
    hour INTEGER,
    amount NUMERIC,
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
            SUM(pt.amount) as total_amount,
            COUNT(*) as total_orders
        FROM public.payment_transactions pt
        WHERE pt.status = 'completed'
          AND pt.created_at::DATE = p_target_date
          AND (p_product_id IS NULL OR pt.product_id = p_product_id)
        GROUP BY 1
    )
    SELECT 
        hours.h,
        COALESCE(sales.total_amount, 0),
        COALESCE(sales.total_orders, 0)::INTEGER
    FROM hours
    LEFT JOIN sales ON hours.h = sales.sale_hour
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
