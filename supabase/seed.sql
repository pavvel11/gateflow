-- Seed data for GateFlow Admin Panel
-- This file contains sample data for testing the admin panel and gatekeeper system

-- Insert sample products (compatible with existing gatekeeper system)
INSERT INTO products (name, slug, description, icon, price, currency, theme, layout_template, stripe_price_id, is_active) VALUES
  ('Free Starter Guide', 'free-starter-guide', 'A comprehensive guide to get you started with our platform. Perfect for beginners who want to learn the basics.', '🚀', 0, 'USD', 'dark', 'default', NULL, true),
  ('Premium Course', 'premium-course', 'Advanced techniques and strategies for power users. Includes exclusive content and resources.', '💎', 49.99, 'USD', 'light', 'default', 'price_1234567890', true),
  ('Pro Toolkit', 'pro-toolkit', 'Professional tools and templates for advanced users. Everything you need to take your skills to the next level.', '🛠️', 99.99, 'EUR', 'dark', 'default', 'price_0987654321', true),
  ('Enterprise Solution', 'enterprise-solution', 'Complete enterprise package with custom support and advanced features.', '🏢', 299.99, 'USD', 'light', 'default', 'price_enterprise123', true),
  ('Beta Feature Access', 'beta-features', 'Early access to new features and experimental tools. Help shape the future of our platform.', '⚡', 19.99, 'GBP', 'dark', 'default', 'price_beta456', false);

-- Note: Users and user_product_access will be created through the admin panel interface
-- This allows for proper testing of the admin functionality
