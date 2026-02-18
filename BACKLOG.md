# GateFlow - Product Roadmap

A high-level overview of planned features, current progress, and completed work.

---

## 🔴 High Priority

### Zero-Config Setup Wizard
**Status**: 📋 Planned
Complete guided setup experience for ALL integrations via OAuth or step-by-step wizards. Goal: user should NOT need to touch .env file at all — everything configurable via Admin UI.

### Serverless Deployment (Vercel / Cloudflare / Netlify)
**Status**: 📋 Planned
One-click deployment without server management. "Deploy in 5 minutes" with Vercel, Cloudflare Pages, or Netlify. Supabase Cloud as managed database.

### Transactional Emails & Logs
**Status**: 📋 Planned
Advanced email delivery with multiple providers (EmailLabs, AWS SES), email history tracking (sent, delivered, bounced, opened), and dynamic templates.

### Follow-up Email Sequences per Product
**Status**: 📋 Planned
Automated email campaigns triggered after purchase or free download. Per-product configuration with delay settings, dynamic variables, and analytics (open/click rates).

### Invoicing Integration (Fakturownia, iFirma, KSeF)
**Status**: 📋 Planned
Automatic invoice generation and delivery for successful purchases. Integration with Fakturownia, iFirma, and Polish KSeF e-invoice system.

---

## 🟡 Medium Priority

### UTM & Affiliate Parameter Tracking
**Status**: 📋 Planned
Track UTM parameters and affiliate links throughout the entire purchase funnel. Preserve marketing attribution from landing to conversion, with admin analytics reports.

### Two-Sided Affiliate Program
**Status**: 💭 Idea
Full affiliate/referral program where both parties benefit — the referrer earns commission and the buyer gets a discount. Self-service signup, affiliate dashboard, configurable commission structure, and payout management.

### Real-time Social Proof Notifications
**Status**: 📋 Planned
"Just Bought" popup notifications, aggregate activity counters, and live viewer count to increase urgency and trust on product pages.

### Simple Funnel System (OTO & Redirects)
**Status**: 🏗️ In Progress
Control where users are redirected after purchase to enable One-Time Offer flows.
- ✅ Database columns, admin UI, redirect logic with param passing
- 📋 Chaining multiple products into OTO sequences

### Per-Product Payment Method Override
**Status**: 📋 Planned (Phase 2 of Payment Config)
Override global payment method settings for specific products. Use cases: cards-only for high-value products, local methods for regional products, bank transfers for B2B.

### One-Click Auto-Update System
**Status**: 📋 Planned
Built-in version management with one-click updates from admin panel. Automatic backup before update, health check verification, and rollback capability.

### Automated Review Collection
**Status**: 📋 Planned
Auto-request reviews after purchase, rich media support (photos/videos), display on product pages and checkout for social proof.

### AI Landing Page Generator
**Status**: 📋 Planned
Generate conversion-focused landing pages using AI. One-click generation from product name & description with persuasive copy and design automation.

### Outgoing Webhooks v2.0
**Status**: 📋 Planned
Auto-retry with exponential backoff, log retention policy (auto-cleanup), additional events (`subscription.started`, `subscription.ended`, `refund.issued`).

### Public Developer API
**Status**: 📋 Planned
REST API with API key management, scoped access (read-only, write), Swagger/OpenAPI documentation, and rate limiting.

### GTM Phase 2 (Automated OAuth)
**Status**: 📋 Planned
Google OAuth App integration for one-click GTM setup — GateFlow auto-creates Container and Tags via GTM API.

---

## 🟢 Lower Priority

### Stripe Subscriptions (Recurring Payments)
**Status**: 📋 Planned
Stripe Billing integration for monthly/yearly subscriptions with lifecycle management and customer portal.

### Privacy-First Cart Recovery
**Status**: 📋 Planned
GDPR-compliant abandoned checkout recovery with real-time email capture and automated follow-up.

### Polish Payment Gateways (PayU, Przelewy24, Tpay)
**Status**: 📋 Planned
Native support for key Polish payment providers to maximize conversion in the PL market.

### Payment Balancer & Smart Routing
**Status**: 📋 Planned
Automatic failover between payment providers, one-click admin toggle, and currency-based routing.

### Bunny.net Video Upload Integration
**Status**: 📋 Planned
Upload videos directly from admin panel to Bunny.net with progress bar, automatic embed code generation, and video library management.

