-- Seed data for GateFlow Admin Panel
-- Sample products for testing different GateFlow protection modes

-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Insert shop configuration (singleton)
INSERT INTO shop_config (
  default_currency,
  shop_name,
  logo_url,
  primary_color,
  secondary_color,
  accent_color,
  font_family,
  custom_settings
) VALUES (
  'USD',
  'GateFlow Demo Shop',
  NULL, -- Upload logo to imgbb.com
  '#9333ea', -- purple-600
  '#ec4899', -- pink-600
  '#8b5cf6', -- violet-500
  'system',
  '{}'::jsonb
)
ON CONFLICT DO NOTHING;

-- Insert sample products for testing
INSERT INTO products (
  name,
  slug,
  description,
  long_description,
  icon,
  image_url,
  thumbnail_url,
  price,
  currency,
  vat_rate,
  price_includes_vat,
  features,
  is_active,
  is_featured,
  auto_grant_duration_days,
  success_redirect_url,
  pass_params_to_redirect
) VALUES
  (
    'Free Tutorial',
    'free-tutorial',
    'Free introductory tutorial - accessible to everyone.',
    'Complete introduction to our platform with step-by-step guidance. Perfect for beginners who want to get started quickly.',
    '📚',
    NULL,
    NULL,
    0,
    'USD',
    23.00,
    true,
    '[{"title": "What you''ll get", "items": ["30-minute video tutorial", "PDF guide", "Starter templates"]}]'::jsonb,
    true,
    true,
    NULL,
    '/checkout/premium-course',
    true
  ),
  (
    'Premium Course',
    'premium-course',
    'Advanced JavaScript course with exclusive content.',
    E'## Master Modern JavaScript

Deep dive into **modern JavaScript** with real-world projects. Learn advanced patterns, async programming, and build production-ready applications.

### What makes this course special?

- 🎯 **Project-based learning** - Build 3 real apps
- 💡 **Advanced concepts** - Closures, async/await, modules
- 🚀 **Production-ready** - Deploy to cloud platforms

> "Best JavaScript course I''ve taken. The projects are incredibly practical!" - Sarah K.

### Prerequisites

Basic JavaScript knowledge required. Familiarity with HTML/CSS recommended.',
    '🚀',
    NULL,
    NULL,
    49.99,
    'USD',
    23.00,
    true,
    '[{"title": "Course content", "items": ["12 hours of video", "20+ coding exercises", "Final capstone project", "Certificate of completion"]}, {"title": "Bonuses", "items": ["Source code access", "Private Discord community", "Monthly live Q&A"]}]'::jsonb,
    true,
    true,
    NULL,
    NULL,
    false
  ),
  (
    'Pro Toolkit',
    'pro-toolkit',
    'Professional development tools and templates.',
    'Complete collection of production-ready templates, UI components, and development tools to accelerate your workflow.',
    '🛠️',
    NULL,
    NULL,
    99.99,
    'USD',
    23.00,
    true,
    '[{"title": "What''s included", "items": ["50+ React components", "10 complete templates", "Figma design system", "VS Code snippets"]}, {"title": "Updates", "items": ["Lifetime access", "Free future updates", "Priority support"]}]'::jsonb,
    true,
    false,
    NULL,
    NULL,
    false
  ),
  (
    'VIP Masterclass',
    'vip-masterclass',
    'Exclusive masterclass with live Q&A sessions.',
    'Join elite developers in this intensive 6-week program. Direct mentorship, code reviews, and career guidance from industry experts.',
    '👨‍🏫',
    NULL,
    NULL,
    199.99,
    'USD',
    23.00,
    true,
    '[{"title": "Program details", "items": ["6 live sessions (2h each)", "Personal code reviews", "Career coaching", "Small group (max 10 people)"]}, {"title": "Bonus access", "items": ["All course materials", "Pro toolkit included", "Alumni network", "Job board access"]}]'::jsonb,
    true,
    true,
    NULL,
    NULL,
    false
  ),
  (
    'Enterprise Package',
    'enterprise-package',
    'Full enterprise solution with priority support.',
    'Complete white-label solution with dedicated support, custom integrations, and SLA guarantees for large organizations.',
    '🏢',
    NULL,
    NULL,
    499.99,
    'USD',
    23.00,
    true,
    '[{"title": "Enterprise features", "items": ["Unlimited team seats", "Custom branding", "SSO integration", "Dedicated account manager"]}, {"title": "Support & SLA", "items": ["24/7 priority support", "99.9% uptime guarantee", "Custom integrations", "Quarterly business reviews"]}]'::jsonb,
    true,
    false,
    3,
    NULL,
    false
  );
  

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
-- SECURITY NOTE: Secret is auto-generated using PostgreSQL's gen_random_bytes
-- In production, each webhook endpoint gets a unique cryptographically secure secret
INSERT INTO webhook_endpoints (id, url, events, description, is_active, secret)
VALUES (
  '88888888-8888-4888-a888-888888888888',
  'https://webhook.site/gateflow-test-endpoint',
  ARRAY['purchase.completed', 'lead.captured'],
  'Zapier CRM Integration',
  true,
  encode(gen_random_bytes(32), 'hex')  -- Generates unique 64-char hex secret
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

-- Insert sample Categories
INSERT INTO categories (name, slug, description) VALUES
('Courses', 'courses', 'Educational video courses and tutorials'),
('Tools', 'tools', 'Software tools and utilities'),
('Templates', 'templates', 'Ready-to-use templates for developers'),
('Bundles', 'bundles', 'Value packages with multiple products');

-- Insert sample Tags
INSERT INTO tags (name, slug) VALUES
('JavaScript', 'javascript'),
('React', 'react'),
('Bestseller', 'bestseller'),
('New', 'new'),
('Free', 'free');

-- Assign Categories to Products
INSERT INTO product_categories (product_id, category_id) VALUES
((SELECT id FROM products WHERE slug = 'free-tutorial'), (SELECT id FROM categories WHERE slug = 'courses')),
((SELECT id FROM products WHERE slug = 'premium-course'), (SELECT id FROM categories WHERE slug = 'courses')),
((SELECT id FROM products WHERE slug = 'vip-masterclass'), (SELECT id FROM categories WHERE slug = 'courses')),
((SELECT id FROM products WHERE slug = 'pro-toolkit'), (SELECT id FROM categories WHERE slug = 'tools')),
((SELECT id FROM products WHERE slug = 'pro-toolkit'), (SELECT id FROM categories WHERE slug = 'templates')),
((SELECT id FROM products WHERE slug = 'enterprise-package'), (SELECT id FROM categories WHERE slug = 'bundles'));

-- Assign Tags to Products
INSERT INTO product_tags (product_id, tag_id) VALUES
((SELECT id FROM products WHERE slug = 'free-tutorial'), (SELECT id FROM tags WHERE slug = 'free')),
((SELECT id FROM products WHERE slug = 'free-tutorial'), (SELECT id FROM tags WHERE slug = 'javascript')),
((SELECT id FROM products WHERE slug = 'premium-course'), (SELECT id FROM tags WHERE slug = 'javascript')),
((SELECT id FROM products WHERE slug = 'premium-course'), (SELECT id FROM tags WHERE slug = 'react')),
((SELECT id FROM products WHERE slug = 'premium-course'), (SELECT id FROM tags WHERE slug = 'bestseller')),
((SELECT id FROM products WHERE slug = 'pro-toolkit'), (SELECT id FROM tags WHERE slug = 'new')),
((SELECT id FROM products WHERE slug = 'vip-masterclass'), (SELECT id FROM tags WHERE slug = 'bestseller'));

-- =====================================================
-- SAMPLE USERS & PAYMENT TRANSACTIONS (Multi-Currency)
-- =====================================================
-- Purpose: Seed data for testing currency conversion feature
-- Creates users and transactions in USD, EUR, and PLN

-- Create sample users for payment history
DO $$
DECLARE
  user1_id UUID;
  user2_id UUID;
  user3_id UUID;
  premium_product_id UUID;
  pro_toolkit_id UUID;
  vip_masterclass_id UUID;
BEGIN
  -- Get product IDs
  SELECT id INTO premium_product_id FROM products WHERE slug = 'premium-course';
  SELECT id INTO pro_toolkit_id FROM products WHERE slug = 'pro-toolkit';
  SELECT id INTO vip_masterclass_id FROM products WHERE slug = 'vip-masterclass';

  -- User 1: US Customer (USD transactions)
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, confirmation_token, recovery_token,
    email_change_token_new, email_change, email_change_token_current, reauthentication_token,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-1111-4111-a111-111111111111',
    'authenticated',
    'authenticated',
    'john.doe@example.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    '', '', '', '', '', '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"John Doe"}'::jsonb,
    NOW(),
    NOW()
  ) RETURNING id INTO user1_id;

  -- Create identity for User 1
  INSERT INTO auth.identities (
    provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) VALUES (
    'aaaaaaaa-1111-4111-a111-111111111111',
    'aaaaaaaa-1111-4111-a111-111111111111',
    jsonb_build_object('sub', 'aaaaaaaa-1111-4111-a111-111111111111', 'email', 'john.doe@example.com'),
    'email',
    NOW(),
    NOW(),
    NOW()
  );

  -- User 2: EU Customer (EUR transactions)
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, confirmation_token, recovery_token,
    email_change_token_new, email_change, email_change_token_current, reauthentication_token,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    'bbbbbbbb-2222-4222-a222-222222222222',
    'authenticated',
    'authenticated',
    'maria.schmidt@example.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    '', '', '', '', '', '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Maria Schmidt"}'::jsonb,
    NOW(),
    NOW()
  ) RETURNING id INTO user2_id;

  -- Create identity for User 2
  INSERT INTO auth.identities (
    provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) VALUES (
    'bbbbbbbb-2222-4222-a222-222222222222',
    'bbbbbbbb-2222-4222-a222-222222222222',
    jsonb_build_object('sub', 'bbbbbbbb-2222-4222-a222-222222222222', 'email', 'maria.schmidt@example.com'),
    'email',
    NOW(),
    NOW(),
    NOW()
  );

  -- User 3: PL Customer (PLN transactions)
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, confirmation_token, recovery_token,
    email_change_token_new, email_change, email_change_token_current, reauthentication_token,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    'cccccccc-3333-4333-a333-333333333333',
    'authenticated',
    'authenticated',
    'anna.kowalska@example.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    '', '', '', '', '', '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Anna Kowalska"}'::jsonb,
    NOW(),
    NOW()
  ) RETURNING id INTO user3_id;

  -- Create identity for User 3
  INSERT INTO auth.identities (
    provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) VALUES (
    'cccccccc-3333-4333-a333-333333333333',
    'cccccccc-3333-4333-a333-333333333333',
    jsonb_build_object('sub', 'cccccccc-3333-4333-a333-333333333333', 'email', 'anna.kowalska@example.com'),
    'email',
    NOW(),
    NOW(),
    NOW()
  );

  -- Insert payment transactions in EUR (john.doe has no transactions for OTO testing)
  INSERT INTO payment_transactions (
    session_id, user_id, product_id, customer_email, amount, currency,
    status, stripe_payment_intent_id, created_at
  ) VALUES
  ('cs_test_eur_001', user2_id, premium_product_id, 'maria.schmidt@example.com', 45.99, 'EUR', 'completed', 'pi_eur_001', NOW() - INTERVAL '6 days'),
  ('cs_test_eur_002', user2_id, pro_toolkit_id, 'maria.schmidt@example.com', 89.99, 'EUR', 'completed', 'pi_eur_002', NOW() - INTERVAL '4 days'),
  ('cs_test_eur_003', user2_id, vip_masterclass_id, 'maria.schmidt@example.com', 179.99, 'EUR', 'completed', 'pi_eur_003', NOW() - INTERVAL '1 day');

  -- Insert payment transactions in PLN
  INSERT INTO payment_transactions (
    session_id, user_id, product_id, customer_email, amount, currency,
    status, stripe_payment_intent_id, created_at
  ) VALUES
  ('cs_test_pln_001', user3_id, premium_product_id, 'anna.kowalska@example.com', 199.99, 'PLN', 'completed', 'pi_pln_001', NOW() - INTERVAL '8 days'),
  ('cs_test_pln_002', user3_id, pro_toolkit_id, 'anna.kowalska@example.com', 399.99, 'PLN', 'completed', 'pi_pln_002', NOW() - INTERVAL '3 days'),
  ('cs_test_pln_003', user3_id, vip_masterclass_id, 'anna.kowalska@example.com', 799.99, 'PLN', 'completed', 'pi_pln_003', NOW());

  -- Grant product access to users (excluding john.doe for OTO testing)
  INSERT INTO user_product_access (user_id, product_id, access_granted_at)
  VALUES
  (user2_id, premium_product_id, NOW() - INTERVAL '6 days'),
  (user2_id, pro_toolkit_id, NOW() - INTERVAL '4 days'),
  (user2_id, vip_masterclass_id, NOW() - INTERVAL '1 day'),
  (user3_id, premium_product_id, NOW() - INTERVAL '8 days'),
  (user3_id, pro_toolkit_id, NOW() - INTERVAL '3 days'),
  (user3_id, vip_masterclass_id, NOW());

  -- Note: john.doe@example.com is automatically made admin by handle_new_user_registration() trigger
  -- since it's the first user created in the system

