-- Snippet to seed categories and tags into existing DB
-- Extracted from updated seed.sql

BEGIN;

-- Insert sample Categories
INSERT INTO categories (name, slug, description) VALUES
('Courses', 'courses', 'Educational video courses and tutorials'),
('Tools', 'tools', 'Software tools and utilities'),
('Templates', 'templates', 'Ready-to-use templates for developers'),
('Bundles', 'bundles', 'Value packages with multiple products')
ON CONFLICT (slug) DO NOTHING;

-- Insert sample Tags
INSERT INTO tags (name, slug) VALUES
('JavaScript', 'javascript'),
('React', 'react'),
('Bestseller', 'bestseller'),
('New', 'new'),
('Free', 'free')
ON CONFLICT (slug) DO NOTHING;

-- Assign Categories to Products
INSERT INTO product_categories (product_id, category_id)
SELECT p.id, c.id
FROM products p, categories c
WHERE p.slug = 'free-tutorial' AND c.slug = 'courses'
ON CONFLICT DO NOTHING;

INSERT INTO product_categories (product_id, category_id)
SELECT p.id, c.id
FROM products p, categories c
WHERE p.slug = 'premium-course' AND c.slug = 'courses'
ON CONFLICT DO NOTHING;

INSERT INTO product_categories (product_id, category_id)
SELECT p.id, c.id
FROM products p, categories c
WHERE p.slug = 'vip-masterclass' AND c.slug = 'courses'
ON CONFLICT DO NOTHING;

INSERT INTO product_categories (product_id, category_id)
SELECT p.id, c.id
FROM products p, categories c
WHERE p.slug = 'pro-toolkit' AND c.slug = 'tools'
ON CONFLICT DO NOTHING;

INSERT INTO product_categories (product_id, category_id)
SELECT p.id, c.id
FROM products p, categories c
WHERE p.slug = 'pro-toolkit' AND c.slug = 'templates'
ON CONFLICT DO NOTHING;

INSERT INTO product_categories (product_id, category_id)
SELECT p.id, c.id
FROM products p, categories c
WHERE p.slug = 'enterprise-package' AND c.slug = 'bundles'
ON CONFLICT DO NOTHING;

-- Assign Tags to Products
INSERT INTO product_tags (product_id, tag_id)
SELECT p.id, t.id
FROM products p, tags t
WHERE p.slug = 'free-tutorial' AND t.slug = 'free'
ON CONFLICT DO NOTHING;

INSERT INTO product_tags (product_id, tag_id)
SELECT p.id, t.id
FROM products p, tags t
WHERE p.slug = 'free-tutorial' AND t.slug = 'javascript'
ON CONFLICT DO NOTHING;

INSERT INTO product_tags (product_id, tag_id)
SELECT p.id, t.id
FROM products p, tags t
WHERE p.slug = 'premium-course' AND t.slug = 'javascript'
ON CONFLICT DO NOTHING;

INSERT INTO product_tags (product_id, tag_id)
SELECT p.id, t.id
FROM products p, tags t
WHERE p.slug = 'premium-course' AND t.slug = 'react'
ON CONFLICT DO NOTHING;

INSERT INTO product_tags (product_id, tag_id)
SELECT p.id, t.id
FROM products p, tags t
WHERE p.slug = 'premium-course' AND t.slug = 'bestseller'
ON CONFLICT DO NOTHING;

INSERT INTO product_tags (product_id, tag_id)
SELECT p.id, t.id
FROM products p, tags t
WHERE p.slug = 'pro-toolkit' AND t.slug = 'new'
ON CONFLICT DO NOTHING;

INSERT INTO product_tags (product_id, tag_id)
SELECT p.id, t.id
FROM products p, tags t
WHERE p.slug = 'vip-masterclass' AND t.slug = 'bestseller'
ON CONFLICT DO NOTHING;

COMMIT;
