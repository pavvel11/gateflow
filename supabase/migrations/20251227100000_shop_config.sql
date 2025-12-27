-- Migration: Shop Configuration Table
-- Created: 2025-12-27
-- Description: Add shop_config table for storing global shop settings

BEGIN;

-- ============================================================================
-- TABLE: shop_config
-- ============================================================================
-- Singleton table for global shop configuration

CREATE TABLE IF NOT EXISTS public.shop_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Basic shop settings
  shop_name TEXT NOT NULL DEFAULT 'My Shop',
  contact_email TEXT,
  default_currency TEXT NOT NULL DEFAULT 'USD',

  -- Tax settings
  tax_rate DECIMAL(5,2) DEFAULT 0,

  -- Custom settings (JSON for extensibility)
  custom_settings JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Ensure only one row exists (singleton pattern)
CREATE UNIQUE INDEX IF NOT EXISTS shop_config_singleton_idx ON public.shop_config ((true));

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE public.shop_config ENABLE ROW LEVEL SECURITY;

-- Policy: Admins have full access
CREATE POLICY "Admins full access to shop_config"
  ON public.shop_config
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.admin_users
      WHERE user_id = auth.uid()
    )
    OR (SELECT current_setting('role', true) = 'service_role')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.admin_users
      WHERE user_id = auth.uid()
    )
    OR (SELECT current_setting('role', true) = 'service_role')
  );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_shop_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_shop_config_updated_at
  BEFORE UPDATE ON public.shop_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_shop_config_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.shop_config IS
  'Singleton table for global shop configuration settings';

COMMENT ON COLUMN public.shop_config.default_currency IS
  'Default currency for the shop (e.g., USD, EUR, GBP)';

COMMENT ON COLUMN public.shop_config.custom_settings IS
  'Flexible JSONB field for additional custom settings';

COMMIT;