END $$;

-- =====================================================
-- OTO (One-Time Offer) SAMPLE DATA
-- =====================================================
-- Purpose: Seed data for testing OTO functionality
-- These offers demonstrate the OTO system in action

-- OTO 1: After buying "Premium Course" → offer "Pro Toolkit" at 30% off for 15 minutes
INSERT INTO oto_offers (
  source_product_id,
  oto_product_id,
  discount_type,
  discount_value,
  duration_minutes,
  is_active,
  display_order
) VALUES (
  (SELECT id FROM products WHERE slug = 'premium-course'),
  (SELECT id FROM products WHERE slug = 'pro-toolkit'),
  'percentage',
  30,
  15,
  true,
  1
);

-- OTO 2: After buying "Pro Toolkit" → offer "VIP Masterclass" at $50 off for 30 minutes
INSERT INTO oto_offers (
  source_product_id,
  oto_product_id,
  discount_type,
  discount_value,
  duration_minutes,
  is_active,
  display_order
) VALUES (
  (SELECT id FROM products WHERE slug = 'pro-toolkit'),
  (SELECT id FROM products WHERE slug = 'vip-masterclass'),
  'fixed',
  50,
  30,
  true,
  1
);

-- OTO 3: After buying "VIP Masterclass" → offer "Enterprise Package" at 40% off for 10 minutes (urgency!)
INSERT INTO oto_offers (
  source_product_id,
  oto_product_id,
  discount_type,
  discount_value,
  duration_minutes,
  is_active,
  display_order
) VALUES (
  (SELECT id FROM products WHERE slug = 'vip-masterclass'),
  (SELECT id FROM products WHERE slug = 'enterprise-package'),
  'percentage',
  40,
  10,
  true,
  1
);

