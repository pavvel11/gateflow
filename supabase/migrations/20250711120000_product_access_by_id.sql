-- Migration: Change user_product_access to reference product_id instead of product_slug
-- This improves data integrity and allows slug to be changed without breaking access

-- Step 1: Add product_id column
ALTER TABLE user_product_access 
ADD COLUMN product_id UUID REFERENCES products(id) ON DELETE CASCADE;

-- Step 2: Populate the new column based on existing product_slug values
UPDATE user_product_access
SET product_id = products.id
FROM products
WHERE user_product_access.product_slug = products.slug;

-- Step 3: Create a composite unique constraint on user_id and product_id
ALTER TABLE user_product_access 
ADD CONSTRAINT user_product_access_user_id_product_id_key 
UNIQUE (user_id, product_id);

-- Step 4: Create view for easy access checking by slug
CREATE OR REPLACE VIEW user_product_access_by_slug AS
SELECT 
    upa.id,
    upa.user_id,
    upa.product_id,
    p.slug as product_slug,
    p.name as product_name,
    upa.created_at,
    upa.tenant_id
FROM user_product_access upa
JOIN products p ON upa.product_id = p.id
WHERE p.is_active = true;

-- Step 5: Create function to check user access by slug
CREATE OR REPLACE FUNCTION check_user_product_access(
    user_id_param UUID,
    product_slug_param TEXT
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM user_product_access upa
        JOIN products p ON upa.product_id = p.id
        WHERE upa.user_id = user_id_param 
          AND p.slug = product_slug_param
          AND p.is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Create function to grant product access by slug
CREATE OR REPLACE FUNCTION grant_product_access(
    user_id_param UUID,
    product_slug_param TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    product_id_var UUID;
BEGIN
    -- Find product ID by slug
    SELECT id INTO product_id_var 
    FROM products 
    WHERE slug = product_slug_param AND is_active = true;
    
    -- If product doesn't exist, return false
    IF product_id_var IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Insert access record (ignore duplicates)
    INSERT INTO user_product_access (user_id, product_id, product_slug)
    VALUES (user_id_param, product_id_var, product_slug_param)
    ON CONFLICT (user_id, product_id) DO NOTHING;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- NOTE: We're keeping the product_slug column for now to maintain backward compatibility
-- A future migration will make product_id NOT NULL and remove product_slug
