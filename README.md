<div align="center">

# GateFlow

**Self-hosted platform for selling and protecting digital products**

[![Version](https://img.shields.io/badge/version-1.0.0--rc.2-blue?style=flat-square)](https://github.com/pavvel11/gateflow/releases)
[![Tests](https://img.shields.io/badge/tests-981%20passing-brightgreen?style=flat-square)](./admin-panel/tests)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](./LICENSE)

[Demo](https://demo.gateflow.io) · [Documentation](./FEATURES.md) · [Deployment Guide](./DEPLOYMENT.md)

<br />

<img src="./Screenshot 2025-12-10 at 17.53.19.png" alt="GateFlow Dashboard" width="800" />

</div>

---

## Why GateFlow?

GateFlow gives you **complete control** over your digital product business. No monthly fees to platforms. No revenue sharing. Your data stays on your infrastructure.

- **Stripe-powered payments** with visual setup wizard — no code required
- **Content protection** that works on any website (WordPress, Webflow, custom)
- **Sales funnels built-in** — One-Time Offers, Order Bumps, Coupons
- **EU-compliant** — Omnibus Directive price history, GDPR consent management
- **Battle-tested** — 981 tests (899 E2E + 82 unit) with 100% pass rate

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

## Quick Start

```bash
# 1. Clone
git clone https://github.com/pavvel11/gateflow.git
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
| Testing | Playwright (899 E2E) + Vitest (82 unit) |
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

See **[Integrations Guide](./DEPLOYMENT.md#integrations-configuration)** for details.

---

## Deployment

| Guide | Best For |
|-------|----------|
| **[DEPLOYMENT.md](./DEPLOYMENT.md)** | VPS/mikr.us (~16 zł/month) |
| **[AI-DEPLOYMENT.md](./AI-DEPLOYMENT.md)** | AI-assisted setup |

Both guides cover Docker deployment with Supabase Cloud and automatic SSL via Caddy.

---

## Documentation

| File | Description |
|------|-------------|
| [FEATURES.md](./FEATURES.md) | Complete feature list with roadmap |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Step-by-step deployment guide |
| [STRIPE-TESTING-GUIDE.md](./STRIPE-TESTING-GUIDE.md) | Testing payments locally |
| [BACKLOG.md](./BACKLOG.md) | Development roadmap |

---

## Project Stats

```
├── 981 tests (899 E2E + 82 unit, 100% pass rate)
├── 120+ API routes (v1 REST API + admin + public)
├── 25+ database tables
├── 40+ RPC functions
├── 50+ RLS policies
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

**[Website](https://gateflow.io)** · **[Documentation](./FEATURES.md)** · **[Report Bug](https://github.com/pavvel11/gateflow/issues)**

</div>
