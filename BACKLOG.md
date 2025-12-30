# GateFlow - Product Backlog

A comprehensive list of planned features, technical improvements, and ideas for the platform.

## 🔴 Critical Priority (Must Fix Before Production)

#### Refactor: Migrate to Native Next.js Layouts & Server Auth
**Status**: ✅ Done (2025-12-22)
**Description**: Migrated the dashboard from client-side HOC auth to native Next.js Server Components and Nested Layouts.
**Implemented Changes**:
1.  **Server-Side Auth**: Created `verifyAdminAccess` utility using `supabase.auth.getUser()`.
2.  **Native Layout**: Implemented `src/app/[locale]/dashboard/layout.tsx` as a Server Component wrapping the dashboard area.
3.  **Page Cleanup**: Removed `withAdminAuth` HOC and manual `DashboardLayout` wrapping from all 7 dashboard sub-pages.
**Result**: Zero flickering on navigation, instant redirects for unauthorized users, cleaner and more professional codebase.

---

## 🟢 High Priority

### 🔒 Security & Infrastructure

#### Upgrade Rate Limiting to Upstash Redis
**Status**: 📋 Planned (Recommended for Production)
**Effort**: ~2-3 hours
**Priority**: High (Critical for scaling beyond development)

**Current State:**
- ✅ In-memory rate limiting implemented for GUS API endpoints
- ⚠️ Resets on server restart
- ❌ Does NOT work in serverless/distributed environments (Vercel, AWS Lambda)

**Problem:**
W serverless (Vercel, AWS Lambda) każda instancja ma własną pamięć:
- User może obejść rate limit wysyłając requesty do różnych instancji
- Limit resetuje się przy każdym cold start
- Brak współdzielonego stanu między instanceami

**Rozwiązanie: Upstash Redis**

**Czym jest Upstash Redis?**
Serverless Redis database zaprojektowany dla edge computing i serverless apps.

**Kluczowe różnice:**
```
Traditional Redis          vs    Upstash Redis
─────────────────────────────────────────────────
- Wymaga serwera           │  - Serverless
- TCP connections          │  - HTTP REST API
- Always running ($)       │  - Pay per request
- Manual scaling           │  - Auto-scaling
- Single region            │  - Global edge (16+ regionów)
- Connection limits        │  - Unlimited connections
```

**Dlaczego Upstash?**
1. **Serverless-First**: Działa idealnie z Vercel/Netlify/AWS Lambda
2. **HTTP-Based**: Nie wymaga persistent connections (idealne dla serverless)
3. **Global Edge**: Ultra-low latency <10ms z 16+ regionów
4. **Built-in Rate Limiting**: Gotowe algorytmy (sliding window, token bucket)
5. **Zero Maintenance**: Fully managed, auto-scaling
6. **Analytics**: Dashboard z metrykami abuse'u

**Pricing:**
```
Free Tier (Development):
- 10,000 requests/day
- 256 MB storage
- Perfect for testing

Pro ($10/month):
- 100,000 requests/day
- 1 GB storage

Pay-as-you-go:
- $0.20 per 100,000 requests
- $0.25 per GB storage
```

**Implementation:**
```bash
# 1. Install
npm install @upstash/redis @upstash/ratelimit

# 2. Create account: https://upstash.com
# 3. Create Redis database
# 4. Add to .env
UPSTASH_REDIS_REST_URL=https://your-region.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
```

**Code Changes:**

Update `/lib/rate-limit.ts`:
```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function rateLimit(
  identifier: string,
  config: { maxRequests: number; windowMs: number }
) {
  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(
      config.maxRequests,
      `${config.windowMs}ms`
    ),
    analytics: true,
  });

  const result = await ratelimit.limit(identifier);

  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  };
}
```

**Benefits:**
✅ **Production-Ready**: Works in Vercel, AWS Lambda, Cloudflare Workers
✅ **Accurate Limiting**: Shared state across all instances
✅ **Analytics**: Track abuse patterns, violations
✅ **Persistent**: Survives restarts and deployments
✅ **Low Latency**: <10ms global edge network
✅ **Zero Maintenance**: Fully managed

**Decision Matrix:**

| Factor | In-Memory (Current) | Upstash Redis | Self-Hosted Redis |
|--------|---------------------|---------------|-------------------|
| Serverless | ❌ No | ✅ Yes | ⚠️ Complex |
| Accuracy | ❌ Per-instance | ✅ Global | ✅ Global |
| Setup | ✅ Easy | ✅ Easy | ❌ Complex |
| Cost | ✅ Free | ✅ Free tier | 💰 $20+/mo |
| Latency | ✅ 0ms | ✅ <10ms | ⚠️ 20-50ms |
| Maintenance | ✅ None | ✅ None | ❌ High |

**Recommendation:**
- **Development**: In-memory (current) OK ✅
- **Production/Scale**: Upgrade to Upstash Redis 🚀
- **Enterprise**: Consider self-hosted Redis cluster

**Files to Update:**
- `/lib/rate-limit.ts` - Replace in-memory with Upstash
- `.env.local` - Add Upstash credentials
- `SECURITY-GUS-API.md` - Update documentation

**Note:** API endpoints już używają `rate-limit.ts`, więc po zamianie implementacji wszystko działa automatycznie!

---

### 🛒 Checkout & Payments (Visuals & Logic)

#### Pixel-Perfect Checkout UI & Invoice Handling (EasyCart Style)
**Status**: 🟢 High Priority (Top)
**Description**: Comprehensive redesign of the cart and checkout experience to match the polish and usability of EasyCart (mobile & desktop).
**Requirements**:
- **Visuals**: Pixel-perfect design for both Desktop and Mobile versions. The cart must look flawless.
- **Invoice Data (Dane do Faktury)**:
    - Implement input fields for full invoice data (Company Name, VAT ID/NIP, Address).
    - **Guest to User Sync**: Logic to capture billing details entered in the Stripe form during a guest checkout and automatically save them to the new User Profile upon account creation.
- **Configurable Experience Options (Stripe Implementation)**:
    1.  **Redirect Checkout**: Classic, Stripe-hosted payment process.
    2.  **Embedded Checkout**: Seamless on-page form (Current Method).
    3.  **Custom Checkout (Stripe Elements)**: Build a fully custom payment form using individual Elements for maximum layout control, similar to `easycart.pl`.

#### Stripe Configuration Wizard (Restricted API Keys)
**Status**: ✅ Done - 2025-12-27
**Description**: Interactive 5-step wizard for secure Stripe integration using Restricted API Keys (RAK) - Stripe's recommended approach for self-hosted integrations.
**Implemented Features**:
- ✅ **5-Step Wizard Flow**:
  1. **Welcome**: Introduction to secure Stripe integration and RAK benefits
  2. **Mode Selection**: Choose between Test Mode (sandbox) and Live Mode (production)
  3. **Create Key**: Step-by-step guide with Stripe Dashboard screenshots showing how to create RAK with exact permissions
  4. **Enter Key**: Paste and validate the RAK (test connection + verify permissions)
  5. **Success**: Configuration complete with next steps
- ✅ **Security Features**:
  - Encrypted storage using AES-256-GCM encryption
  - Key validation before saving (test API call + permission verification)
  - Separate Test/Live mode keys with visual indicators
  - Exit confirmation modal (prevents accidental data loss)
- ✅ **Required Permissions Detection**: Automatically validates that RAK has all required permissions:
  - Checkout Sessions (write), Payment Intents (write), Customers (write), Products (read), Prices (read), Payment Links (write), Refunds (write), Webhook Endpoints (write)
