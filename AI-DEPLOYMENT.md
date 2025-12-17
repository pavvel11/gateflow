# Gateflow Deployment Guide (PM2 / VPS)

This document serves as the master guide for deploying Gateflow to a VPS (e.g., Mikrus) using PM2. It is designed to be readable by both humans and AI agents.

## 📋 System Requirements
- **OS:** Ubuntu 24.04 (or similar Linux)
- **Node.js:** v24.x (LTS) or newer (**Critical**: Next.js 16 requires Node >= 20.9)
- **Process Manager:** PM2 (`npm install -g pm2`)
- **Database:** Supabase (Hosted or Local Docker)

## ⚙️ Configuration Overview

| Service | Port | PM2 Name | Path |
|---------|------|----------|------|
| Admin Panel | **3333** | `gateflow-admin` | `./admin-panel` |

> **Note:** The static file server (Caddy/Python) has been removed. The Next.js app handles everything.

## 🚀 Deployment Steps (AI / Manual)

### 1. Initial Setup (One-time)

If setting up a fresh server:

```bash
# 1. Install Node.js v24
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Install PM2
sudo npm install -g pm2

# 3. Clone Repository
git clone <REPO_URL> gateflow
cd gateflow

# 4. Create ecosystem.config.js (IT IS GITIGNORED)
cat > ecosystem.config.js <<EOF
module.exports = {
  apps: [
    {
      name: "gateflow-admin",
      cwd: "./admin-panel",
      script: "npm",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: 3333
      }
    }
  ]
};
EOF

# 5. Setup Environment Variables
# Copy your local .env to .env.local in admin-panel/
cd admin-panel
cp .env.example .env.local
nano .env.local # Fill in SUPABASE_URL, STRIPE_KEYS, etc.
```

### 2. Routine Deployment (Update)

Run these commands to update the application after pushing changes to git:

```bash
# 1. Pull latest changes
cd /path/to/gateflow
git pull origin dev  # or main/infra/pm2-migration

# 2. Update Configuration (if needed)
# Ensure ecosystem.config.js has PORT: 3333

# 3. Install Dependencies & Build
cd admin-panel
npm install
npm run build

# 4. Restart PM2
cd ..
pm2 restart gateflow-admin

# 5. Verify
pm2 status
pm2 logs gateflow-admin --lines 20 --nostream
```

## ⚠️ Troubleshooting / Known Issues

1.  **Node Version Mismatch:**
    *   Error: `You are using Node.js 18.x... Next.js requires >=20.9.0`
    *   Fix: Upgrade Node.js to v24 using the command in "Initial Setup".

2.  **Build Errors (Webpack/Aliases):**
    *   Ensure `package.json` has `@tailwindcss/postcss` in `dependencies` (not devDependencies).
    *   Ensure `next.config.ts` or `next.config.js` is correct.

3.  **Environment Variables:**
    *   If the app starts but errors on DB connection, check `admin-panel/.env.local`.
    *   PM2 does not auto-reload env vars on restart. Use `pm2 delete gateflow-admin` and `pm2 start ecosystem.config.js` if you changed `.env`.

## 📁 Key File Locations
- **PM2 Config:** `./ecosystem.config.js` (Not in git, create manually)
- **Env File:** `./admin-panel/.env.local`
- **Build Output:** `./admin-panel/.next`
