# 🚀 GateFlow - Self-Hosted Product Access Management

**GateFlow** is an enterprise-grade platform for selling and protecting digital products. It combines powerful authentication (Magic Links), flexible payment processing (Stripe), and intuitive content protection.

> **Your Products. Your Infrastructure. Your Rules.**

## ✨ Key Features

- **💳 Stripe Integration**: Complete checkout flow with **visual wizard** for easy setup (2 configuration methods: .env or encrypted database).
- **🔐 Content Protection**: Protect pages, elements, or specific resources.
- **⚡ Funnels & OTO**: Create One-Time Offers and upsell flows.
- **🔌 Webhooks Automation**: Connect with Zapier, Make, or custom endpoints (with HMAC security).
- **🌍 Internationalization**: Ready for global sales (EN/PL included).
- **⚙️ Settings Dashboard**: Shop configuration, multi-currency support, Stripe management.
- **🎨 Modern UI**: Beautiful, responsive dashboard built with Tailwind CSS.

## 🏗️ Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Database**: Supabase (PostgreSQL + Auth + RLS)
- **Styling**: Tailwind CSS
- **Payments**: Stripe Elements & Checkout
- **Deployment**: Docker / PM2

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 20+ (required by Next.js 16)
- Docker (for local Supabase)
- Stripe Account (for test keys)

### 1. Setup
```bash
# Clone the repository
git clone https://github.com/pavvel11/gateflow.git
cd gateflow/admin-panel

# Install dependencies
npm install
```

### 2. Database
```bash
# Go back to root
cd ..

# Start local Supabase
npx supabase start

# Apply migrations and seed data
npx supabase db reset
```

### 3. Environment Variables
Create `admin-panel/.env.local` and populate it with keys from `npx supabase status` and your Stripe Dashboard.

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 4. Run
```bash
cd admin-panel
npm run dev
```
Visit **http://localhost:3000** to see your GateFlow instance.

## ⚙️ Integrations Configuration

GateFlow supports multiple integration methods - some via environment variables only, others through both `.env` and the admin panel. Admin panel configuration uses **AES-256-GCM encryption** for API keys.

### 💳 Stripe Payment Processing

**Method 1: Visual Wizard (Recommended)**
1. Navigate to **Dashboard → Integrations**
2. Click **"Stripe Setup Wizard"**
3. Follow the 4-step wizard:
   - Enter API keys (encrypted in database)
   - Configure webhook endpoint
   - Set up products
   - Test payment flow
4. Keys are encrypted with AES-256-GCM and stored in `shop_config.custom_settings`

**Method 2: Environment Variables**
```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Priority**: Database config > .env variables

### 🏢 GUS REGON API (Polish Company Data)

Auto-fill company details by NIP (Polish Tax ID). Admin panel only - no .env option.

1. Navigate to **Dashboard → Integrations**
2. Scroll to **"GUS API Settings"**
3. Enter your GUS API Key (get from [stat.gov.pl](https://wyszukiwarkaregon.stat.gov.pl/))
4. Enable the integration
5. Keys are encrypted with AES-256-GCM

**How it works**: When customers enter a 10-digit NIP during checkout (with invoice selected), GateFlow automatically fetches company name, address, and VAT details from the official GUS database.

### 💱 Currency Exchange Rates

**Method 1: Admin Panel (Recommended)**
1. Navigate to **Dashboard → Integrations**
2. Scroll to **"Currency Exchange Rate API"**
3. Choose provider:
   - **ECB (European Central Bank)** - Free, no API key required (default)
   - **ExchangeRate-API** - Requires API key
   - **Fixer.io** - Requires API key
4. Enter API key if needed (encrypted with AES-256-GCM)
5. Save configuration

**Method 2: Environment Variables**
```env
CURRENCY_API_PROVIDER=ecb  # or exchangerate-api, fixer
CURRENCY_API_KEY=your_api_key  # only for exchangerate-api and fixer
```

**Priority**: Database config > .env variables > ECB fallback

**Note**: ECB provider is free and enabled by default - no configuration needed unless you want a different provider.

### 📊 Google Tag Manager (GTM)

Admin panel only - no .env option.

1. Navigate to **Dashboard → Integrations**
2. Find **"Google Tag Manager"** section
3. Enter your GTM Container ID (format: `GTM-XXXXXXX`)
4. Save configuration
5. Container ID is stored in `shop_config.custom_settings`

**Events tracked**: Page views, purchases, checkout steps, product views.

### 📘 Facebook Pixel

Admin panel only - no .env option.

1. Navigate to **Dashboard → Integrations**
2. Find **"Facebook Pixel"** section
3. Enter your Facebook Pixel ID
4. Save configuration
5. Pixel ID is stored in `shop_config.custom_settings`

**Events tracked**: PageView, ViewContent, AddToCart, InitiateCheckout, Purchase.

### 🔒 Security Notes

- All API keys configured via admin panel are encrypted with **AES-256-GCM**
- Encryption key stored in `STRIPE_ENCRYPTION_KEY` environment variable
- Database stores: `encrypted_value`, `iv` (initialization vector), `tag` (authentication tag)
- Keys are decrypted only server-side - never exposed to client
- Admin-only access (RLS policies enforce this)

### 🔍 Configuration Status

Check your integration status:
- **Dashboard** shows active integrations (non-default configs only)
- **Dashboard → Integrations** shows detailed config for each service
- Database config takes priority over environment variables

## 📦 Deployment

**Want to deploy GateFlow?** Choose your guide:

### 🚀 [DEPLOYMENT.md](./DEPLOYMENT.md) - For Humans

Simple step-by-step guide for deploying to **mikr.us** or any Ubuntu VPS.

- ✅ Works with Docker + Supabase Cloud
- ✅ Auto SSL with Caddy
- ✅ ~16 zł/month total cost
- ✅ Perfect for 90% of users

### 🤖 [AI-DEPLOYMENT.md](./AI-DEPLOYMENT.md) - For AI Agents

Comprehensive guide for AI-assisted deployment with decision trees and automation.

- ✅ Docker & PM2 methods
- ✅ Troubleshooting diagnostics
- ✅ Success criteria validation
- ✅ Automated update workflows

### Advanced Options

For specific needs, see `deployment/advanced/`:
- **Full Self-Hosted** (no Supabase Cloud, GDPR) → [FULL-STACK.md](./deployment/advanced/FULL-STACK.md)
- **PM2 without Docker** (Node.js experts) → [PM2-VPS.md](./deployment/advanced/PM2-VPS.md)

## 📚 Documentation

- **[CLAUDE.md](./CLAUDE.md)**: Technical architecture and development guidelines.
- **[BACKLOG.md](./BACKLOG.md)**: Current roadmap and planned features.
- **[CONTRIBUTING.md](./CONTRIBUTING.md)**: How to contribute to the project.

## 📝 License

MIT License. See [LICENSE](LICENSE) for details.

---
Made with ❤️ by [GateFlow Team](https://github.com/pavvel11/gateflow)