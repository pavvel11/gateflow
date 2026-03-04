-- Add expiry_notified_at to user_product_access
-- Used by the /api/cron?job=access-expired endpoint to prevent duplicate webhook dispatch.
-- When the cron fires, it queries: access_expires_at < NOW() AND expiry_notified_at IS NULL
-- After dispatching the access.expired webhook, it sets expiry_notified_at = NOW().

ALTER TABLE public.user_product_access
  ADD COLUMN IF NOT EXISTS expiry_notified_at TIMESTAMPTZ;

-- Index: cron job queries this column frequently
CREATE INDEX IF NOT EXISTS idx_user_product_access_expiry_notified
  ON public.user_product_access (expiry_notified_at)
  WHERE expiry_notified_at IS NULL;
