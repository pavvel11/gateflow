-- Omnibus Directive (EU 2019/2161) - 30-Day Price History Tracking
-- Implements requirement to display lowest price from last 30 days when showing discounts

-- ============================================================================
-- 1. Add omnibus_exempt flag to products table
-- ============================================================================
ALTER TABLE products
ADD COLUMN IF NOT EXISTS omnibus_exempt BOOLEAN DEFAULT false NOT NULL;

COMMENT ON COLUMN products.omnibus_exempt IS
  'Exempt this product from Omnibus price history display (e.g., perishable goods, new arrivals <30 days)';

-- ============================================================================
-- 2. Create product_price_history table
-- ============================================================================
CREATE TABLE IF NOT EXISTS product_price_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  price NUMERIC NOT NULL CHECK (price >= 0),
  currency TEXT NOT NULL CHECK (length(currency) = 3),
  vat_rate DECIMAL(5,2),
  price_includes_vat BOOLEAN DEFAULT true,
  effective_from TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  effective_until TIMESTAMPTZ, -- NULL = current price
  changed_by UUID REFERENCES auth.users(id),
  change_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE product_price_history IS
  'Price history for Omnibus Directive compliance (EU 2019/2161) - tracks lowest price in last 30 days';

-- Index for fast queries (product + date range)
CREATE INDEX IF NOT EXISTS idx_product_price_history_product_date
  ON product_price_history(product_id, effective_from DESC);

-- Index for finding current prices (where effective_until IS NULL)
CREATE INDEX IF NOT EXISTS idx_product_price_history_current
  ON product_price_history(product_id, effective_until) WHERE effective_until IS NULL;

-- ============================================================================
-- 3. Add Omnibus settings to shop_config as proper columns
-- ============================================================================
ALTER TABLE shop_config
ADD COLUMN IF NOT EXISTS omnibus_enabled BOOLEAN DEFAULT true NOT NULL;

COMMENT ON COLUMN shop_config.omnibus_enabled IS
  'Global toggle for EU Omnibus Directive (2019/2161) price history display';

-- ============================================================================
-- 4. Create trigger function to log price changes automatically
-- ============================================================================
CREATE OR REPLACE FUNCTION log_product_price_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if price actually changed
  IF (TG_OP = 'UPDATE' AND
      (OLD.price != NEW.price OR
       OLD.currency != NEW.currency OR
       OLD.vat_rate != NEW.vat_rate)) OR
     TG_OP = 'INSERT' THEN

    -- Close previous price period
    IF TG_OP = 'UPDATE' THEN
      UPDATE product_price_history
      SET effective_until = NOW()
      WHERE product_id = OLD.id
        AND effective_until IS NULL;
    END IF;

    -- Insert new price record
    INSERT INTO product_price_history (
      product_id, price, currency, vat_rate,
      price_includes_vat, effective_from
    ) VALUES (
      NEW.id, NEW.price, NEW.currency, NEW.vat_rate,
      NEW.price_includes_vat, NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION log_product_price_change() IS
  'Automatically logs price changes to product_price_history for Omnibus compliance';

-- ============================================================================
-- 5. Create trigger on products table
-- ============================================================================
DROP TRIGGER IF EXISTS product_price_change_trigger ON products;

CREATE TRIGGER product_price_change_trigger
  AFTER INSERT OR UPDATE OF price, currency, vat_rate
  ON products
  FOR EACH ROW
  EXECUTE FUNCTION log_product_price_change();

-- ============================================================================
-- 6. Backfill existing products (create initial price history entries)
-- ============================================================================
-- Only backfill products that don't have any price history yet
INSERT INTO product_price_history (
  product_id,
  price,
  currency,
  vat_rate,
  price_includes_vat,
  effective_from
)
SELECT
  id,
  price,
  currency,
  vat_rate,
  price_includes_vat,
  created_at -- Use product creation time as effective_from
FROM products
WHERE NOT EXISTS (
  SELECT 1 FROM product_price_history
  WHERE product_price_history.product_id = products.id
);

-- ============================================================================
-- 7. Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on product_price_history
ALTER TABLE product_price_history ENABLE ROW LEVEL SECURITY;

-- Everyone can read price history (public data for transparency)
CREATE POLICY "Price history is publicly readable"
  ON product_price_history
  FOR SELECT
  USING (true);

-- Only system (via trigger) or admins can insert price history
CREATE POLICY "Only system or admins can insert price history"
  ON product_price_history
  FOR INSERT
  WITH CHECK (
    -- Allow trigger (no auth.uid())
    auth.uid() IS NULL
    OR
    -- Or allow admins
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
    )
  );

-- Only admins can update price history (for manual corrections)
CREATE POLICY "Only admins can update price history"
  ON product_price_history
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
    )
  );

-- Only admins can delete price history
CREATE POLICY "Only admins can delete price history"
  ON product_price_history
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
    )
  );

-- shop_config already has RLS policies defined in core schema migration
