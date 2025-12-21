-- Seed data for GateFlow Admin Panel
-- Sample products for testing different GateFlow protection modes

-- Insert sample products for testing
INSERT INTO products (name, slug, description, price, currency, is_active, is_featured, auto_grant_duration_days, success_redirect_url, pass_params_to_redirect) VALUES
  ('Free Tutorial', 'free-tutorial', 'Free introductory tutorial - accessible to everyone.', 0, 'USD', true, true, NULL, '/checkout/premium-course', true),
  ('Premium Course', 'premium-course', 'Advanced JavaScript course with exclusive content.', 49.99, 'USD', true, true, NULL, NULL, false),
  ('Pro Toolkit', 'pro-toolkit', 'Professional development tools and templates.', 99.99, 'USD', true, false, NULL, NULL, false),
  ('VIP Masterclass', 'vip-masterclass', 'Exclusive masterclass with live Q&A sessions.', 199.99, 'USD', true, true, NULL, NULL, false),
  ('Enterprise Package', 'enterprise-package', 'Full enterprise solution with priority support.', 499.99, 'USD', true, false, 3, NULL, false);

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

-- Insert sample coupons
-- 1. General percentage discount (Welcome coupon)
INSERT INTO coupons (code, name, discount_type, discount_value, usage_limit_global, is_active) 
VALUES ('WELCOME10', 'Welcome 10% Off', 'percentage', 10, 1000, true);

-- 2. Fixed amount discount ($50 off)
INSERT INTO coupons (code, name, discount_type, discount_value, currency, is_active) 
VALUES ('SAVE50', '$50 Savings', 'fixed', 50, 'USD', true);

-- 3. Email-specific exclusive coupon (targeted offer)
INSERT INTO coupons (code, name, discount_type, discount_value, allowed_emails, is_active) 
VALUES ('EXCLUSIVE90', 'VIP 90% Discount', 'percentage', 90, '["vip@example.com", "plkjurczyk@gmail.com"]'::jsonb, true);

-- 4. Product-specific coupon
INSERT INTO coupons (code, name, discount_type, discount_value, allowed_product_ids, is_active) 
VALUES ('COURSE20', 'Course Special 20%', 'percentage', 20, (SELECT jsonb_build_array(id) FROM products WHERE slug = 'premium-course'), true);

-- Insert sample webhook data
-- 1. Sample Webhook Endpoint
INSERT INTO webhook_endpoints (id, url, events, description, is_active, secret)
VALUES (
  '88888888-8888-4888-a888-888888888888',
  'https://webhook.site/gateflow-test-endpoint',
  ARRAY['purchase.completed', 'lead.captured'],
  'Zapier CRM Integration',
  true,
  'sk_test_webhook_secret_key_12345'
);

-- 2. Sample Webhook Logs (Updated schema: status, http_status)
-- Success Log
INSERT INTO webhook_logs (endpoint_id, event_type, payload, status, http_status, response_body, duration_ms, created_at)
VALUES (
  '88888888-8888-4888-a888-888888888888',
  'purchase.completed',
  '{"event": "purchase.completed", "data": {"email": "success@example.com", "amount": 4900}}'::jsonb,
  'success',
  200,
  '{"status": "ok", "message": "Received"}',
  150,
  NOW() - INTERVAL '1 hour'
);

-- Failed Log (Server Error)
INSERT INTO webhook_logs (endpoint_id, event_type, payload, status, http_status, response_body, error_message, duration_ms, created_at)
VALUES (
  '88888888-8888-4888-a888-888888888888',
  'purchase.completed',
  '{"event": "purchase.completed", "data": {"email": "error@example.com", "amount": 9900}}'::jsonb,
  'failed',
  500,
  'Internal Server Error',
  'HTTP 500',
  2500,
  NOW() - INTERVAL '30 minutes'
);

-- Failed Log (Network Timeout)
INSERT INTO webhook_logs (endpoint_id, event_type, payload, status, http_status, response_body, error_message, duration_ms, created_at)
VALUES (
  '88888888-8888-4888-a888-888888888888',
  'lead.captured',
  '{"event": "lead.captured", "data": {"email": "lead@example.com"}}'::jsonb,
  'failed',
  0,
  NULL,
  'Request timed out (5s)',
  5001,
  NOW() - INTERVAL '5 minutes'
);

-- Note: Users and user_product_access will be created through the admin panel interface
