<div align="center">

# GateFlow

**Self-hosted platform for selling and protecting digital products**

[![Version](https://img.shields.io/badge/version-1.0.3-blue?style=flat-square)](https://github.com/jurczykpawel/gateflow/releases)
[![Tests](https://img.shields.io/badge/tests-2,650%20passing-brightgreen?style=flat-square)](./admin-panel/tests)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](./LICENSE)

[Documentation](./FEATURES.md) · [Deployment Guide](./docs/DEPLOYMENT-MIKRUS.md)

</div>

---

## Why GateFlow?

GateFlow gives you **complete control** over your digital product business. No monthly fees to platforms. No revenue sharing. Your data stays on your infrastructure.

- **Stripe-powered payments** with visual setup wizard — no code required
- **Content protection** that works on any website (WordPress, Webflow, custom)
- **Sales funnels built-in** — One-Time Offers, Order Bumps, Coupons
- **EU-compliant** — Omnibus Directive price history, GDPR consent management
- **Battle-tested** — 2,650 tests (1,127 E2E + 1,523 unit) with 100% pass rate

---

## Features

<details>
<summary><strong>Payments & Checkout</strong></summary>

- Stripe Elements & Checkout integration
- Guest checkout with Magic Link login
- 26 currencies with automatic conversion
- Pay What You Want (PWYW) pricing
- Coupons (percentage, fixed amount, per-user limits)
- Order Bumps for upselling
- One-Time Offers (OTO) post-purchase
- Refund management with configurable periods

</details>

<details>
<summary><strong>Product Management</strong></summary>

- Product variants (Basic/Pro/Enterprise tiers)
- Sale pricing with quantity and time limits
- Timed access (30-day, lifetime, custom)
- Waitlist for upcoming products
- Categories and featured products
- Rich descriptions with Markdown support

</details>

<details>
<summary><strong>Content Protection (Gatekeeper)</strong></summary>

- Page-level or element-level protection
- JavaScript SDK for any website
- Custom fallback content for non-buyers
- Multi-product access on single page
- License validation

</details>

<details>
<summary><strong>Marketing & Analytics</strong></summary>

- Google Tag Manager integration
- Facebook Pixel with Conversions API (CAPI)
- Webhooks (HMAC-secured) for Zapier, Make, n8n
- Revenue dashboard with goals
- Real-time sales notifications

</details>

<details>
<summary><strong>REST API v1 & Integrations</strong></summary>

- Full REST API with OpenAPI 3.1 spec
- Interactive Swagger UI at `/api/v1/docs`
- API Keys with scopes (`products:read`, `users:write`, `*`)
- Rate limiting per key (configurable)
- MCP Server for Claude Desktop (45 tools, 4 resources, 6 prompts)
- Bruno API collection for testing

</details>

<details>
<summary><strong>Compliance & Security</strong></summary>

- EU Omnibus Directive (30-day price history)
- GDPR consent logging
- Cloudflare Turnstile CAPTCHA
- AES-256-GCM encryption for API keys
- Row Level Security (RLS) policies
- Rate limiting (Upstash Redis)
- Audit logging

</details>

For the complete feature list, see **[FEATURES.md](./FEATURES.md)**.

---

## Payment Model: Own Stripe Account

GateFlow connects to **your own Stripe account** — you are the seller, payments go directly to you.

<details>
<summary><strong>How does this compare to Merchant of Record platforms?</strong></summary>

Platforms like Paddle, LemonSqueezy, and Gumroad act as the **Merchant of Record (MoR)** — they process payments on your behalf and handle tax compliance. This comes with trade-offs:

| | MoR (Paddle, LS, Gumroad) | GateFlow + Own Stripe |
|---|---|---|
| **Platform fees** | 5–10% of revenue | $0 |
| **Payment processing** | Included in platform fee | ~2.9% + 30¢ ([Stripe pricing](https://stripe.com/pricing)) |
| **Customer data** | Held by the MoR platform | Fully yours |
| **Tax calculation** | Handled by MoR | Optional via [Stripe Tax](https://stripe.com/tax) (+0.5%) |
| **Tax filing & remittance** | Handled by MoR | Your responsibility |
| **Vendor lock-in** | Yes — customer and payment data tied to platform | No — self-hosted, fully portable |
| **Platform risk** | Account freezes, shutdowns possible | None — you control the infrastructure |

**When does tax compliance become relevant?**

For EU-based sellers, the [VAT One Stop Shop (OSS)](https://vat-one-stop-shop.ec.europa.eu/) threshold is **€10,000/year** in cross-border B2C sales. Below this, you only handle VAT in your own country. Above it, you register for OSS (a single EU-wide filing) and can use [Stripe Tax](https://stripe.com/tax/pricing) to automate calculations.

> **Note:** This is general information, not tax advice. Tax obligations depend on your country, business type, and revenue. Consult a qualified tax professional for your specific situation.

</details>

---

## Live Demo

Try GateFlow without installing anything: **[gateflow.cytr.us](https://gateflow.cytr.us)**

- Full admin panel access — browse products, dashboard, settings
- Test checkout with Stripe test cards (`4242 4242 4242 4242`)
- Data resets every hour

---

## Quick Start

```bash
# 1. Clone
git clone https://github.com/jurczykpawel/gateflow.git
cd gateflow

# 2. Start database
npx supabase start

# 3. Install & configure
cd admin-panel
bun install
cp .env.example .env.local  # Edit with your keys

# 4. Run
bun run dev
```

Open **http://localhost:3000** — the first registered user becomes admin.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5.9 |
| Database | Supabase (PostgreSQL + Auth + Realtime) |
| Styling | Tailwind CSS 4 |
| Payments | Stripe (Elements, Checkout, Webhooks) |
| Testing | Playwright (1,127 E2E) + Vitest (1,523 unit) |
| i18n | next-intl (EN, PL) |

---

## Configuration

All integrations can be configured via the admin panel (encrypted storage) or environment variables.

| Integration | Admin Panel | Env Variables | Notes |
|-------------|:-----------:|:-------------:|-------|
| Stripe | ✓ | ✓ | Visual wizard available |
| GUS REGON (PL) | ✓ | — | Polish company auto-fill |
| Currency Rates | ✓ | ✓ | ECB free, or paid providers |
| Google Tag Manager | ✓ | — | Container ID |
| Facebook Pixel | ✓ | — | Pixel ID + CAPI token |

See **[FEATURES.md](./FEATURES.md)** for details on all integrations.

---

## Deployment

### One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fjurczykpawel%2Fgateflow&root-directory=admin-panel&env=SUPABASE_URL,SUPABASE_ANON_KEY,SUPABASE_SERVICE_ROLE_KEY,STRIPE_SECRET_KEY,STRIPE_PUBLISHABLE_KEY,STRIPE_WEBHOOK_SECRET,SITE_URL&envDescription=Required%20environment%20variables%20for%20GateFlow.%20See%20.env.example%20for%20all%20options.&envLink=https%3A%2F%2Fgithub.com%2Fjurczykpawel%2Fgateflow%2Fblob%2Fmain%2Fadmin-panel%2F.env.example&project-name=gateflow&repository-name=gateflow)
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/jurczykpawel/gateflow&base=admin-panel)

> **Coolify / Docker**: Create a new Application in Coolify, point to this repo, set **Base Directory** to `admin-panel`, and configure env vars from [.env.example](./admin-panel/.env.example).

### Manual Deploy

| Guide | Best For |
|-------|----------|
| **[Deployment Guide](./docs/DEPLOYMENT-MIKRUS.md)** | VPS/mikr.us with PM2 (recommended) |
| **[Advanced Options](./docs/DEPLOYMENT.md)** | Docker, Full-Stack, PM2 Cluster |

---

## Documentation

| File | Description |
|------|-------------|
| [FEATURES.md](./FEATURES.md) | Complete feature list with roadmap |
| [Deployment Guide](./docs/DEPLOYMENT-MIKRUS.md) | Step-by-step deployment guide |
| [STRIPE-TESTING-GUIDE.md](./STRIPE-TESTING-GUIDE.md) | Testing payments locally |
| [BACKLOG.md](./BACKLOG.md) | Development roadmap |
| [mcp-server/README.md](./mcp-server/README.md) | MCP Server setup guide |
| `/api/v1/docs` | Interactive Swagger UI (OpenAPI 3.1) |

---

## Project Stats

```
├── 2,650 tests (1,127 E2E + 1,523 unit, 100% pass rate)
├── 90+ API routes (v1 REST API + admin + public)
├── 36 database tables
├── 73 RPC functions
├── 92 RLS policies
├── MCP Server (45 tools, 4 resources, 6 prompts)
└── 2 languages (EN, PL)
```

---

## Contributing

Contributions are welcome. Please read the contribution guidelines before submitting a pull request.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

---

## License

MIT License. See [LICENSE](./LICENSE) for details.

---

<div align="center">

**[Website](https://gateflow.io)** · **[Documentation](./FEATURES.md)** · **[Report Bug](https://github.com/jurczykpawel/gateflow/issues)**

</div>
