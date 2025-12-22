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

#### Configurable Stripe Checkout Experience
**Status**: 📋 Planned
**Description**: Allow administrators to choose and configure how users pay for products, aiming for greater flexibility and adaptation to various sales scenarios.

**Required Implementation Options**:
1.  **Redirect Checkout**:
    - Classic, Stripe-hosted payment process.
    - Simplest integration, highest level of security and PCI compliance.
    - User is redirected to `checkout.stripe.com`.

2.  **Embedded Checkout (Current Method)**:
    - A complete payment form embedded directly on the product page (`/p/[slug]`).
    - Uses Stripe's `CheckoutProvider` and `<PaymentElement>`.
    - Provides a seamless experience without leaving the site.
    - Currently implemented in `admin-panel/src/app/[locale]/checkout/[slug]/page.tsx`.

3.  **Custom Checkout (Stripe Elements)**:
    - Build a fully custom payment form using individual `Stripe Elements` components (`CardNumberElement`, `CardExpiryElement`, `CardCvcElement`, etc.).
    - Allows for full control over the look and layout of each form field.
    - Requires using the `Elements` provider instead of `CheckoutProvider`.
    - Enables styling each element separately, similar to `easycart.pl`.

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

#### Content Delivery Type Refactoring
**Status**: 💭 Idea
**Description**: Extend the `content_delivery_type` system.
**New Types**: `bunny_video`, `download`, `video_course`, `membership`, `api_access`.

#### Video Course Structure
**Status**: 💭 Idea
**Description**: Support for courses composed of multiple lessons.
**Features**: Chapters & Lessons hierarchy, Progress tracking, Sequential unlocking, Certificates, Quiz integration.

---

## ✅ Completed Features

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

**Last Updated**: 2025-12-19
**Version**: 1.5