- ✅ **Context-Aware UI**:
  - Current mode indicator (Test/Live with color coding)
  - Webhook endpoint URL with copy button
  - Test connection status feedback
  - Error handling with actionable messages
- ✅ **Comprehensive Testing**: 7 E2E Playwright tests covering full wizard flow, validation, mode switching
- ✅ **Settings Integration**: Embedded in `/dashboard/settings` with StripeSettings component
- ✅ **Documentation**: STRIPE-TESTING-GUIDE.md with setup instructions and testing scenarios

**Why RAK (not OAuth)**:
- **Stripe Recommendation**: For self-hosted single-shop installations, Stripe recommends RAK or OAuth
- **No Platform Registration**: RAK doesn't require registering GateFlow as a Stripe App
- **Granular Control**: Admin can see exactly which permissions are granted
- **Easy Revocation**: Can be revoked instantly from Stripe Dashboard
- **Production Ready**: Works immediately without OAuth app approval process

**Next Steps** (Future Enhancement):
- 📋 **Stripe Apps OAuth**: Alternative "Connect with Stripe" button for even easier setup (requires Stripe App registration)
- 📋 **Auto-Webhook Setup**: Use RAK to automatically create webhook endpoint via API (currently manual)

#### Stripe Apps OAuth Integration (Alternative Method)
**Status**: 📋 Planned (Low Priority - Alternative to RAK)
**Description**: Add optional OAuth flow as an alternative to manual RAK entry. "Connect with Stripe" button → OAuth authorization → done.
**Why Keep RAK**:
- RAK is production-ready and working now
- OAuth requires Stripe App registration (takes time)
- Some users prefer manual control over OAuth
**Implementation** (if needed):
1.  **Stripe App Registration**: Register GateFlow as a Stripe App in Stripe Dashboard
2.  **OAuth Flow**: Add "Connect with Stripe" button alongside existing RAK wizard
3.  **Fallback**: Keep RAK wizard for users who prefer it or for advanced use cases
**References**:
- [Stripe Apps OAuth 2.0 docs](https://docs.stripe.com/stripe-apps/api-authentication/oauth)
- [WooCommerce migration example](https://woocommerce.com/document/stripe/admin-experience/updated-requirements-for-stripe-plugin-mid-2024/)

#### Stripe Connect Platform (Future - Multi-Vendor SaaS Mode)
**Status**: 📋 Planned (Low Priority - Only if GateFlow becomes multi-vendor platform)
**Description**: Full Stripe Connect integration for marketplace/SaaS model where multiple creators sell on one GateFlow instance.
**When Needed**: Only if business model changes from "self-hosted single shop" to "hosted platform with multiple vendors"
**Why NOT Now**:
- GateFlow is currently self-hosted (one instance = one shop owner)
- Stripe Connect is for marketplaces with payment splitting and platform fees
- Adds significant complexity: KYC, compliance, connected account management, destination charges
- Not needed when each installation has one Stripe account
**Future Implementation** (if needed):
1.  **Platform Registration**: Configure GateFlow as Stripe Connect Platform
2.  **Connect Onboarding**: Create connected accounts for each vendor via Account Links API
3.  **Payment Routing**: Implement destination charges or direct charges with `Stripe-Account` header
4.  **Platform Fee**: Add application fee logic for revenue share
**Decision Point**: Revisit this when/if GateFlow pivots to multi-vendor hosted SaaS model.

### 📊 Analytics & Marketing Integrations
**Status**: 🏗️ Partially Done
**Goal**: Robust tracking infrastructure compatible with modern privacy standards (Server-Side) and ease of use.

#### 0. Multi-Currency Conversion & Exchange Rate Configuration
**Status**: ✅ Done - 2025-12-30
**Description**: Convert all revenue to a single base currency for unified analytics, with configurable exchange rate providers via admin panel.

**Implemented Features**:
- ✅ **Currency Conversion System**: Support for USD, EUR, GBP, PLN, JPY, CAD, AUD
- ✅ **Multiple Exchange Rate Providers**:
  - **ECB (European Central Bank)**: Free, no API key required (default)
  - **ExchangeRate-API**: Free tier with API key
  - **Fixer.io**: Paid service with API key
- ✅ **Admin Configuration UI**: Full settings panel in `/dashboard/integrations` for exchange rate provider selection
- ✅ **Encrypted API Key Storage**: AES-256-GCM encryption reusing existing infrastructure (same as Stripe/GUS)
- ✅ **Database Integration**: `integrations_config` table with currency API provider and encrypted key fields
- ✅ **Configuration Priority**: Database config > .env config > ECB fallback
- ✅ **Status Display**: Shows configuration source (Database/env/both) with colored badges
- ✅ **Dashboard Status Widget**: `ConfigurationStatus` component showing active currency provider
- ✅ **Delete Configuration**: Ability to reset to default ECB provider
- ✅ **Conversion Layer**: `useCurrencyConversion` hook with `convertToSingleCurrency()` helper
- ✅ **UI Toggle**: `CurrencySelector` component with "Grouped by Currency" and "Convert to [CURRENCY]" modes
- ✅ **User Preferences**: Currency view mode and display currency stored in `user_metadata`
- ✅ **Dashboard Integration**:
  - Revenue chart with stacked areas visualization for multi-currency grouped view
  - Chart Y-axis adapts (no currency symbol in grouped mode)
  - Revenue goal converts to display currency automatically
- ✅ **Stats Overview**: All stat cards support both grouped and converted display modes
- ✅ **E2E Tests**: 22 comprehensive Playwright tests (11 conversion + 11 configuration) covering all features
- ✅ **Server Actions**: `saveCurrencyConfig`, `getCurrencyConfig`, `deleteCurrencyConfig`, `getDecryptedCurrencyConfig`
- ✅ **Currency Service**: Pluggable architecture with provider abstraction

**Next Steps (Future Enhancement)**:
- 📋 **Historical Rates Storage**: Store historical exchange rates for accurate past data conversion
- 📋 **Hover Enhancement**: Show original currency amount on hover when in converted mode
- 📋 **SQL Server-Side Conversion**: Add `p_convert_to` parameter to analytics functions for better performance

#### 1. Google Tag Manager (GTM) Integration - Phase 2
**Status**: 📋 Planned
*   **Phase 2 (Automated)**: Google OAuth App integration. One-click setup where GateFlow creates the Container and Tags automatically via GTM API.

#### 2. Server-Side Tracking (Conversions API)
**Status**: 🏗️ Partially Done (DB & UI Ready)
*   **Meta (Facebook) CAPI**: Send `Purchase` and `Lead` events directly from backend (Stripe Webhook / Access Grant) to bypass AdBlockers.
    *   ✅ Database Schema & Admin UI (Token storage)
    *   📋 Backend Logic (Sending events to FB Graph API)
*   **Google Enhanced Conversions**: Backend integration to send hashed user data (email) with conversion events to Google Ads.

#### 4. Real-time Social Proof Notifications (Client-side)
**Status**: 📋 Planned
**Description**: Increase urgency and trust by showing live activity notifications to users browsing the product page.
**Features**:
- **"Just Bought" Popup**: Small toast notification showing "Someone from [City] just purchased this product" (anonymized).
- **Aggregate Activity**: "X people purchased this product in the last 24 hours".
- **Live Viewer Count**: "X people are viewing this offer right now".
- **Configuration**: Options to enable/disable per product and configure thresholds to avoid showing low numbers (fake data option for new products?).

### 🔌 Integrations & Automation

#### Outgoing Webhooks (Automation)
**Status**: 🏗️ Partially Done (v1.5 Implemented)
**Description**: Trigger external automations when key events occur in GateFlow. Essential for CRM, Mailing, and Marketing Automation.

**v1.5 Implemented (Done 2025-12-19)**:
- ✅ **Database Schema**: `webhook_endpoints` and `webhook_logs` with RLS.
- ✅ **Secure Delivery (HMAC)**: Every request includes an `X-GateFlow-Signature` (HMAC-SHA256).
- ✅ **Events Integration**: `purchase.completed` and `lead.captured` triggers.
- ✅ **Management UI**: Full CRUD for endpoints.
- ✅ **Testing System**: "Send Test Event" modal.
- ✅ **Reliability**: Async delivery with 5s timeout and logging.
- ✅ **Logs & Debugging**: Detailed logs viewer with filtering (Success/Failed) and manual "Retry" button for failed requests.

**v2.0 Planned (Next Steps)**:
- 📋 **Auto-Retry Logic**: Automatic background re-delivery using exponential backoff (requires cron/queue).
- 📋 **Log Retention Policy**: Automatic cleanup of old webhook logs (e.g., delete success logs after 7 days, failed after 30 days) to save space.
- 📋 **More Events**: Support for `subscription.started`, `subscription.ended`, `refund.issued`.

**Integration Targets**: Zapier, Make (Integromat), ActiveCampaign, MailerLite, Custom URL.

#### Transactional Emails & Logs
**Status**: 📋 Planned
**Description**: Advanced email delivery system with multiple providers and full history.
**Features**:
- **Providers**:
    - **EmailLabs**: Integration with Polish provider for high deliverability in PL.
    - **AWS SES**: Cost-effective global delivery.
- **Email Logs**:
    - Database table `email_logs` to track every sent message.
    - Status tracking (Sent, Delivered, Bounced, Opened - via webhooks).
    - Admin UI to view sent emails and their content/status.
- **Templates**: Support for dynamic templates (e.g., React Email or MJML).

#### Follow-up Email Sequences per Product
**Status**: 📋 Planned
**Description**: Automated email campaigns triggered after product purchase or free download to nurture customers and increase engagement.
**Features**:
- **Per-Product Configuration**: Each product can have its own email sequence (e.g., onboarding for courses, upsell for lead magnets).
- **Email Sequence Builder**: Admin UI to create/edit email sequences with drag-and-drop or timeline interface.
- **Delay Configuration**: Set time delays between emails (e.g., Day 1, Day 3, Day 7).
- **Dynamic Variables**: Personalize emails with customer name, product name, access links, etc.
- **Trigger Events**:
  - Purchase completed
  - Free product downloaded
  - Access granted (guest or registered)
- **Email Types**:
  - Welcome & Onboarding (tips for using the product)
  - Educational content (tutorials, best practices)
  - Upsell/Cross-sell (related products, premium upgrades)
  - Re-engagement (inactive users)
- **Analytics**: Track open rates, click rates, conversion rates per email.
- **Unsubscribe Management**: One-click unsubscribe links and preference center.
- **Integration**: Works with "Transactional Emails & Logs" system for delivery and tracking.

#### Invoicing Integration (Fakturownia, iFirma, KSeF)
**Status**: 📋 Planned
**Description**: Automatically generate and send invoices for successful purchases.
**Features**:
- **Fakturownia (InvoiceOcean)** integration via API.
- **iFirma** integration via API.
- **KSeF (Krajowy System e-Faktur)**: Direct integration to push invoices to the Polish national e-invoice system (mandatory for B2B).
    - **⚠️ Complexity Warning**: KSeF integration is highly complex (XML structure, sync/async handling, error management). Requires careful architecture for queueing, handling immutability (no edits allowed), and strict data validation (FA(2) schema). Implementation estimate: 2-4 months. Dates: Feb/Apr 2026.
- Detect user location/TAX ID (NIP) during checkout (requires Stripe Tax or custom field).
- Auto-send invoice PDF to customer email.
- Sync invoices with payment transactions in database.

#### Public Developer API
**Status**: 📋 Planned
**Description**: Expose a secure REST API for developers to integrate GateFlow with their own systems.
**Features**:
- **API Keys Management**: UI to generate/revoke keys with specific scopes (Read-only, Write).
- **Endpoints**: `/v1/products`, `/v1/licenses`, `/v1/customers`.
- **Documentation**: Swagger/OpenAPI spec.
- **Rate Limiting**: Enforce limits per API key.

### 🎥 Video & Media

#### Simple Funnel System (OTO & Redirects)
**Status**: 🏗️ In Progress
**Description**: Enable building simple sales funnels by controlling where the user is redirected after a purchase (or free signup). This allows creating OTO (One-Time Offer) flows.
**Implemented**:
- ✅ Database columns (`success_redirect_url`, `pass_params_to_redirect`)
- ✅ Admin UI in Product Form
- ✅ Redirect logic in `/payment-status` page with param passing
- 📋 Chaining multiple products into OTO sequences

**Implementation Strategy (MVP)**:
1.  **Product Setting**: Add `success_redirect_url` field to the Product configuration.
    - If set, the user is redirected to this URL immediately after a successful transaction instead of the standard "Thank You" page.
    - Useful for chaining offers (e.g., Free Lead Magnet -> Redirect to OTO Page).
2.  **URL Override**: Allow overriding the redirect destination via a query parameter in the checkout link (e.g., `?success_url=https://mysite.com/oto-2`).
    - This gives marketing flexibility to reuse the same product in different funnels.
3.  **Logic Priority**:
    1. `?success_url` param (highest priority)
    2. Product's `success_redirect_url`
    3. Standard `/payment-status` page (default)

#### UTM & Affiliate Parameter Tracking
**Status**: 📋 Planned
**Priority**: 🟡 Medium
**Effort**: ~4-6 hours
**Description**: Dedicated tracking system for UTM parameters and affiliate links throughout the entire purchase funnel. Preserve marketing attribution from initial landing to final conversion.

**Why This Matters**:
- **Attribution Accuracy**: Track which marketing campaigns (UTM) or affiliates drive actual sales
- **ROI Measurement**: Connect ad spend to revenue with clear attribution chain
- **Affiliate Management**: Build affiliate program with accurate conversion tracking
- **Multi-Touch Attribution**: Preserve parameters across multiple funnel steps (e.g., Lead Magnet → Upsell → Premium)

**Features**:
1.  **UTM Parameter Capture**:
    - Automatically detect and store: `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`
    - Capture on first page visit (landing page or direct checkout link)
    - Store in session/cookie for persistence across funnel steps

2.  **Affiliate ID Tracking**:
    - Support custom affiliate parameter (e.g., `?ref=john123`, `?aff=partner-id`)
    - Configurable parameter name in admin settings
    - Track affiliate throughout purchase journey

3.  **Database Schema** (`purchase_attribution` table):
    ```sql
    - purchase_id (FK to purchases)
    - utm_source, utm_medium, utm_campaign, utm_term, utm_content
    - affiliate_id
    - referrer_url (HTTP Referer header)
    - landing_page (first page visited)
    - captured_at (timestamp)
    ```

4.  **Funnel Persistence**:
    - Preserve UTM/affiliate data when `pass_params_to_redirect = true`
    - Automatically append to OTO redirect URLs
    - Maintain attribution across: Landing → Checkout → OTO → Final Purchase

5.  **Admin Analytics**:
    - Dashboard report: "Revenue by UTM Source/Campaign"
    - Affiliate performance table: Revenue, Conversions, AOV per affiliate ID
    - Filter purchases by UTM parameters
    - Export attribution data for external analysis

6.  **Webhook Integration**:
    - Include UTM/affiliate data in `purchase.completed` webhook payload
    - Enable external CRM/analytics tools to receive full attribution context

7.  **Privacy Compliance**:
    - Cookie consent required for UTM tracking (respect GDPR)
    - Option to disable tracking in admin settings
    - Clear data retention policy (e.g., 90 days)

**Implementation Steps**:
1.  **Capture Layer** (`/lib/tracking/utm-capture.ts`):
    - Middleware or hook to extract UTM params from URL on page load
    - Store in localStorage + HTTP-only cookie for persistence
    - Fallback to session storage for cookieless environments

2.  **Database Migration**:
    - Create `purchase_attribution` table with indexes on utm_source, affiliate_id
    - Add RLS policies for admin-only access

3.  **Payment Flow Integration**:
    - Update `/app/api/create-payment-intent/route.ts` to accept attribution data
    - Store attribution in metadata during checkout
    - Write to `purchase_attribution` table after successful payment

4.  **OTO Redirect Enhancement** (`/payment-status/page.tsx`):
    - When `pass_params_to_redirect = true`, automatically append UTM params to redirect URL
    - Preserve affiliate ID across funnel steps

5.  **Admin Dashboard** (`/dashboard/analytics`):
    - New "Attribution" tab with UTM and Affiliate reports
    - Charts: Revenue by source, conversions by campaign, affiliate leaderboard
    - Filter purchases by attribution parameters

6.  **Webhook Payload**:
    - Extend `purchase.completed` event with `attribution` object containing UTM/affiliate data

**Example Flow**:
```
1. User clicks ad: https://shop.com/?utm_source=facebook&utm_campaign=spring-sale&ref=partner123
2. Lands on /p/free-ebook → Downloads free product
3. Redirected to /checkout/premium-course (UTM params preserved)
4. Completes purchase → Attribution stored:
   {
     utm_source: "facebook",
     utm_campaign: "spring-sale",
     affiliate_id: "partner123",
     landing_page: "/p/free-ebook"
   }
5. Webhook fires with full attribution data for CRM sync
```

**Benefits**:
- ✅ Clear ROI measurement for marketing campaigns
- ✅ Foundation for affiliate/referral program
- ✅ Multi-touch attribution across funnel steps
- ✅ Data-driven marketing decisions
- ✅ Competitive advantage (most self-hosted platforms lack this)

**References**:
- [Google Analytics UTM Best Practices](https://support.google.com/analytics/answer/1033863)
- [Affiliate Tracking Systems Architecture](https://www.rewardful.com/blog/how-affiliate-tracking-works)

---

## 🟡 Medium Priority

### 🤖 AI & Growth

#### AI Landing Page Generator ("Wow" Factor)
**Status**: 📋 Planned
**Description**: Generate conversion-focused landing pages instantly using AI.
**Features**:
- **One-Click Generation**: Input product name & description -> Get full landing page.
- **AI Copywriting**: Auto-generate persuasive headlines, benefits, and FAQ (using OpenAI/Anthropic).
- **Design Automation**: AI selects color palettes and layout structure compatible with GateFlow themes.
- **Integration**: Seamlessly links to the Checkout/Product.
- **Inspiration**: easy.app's generator.

#### Automated Review Collection (Social Proof)
**Status**: 📋 Planned
**Description**: Collect and display authentic user reviews to boost conversion.
**Features**:
- **Auto-Request**: Send review request emails X days after purchase (configurable per product).
- **Rich Media**: Allow customers to upload photos/videos with their review.
- **Product Page Display**: Dedicate review section on `/p/[slug]`.
- **Checkout Widget**: Display top reviews/stars directly on the checkout form (`/checkout/[slug]`) to reduce hesitation.
- **Verified Badge**: Mark reviews from actual purchasers.
- **Direct Link Support**: Ensure reviews are visible even when traffic comes via direct checkout links (`/checkout/[slug]`) from external funnels.
- **Inspiration**: TrustMate / easycart built-in reviews.

### 🛒 Checkout & Payments

#### Privacy-First Cart Recovery (Legalne Ratowanie Koszyków)
**Status**: 📋 Planned
**Description**: Increase conversion by capturing abandoned checkouts while remaining GDPR compliant.
**Key Features**:
- **Real-time Email Capture**: Save the email address as the user types it in the checkout form (ghosting).
- **Compliance First**: Implement a "legal" way to contact users who didn't finish the purchase (e.g., via a clear notice or explicit recovery consent checkbox).
- **Abandonment Detection**: Mark a checkout as "abandoned" after a specific period of inactivity (e.g., 30 minutes).
- **Automated Follow-up**: Trigger a webhook or internal email system to send a recovery link (optionally with a dynamic coupon code).
- **Inspiration**: `easy.app` / `easycart.pl` recovery system.

#### Stripe Subscriptions (Recurring Payments)
**Status**: 📋 Planned
**Description**: Support for recurring billing (monthly/yearly subscriptions).
**Features**:
- Integrate Stripe Billing.
- Handle subscription lifecycle events (created, updated, canceled).
- "My Subscription" portal for users to manage their plan.
- Dunning management (failed payment retries).

#### Advanced Refund Management
**Status**: 📋 Planned
**Description**: Comprehensive refund handling directly from the Admin Panel.
**Features**:
- **Refund Action**: Button to trigger Stripe refund API.
- **Refund Window**: Configure "Days to Refund" per product (e.g., 30-day money-back guarantee).
- **Auto-Revoke**: Automatically revoke access when a refund is processed.
- **Partial Refunds**: Allow refunding specific amounts.

#### Payment Transactions History UI
**Status**: 📋 Planned
**Description**: A dedicated view to monitor all purchase attempts and successful payments.
**Features**:
- **Transaction List**: Comprehensive table showing Customer Email, Product, Amount, Currency, and Status.
- **Stripe Integration**: Link each transaction to the Stripe Dashboard.
- **Search & Filters**: Filter by date range, product, or transaction status.

#### Polish Payment Gateways (PayU, Przelewy24, Tpay)
**Status**: 📋 Planned
**Description**: Add native support for key Polish payment providers to maximize conversion in the PL market.
**Integrations**: PayU, Przelewy24, Tpay.
**Requirements**:
- **Payment Generation**: Create transactions via API (Redirect/Embedded).
- **Webhooks**: Handle asynchronous status updates (Success, Failed) securely.
- **Validation**: Verify transaction signatures/checksums to prevent fraud.
- **Refunds**: Support full and partial refunds via Admin Panel.
- **Error Handling**: Graceful handling of timeouts and API errors.

#### Payment Balancer & Smart Routing
**Status**: 📋 Planned
**Description**: Architecture to switch between payment providers instantly without negative impact on users. Critical for business continuity.
**Features**:
- **Failover**: Automatically switch to a backup provider if the primary API is down.
- **Smart Switch**: One-click admin toggle to change providers (e.g., if Stripe blocks the account) without deploying code.
- **Routing Rules**: Route transactions based on currency (e.g., USD -> Stripe, PLN -> Tpay) or lowest fees.
- **Seamless Experience**: Frontend adapts the payment form automatically based on the active backend provider so the user experience remains consistent.

#### Audit Logging for Admin Operations
**Status**: 📋 Planned
**Description**: Log every administrative action (Create/Update/Delete) to a dedicated `admin_audit_logs` table for security compliance.
**Features**:
- **Automatic Logging**: Middleware or helper to log who did what and when.
- **Webhook Operations**: Track changes to webhook configurations and manual retries.
- **Product & Coupon changes**: Track price changes or discount updates.

### 🏗️ Architecture & Security Improvements
- 📋 **Dashboard Data Fetching Consolidation**: Optimize admin dashboard by reducing parallel client-side requests (currently ~15 POST calls) by moving fetching to Server Components.
- 📋 **Custom Error Classes**: Implement strongly typed error classes (e.g., `UnauthorizedError`, `ForbiddenError`) with automatic HTTP status mapping for cleaner API code.
- 📋 **API Middleware Wrapper**: Create a `withAdminAuth()` Higher-Order Function (HOF) to wrap admin routes, reducing boilerplate and centralizing security/error handling.
- 📋 **Supabase Custom JWT Claims**: Integrate `is_admin` flag directly into the Supabase JWT token to enable stateless, lightning-fast admin verification in Edge Middleware.
- 📋 **Standardized Rate Limiting**: Implement a global rate limiting strategy for all public and administrative API endpoints.

### 🎥 Video & Media

#### Full Integration with Bunny.net API
**Status**: 📋 Planned
**Description**: Upload videos directly from the GateFlow admin panel to Bunny.net.
**Requirements**:
- Configuration of Bunny.net API key in the admin panel
- Upload interface in the admin panel
- Progress bar during upload
- Automatic embed code generation
- Video library management (list, edit, delete)

#### Advanced Video Player Styling (inspired by Presto Player)
**Status**: 📋 Planned
**Description**: Customization of the video player's appearance and features.

**Features**:
- 🎨 **Custom Styling**: Player UI colors, buttons, logo overlay.
- ⚙️ **Controls**: Speed control, PiP, Sticky player.
- 🎯 **Overlays & CTAs**: Buttons at timestamps, email capture, action bars.
- 🧠 **Smart**: Remember playback position, chapters.
- 🔒 **Protection**: Prevent unauthorized downloads (signed URLs).
- 📊 **Analytics**: Watch percentage, heatmaps, drop-off points.

### 🔐 Security & Access Control

#### Terms Acceptance for Free/Guest Users
**Status**: 📋 Planned
**Description**: Ensure explicit acceptance of Terms of Service and Privacy Policy for non-payment flows.
**Context**:
- Stripe Checkout handles terms acceptance for paid products (`consent_collection`).
- Free product access and direct registration currently lack a mandatory checkbox.
**Requirements**:
- Add "I agree to Terms & Privacy" checkbox to:
  - Guest email capture forms (free products)
  - Magic Link login/registration forms
- Store acceptance timestamp and IP in `users` or `audit_log`.

#### Configurable URL Validation
**Status**: 📋 Planned
**Description**: Add a global setting in the admin panel to enable or disable strict URL validation for content links, such as `video_embed` or `download_link` fields.

#### Self-Service Account Deletion (GDPR)
**Status**: 📋 Planned
**Description**: Allow users to permanently delete their account from the profile settings, requiring explicit confirmation of the consequences.
**Warning Message (PL)**:
> **UWAGA! Usunięcie konta wiąże się z:**
> 1.  Automatycznym usunięciem konta w platformie **GateFlow**.
> 2.  Automatycznym anulowaniem wszystkich aktywnych subskrypcji, ze skutkiem natychmiastowym.
> 3.  Brakiem możliwości pobrania wystawionych wcześniej faktur i rachunków.
> 4.  Brakiem możliwości pobrania plików dołączonych do zakupionych produktów (np. PDF).
>
> *Dostęp do produktów zakupionych pojedynczo może zostać utracony, jeśli sprzedawca korzysta z logowania GateFlow do zabezpieczenia treści.*
>
> W związku z tym, polecamy wcześniejsze pobranie swoich plików, faktur czy rachunków.
> **Twoje konto zostanie deaktywowane natychmiastowo i nie będziesz mógł/mogła już się zalogować.**

**Technical Requirements**:
- **Stripe Integration**: Immediately cancel all active subscriptions via API.
- **Data Cleanup**: Anonymize or delete user record in Supabase (handle foreign key constraints with `ON DELETE SET NULL` or soft delete).
- **Session**: Invalidate all active user sessions immediately.
- **Safety**: "Danger Zone" UI with double confirmation (e.g., type "DELETE").

### 🎨 UI & Branding

#### Custom Application Branding & Whitelabel
**Status**: ✅ Done (MVP) - 2025-12-27
**Description**: Comprehensive branding system allowing shop owners to customize the application's appearance and create a white-labeled experience.
**Implemented Features**:
- ✅ **Logo Upload**: Custom logo with preview and removal (stored in Supabase Storage)
- ✅ **Color Customization**:
  - Primary Color (main brand color)
  - Secondary Color (accents and secondary elements)
  - Accent Color (CTAs, highlights)
  - Live preview with real-time updates
- ✅ **Font Selection**: Choose from 6 professional font families:
  - System Default (native OS fonts)
  - Inter (modern, geometric)
  - Roboto (neutral, versatile)
  - Montserrat (elegant, modern)
  - Poppins (friendly, geometric)
  - Playfair Display (classic, serif)
- ✅ **Settings UI**: Full BrandingSettings component in `/dashboard/settings` with:
  - Image upload with drag-and-drop
  - Color pickers with hex input
  - Font dropdown with previews
  - Reset to defaults button
- ✅ **Database Schema**: `shop_config` table extended with branding fields
- ✅ **Type Safety**: ShopConfig interface with branding properties
- ✅ **E2E Tests**: 11 comprehensive Playwright tests covering all branding features

**Next Steps** (Future Enhancement):
- 📋 **Custom CSS Injection**: Allow advanced users to inject custom CSS for ultimate control
- 📋 **Favicon Upload**: Separate favicon configuration
- 📋 **Theme Presets**: Pre-configured color schemes (e.g., "Dark Mode", "Pastel", "Bold")
- 📋 **Custom Domain Branding**: Hide "Powered by GateFlow" when using custom domain

#### Smart Landing Page (Dynamic Storefront)
**Status**: ✅ Done - 2025-12-27
**Description**: Intelligent landing page that adapts based on user role and product availability, providing optimal experience for each scenario.
**Implemented Features**:
- ✅ **4 Adaptive Scenarios**:
  1. **Admin without products**: Onboarding CTA with setup checklist
  2. **Guest without products**: "Coming Soon" empty state with shop branding
  3. **Admin with products**: Full storefront (same as guests)
  4. **Guest with products**: Modern product showcase with free/premium sections
- ✅ **Admin Onboarding CTA** (`AdminOnboardingCTA.tsx`):
  - Welcome message with shop name
  - Setup progress checklist (Shop configured, Add product, Configure payments, Launch)
  - Primary CTA: "Add Your First Product" (opens modal via `?open=new`)
  - Quick links to Products, Payments (Settings), Dashboard
  - Animated gradient background with floating blobs
- ✅ **Coming Soon State** (`ComingSoonEmptyState.tsx`):
  - Branded empty state for guests when no products exist
  - Shop name and contact email display
  - Friendly message encouraging return visit
- ✅ **Modern Storefront** (`Storefront.tsx`):
  - Hero section with dynamic content based on product mix (free-only, paid-only, mixed)
  - Separate sections for Free and Premium products
  - Featured products with bento grid layout (first product larger)
  - Temporal badges (Limited Time, Coming Soon) based on availability dates
  - Access duration badges (e.g., "30d access")
  - Show All functionality for products over limit (6 initial, expand on click)
  - Smooth scroll navigation to product sections
  - Responsive design (mobile, tablet, desktop)
- ✅ **Smart Hero Variants**:
  - Free-only: "Start Your Journey - Completely Free"
  - Paid-only: "Premium Quality - Professional Results"
  - Mixed: "From Free To Professional"
  - Product count badges dynamically updated
- ✅ **E2E Tests**: 24 comprehensive Playwright tests covering:
  - All 4 scenarios with different user/product combinations
  - Onboarding flow and navigation
  - Storefront rendering for free, paid, and mixed shops
  - Featured products, temporal badges, duration badges
  - Show All functionality, animations, responsive design

**Technical Architecture**:
- `SmartLandingClient.tsx`: Main logic for scenario detection and routing
- `src/app/[locale]/page.tsx`: Server-side data fetching and user detection
- Context-aware rendering based on `isAdmin` flag and `products.length`
- Integrated with DashboardLayout for consistent navigation

#### About Page (Marketing & Lead Generation)
**Status**: ✅ Done - 2025-12-27
**Description**: Professional marketing page showcasing GateFlow's features, benefits, and deployment options to attract potential users.
**Implemented Features**:
- ✅ **Hero Section**:
  - Animated gradient background with floating shapes
  - Clear value proposition: "Self-Hosted Digital Product Platform"
  - Dual CTAs: "View Documentation" and "See Demo"
- ✅ **8 Feature Cards** with gradient backgrounds:
  - Payment Processing (Stripe integration)
  - Product Management (digital delivery)
  - Email Verification (secure access)
  - Lead Collection (guest checkout)
  - Customer Dashboard (product access)
  - Video Embeds (YouTube, Vimeo, Bunny.net, Loom)
  - Quick Setup (Deploy in minutes)
  - Open Source (MIT license)
- ✅ **Deployment Options Section**:
  - Quick Start: mikr.us with PM2 (~$3/mo, ~300MB RAM, free SSL)
  - Production: VPS with Docker (~$4-14/mo, managed DB, zero-downtime deploys)
  - Clear pricing and technical specifications
- ✅ **Why Choose GateFlow Section**:
  - No platform fees comparison
  - Full control over data and payments
  - Open source benefits
- ✅ **FAQ Section**: 6 common questions with accurate, honest answers
- ✅ **Technical Stack Section**: Next.js, PostgreSQL, Supabase, Stripe badges
- ✅ **Footer**: Links to features, documentation, products, GitHub
- ✅ **Bilingual**: Full EN/PL translations
- ✅ **Removed Inaccuracies**:
  - Fixed deployment pricing to realistic amounts
  - Removed "Stripe one-click" claim (not accurate)
  - Changed "Video Hosting" to "Video Embeds" (only embed support)
  - Removed Enterprise tier (not ready yet)
  - Fixed FAQ claims (removed "thousands of transactions tested", "community discussions")

**Navigation**:
- Added to main navigation in `DashboardLayout.tsx`
- Route: `/[locale]/about`
- Accessible to both authenticated and guest users

---

## 🔵 Low Priority / Ideas

#### Anonymous Analytics & Usage Statistics
**Status**: 💭 Idea
**Description**: Collect anonymous usage statistics with user consent to improve the platform and understand user behavior.
**Privacy-First Approach**:
- **Opt-In Only**: Require explicit user consent before collecting any data
- **Anonymous Data**: No personal identifiers, emails, or IP addresses stored
- **Transparent**: Clear explanation of what data is collected and why
- **Revocable**: Easy opt-out at any time in user settings
**Data to Collect** (anonymous):
- **Platform Usage**:
  - Number of products created/published
  - Feature adoption (order bumps, coupons, webhooks usage)
  - Average revenue per shop (currency-converted to USD)
  - Payment methods used (Stripe only, alternative providers in future)
- **Performance Metrics**:
  - Page load times
  - API response times
  - Error rates (without sensitive details)
- **Deployment Stats**:
  - Platform (mikr.us, VPS, Docker, PM2)
  - Region (country-level, not city)
  - Self-hosted vs managed
**Use Cases**:
- Prioritize features based on actual usage
- Identify performance bottlenecks across deployments
- Understand which deployment paths are most popular
- Showcase aggregate stats (e.g., "GateFlow powers X shops processing $Y globally")
**Implementation**:
- **Consent UI**: Modal on first login with clear explanation
- **Settings Toggle**: Enable/disable in user profile
- **Storage**: Aggregated data only, no individual shop tracking
- **Technology**: PostHog (self-hosted) or simple beacon API
**Note**: This is controversial for privacy-focused users. Only proceed if community supports it.

#### In-App File Hosting & Cloud Storage Integration
**Status**: 💭 Idea
**Description**: Ability to upload and host files directly within GateFlow, with support for multiple storage providers.
**Storage Providers**:
- **Supabase Storage** (Native):
  - Direct integration with existing Supabase instance
  - Built-in RLS policies for secure file access
  - Signed URLs for time-limited downloads
  - Best for: Self-hosted instances with existing Supabase infrastructure
- **AWS S3**:
  - Industry-standard object storage
  - Global CDN via CloudFront
  - Best for: High-traffic products with international audience
- **Cloudinary**:
  - Image/video optimization and transformation
  - Automatic format conversion and responsive images
  - Best for: Visual content (images, videos, PDFs with previews)
- **Bunny.net CDN**:
  - Cost-effective CDN with storage
  - Low latency, high performance
  - Best for: European market, budget-conscious hosting
- **Google Drive / Dropbox**:
  - External integration for existing file storage
  - OAuth-based authorization
  - Best for: Creators who already manage files in these platforms

**Features**:
- **Upload UI**: Drag-and-drop file uploader in Product Form
- **File Management**: Library view with preview, rename, delete, copy URL
- **Storage Limits**: Configurable per-plan limits (e.g., 100MB free, 10GB pro, unlimited enterprise)
- **File Types**: Support for PDFs, videos, images, archives (.zip), ebooks (.epub, .mobi)
- **Secure Access**: Signed URLs with expiration, watermarking for images/PDFs
- **Bandwidth Monitoring**: Track download usage per product
- **Migration Tool**: Easy migration between storage providers without broken links

**Implementation Priority**: Low (most users already use external CDNs or Google Drive links)

#### Mux Video Integration (Alternative Provider)
**Status**: 💭 Idea
**Description**: Integration with Mux Video as an alternative high-end video hosting provider.

#### Related Products
**Status**: 💭 Idea
**Description**: Display "Related Products" or "Customers also bought" sections on product pages to encourage cross-selling and product discovery.

#### Product Bundles
**Status**: 💭 Idea
**Description**: Allow administrators to group multiple products into a single "bundle" that can be purchased as one item, often at a discounted price.

#### Product Categories
**Status**: 📋 Planned
**Description**: Organize products into a hierarchical or flat category structure for better navigation and management.
**Features**:
- **Category Management**: CRUD for categories (Name, Slug, Description).
- **Product Assignment**: UI to assign one or multiple categories to a product.
- **Frontend filtering**: Filter products by category on the storefront/dashboard.

#### Product Tags
**Status**: 📋 Planned
**Description**: Flexible tagging system for products to enable advanced filtering, marketing segmentation, and automation.
**Features**:
- **Tag Management**: Create/Edit tags on the fly or in a dedicated view.
- **Usage**: Assign tags like "Promo", "Bestseller", "New" to products.
- **Automation**: Use tags as triggers for discounts or webhooks (e.g. "Apply coupon to all products with tag 'BlackFriday'").

#### Content Delivery Type Refactoring
**Status**: 💭 Idea
**Description**: Extend the `content_delivery_type` system.
**New Types**: `bunny_video`, `download`, `video_course`, `membership`, `api_access`.

#### Video Course Structure
**Status**: 💭 Idea
**Description**: Support for courses composed of multiple lessons.
**Features**: Chapters & Lessons hierarchy, Progress tracking, Sequential unlocking, Certificates, Quiz integration.

#### Interactive Onboarding Checklist
**Status**: ✅ Done (Basic MVP) - 2025-12-27
**Description**: Admin onboarding experience displayed when no products exist, guiding shop setup with visual checklist and CTAs.
**Implemented Features**:
- ✅ **Smart Detection**: Automatically shown when admin user has 0 products
- ✅ **Setup Checklist** (4 tasks with visual indicators):
  1. ✅ Shop configured (auto-completed)
  2. ⏳ Add first product (links to product creation modal)
  3. ⏳ Configure payments (links to Stripe settings)
  4. ⏳ Launch store (ready when above are done)
- ✅ **Primary CTA**: "Add Your First Product" button (opens modal via `?open=new` query param)
- ✅ **Quick Links Section**: Direct access to Products, Payments, Dashboard
- ✅ **Visual Design**: Animated gradient background, stat cards showing 0 products/customers
- ✅ **Component**: `AdminOnboardingCTA.tsx` integrated into Smart Landing Page
- ✅ **E2E Tests**: Covered by smart-landing.spec.ts tests

**Next Steps** (Future Enhancement):
- 📋 **Progress Persistence**: Track completed tasks in database (currently all pending except first)
- 📋 **Dynamic Task Completion**: Auto-mark tasks as done when actions are completed
- 📋 **More Tasks**: Add "Configure taxes", "Upload logo", "Test checkout" to checklist
- 📋 **Dismissible**: Allow admin to hide onboarding once comfortable
- 📋 **Re-open Option**: "Show me setup guide" link in dashboard for returning to checklist

---

## ✅ Completed Features

### 🛒 Checkout & Compliance (2025-12-28 - 2025-12-30)

#### EU Omnibus Directive Compliance (2019/2161)
**Completed**: 2025-12-28
- ✅ **Price History Tracking**: Automatic logging of all price changes in `price_history` table
- ✅ **Lowest Price Display**: Shows lowest price from last 30 days on product pages
- ✅ **Omnibus Badge**: Visual indicator when displaying Omnibus-required lowest price
- ✅ **Admin Configuration**: Global toggle to enable/disable Omnibus price display
- ✅ **Per-Product Exemption**: Ability to exempt specific products from Omnibus requirements
- ✅ **Backend Functions**: PostgreSQL functions for price comparison and history queries
- ✅ **Frontend Components**: `OmnibusPrice` component with proper formatting
- ✅ **Migration**: Database schema with RLS policies for price history
- ✅ **E2E Tests**: Comprehensive tests covering price display and history tracking

**Limitations (Current Implementation)**:
- ⚠️ **No Compare-At-Price**: Omnibus only shows when current price is at historical minimum
- ⚠️ **Missing "Was/Now" Display**: Cannot show crossed-out "original price" like EasyCart/Shopify
- 📋 **Enhancement Needed**: Add `compare_at_price` field (see below)

#### Compare-At-Price / Original Price Display
**Status**: 📋 Planned
**Priority**: 🟡 Medium
**Effort**: ~3-4 hours
**Description**: Add support for showing "Was/Now" pricing with crossed-out original price, enabling proper Omnibus compliance for promotional pricing.

**Why This Matters**:
Current Omnibus implementation shows lowest price from last 30 days, but ONLY when current price is at historical minimum. This doesn't match real-world e-commerce where you show:
- **Was**: ~~100 USD~~ (crossed out)
- **Now**: 60 USD (current price)
- **Omnibus**: "Lowest price in last 30 days: 50 USD"

**Missing Functionality**:
We have ONLY `price` field. We need `compare_at_price` (original/regular price) to:
1. Show crossed-out "was" price
2. Calculate discount percentage (-40%)
3. Display Omnibus warning even when current price is NOT at minimum

**Real-World Example**:
```
EasyCart/Shopify Style:
┌─────────────────────────┐
│ ~~100 USD~~  (-40% OFF) │  ← compare_at_price
│   60 USD                │  ← price (actual)
│ Lowest 30d: 50 USD      │  ← Omnibus (shows always when compare_at_price set)
└─────────────────────────┘

GateFlow Current:
┌─────────────────────────┐
│   60 USD                │  ← price only
│ (Omnibus hidden)        │  ← hidden because 60 >= 50 (lowest)
└─────────────────────────┘
```

**Database Schema Changes**:
```sql
ALTER TABLE products ADD COLUMN compare_at_price DECIMAL(10,2);
ALTER TABLE products ADD COLUMN discount_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
  CASE
    WHEN compare_at_price > 0 AND compare_at_price > price
    THEN ROUND(((compare_at_price - price) / compare_at_price) * 100, 2)
    ELSE NULL
  END
) STORED;
```

**Product Type Extension**:
```typescript
interface Product {
  // ... existing fields
  price: number;
  compare_at_price?: number | null;  // "Was" price (crossed out)
  discount_percentage?: number | null; // Auto-calculated
}
```

**UI Changes**:
1. **ProductFormModal**: Add "Compare At Price" input field (optional)
2. **ProductShowcase** (`/checkout/[slug]`):
   ```tsx
   {compareAtPrice && compareAtPrice > price && (
     <div className="flex items-center gap-3">
       <span className="text-2xl text-gray-400 line-through">
         ${compareAtPrice}
       </span>
       <span className="text-4xl font-bold text-green-600">
         ${price}
       </span>
       <span className="bg-red-500 text-white px-2 py-1 rounded">
         -{discountPercentage}%
       </span>
     </div>
   )}
   <OmnibusPrice ... /> {/* Now shows even when price not at minimum */}
   ```

3. **OmnibusPrice Logic Update**:
   ```typescript
   // OLD (line 61):
   if (currentPrice >= lowestPriceData.lowestPrice) return null;

   // NEW:
   // Show if either:
   // 1. Compare-at-price is set (promotional pricing active), OR
   // 2. Current price < lowest price (historical discount)
   const hasPromotion = compareAtPrice && compareAtPrice > currentPrice;
   const hasHistoricalDiscount = currentPrice < lowestPriceData.lowestPrice;

   if (!hasPromotion && !hasHistoricalDiscount) {
     return null;
   }
   ```

**Admin Workflow**:
1. Create product: price = 100, compare_at_price = null (no promotion)
2. Run Black Friday sale: price = 60, compare_at_price = 100
   - Shows: ~~100 USD~~ → 60 USD (-40%)
   - Omnibus: "Lowest 30d: 50 USD" (if historical min was 50)
3. End sale: price = 100, compare_at_price = null (back to regular)

**Benefits**:
- ✅ Proper Omnibus compliance for promotional pricing
- ✅ Visual "sale" badges and crossed-out prices
- ✅ Automatic discount percentage calculation
- ✅ Matches EasyCart/Shopify UX expectations
- ✅ More flexibility in pricing strategies

**Migration Strategy**:
- Add column with `DEFAULT NULL` (backward compatible)
- Existing products: `compare_at_price = NULL` (no change in display)
- New products: Optional field in admin panel

**References**:
- [Shopify Compare At Price](https://help.shopify.com/en/manual/products/details/product-pricing#compare-at-price)
- [WooCommerce Sale Price](https://woocommerce.com/document/managing-products/#sale-price)

#### GUS REGON API Integration (Polish Company Data)
**Completed**: 2025-12-28
- ✅ **NIP Validation**: Polish VAT ID checksum validation algorithm
- ✅ **SOAP Client**: Integration with GUS REGON API for company data lookup
- ✅ **Auto-fill**: Automatic population of company name, address, city, postal code from NIP
- ✅ **Admin Configuration**: Encrypted API key storage in `/dashboard/integrations`
- ✅ **Checkout Integration**: Seamless autofill on NIP blur (after entering 10 digits)
- ✅ **Profile Sync**: Company data saved to user profile after successful payment
- ✅ **Guest Support**: Company data stored in `guest_purchases.metadata` for non-logged users
- ✅ **Error Handling**: Graceful fallback to manual entry when API fails
- ✅ **Rate Limiting**: Protection against API abuse (in-memory, upgrade path to Upstash)
- ✅ **E2E Tests**: 15 comprehensive Playwright tests covering all scenarios
- ✅ **Encryption**: AES-256-GCM for API key storage (reusing Stripe infrastructure)

#### Enhanced Checkout UX (2025-12-27 - 2025-12-30)
**Completed**: 2025-12-27 - 2025-12-30
- ✅ **Custom Payment Form**: Stripe Elements integration for embedded payments
- ✅ **Streamlined Form**: Simplified checkout with only essential fields
- ✅ **Profile Auto-load**: Automatic pre-fill of user data for logged-in customers
- ✅ **First/Last Name Fields**: Required fields for invoice generation
- ✅ **Email Handling**: Smart email field (hidden for logged-in, required for guests)
- ✅ **Terms at Checkout**: Moved T&C acceptance to checkout form (from Stripe)
- ✅ **NIP Optional Logic**: Invoice checkbox reveals company fields
- ✅ **Address Fields**: Full address support (street, city, postal code, country)
- ✅ **Payment Intent Flow**: Complete guest checkout support with metadata
- ✅ **EasyCart-style Showcase**: Product preview on left, form on right
- ✅ **Responsive Design**: Mobile-optimized checkout experience
- ✅ **E2E Tests**: Updated test suite for new checkout flow

#### Comprehensive E2E Testing Infrastructure (2025-12-30)
**Completed**: 2025-12-30
- ✅ **176 Total Tests**: 100% pass rate across all test suites
- ✅ **Currency Tests**: 22 tests for conversion and configuration
- ✅ **GUS Tests**: 15 tests for Polish company data integration
- ✅ **Omnibus Tests**: Tests for price history and compliance
- ✅ **Checkout Tests**: End-to-end payment and form validation tests
- ✅ **Stable Selectors**: `data-testid` attributes for reliable test targeting
- ✅ **Serial Execution**: Admin tests run in serial mode to prevent conflicts
- ✅ **Test Helpers**: Reusable authentication and setup utilities
- ✅ **Cleanup**: Proper test data cleanup in afterAll hooks

### 📊 Analytics & Integrations (2025-12-24)

#### Real-time Sales Dashboard
- ✅ **Live Updates**: Instant notifications and chart updates via Supabase Realtime + Polling fallback.
- ✅ **Revenue Goal**: Progress bar with database persistence per product and global targets.
- ✅ **Filtering**: Advanced Combobox filter by product.
- ✅ **Charts**: Hourly (today) and Daily (30d) revenue visualization using Recharts.
- ✅ **UX**: "New Order" confetti popup accessible globally in admin panel.

#### Multi-Currency Conversion System (2025-12-26)
- ✅ **Currency Support**: USD, EUR, GBP, PLN, JPY, CAD, AUD with manual exchange rates.
- ✅ **View Modes**: Toggle between "Grouped by Currency" and "Convert to [TARGET]" modes.
- ✅ **Currency Selector**: Dropdown UI component with currency symbols and real-time switching.
- ✅ **User Preferences**: Persistent storage of selected currency view mode and display currency.
- ✅ **Shop Configuration**: Global default currency setting via `/dashboard/settings`.
- ✅ **Chart Visualization**: Stacked area chart with color-coded currencies (blue=USD, green=EUR, purple=GBP, orange=PLN).
- ✅ **Smart Y-Axis**: Removes currency symbols in grouped mode, shows symbol in converted mode.
- ✅ **Revenue Goal Conversion**: Automatically converts goal and progress to display currency.
- ✅ **Stats Cards**: All dashboard statistics support both view modes.
- ✅ **Testing**: 11 E2E Playwright tests covering conversion, persistence, and visualization.

#### Google Tag Manager (GTM) - Phase 1
- ✅ Admin UI to input `GTM-XXXX` ID.
- ✅ Client-side script injection via `TrackingProvider`.
- ✅ Validation for GTM ID format.

#### Cookie Consent (Klaro)
- ✅ Implemented open-source `Klaro` for GDPR compliance.
- ✅ Integration with `TrackingProvider` to block scripts until consent is given.
- ✅ "Require Consent" toggle in admin settings.

#### Script Manager
- ✅ Structured management of custom scripts (Essential, Marketing, Analytics).
- ✅ Dynamic injection based on consent category.
- ✅ Secure database storage (`integrations_config`).

### 🛒 Sales Mechanics

#### Smart Coupons (2025-12-19)
- ✅ Database schema (`coupons`)
- ✅ Admin UI (List/Create/Edit)
- ✅ Percentage & Fixed amount discounts
- ✅ Global & Per-user usage limits
- ✅ Product & Email restrictions
- ✅ Frictionless Auto-apply links (`?coupon=CODE`)
- ✅ "Exclude Order Bumps" logic

#### Order Bumps (2025-11-28)
- ✅ Database schema (`order_bumps` table with RLS policies)
- ✅ API endpoints & Admin UI
- ✅ Checkout page integration (attractive checkbox UI)
- ✅ Payment processing (automatic access grant for both main + bump products)
- ✅ Guest checkout support

#### Direct Checkout Links (Deep Linking)
- ✅ Support for external funnels via direct links (`/checkout/[slug]`)
- ✅ URL parameters for coupons (`?coupon=...`) and tracking

### 🎥 Media

#### Bunny.net Video Embed Integration (2025-11-27)
- ✅ Smart video URL parser (`videoUtils.ts`)
- ✅ Automatic conversion of YouTube watch URLs → embed URLs
- ✅ Support for Bunny.net, Vimeo, Loom, Wistia, DailyMotion, Twitch
- ✅ Platform badges & Error handling

---

## 📝 Notation

**Status Tags**:
- 🟢 High Priority
- 🟡 Medium Priority
- 🔵 Low Priority

**Progress**:
- 💭 Idea - to be considered
- 📋 Planned - scheduled for implementation
- 🏗️ In Progress - currently being implemented
- ✅ Done - completed
- ❌ Cancelled - cancelled/abandoned

---

**Last Updated**: 2025-12-30
**Version**: 1.9