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

#### Stripe Apps OAuth Integration (Self-Hosted Single Shop)
**Status**: 🟢 High Priority (Next Up)
**Description**: Replace manual API Key entry with **Stripe Apps OAuth 2.0** authentication. Allows self-hosted GateFlow instance owners to connect their Stripe account with a single "Connect with Stripe" button - no API keys to copy/paste.
**Current State**: Using standard Stripe API with manual `STRIPE_SECRET_KEY` from .env (requires technical knowledge).
**Why Stripe Apps (not Connect)**:
- **Perfect for Self-Hosted**: Each GateFlow instance = one shop owner with their own Stripe account
- **Zero Config UX**: "Connect with Stripe" button → OAuth authorization → done (like WooCommerce, Shopify plugins)
- **Security**: OAuth token instead of full access API keys
- **No Platform Fees**: Payments go directly to shop owner's Stripe account (no splitting, no marketplace logic)
- **Stripe Recommendation**: For self-hosted integrations, Stripe recommends Apps with OAuth or Restricted API Keys
**Implementation**:
1.  **Stripe App Registration**: Register GateFlow as a Stripe App in Stripe Dashboard
2.  **OAuth Flow**:
    - User clicks "Connect Stripe" → redirect to Stripe OAuth (`/api/auth/stripe-apps/authorize`)
    - User authorizes their own Stripe account
    - Callback receives OAuth token → store in database (`/api/auth/stripe-apps/callback`)
3.  **API Calls**: Use OAuth token to make charges directly to shop owner's account (same as current logic, just different auth)
4.  **Fallback**: Keep manual API key option for advanced users who prefer it
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

#### 0. Multi-Currency Conversion (Unified View)
**Status**: ✅ Done (MVP) - 2025-12-26
**Description**: Convert all revenue to a single base currency for unified analytics and easier comparison across markets.

**Implemented Features**:
- ✅ **Currency Conversion System**: Manual exchange rate provider with support for USD, EUR, GBP, PLN, JPY, CAD, AUD
- ✅ **Conversion Layer**: `useCurrencyConversion` hook with `convertToSingleCurrency()` helper
- ✅ **UI Toggle**: `CurrencySelector` component with "Grouped by Currency" and "Convert to [CURRENCY]" modes
- ✅ **User Preferences**: Currency view mode and display currency stored in `user_metadata` via `UserPreferencesContext`
- ✅ **Admin Settings**: Shop configuration system (`shop_config` table) with default currency setting
- ✅ **Dashboard Integration**:
  - Revenue chart with stacked areas visualization for multi-currency grouped view
  - Chart Y-axis adapts (no currency symbol in grouped mode)
  - Legend showing all currencies in grouped mode
  - Revenue goal converts to display currency automatically
- ✅ **Stats Overview**: All stat cards support both grouped and converted display modes
- ✅ **E2E Tests**: 11 comprehensive Playwright tests covering currency conversion, persistence, and chart rendering
- ✅ **Test Infrastructure**: Fixed `test-new-payment.sh` with dynamic product lookup and multi-currency test data

**Next Steps (Future Enhancement)**:
- 📋 **Live Exchange Rate API Integration**: Replace manual rates with real-time data from exchangerate-api.com, fixer.io, or ECB API
  - Cache rates in database/Redis with hourly refresh
  - Historical rates storage for accurate past data conversion
  - Admin UI to view current rates and last update timestamp
- 📋 **Hover Enhancement**: Show original currency amount on hover when in converted mode (e.g., "$100 USD (€92 EUR original)")
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

#### Custom Application Branding
**Status**: 📋 Planned
**Description**: Ability to configure the application's appearance per instance (white-labeling).
**Features**:
- Custom logo and favicon
- Primary and secondary color configuration
- Font selection
- Custom CSS injection
- White-labeling options

---

## 🔵 Low Priority / Ideas

#### In-App File Hosting
**Status**: 💭 Idea
**Description**: Ability to upload and host files directly within GateFlow.
**Requirements**: Supabase Storage integration, Upload limits per plan.

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
**Status**: 💭 Idea
**Description**: A "Getting Started" guide displayed after the first login to help users set up their store.
**Checklist (0/5 Tasks)**:
1.  **Create your first product**: Guide to the product creation form.
2.  **Store Details**: Configure store name, logo, and subdomain/domain.
3.  **Connect Stripe**: Link a Stripe account to enable payments.
4.  **Company Details**: Fill in business address and tax information.
5.  **Billing & Taxes**: Configure VAT/Tax rates and invoicing settings.
**UX**: Progress bar at the top of the dashboard until all steps are completed.

---

## ✅ Completed Features

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

**Last Updated**: 2025-12-26
**Version**: 1.6