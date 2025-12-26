-- Exchange Rates System for Multi-Currency Conversion
-- Date: 2025-12-24

-- 1. Exchange Rates Table
-- Stores historical and current exchange rates
CREATE TABLE IF NOT EXISTS public.exchange_rates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  base_currency TEXT NOT NULL CHECK (length(base_currency) = 3 AND upper(base_currency) ~ '^[A-Z]{3}$'),
  target_currency TEXT NOT NULL CHECK (length(target_currency) = 3 AND upper(target_currency) ~ '^[A-Z]{3}$'),
  rate NUMERIC NOT NULL CHECK (rate > 0),
  source TEXT NOT NULL DEFAULT 'manual', -- 'exchangerate-api', 'fixer', 'ecb', 'manual'
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate rates for same pair at same time
  UNIQUE(base_currency, target_currency, fetched_at)
);

-- Index for fast lookups
CREATE INDEX idx_exchange_rates_currencies ON public.exchange_rates(base_currency, target_currency);
CREATE INDEX idx_exchange_rates_fetched_at ON public.exchange_rates(fetched_at DESC);

-- 2. Latest Rates View (materialized for performance)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.latest_exchange_rates AS
SELECT DISTINCT ON (base_currency, target_currency)
  id,
  base_currency,
  target_currency,
  rate,
  source,
  fetched_at
FROM public.exchange_rates
ORDER BY base_currency, target_currency, fetched_at DESC;

-- Index on materialized view
CREATE UNIQUE INDEX idx_latest_rates_currencies ON public.latest_exchange_rates(base_currency, target_currency);

-- Refresh function for materialized view
CREATE OR REPLACE FUNCTION public.refresh_latest_exchange_rates()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.latest_exchange_rates;
END;
$$;

-- 3. Function: Get Exchange Rate
CREATE OR REPLACE FUNCTION public.get_exchange_rate(
  p_from_currency TEXT,
  p_to_currency TEXT,
  p_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rate NUMERIC;
BEGIN
  -- Same currency, rate = 1
  IF p_from_currency = p_to_currency THEN
    RETURN 1.0;
  END IF;

  -- Try to get rate from latest_exchange_rates
  SELECT rate INTO v_rate
  FROM public.latest_exchange_rates
  WHERE base_currency = p_from_currency
    AND target_currency = p_to_currency
  LIMIT 1;

  -- If not found, try reverse rate (1 / rate)
  IF v_rate IS NULL THEN
    SELECT 1.0 / rate INTO v_rate
    FROM public.latest_exchange_rates
    WHERE base_currency = p_to_currency
      AND target_currency = p_from_currency
    LIMIT 1;
  END IF;

  -- If still not found, return NULL (caller should handle)
  RETURN v_rate;
END;
$$;

-- 4. Function: Convert Amount
CREATE OR REPLACE FUNCTION public.convert_currency_amount(
  p_amount NUMERIC,
  p_from_currency TEXT,
  p_to_currency TEXT
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rate NUMERIC;
BEGIN
  v_rate := public.get_exchange_rate(p_from_currency, p_to_currency);

  IF v_rate IS NULL THEN
    -- No rate found, return NULL
    RETURN NULL;
  END IF;

  RETURN ROUND(p_amount * v_rate);
END;
$$;

-- 5. Insert default rates (1:1 for same currency)
INSERT INTO public.exchange_rates (base_currency, target_currency, rate, source, fetched_at)
VALUES
  ('USD', 'USD', 1.0, 'system', NOW()),
  ('EUR', 'EUR', 1.0, 'system', NOW()),
  ('GBP', 'GBP', 1.0, 'system', NOW()),
  ('PLN', 'PLN', 1.0, 'system', NOW()),
  ('JPY', 'JPY', 1.0, 'system', NOW()),
  ('CAD', 'CAD', 1.0, 'system', NOW()),
  ('AUD', 'AUD', 1.0, 'system', NOW())
ON CONFLICT (base_currency, target_currency, fetched_at) DO NOTHING;

-- Refresh materialized view
REFRESH MATERIALIZED VIEW public.latest_exchange_rates;

-- 6. RLS Policies (read-only for authenticated users)
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER MATERIALIZED VIEW public.latest_exchange_rates OWNER TO postgres;

CREATE POLICY "exchange_rates_read_all" ON public.exchange_rates
  FOR SELECT TO authenticated
  USING (true);

-- Admin policy will be added later after admin_users table exists
-- For now, only service_role can modify rates via server actions

-- Grant permissions
GRANT SELECT ON public.exchange_rates TO authenticated;
GRANT SELECT ON public.latest_exchange_rates TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_exchange_rate(TEXT, TEXT, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.convert_currency_amount(NUMERIC, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_latest_exchange_rates() TO authenticated;

-- Comments
COMMENT ON TABLE public.exchange_rates IS 'Stores historical exchange rates for multi-currency conversion';
COMMENT ON MATERIALIZED VIEW public.latest_exchange_rates IS 'Latest exchange rates for each currency pair (cached for performance)';
COMMENT ON FUNCTION public.get_exchange_rate IS 'Get exchange rate between two currencies, tries reverse if direct not found';
COMMENT ON FUNCTION public.convert_currency_amount IS 'Convert amount from one currency to another';
