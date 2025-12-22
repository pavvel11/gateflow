# 🚀 GateFlow - Self-Hosted Product Access Management

**GateFlow** is an enterprise-grade platform for selling and protecting digital products. It combines powerful authentication (Magic Links), flexible payment processing (Stripe), and intuitive content protection.

> **Your Products. Your Infrastructure. Your Rules.**

## ✨ Key Features

- **💳 Stripe Integration**: Complete checkout flow, order bumps, smart coupons, and refunds.
- **🔐 Content Protection**: Protect pages, elements, or specific resources.
- **⚡ Funnels & OTO**: Create One-Time Offers and upsell flows.
- **🔌 Webhooks Automation**: Connect with Zapier, Make, or custom endpoints (with HMAC security).
- **🌍 Internationalization**: Ready for global sales (EN/PL included).
- **🎨 Modern UI**: Beautiful, responsive dashboard built with Tailwind CSS.

## 🏗️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: Supabase (PostgreSQL + Auth + RLS)
- **Styling**: Tailwind CSS
- **Payments**: Stripe Elements & Checkout
- **Deployment**: Docker / PM2

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 18+
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

## 📦 Deployment

We offer three flexible deployment strategies. Choose the one that fits your needs:

| Strategy | Best For | Complexity | Guide |
|----------|----------|------------|-------|
| **Simple Production** | Startups, Small Business | ⭐ Easy | [DEPLOYMENT-SIMPLE.md](./DEPLOYMENT-SIMPLE.md) |
| **PM2 / VPS** | Performance, Low Overhead | ⭐⭐ Medium | [AI-DEPLOYMENT.md](./AI-DEPLOYMENT.md) |
| **Full Stack** | Enterprise, Compliance | ⭐⭐⭐⭐ Advanced | [DEPLOYMENT.md](./DEPLOYMENT.md) |

## 📚 Documentation

- **[CLAUDE.md](./CLAUDE.md)**: Technical architecture and development guidelines.
- **[BACKLOG.md](./BACKLOG.md)**: Current roadmap and planned features.
- **[CONTRIBUTING.md](./CONTRIBUTING.md)**: How to contribute to the project.

## 📝 License

MIT License. See [LICENSE](LICENSE) for details.

---
Made with ❤️ by [GateFlow Team](https://github.com/pavvel11/gateflow)