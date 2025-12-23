#!/bin/bash
# Quick script to insert a new test payment and trigger Realtime notification

AMOUNT=${1:-9900}  # Default $99.00 (in cents)
PRODUCT_ID="2a6bce45-1678-4c49-bcac-c074d800dba0"  # Premium Course
RANDOM_ID=$(openssl rand -hex 8)

echo "💳 Creating new payment of \$$(echo "scale=2; $AMOUNT/100" | bc)..."

docker exec supabase_db_gemini-test psql -U postgres -d postgres -c "
INSERT INTO payment_transactions (
  session_id,
  product_id,
  customer_email,
  amount,
  currency,
  stripe_payment_intent_id,
  status,
  metadata
) VALUES (
  'cs_test_$RANDOM_ID',
  '$PRODUCT_ID',
  'test_$RANDOM_ID@example.com',
  $AMOUNT,
  'USD',
  'pi_test_$RANDOM_ID',
  'completed',
  '{\"test\": true, \"realtime_test\": true}'
);
"

echo "✅ Payment created! Check your dashboard for the notification."
echo "📧 Customer: test_$RANDOM_ID@example.com"
echo "💰 Amount: \$$(echo "scale=2; $AMOUNT/100" | bc)"
