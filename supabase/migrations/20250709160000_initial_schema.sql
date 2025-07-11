-- Create initial database structure for GateFlow Admin Panel
-- Migration: 20250709160000_initial_schema
-- Updated: Now uses UUID for product IDs and product_id for user_product_access relationships
-- Based on existing gateflow_setup.sql and user_product_access_setup.sql

BEGIN;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create products table 
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- Required for gatekeeper system
  description TEXT,
  icon TEXT, -- Used by gatekeeper for UI
  price NUMERIC DEFAULT 0 NOT NULL,
  currency TEXT DEFAULT 'USD' NOT NULL, -- Currency for price (USD, EUR, GBP, etc.)
  redirect_url TEXT, -- Custom redirect URL after authentication
  theme TEXT DEFAULT 'dark' NOT NULL, -- Used by gatekeeper for theming
  layout_template TEXT DEFAULT 'default' NOT NULL, -- Used by gatekeeper layouts
  stripe_price_id TEXT, -- Stripe integration
  is_active BOOLEAN NOT NULL DEFAULT true, -- Admin panel functionality
  tenant_id TEXT, -- Support for multi-tenancy
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create user_product_access table with product_id reference for better data integrity
CREATE TABLE IF NOT EXISTS user_product_access (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL, -- Improved data integrity
  tenant_id TEXT, -- Support for multi-tenancy
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (user_id, product_id) -- Ensure a user can only have one access entry per product
);

-- Create audit_logs table for tracking admin actions
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  action TEXT NOT NULL,
  user_id UUID NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create view for easy access checking by slug
CREATE OR REPLACE VIEW user_product_access_by_slug AS
SELECT 
    upa.id,
    upa.user_id,
    upa.product_id,
    p.slug as product_slug,
    p.name as product_name,
    p.price as product_price,
    p.currency as product_currency,
    upa.created_at,
    upa.tenant_id
FROM user_product_access upa
JOIN products p ON upa.product_id = p.id
WHERE p.is_active = true;

-- Create a view for user access statistics
CREATE OR REPLACE VIEW user_access_stats AS
SELECT 
    u.id as user_id,
    u.email,
    u.created_at as user_created_at,
    u.email_confirmed_at,
    u.last_sign_in_at,
    u.raw_user_meta_data,
    COUNT(upa.id) as total_products,
    COALESCE(SUM(p.price), 0) as total_value,
    MAX(upa.created_at) as last_access_granted_at,
    MIN(upa.created_at) as first_access_granted_at
FROM auth.users u
LEFT JOIN user_product_access upa ON u.id = upa.user_id
LEFT JOIN products p ON upa.product_id = p.id
GROUP BY u.id, u.email, u.created_at, u.email_confirmed_at, u.last_sign_in_at, u.raw_user_meta_data;

-- Create a more detailed user product access view for admin panels
CREATE OR REPLACE VIEW user_product_access_detailed AS
SELECT 
    upa.id,
    upa.user_id,
    upa.product_id,
    p.slug as product_slug,
    p.name as product_name,
    p.description as product_description,
    p.price as product_price,
    p.currency as product_currency,
    p.icon as product_icon,
    p.theme as product_theme,
    p.is_active as product_is_active,
    upa.created_at as access_created_at,
    p.created_at as product_created_at,
    p.updated_at as product_updated_at,
    upa.tenant_id
FROM user_product_access upa
JOIN products p ON upa.product_id = p.id;

-- Create function to check user access by slug
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

-- Create function to grant product access by slug
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
    INSERT INTO user_product_access (user_id, product_id)
    VALUES (user_id_param, product_id_var)
    ON CONFLICT (user_id, product_id) DO NOTHING;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get complete user profile with statistics
CREATE OR REPLACE FUNCTION get_user_profile(user_id_param UUID)
RETURNS JSONB AS $$
DECLARE
    user_info JSONB;
    user_stats JSONB;
    user_access JSONB;
BEGIN
    -- Get user info from auth.users
    SELECT jsonb_build_object(
        'id', id,
        'email', email,
        'created_at', created_at,
        'email_confirmed_at', email_confirmed_at,
        'last_sign_in_at', last_sign_in_at,
        'user_metadata', raw_user_meta_data
    ) INTO user_info
    FROM auth.users
    WHERE id = user_id_param;
    
    -- Get user statistics
    SELECT jsonb_build_object(
        'total_products', total_products,
        'total_value', total_value,
        'last_access_granted_at', last_access_granted_at,
        'first_access_granted_at', first_access_granted_at
    ) INTO user_stats
    FROM user_access_stats
    WHERE user_id = user_id_param;
    
    -- Get user access details
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', id,
            'product_id', product_id,
            'product_name', product_name,
            'product_slug', product_slug,
            'product_price', product_price,
            'product_currency', product_currency,
            'product_icon', product_icon,
            'product_is_active', product_is_active,
            'granted_at', access_created_at
        )
    ) INTO user_access
    FROM user_product_access_detailed
    WHERE user_id = user_id_param;
    
    -- Return the combined user profile
    RETURN jsonb_build_object(
        'user', user_info,
        'stats', user_stats,
        'access', COALESCE(user_access, '[]'::jsonb)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);
CREATE INDEX IF NOT EXISTS idx_user_product_access_user_id ON user_product_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_product_access_product_id ON user_product_access(product_id);
CREATE INDEX IF NOT EXISTS idx_user_product_access_unique ON user_product_access(user_id, product_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_products_tenant_id ON products(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_product_access_tenant_id ON user_product_access(tenant_id) WHERE tenant_id IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_product_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for products table
-- Allow public read access for all products (needed by gatekeeper.js)
CREATE POLICY "Allow public read access for everyone" ON products
  FOR SELECT
  USING (true);

-- Allow authenticated users full access to products (admin panel)
CREATE POLICY "Allow authenticated users to manage products" ON products
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for user_product_access table
-- Allow users to read their own access records
CREATE POLICY "Allow users to read their own product access" ON user_product_access
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow service role to insert access records (used by Edge Functions and admin panel)
CREATE POLICY "Allow service role to insert product access" ON user_product_access
  FOR INSERT
  WITH CHECK (true);

-- Allow authenticated users to insert access for FREE products (gatekeeper auto-grant)
CREATE POLICY "Allow authenticated users to insert access for free products" ON user_product_access
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM products WHERE id = product_id AND price = 0)
  );

-- Allow authenticated users full access to user_product_access (admin panel)
CREATE POLICY "Allow authenticated users to manage access" ON user_product_access
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for audit_logs table
-- Only authenticated users can read audit logs
CREATE POLICY "Allow authenticated users to read audit logs" ON audit_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- Only authenticated users can insert audit logs
CREATE POLICY "Allow authenticated users to insert audit logs" ON audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ language plpgsql;

-- Create trigger for products table
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;
