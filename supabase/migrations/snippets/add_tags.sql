-- Snippet to add tags to running DB without reset
-- Extracted from updated initial_schema.sql

BEGIN;

CREATE TABLE IF NOT EXISTS tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(name) <= 50),
  slug TEXT UNIQUE NOT NULL CHECK (slug ~ '^[a-zA-Z0-9_-]+$' AND length(slug) BETWEEN 1 AND 50),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS product_tags (
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (product_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug);
CREATE INDEX IF NOT EXISTS idx_product_tags_product_id ON product_tags(product_id);
CREATE INDEX IF NOT EXISTS idx_product_tags_tag_id ON product_tags(tag_id);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_tags ENABLE ROW LEVEL SECURITY;

-- Policies (Dropping first to avoid conflicts if re-running)
DROP POLICY IF EXISTS "Public read access for tags" ON tags;
CREATE POLICY "Public read access for tags" ON tags FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins full access for tags" ON tags;
CREATE POLICY "Admins full access for tags" ON tags
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Public read access for product_tags" ON product_tags;
CREATE POLICY "Public read access for product_tags" ON product_tags FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins full access for product_tags" ON product_tags;
CREATE POLICY "Admins full access for product_tags" ON product_tags
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

COMMIT;
