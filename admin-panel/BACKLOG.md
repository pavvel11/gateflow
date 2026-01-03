# Backlog

## ✅ Recently Completed (Dec 2024 - Jan 2025)

### Promotional Pricing & Sales Tools (Jan 2025)
- ✅ **EU Omnibus Directive Compliance**
  - 30-day price history tracking with automatic triggers
  - Lowest price display when discount is active
  - Per-product exempt flag for perishables/new arrivals
  - Global Omnibus toggle in settings

- ✅ **Sale Price with Time & Quantity Limits**
  - Time-based sale expiration (`sale_price_until`)
  - Quantity-based sale limits (`sale_quantity_limit`)
  - Both limits work together (ends when first is reached)
  - Remaining quantity display on checkout ("Only X left!")
  - Admin UI with counter reset option
  - 15 E2E tests covering all scenarios

- ✅ **True OTO (One-Time Offer) System**
  - Post-purchase coupon generation (time-limited, email-bound)
  - Server-side validation (cannot be bypassed)
  - Configurable per-product OTO offers
  - Auto-cleanup of expired OTO coupons
  - 25 E2E tests

- ✅ **Refund Request System**
  - Per-product refund configuration
  - Customer-facing refund request form
  - Admin panel for managing refund requests
  - Status workflow (pending → approved/rejected)
  - Automatic Stripe refund processing
  - 24 E2E tests

### Payment & Checkout System
- ✅ **Custom Payment Form with Stripe Elements** (Dec 2024)
  - Payment Intent flow for custom checkout experience
  - Guest purchase support with magic link authentication
  - Email validation and profile data auto-load for logged-in users
  - Required first/last name fields with auto-population

- ✅ **EasyCart-Style Checkout UI** (Dec 2024)
  - Product showcase component (left side with image, features, price)
  - Streamlined payment form (right side)
  - Payment method tabs (card/P24/Blik)
  - Mobile-responsive two-column layout

- ✅ **T&C Acceptance in Checkout** (Dec 2024)
  - Moved terms acceptance from payment-status page to checkout form
  - Required checkbox for guests before payment
  - Stored in Stripe metadata for compliance
  - Refactored payment-status flow (removed `termsAlreadyHandled` parameter)

### GUS REGON API Integration (Dec 2024)
- ✅ **Polish Company Data Autofill**
  - NIP validation with checksum algorithm
  - SOAP client for GUS REGON API
  - Automatic company data fetch on NIP blur
  - AES-256-GCM encryption for API key storage
  - Admin panel integration for API key management
  - Rate limiting and CORS protection

### Testing Infrastructure (Dec 2024 - Jan 2025)
- ✅ **Comprehensive E2E Tests with Playwright**
  - Checkout flow validation tests (NIP, GUS integration, form validation)
  - Payment access flow tests (14 passing scenarios):
    - Access granting (logged-in users, timed/unlimited duration)
    - Order bump assignment
    - Failed payment scenarios (declined, expired, processing)
    - Access verification (with/without access, guest redirects)
  - Magic link auto-send flow (with Turnstile captcha mocking)
  - Real Stripe payment intents with test API keys
  - Bypass Stripe.js using `grant_product_access_service_role()` RPC

### Code Quality & Refactoring (Jan 2025)
- ✅ **Payment Status Flow Simplification**
  - Removed redundant `termsAlreadyHandled` parameter (always true after checkout refactor)
  - Cleaned up 7 files, removed ~36 lines of dead code
  - Simplified `useMagicLink`, `useTerms`, `MagicLinkStatus` hooks/components
  - Better code maintainability with clearer intent

---

## High Priority

(No items currently in high priority - all major features implemented)

---

### Redis Rate Limiting (Upstash) - OPTIONAL OPTIMIZATION

**Current Implementation (Jan 2025):**
✅ **All rate limiting is now database-backed** (PostgreSQL) for consistency and production reliability.

**Rate Limiting Architecture:**
1. **Internal RPC Functions** - Use `check_rate_limit()` function with `rate_limits` table
   - Used by: `check_user_product_access`, `batch_check_user_product_access`, `claim_guest_purchases_for_user`, etc.
   - Prevents abuse of internal database functions

2. **Application-Level API Routes** - Use `check_application_rate_limit()` function with `application_rate_limits` table
   - Used by: `/lib/rate-limiting.ts`
   - API routes using this:
     - `/api/gus/fetch-company-data` - GUS REGON API calls
     - `/api/update-payment-metadata` - Payment metadata updates
     - `/api/coupons/verify` - Coupon validation
     - `/api/coupons/auto-apply` - Auto-apply coupons
     - `/api/public/products/claim-free` - Free product claims
     - `/api/public/products/[slug]/grant-access` - Product access grants
     - `/api/verify-payment` - Payment verification

**Migration History:**
- ❌ Previously had in-memory `Map<string, RateLimitEntry>` in `src/lib/rate-limit.ts` (deleted)
- ✅ Unified on database-backed rate limiting (Jan 2025)
- ✅ All API routes now use `checkRateLimit()` from `/lib/rate-limiting.ts`

**Future Optimization (Optional):**
If horizontal scaling becomes necessary, consider **Upstash Redis** for faster distributed rate limiting:
- Replace `check_application_rate_limit()` RPC function with Redis calls
- Add `@upstash/redis` dependency
- Environment variables: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

**Benefits of Redis upgrade:**
- ⚡ Faster than PostgreSQL queries (~10-50ms vs ~100-200ms)
- 🌍 Global edge caching with Upstash
- 💰 Lower database load (fewer writes to PostgreSQL)

**When to upgrade:**
- When deploying to multiple serverless regions
- When rate limit checks become a performance bottleneck (>100ms p95)
- When database write load from rate limiting becomes significant

**Current Performance:**
- PostgreSQL rate limiting: ~100-200ms per check (acceptable for current scale)
- Database-backed approach works well for single-region deployments
- No immediate need for Redis unless scaling globally

---

## Medium Priority

---

## Low Priority

### Better Date/DateTime Picker Component
**Current State:** Using native HTML5 `<input type="date">` and `<input type="datetime-local">` inputs.

**Issues:**
- Native date pickers have inconsistent styling across browsers
- Dark mode support varies by browser (Chrome/Safari respect `color-scheme: dark`, Firefox may not)
- Limited customization options for branding
- Calendar popup appearance depends on OS/browser (white background on some systems)

**What Works:**
- ✅ Zero dependencies, no library conflicts
- ✅ Built-in accessibility
- ✅ Mobile-friendly native pickers
- ✅ Timezone conversion working correctly (UTC ↔ local)
- ✅ Simple implementation, easy to maintain

**Future Improvement Options:**
1. **Build custom lightweight date picker** - Tailwind CSS only, no libraries
   - Full control over styling and dark mode
   - Consistent appearance across all browsers
   - Estimated effort: 1-2 days

2. **Find Tailwind v4 compatible library** - Research alternatives:
   - Check if react-day-picker v10+ supports Tailwind v4
   - Look for headless UI libraries (e.g., @headlessui/react, Ark UI)
   - Consider Radix UI primitives with custom styling
   - Estimated effort: 1 day research + 1 day integration

3. **Wait for shadcn/ui Tailwind v4 support**
   - Monitor https://github.com/shadcn-ui/ui for v4 compatibility
   - May become available in future versions
   - Zero effort, just waiting

**Priority:** Low - current solution is functional, just not aesthetically ideal.

**Estimated Effort:** 1-3 days depending on chosen approach.

---
