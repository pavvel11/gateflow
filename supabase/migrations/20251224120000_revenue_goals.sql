-- Migration: Revenue Goals Table
-- Date: 2025-12-24

-- Create table if not exists (for idempotency in case of retry)
CREATE TABLE IF NOT EXISTS public.revenue_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    goal_amount BIGINT NOT NULL, -- in cents
    start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure only one goal per product (or one global goal)
DROP INDEX IF EXISTS revenue_goals_global_idx;
DROP INDEX IF EXISTS revenue_goals_product_idx;

CREATE UNIQUE INDEX revenue_goals_global_idx ON public.revenue_goals ((1)) WHERE product_id IS NULL;
CREATE UNIQUE INDEX revenue_goals_product_idx ON public.revenue_goals (product_id) WHERE product_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.revenue_goals ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Admins can manage revenue goals" ON public.revenue_goals;
CREATE POLICY "Admins can manage revenue goals" ON public.revenue_goals
    USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

-- Function to get or create goal
CREATE OR REPLACE FUNCTION public.get_revenue_goal(p_product_id UUID DEFAULT NULL)
RETURNS TABLE (
    goal_amount BIGINT,
    start_date TIMESTAMPTZ
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
    SELECT rg.goal_amount, rg.start_date
    FROM public.revenue_goals rg
    WHERE (p_product_id IS NULL AND rg.product_id IS NULL)
       OR (p_product_id IS NOT NULL AND rg.product_id = p_product_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_revenue_goal(UUID) TO authenticated;

-- Function to upsert goal
CREATE OR REPLACE FUNCTION public.set_revenue_goal(
    p_goal_amount BIGINT,
    p_start_date TIMESTAMPTZ,
    p_product_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    -- Check Admin
    IF NOT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    -- Upsert logic handling the NULL product_id for global goal
    IF p_product_id IS NULL THEN
        -- Conflict target must match the unique index definition: ((1)) WHERE product_id IS NULL
        INSERT INTO public.revenue_goals (product_id, goal_amount, start_date, updated_at)
        VALUES (NULL, p_goal_amount, p_start_date, NOW())
        ON CONFLICT ((1)) WHERE product_id IS NULL 
        DO UPDATE SET 
            goal_amount = EXCLUDED.goal_amount,
            start_date = EXCLUDED.start_date,
            updated_at = NOW();
    ELSE
        INSERT INTO public.revenue_goals (product_id, goal_amount, start_date, updated_at)
        VALUES (p_product_id, p_goal_amount, p_start_date, NOW())
        ON CONFLICT (product_id) WHERE product_id IS NOT NULL
        DO UPDATE SET 
            goal_amount = EXCLUDED.goal_amount,
            start_date = EXCLUDED.start_date,
            updated_at = NOW();
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_revenue_goal(BIGINT, TIMESTAMPTZ, UUID) TO authenticated;