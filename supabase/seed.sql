-- Seed data for GateFlow Admin Panel
-- Sample products for testing different GateFlow protection modes

-- Insert sample products for testing
INSERT INTO products (name, slug, description, price, currency, is_active, is_featured, auto_grant_duration_days) VALUES
  ('Free Tutorial', 'free-tutorial', 'Free introductory tutorial - accessible to everyone.', 0, 'USD', true, true, NULL),
  ('Premium Course', 'premium-course', 'Advanced JavaScript course with exclusive content.', 49.99, 'USD', true, true, NULL),
  ('Pro Toolkit', 'pro-toolkit', 'Professional development tools and templates.', 99.99, 'USD', true, false, NULL),
  ('VIP Masterclass', 'vip-masterclass', 'Exclusive masterclass with live Q&A sessions.', 199.99, 'PLN', true, true, NULL),
  ('Enterprise Package', 'enterprise-package', 'Full enterprise solution with priority support.', 499.99, 'USD', true, false, 3);

-- Note: Users and user_product_access will be created through the admin panel interface
-- This allows for proper testing of the admin functionality

-- Example usage scenarios:
-- 1. 'free-tutorial' - Free content, accessible to everyone
-- 2. 'premium-course' - Page-level protection, requires login
-- 3. 'pro-toolkit' - Element-level protection, mixed content
-- 4. 'vip-masterclass' - Full page protection with custom styling
-- 5. 'enterprise-package' - Advanced features with analytics tracking
