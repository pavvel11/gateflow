-- Migration: Stripe Restricted API Keys Configuration System
-- Created: 2025-12-27
-- Description: Add encrypted storage for Stripe RAK with test/live mode separation and key rotation support

BEGIN;

-- ============================================================================
-- TABLE: stripe_configurations
-- ============================================================================
-- Stores encrypted Stripe Restricted API Keys with AES-256-GCM encryption
-- Supports test/live mode separation and key rotation (90-day reminders)

CREATE TABLE IF NOT EXISTS public.stripe_configurations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Mode identification
  mode TEXT NOT NULL CHECK (mode IN ('test', 'live')),

  -- Encrypted key storage (AES-256-GCM)
  encrypted_key TEXT NOT NULL, -- Base64 encoded encrypted key
  encryption_iv TEXT NOT NULL,  -- Initialization vector for GCM
  encryption_tag TEXT NOT NULL, -- Authentication tag for GCM

  -- Key metadata (non-sensitive)
  key_last_4 TEXT NOT NULL CHECK (length(key_last_4) = 4),
  key_prefix TEXT NOT NULL CHECK (key_prefix IN ('rk_test_', 'rk_live_', 'sk_test_', 'sk_live_')),

  -- Validation status
  permissions_verified BOOLEAN DEFAULT false NOT NULL,
  last_validated_at TIMESTAMPTZ,
  account_id TEXT, -- Stripe account ID from validation

  -- Rotation management
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ, -- Optional: for rotation reminders (e.g., +90 days)
  rotation_reminder_sent BOOLEAN DEFAULT false,

  -- Status
  is_active BOOLEAN DEFAULT true NOT NULL
);

-- ============================================================================
-- CONSTRAINTS
-- ============================================================================

-- Ensure only one active config per mode
-- This prevents conflicts when multiple admins configure simultaneously
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_mode_per_stripe_config
  ON public.stripe_configurations (mode, is_active)
  WHERE is_active = true;

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for mode lookup
CREATE INDEX IF NOT EXISTS idx_stripe_config_mode
  ON public.stripe_configurations(mode);

-- Index for active configurations
CREATE INDEX IF NOT EXISTS idx_stripe_config_active
  ON public.stripe_configurations(is_active)
  WHERE is_active = true;

-- Index for rotation reminders (finding expiring keys)
CREATE INDEX IF NOT EXISTS idx_stripe_config_expires_at
  ON public.stripe_configurations(expires_at)
  WHERE is_active = true AND expires_at IS NOT NULL;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE public.stripe_configurations ENABLE ROW LEVEL SECURITY;

-- Policy: Admins have full access to all stripe configurations
CREATE POLICY "Admins full access to stripe_configurations"
  ON public.stripe_configurations
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

-- Trigger: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_stripe_configurations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_stripe_configurations_updated_at
  BEFORE UPDATE ON public.stripe_configurations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_stripe_configurations_updated_at();

-- ============================================================================
-- COMMENTS (Documentation)
-- ============================================================================

COMMENT ON TABLE public.stripe_configurations IS
  'Stores encrypted Stripe Restricted API Keys with support for test/live modes and key rotation';

COMMENT ON COLUMN public.stripe_configurations.mode IS
  'Stripe mode: test or live';

COMMENT ON COLUMN public.stripe_configurations.encrypted_key IS
  'AES-256-GCM encrypted Stripe API key (base64 encoded)';

COMMENT ON COLUMN public.stripe_configurations.encryption_iv IS
  'Initialization vector for AES-256-GCM encryption (base64 encoded)';

COMMENT ON COLUMN public.stripe_configurations.encryption_tag IS
  'Authentication tag for AES-256-GCM encryption (base64 encoded)';

COMMENT ON COLUMN public.stripe_configurations.key_last_4 IS
  'Last 4 characters of the API key for display purposes';

COMMENT ON COLUMN public.stripe_configurations.key_prefix IS
  'Key type prefix: rk_test_, rk_live_, sk_test_, or sk_live_';

COMMENT ON COLUMN public.stripe_configurations.permissions_verified IS
  'Whether required Stripe API permissions have been verified';

COMMENT ON COLUMN public.stripe_configurations.expires_at IS
  'Expiration date for key rotation reminders (typically 90 days from creation)';

COMMENT ON COLUMN public.stripe_configurations.is_active IS
  'Whether this configuration is currently active (only one active per mode)';

COMMIT;
