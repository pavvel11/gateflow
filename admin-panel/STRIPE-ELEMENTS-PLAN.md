# Stripe Elements Integration Plan

## Current State
- Using `EmbeddedCheckout` from `@stripe/react-stripe-js`
- API endpoint: `/api/create-embedded-checkout` creates Stripe Checkout Session
- Flow: User clicks pay → Creates session → Stripe handles payment → Redirects to success page

## Target State (EasyCart-style)
- Custom payment form using `PaymentElement`
- Direct control over form layout and styling
- Inline payment without redirect
- VAT breakdown visible before payment
- Invoice fields (NIP, company name)

## Architecture Changes

### 1. Frontend Components

#### New: `CustomPaymentForm.tsx`
- Import `PaymentElement`, `Elements`, `useStripe`, `useElements`
- Email input (for guests) or display user email
- PaymentElement (handles card, BLIK, Przelewy24 automatically)
- Invoice fields section:
  - Checkbox: "I need an invoice"
  - NIP input (Polish tax ID)
  - Company name input
- Price summary section:
  - Product price (gross)
  - Net price calculation
  - VAT amount
  - Order bump (if selected)
  - Coupon discount (if applied)
  - **Total**
- Submit button: "Pay {amount} {currency}"
- Loading/error states

#### Modified: `PaidProductForm.tsx`
- Remove `EmbeddedCheckoutProvider` and `EmbeddedCheckout`
- Add `Elements` provider with PaymentElement appearance config
- Wrap `CustomPaymentForm` in `Elements`
- Keep order bump logic
- Keep coupon logic
- Pass all state to CustomPaymentForm

### 2. Backend API

#### New: `/api/create-payment-intent`
Request body:
```typescript
{
  productId: string
  email: string
  bumpProductId?: string
  couponCode?: string
  needsInvoice?: boolean
  nip?: string
  companyName?: string
  successUrl?: string
}
```

Response:
```typescript
{
  clientSecret: string
  paymentIntentId: string
}
```

Steps:
1. Validate product exists and is active
2. Check if user already has access
3. Calculate price (product + bump - coupon)
4. Calculate VAT breakdown
5. Create Stripe PaymentIntent with metadata:
   - `product_id`
   - `user_id` (if logged in)
   - `email`
   - `bump_product_id` (if selected)
   - `coupon_code` (if applied)
   - `needs_invoice`
   - `nip`
   - `company_name`
   - `success_url`
6. Return clientSecret

#### Modified: Stripe webhook handler
- Listen for `payment_intent.succeeded` event (instead of just `checkout.session.completed`)
- Extract metadata from PaymentIntent
- Grant product access
- If `needs_invoice` = true, store invoice data
- Send confirmation email
- If `success_url` exists, include in response/email

### 3. Database Schema
No changes needed! We can store invoice data in user_products metadata or create a new `invoices` table later.

### 4. Translations

Add to `checkout` section:
- `payButton`: "Pay {amount}"
- `processing`: "Processing payment..."
- `paymentSuccessful`: "Payment Successful!"
- `needInvoice`: "I need an invoice"
- `nipLabel`: "NIP (Tax ID)"
- `companyNameLabel`: "Company Name"
- `priceSummary`: "Price Summary"
- `productPrice`: "Product"
- `orderBumpLabel`: "Additional Product"
- `couponDiscount`: "Coupon Discount"
- `total`: "Total"

## Implementation Order

1. ✅ Plan document (this file)
2. Create `/api/create-payment-intent` endpoint
3. Create `CustomPaymentForm` component with:
   - Email field (if guest)
   - PaymentElement
   - Invoice fields
   - Price summary with VAT breakdown
   - Submit button
4. Update `PaidProductForm` to use Elements + CustomPaymentForm
5. Add translations
6. Test payment flow
7. Update webhook handler for `payment_intent.succeeded`
8. Test end-to-end with real payment
9. Commit changes

## Key Differences: EmbeddedCheckout vs PaymentElement

| Feature | EmbeddedCheckout | PaymentElement |
|---------|------------------|----------------|
| UI Control | Low (Stripe hosted) | High (custom form) |
| Payment Methods | Automatic | Automatic (same) |
| Tax Display | Hidden | Visible (we add it) |
| Invoice Fields | Not possible | Easy to add |
| Mobile UX | Good | We control it |
| Success Handling | Redirect required | Inline (can redirect) |
| API | Checkout Session | PaymentIntent |

## Notes
- PaymentElement automatically shows available payment methods based on currency and country
- For PLN (Polish Zloty), it will show Card, BLIK, Przelewy24 automatically
- We need to set `automatic_payment_methods: { enabled: true }` when creating PaymentIntent
- Elements appearance can be customized to match our dark theme
