-- Change vat_rate default from 23.00 to NULL (copy-on-create from shop_config)
ALTER TABLE products ALTER COLUMN vat_rate SET DEFAULT NULL;

-- Set existing products with hardcoded 23% to NULL (will use shop_config default on next edit)
UPDATE products SET vat_rate = NULL WHERE vat_rate = 23.00;

-- Ensure shop_config has a tax_rate set (23% Polish default)
UPDATE shop_config SET tax_rate = 0.23 WHERE tax_rate = 0 OR tax_rate IS NULL;