-- =====================================================
-- TEST PRODUCTS FOR REDIRECT SCENARIOS
-- =====================================================
-- Purpose: 5 products for testing different redirect configurations
--
-- 1. test-oto-active      → OTO enabled, redirects to OTO product
-- 2. test-product-redirect → Redirect to internal product page
-- 3. test-custom-redirect  → Redirect to external URL
-- 4. test-oto-owned        → OTO enabled but john.doe owns OTO product (skip scenario)
-- 5. test-no-redirect      → No OTO, no redirect (plain product)

-- Test Product 1: OTO Active (no redirect, has OTO offer)
INSERT INTO products (
  name, slug, description, icon, price, currency, vat_rate, price_includes_vat,
  features, is_active, success_redirect_url, pass_params_to_redirect
) VALUES (
  'Test OTO Active',
  'test-oto-active',
  'Product with active OTO offer. After purchase, shows OTO for Test OTO Target product.',
  '🎯',
  19.99,
  'USD',
  23.00,
  true,
  '[{"title": "Test scenario", "items": ["OTO enabled", "No redirect URL", "Shows OTO offer after purchase"]}]'::jsonb,
  true,
  NULL,
  false
);

-- Test Product 2: Product Redirect (internal redirect to another product)
INSERT INTO products (
  name, slug, description, icon, price, currency, vat_rate, price_includes_vat,
  features, is_active, success_redirect_url, pass_params_to_redirect
) VALUES (
  'Test Product Redirect',
  'test-product-redirect',
  'Product that redirects to another product page after purchase.',
  '🔄',
  29.99,
  'USD',
  23.00,
  true,
  '[{"title": "Test scenario", "items": ["No OTO", "Redirects to /p/premium-course", "Internal redirect"]}]'::jsonb,
  true,
  '/p/premium-course',
  true
);