### Advanced Video Player Styling
**Status**: 📋 Planned
Custom player UI (colors, logo overlay), overlays & CTAs at timestamps, playback memory, chapters, download protection, and watch analytics.

### Self-Service Account Deletion (GDPR)
**Status**: 📋 Planned
Allow users to permanently delete their account with Stripe subscription cancellation, data cleanup, and double confirmation.

### Product Bundles
**Status**: 💭 Idea
Group multiple products into a single bundle at a discounted price.

### Related Products / Cross-selling
**Status**: 💭 Idea
"Customers also bought" sections on product pages.

### Video Course Structure
**Status**: 💭 Idea
Courses with chapters, lessons, progress tracking, sequential unlocking, certificates, and quizzes.

### In-App File Hosting
**Status**: 💭 Idea
Upload and host files directly within GateFlow with support for Supabase Storage, AWS S3, Cloudinary, and Bunny.net CDN.

### Mux Video Integration
**Status**: 💭 Idea
Alternative high-end video hosting provider integration alongside Bunny.net.

### Content Delivery Type Refactoring
**Status**: 💭 Idea
Extend `content_delivery_type` system with new types: `bunny_video`, `download`, `video_course`, `membership`, `api_access`.

### Configurable URL Validation
**Status**: 📋 Planned
Admin panel setting to enable/disable strict URL validation for content links (`video_embed`, `download_link` fields).

---

## ✅ Completed Features

### 🎨 Theme & Appearance (2026-02-18)

#### Dark/Light Theme Toggle
- ✅ Class-based dark mode (Tailwind v4 `@custom-variant dark`)
- ✅ ThemeProvider with localStorage persistence, system/light/dark modes
- ✅ FloatingToolbar toggle (sun/moon icon)
- ✅ FOUC prevention with inline script

#### Force Checkout Theme (Admin Setting)
- ✅ Admin UI: System/Light/Dark buttons with auto-save
- ✅ DB column: `shop_config.checkout_theme`
- ✅ Responsive checkout backgrounds and Stripe Elements theme

#### GateFlow Branding Watermark
- ✅ Checkout footer with link, license-gated (ECDSA P-256)

### 🚀 Performance & Scalability (2026-01-15)
- ✅ ISR (Incremental Static Regeneration) for all public pages
- ✅ PM2 cluster mode for multi-core utilization
- ✅ Optional Redis caching layer (Upstash) with graceful fallback
- ✅ 30x throughput improvement, 19x lower latency

### 🛒 Checkout & Payments

#### Pixel-Perfect Checkout UI (2026-02-18)
- ✅ Full Stripe Elements integration with custom payment form
- ✅ Invoice data with GUS REGON auto-fill
- ✅ Guest-to-user sync, EasyCart-style layout, order bumps
- ✅ Dark/light theme support, responsive design

#### Enhanced Checkout UX (2025-12-27 — 2025-12-30)
- ✅ Custom Stripe Elements, profile auto-load, guest checkout
- ✅ Terms at checkout, NIP/invoice toggle, EasyCart-style layout

#### Stripe Configuration Wizard (2025-12-27)
- ✅ 5-step RAK wizard with permission validation
- ✅ AES-256-GCM encrypted storage, test/live mode switching

#### Global Payment Method Configuration (2026-01-15)
- ✅ Three modes: automatic, Stripe preset, custom selection
- ✅ Drag & drop ordering, Express Checkout toggles (Apple/Google Pay)

#### Advanced Refund Management (Jan 2025)
- ✅ Per-product config, customer request form, admin dashboard
- ✅ Stripe auto-refund on approval, period validation

#### EU Omnibus Directive Compliance (2025-12-28)
- ✅ Price history tracking, 30-day lowest price display
- ✅ Per-product exemption, admin toggle

#### Compare-At-Price / Original Price Display (2026-01-05)
- ✅ `compare_at_price` field, crossed-out original price with discount badge
- ✅ Omnibus integration (30-day lowest alongside promotional pricing)

#### Payment Transactions History UI (Dec 2024)
- ✅ Payments dashboard with stats cards, sessions & transactions tables
- ✅ Date range & status filters, multi-currency support

#### Direct Checkout Links (Deep Linking)
- ✅ External funnel support via `/checkout/[slug]`
- ✅ URL parameters for coupons (`?coupon=...`) and tracking

