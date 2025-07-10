-- Migration to add redirect_url field to products table
-- This allows configuration of custom redirect destinations after authentication

BEGIN;

-- Add redirect_url column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS redirect_url TEXT;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_products_redirect_url ON products(redirect_url);

COMMIT;