-- Test Product 3: Custom Redirect (external URL)
INSERT INTO products (
  name, slug, description, icon, price, currency, vat_rate, price_includes_vat,
  features, is_active, success_redirect_url, pass_params_to_redirect
) VALUES (
  'Test Custom Redirect',
  'test-custom-redirect',
  'Product that redirects to external URL after purchase.',
  '🌐',
  39.99,
  'USD',
  23.00,
  true,
  '[{"title": "Test scenario", "items": ["No OTO", "Redirects to https://google.com", "External redirect with params"]}]'::jsonb,
  true,
  'https://google.com',
  true
);

-- Test Product 4: OTO Owned (john.doe already has the OTO product)
INSERT INTO products (
  name, slug, description, icon, price, currency, vat_rate, price_includes_vat,
  features, is_active, success_redirect_url, pass_params_to_redirect
) VALUES (
  'Test OTO Owned',
  'test-oto-owned',
  'Product with OTO, but john.doe already owns the OTO target. OTO should be skipped.',
  '✅',
  24.99,
  'USD',
  23.00,
  true,
  '[{"title": "Test scenario", "items": ["OTO configured", "john.doe owns OTO product", "OTO should be SKIPPED", "No redirect"]}]'::jsonb,
  true,
  NULL,
  false
);

