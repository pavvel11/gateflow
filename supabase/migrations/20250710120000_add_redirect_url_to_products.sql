-- Migration: 20250710120000_add_redirect_url_to_products
-- Add redirect_url field to products table for custom redirect after authentication

BEGIN;

-- Add redirect_url column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS redirect_url TEXT;

-- Update any existing products to have a default redirect URL if needed
-- This is optional and can be removed if not needed
-- UPDATE products SET redirect_url = CONCAT('/protected-product?product=', slug) WHERE redirect_url IS NULL;

COMMIT;
