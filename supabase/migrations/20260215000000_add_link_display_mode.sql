-- Migration: Add link_display_mode to payment_method_config
-- Description: Allow admin to choose how Stripe Link appears in checkout:
--   'express' = Link button in Express Checkout section (one-click pay)
--   'payment_element' = Link tab inside PaymentElement (alongside BLIK/P24/Card)
-- Author: Claude Opus 4.6
-- Date: 2026-02-15

BEGIN;

ALTER TABLE public.payment_method_config
ADD COLUMN IF NOT EXISTS link_display_mode TEXT DEFAULT 'express' NOT NULL
CHECK (link_display_mode IN ('express', 'payment_element'));

COMMENT ON COLUMN public.payment_method_config.link_display_mode IS
  'How Stripe Link appears in checkout: express (one-click button in Express Checkout section) or payment_element (tab alongside other payment methods)';

COMMIT;
