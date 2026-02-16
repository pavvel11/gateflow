#!/bin/bash
# Quick script to insert a new test payment and trigger Realtime notification
# Usage: ./test-new-payment.sh [amount] [currency]
# Examples:
#   ./test-new-payment.sh 9900 USD    # $99.00
#   ./test-new-payment.sh 8500 EUR    # €85.00
#   ./test-new-payment.sh 39900 PLN   # 399.00zł
#   ./test-new-payment.sh 7500 GBP    # £75.00

AMOUNT=${1:-9900}  # Default 9900 cents
CURRENCY=${2:-USD} # Default USD

# Get first active product from database dynamically
PRODUCT_ID=$(docker exec supabase_db_gateflow psql -U postgres -d postgres -t -c "SELECT id FROM products WHERE is_active = true LIMIT 1;" | tr -d ' ')

if [ -z "$PRODUCT_ID" ]; then
  echo "❌ Error: No active products found in database!"
  echo "Creating a test product first..."
  PRODUCT_ID=$(docker exec supabase_db_gateflow psql -U postgres -d postgres -t -c "
    INSERT INTO products (name, slug, price, currency, is_active, description)
    VALUES ('Test Product', 'test-product-$(date +%s)', 5000, 'USD', true, 'Auto-created test product')
    RETURNING id;
  " | tr -d ' ')
fi

RANDOM_ID=$(openssl rand -hex 8)

# Currency symbols map
case $CURRENCY in
  USD) SYMBOL="$" ;;
  EUR) SYMBOL="€" ;;
  GBP) SYMBOL="£" ;;
  PLN) SYMBOL="" SUFFIX="zł" ;;
  JPY) SYMBOL="¥" ;;
  CAD) SYMBOL="C$" ;;
  AUD) SYMBOL="A$" ;;
  *) SYMBOL="" SUFFIX=" $CURRENCY" ;;
esac

# Format amount based on currency (JPY has no decimal)
if [ "$CURRENCY" = "JPY" ]; then
  FORMATTED="${SYMBOL}${AMOUNT}"
else
  FORMATTED="${SYMBOL}$(echo "scale=2; $AMOUNT/100" | bc)${SUFFIX}"
fi

echo "💳 Creating new payment of ${FORMATTED} (${CURRENCY})..."

docker exec supabase_db_gateflow psql -U postgres -d postgres -c "
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
  '$CURRENCY',
  'pi_test_$RANDOM_ID',
  'completed',
  '{\"test\": true, \"realtime_test\": true, \"currency\": \"$CURRENCY\"}'
);
"

echo "✅ Payment created! Check your dashboard for the notification."
echo "📧 Customer: test_$RANDOM_ID@example.com"
echo "💰 Amount: ${FORMATTED}"
echo "💱 Currency: $CURRENCY"