-- Test Product 5: No Redirect (plain product, no OTO, no redirect)
INSERT INTO products (
  name, slug, description, icon, price, currency, vat_rate, price_includes_vat,
  features, is_active, success_redirect_url, pass_params_to_redirect
) VALUES (
  'Test No Redirect',
  'test-no-redirect',
  'Plain product without any OTO or redirect. Shows success page and redirects to product page.',
  '📦',
  14.99,
  'USD',
  23.00,
  true,
  '[{"title": "Test scenario", "items": ["No OTO", "No redirect URL", "Stays on success page", "Countdown to product page"]}]'::jsonb,
  true,
  NULL,
  false
);

-- Target product for OTO offers (cheap product that john.doe will own)
INSERT INTO products (
  name, slug, description, icon, price, currency, vat_rate, price_includes_vat,
  features, is_active, success_redirect_url, pass_params_to_redirect
) VALUES (
  'Test OTO Target',
  'test-oto-target',
  'This product is offered as OTO for other test products.',
  '🎁',
  9.99,
  'USD',
  23.00,
  true,
  '[{"title": "OTO Target", "items": ["Used as OTO offer", "Discounted in OTO flow"]}]'::jsonb,
  true,
  NULL,
  false
);

-- OTO Offer: test-oto-active → test-oto-target (20% off, 15 min)
INSERT INTO oto_offers (
  source_product_id,
  oto_product_id,
  discount_type,
  discount_value,
  duration_minutes,
  is_active,
  display_order
) VALUES (
  (SELECT id FROM products WHERE slug = 'test-oto-active'),
  (SELECT id FROM products WHERE slug = 'test-oto-target'),
  'percentage',
  20,
  15,
  true,
  1
);

-- OTO Offer: test-oto-owned → test-oto-target (same OTO target that john.doe owns)
INSERT INTO oto_offers (
  source_product_id,
  oto_product_id,
  discount_type,
  discount_value,
  duration_minutes,
  is_active,
  display_order
) VALUES (
  (SELECT id FROM products WHERE slug = 'test-oto-owned'),
  (SELECT id FROM products WHERE slug = 'test-oto-target'),
  'percentage',
  25,
  20,
  true,
  1
);

-- Give john.doe access to test-oto-target (so OTO will be skipped for test-oto-owned)
INSERT INTO user_product_access (user_id, product_id, access_granted_at)
VALUES (
  'aaaaaaaa-1111-4111-a111-111111111111', -- john.doe's UUID
  (SELECT id FROM products WHERE slug = 'test-oto-target'),
  NOW() - INTERVAL '7 days'
);