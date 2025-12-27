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