### 📊 Analytics & Integrations

#### Multi-Currency Conversion (2025-12-30)
- ✅ 7 currencies, multiple exchange rate providers (ECB, ExchangeRate-API, Fixer.io)
- ✅ Admin config UI, encrypted API key storage, dashboard integration

#### Server-Side Tracking (2026-01-03)
- ✅ GTM DataLayer events, Facebook Pixel + CAPI with deduplication
- ✅ Google Consent Mode V2, unified useTracking hook

#### MCP Server (2026-02)
- ✅ 7 tool modules (products, analytics, coupons, payments, users, webhooks, system)
- ✅ API key auth, Claude Desktop integration, Vitest tests

#### Real-time Sales Dashboard (2025-12-24)
- ✅ Live updates via Supabase Realtime + polling fallback
- ✅ Revenue goal with progress bar, hourly & daily charts (Recharts)
- ✅ Product filtering, "New Order" confetti popup

#### Outgoing Webhooks v1.5 (2025-12-19)
- ✅ HMAC-SHA256 signed delivery, `purchase.completed` and `lead.captured` events
- ✅ Management UI, test events, retry, detailed logs

#### Cookie Consent — Klaro (2025-12-24)
- ✅ GDPR-compliant consent manager with TrackingProvider integration
- ✅ "Require Consent" toggle in admin, blocks scripts until consent given

#### Script Manager (2025-12-24)
- ✅ Structured management of custom scripts (Essential, Marketing, Analytics)
- ✅ Dynamic injection based on consent category, secure DB storage

### 🛒 Sales Mechanics

#### Smart Coupons (2025-12-19)
- ✅ Percentage & fixed discounts, global & per-user limits
- ✅ Product & email restrictions, auto-apply links

#### Order Bumps (2025-11-28)
- ✅ Checkout integration, automatic access grant, guest support

#### Product Variants (Jan 2025)
- ✅ M:N architecture (variants as linked products)
- ✅ Admin UI, variant selector page, featured variant

### 🎨 UI & Branding

#### Custom Branding & Whitelabel (2025-12-27)
- ✅ Logo upload, color customization, font selection (6 families)

#### Smart Landing Page (2025-12-27)
- ✅ 4 adaptive scenarios (admin onboarding, coming soon, storefront)
- ✅ Modern storefront with hero, bento grid, temporal badges

#### About Page (2025-12-27)
- ✅ Feature showcase, deployment options, FAQ, bilingual (EN/PL)

#### Interactive Onboarding Checklist (2025-12-27)
- ✅ Smart detection (shown when admin has 0 products), 4-task setup checklist
- ✅ Primary CTA, quick links, animated design

### 🔐 Security & Infrastructure

#### GUS REGON API Integration (2025-12-28)
- ✅ NIP validation, SOAP client, checkout auto-fill, encrypted API key

#### Audit Logging (Dec 2024)
- ✅ Automatic triggers, admin_actions table, severity levels, cleanup jobs

#### Terms Acceptance (Jan 2025)
- ✅ Reusable TermsCheckbox, consent logging, GDPR compliant

### 🏗️ Architecture (2025-12-22)

#### Server-Side Auth & Native Layouts
- ✅ `verifyAdminAccess` utility, Server Component layout, zero flickering

### 🎥 Media

#### Video Embed Integration (2025-11-27)
- ✅ YouTube, Bunny.net, Vimeo, Loom, Wistia, DailyMotion, Twitch

### 📊 Other

#### Public Demo Instance (2026-02)
- ✅ Live at https://gateflow.cytr.us
- ✅ Stripe Test Mode, hourly DB reset, demo guard, demo banner

#### Product Categories (Dec 2024, partial)
- ✅ Database schema, admin CRUD, product form integration
- 📋 Missing: storefront filtering, category pages, navigation

#### Product Tags (Dec 2024, partial)
- ✅ Database schema
- 📋 Missing: admin UI, product form, filtering

#### E2E Testing Infrastructure (2025-12-30)
- ✅ 176+ tests, stable selectors, serial admin tests, cleanup hooks

---

## 📝 Notation

**Status Tags**: 🟢 High | 🟡 Medium | 🔵 Low

**Progress**: 💭 Idea | 📋 Planned | 🏗️ In Progress | ✅ Done

---

**Last Updated**: 2026-02-18
