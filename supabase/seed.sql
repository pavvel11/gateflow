-- Seed data for GateFlow Admin Panel
-- Sample products for testing different GateFlow protection modes

-- Insert sample products for testing
INSERT INTO products (name, slug, description, price, currency, is_active, is_featured, auto_grant_duration_days) VALUES
  ('Free Tutorial', 'free-tutorial', 'Free introductory tutorial - accessible to everyone.', 0, 'USD', true, true, NULL),
  ('Premium Course', 'premium-course', 'Advanced JavaScript course with exclusive content.', 49.99, 'USD', true, true, NULL),
  ('Pro Toolkit', 'pro-toolkit', 'Professional development tools and templates.', 99.99, 'USD', true, false, NULL),
  ('VIP Masterclass', 'vip-masterclass', 'Exclusive masterclass with live Q&A sessions.', 199.99, 'USD', true, true, NULL),
  ('Enterprise Package', 'enterprise-package', 'Full enterprise solution with priority support.', 499.99, 'USD', true, false, 3);

-- Insert sample order bumps
-- Bump 1: Add Pro Toolkit to Premium Course for $29.99 (Huge discount!)
INSERT INTO order_bumps (
  main_product_id, 
  bump_product_id, 
  bump_price, 
  bump_title, 
  bump_description, 
  is_active
) VALUES (
  (SELECT id FROM products WHERE slug = 'premium-course'),
  (SELECT id FROM products WHERE slug = 'pro-toolkit'),
  29.99,
  '🚀 Add the Pro Toolkit for just $29.99!',
  'Get professional development templates and tools worth $99.99. One-time offer!',
  true
);

-- Bump 2: Add Enterprise Package to VIP Masterclass for $199.99
INSERT INTO order_bumps (
  main_product_id, 
  bump_product_id, 
  bump_price, 
  bump_title, 
  bump_description, 
  is_active,
  access_duration_days
) VALUES (
  (SELECT id FROM products WHERE slug = 'vip-masterclass'),
  (SELECT id FROM products WHERE slug = 'enterprise-package'),
  199.99,
  '🏢 Upgrade to Enterprise Status',
  'Add priority support and full enterprise solutions. Save $300 instanly! (Special 7-day access)',
  true,
  7
);

-- Note: Users and user_product_access will be created through the admin panel interface
-- This allows for proper testing of the admin functionality