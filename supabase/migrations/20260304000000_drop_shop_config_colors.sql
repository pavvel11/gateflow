-- Drop legacy color columns from shop_config.
-- These were never exposed in the settings UI and are superseded
-- by the JSON-based theme system in BrandingSettings.
ALTER TABLE public.shop_config
  DROP COLUMN IF EXISTS primary_color,
  DROP COLUMN IF EXISTS secondary_color,
  DROP COLUMN IF EXISTS accent_color;
