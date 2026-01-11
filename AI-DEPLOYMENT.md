# AI Agent Deployment Guide - GateFlow on mikr.us (PM2)

**This document is designed for AI agents deploying GateFlow to mikr.us VPS using PM2.**
Human users should use [DEPLOYMENT.md](./DEPLOYMENT.md) instead.

---

## 🎯 Mission: Deploy GateFlow to mikr.us using PM2

### mikr.us Context
- **Hosting**: Polish VPS provider (https://mikr.us)
- **Reverse Proxy**: Cytrus (built-in, don't install Caddy/Nginx)
- **Process Manager**: PM2 (lighter than Docker for 2GB RAM)
- **Access**: SSH as root
- **Goal**: Working GateFlow with SSL in ~15 minutes

### Why PM2 (not Docker) on mikr.us?
- ✅ Lower memory footprint (~300MB vs ~1GB for Docker)
- ✅ Faster startup
- ✅ mikr.us 2048MB works better with PM2
- ✅ Direct Node.js control

### Why No Caddy/Nginx?
- ✅ mikr.us includes **Cytrus** (reverse proxy panel)
- ✅ SSL is handled by Cytrus
- ✅ Just expose app on port (e.g., 3333) and configure in panel

---

## Pre-flight Checks

```bash
# Verify system
uname -a  # Should show Linux
free -h   # Check RAM (2GB on mikr.us 2048)
df -h     # Check disk (should have 10GB+ free)
whoami    # Should be root (mikr.us default)
```

**Expected mikr.us specs:**
- OS: Ubuntu 24.04 (or 22.04)
- RAM: 2048 MB
- Disk: 25-50 GB SSD
- CPU: 2+ vCores

---

## Step 1: Install Bun

```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Add to PATH (or restart shell)
source ~/.bashrc  # or ~/.zshrc

# Verify
bun --version  # Should show 1.x
```

**If bun not in PATH after install:**
```bash
# Add manually
export PATH="$HOME/.bun/bin:$PATH"
echo 'export PATH="$HOME/.bun/bin:$PATH"' >> ~/.bashrc
```

---

## Step 2: Install PM2

```bash
# Install PM2 globally (using bun)
bun install -g pm2

# Verify
pm2 --version  # Should show 5.x

# Setup auto-start on reboot
pm2 startup
# Copy and run the command it outputs (sudo env PATH=... pm2 startup ...)
```

---

## Step 3: Clone Repository

```bash
# Clone to /root/gateflow (or /home/deploy/gateflow if using non-root)
cd ~
git clone https://github.com/pavvel11/gateflow.git
cd gateflow
```

**AI: If user provided specific branch:**
```bash
git checkout <branch-name>
```

---

## Step 4: Database Setup (Supabase Cloud)

**AI: Guide user to Supabase Dashboard:**

1. Open https://supabase.com/dashboard
2. Create new project (or use existing)
3. Copy credentials:
   - Project URL: `https://xxx.supabase.co`
   - anon key: `eyJhbGci...` (Settings → API)
   - service_role key: `eyJhbGci...` (Settings → API)

4. Run migrations in SQL Editor:
   - Open Dashboard → SQL Editor
   - Execute each migration from `~/gateflow/supabase/migrations/` in order:
     - `20250709160000_initial_schema.sql`
     - `20250717120000_complete_payment_system.sql`
     - (... all remaining in chronological order)

5. Configure SMTP in Supabase:
   - Settings → Authentication → SMTP Settings
   - Enable Custom SMTP
   - Fill in details (SendGrid, Mailgun, etc.)

**Verify migrations:**
```bash
ls -la ~/gateflow/supabase/migrations/
# Count files and ensure all are executed in Supabase
```

---

## Step 5: Configure Environment Variables

```bash
cd ~/gateflow/admin-panel
cp .env.example .env.local
nano .env.local
```

**AI: Prompt user for these values:**

```env
# ===========================================
# SUPABASE (from user's Supabase Dashboard)
# ===========================================
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# ===========================================
# STRIPE (test mode recommended first)
# ===========================================
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...  # Configure later in Step 8

# ===========================================
# SITE URLS (user's domain)
# ===========================================
NEXT_PUBLIC_SITE_URL=https://example.com
NEXT_PUBLIC_BASE_URL=https://example.com
MAIN_DOMAIN=example.com

# ===========================================
# CLOUDFLARE TURNSTILE (optional)
# ===========================================
NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY=1x00000000000000000000AA
CLOUDFLARE_TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA

# ===========================================
# NODE ENV (CRITICAL)
# ===========================================
NODE_ENV=production
PORT=3333
```

**Save:** `Ctrl+O`, `Enter`, `Ctrl+X`

**Security:**
```bash
chmod 600 .env.local  # Only root can read
```

---

## Step 6: Install Dependencies & Build

```bash
cd ~/gateflow/admin-panel

# Install dependencies (bun is ~30x faster than npm)
bun install

# Build for production
bun run build
```

**Expected output:**
- ✓ Compiled successfully
- Route list showing all pages
- No TypeScript errors

**If build fails:**
```bash
# Check for missing migrations in Supabase
# Check .env.local variables
# Check logs: bun run build 2>&1 | tee build.log
```

---

## Step 7: Create PM2 Ecosystem File

```bash
cd ~/gateflow
cat > ecosystem.config.js <<'EOF'
module.exports = {
  apps: [{
    name: "gateflow-admin",
    cwd: "./admin-panel",
    script: process.env.HOME + "/.bun/bin/bun",
    args: "run start",
    env: {
      NODE_ENV: "production",
      PORT: 3333
    },
    instances: 1,
    exec_mode: "fork",
    autorestart: true,
    max_memory_restart: "1G",
    error_file: "./logs/pm2-error.log",
    out_file: "./logs/pm2-out.log",
    log_date_format: "YYYY-MM-DD HH:mm Z"
  }]
};
EOF
```

**Why PORT=3333?**
- mikr.us reserves some low ports
- 3333 is free and easy to remember
- AI can pick any free port 3000-9999

**Create logs directory:**
```bash
mkdir -p ~/gateflow/admin-panel/logs
```

---

## Step 8: Start Application with PM2

```bash
cd ~/gateflow

# Start PM2
pm2 start ecosystem.config.js

# Save PM2 process list (for auto-restart on reboot)
pm2 save

# Verify
pm2 status  # Should show gateflow-admin online
pm2 logs gateflow-admin --lines 50
```

**Expected output:**
```
┌─────┬──────────────────┬─────────────┬─────────┬─────────┬──────────┐
│ id  │ name             │ namespace   │ version │ mode    │ pid      │
├─────┼──────────────────┼─────────────┼─────────┼─────────┼──────────┤
│ 0   │ gateflow-admin   │ default     │ 0.0.1   │ fork    │ 12345    │
└─────┴──────────────────┴─────────────┴─────────┴─────────┴──────────┘
```

**Test locally:**
```bash
curl localhost:3333
# Should return HTML
```

---

## Step 9: Configure Cytrus (mikr.us Panel)

**AI: Instruct user to configure reverse proxy in mikr.us panel:**

### Access Cytrus Panel

1. Login to mikr.us panel: https://mikr.us/panel
2. Go to your VPS
3. Click **Cytrus** (reverse proxy manager)

### Add Domain

1. Click **Add Domain**
2. Domain: `example.com` (user's domain)
3. Backend:
   - Type: **HTTP**
   - Host: `localhost` (or `127.0.0.1`)
   - Port: `3333`
4. SSL:
   - Enable **Auto SSL** (Let's Encrypt)
   - Check both `example.com` and `www.example.com`
5. Save

### Add www Redirect (Optional)

1. Add another domain: `www.example.com`
2. Set as redirect to `https://example.com`
3. Or use same backend config (both work)

### Verify SSL

After 1-2 minutes:
- SSL certificate should be issued automatically
- Visit `https://example.com` → should work with green lock

**AI: No need to install Caddy, Nginx, or Certbot - Cytrus handles everything!**

---

## Step 10: DNS Configuration

**AI: Instruct user to set DNS records:**

In user's domain registrar (OVH, Cloudflare, etc.):

```
Type: A
Name: @
Value: [mikr.us VPS IP]  ← Get from mikr.us panel
TTL: 3600

Type: A
Name: www
Value: [mikr.us VPS IP]
TTL: 3600
```

**Get VPS IP:**
```bash
curl ifconfig.me
# or check mikr.us panel
```

**Wait for DNS propagation:**
```bash
nslookup example.com
# Should return your VPS IP
```

---

## Step 11: Configure Stripe Webhooks

**AI: Guide user through Stripe Dashboard:**

1. Go to https://dashboard.stripe.com/test/webhooks (or `/webhooks` for live)
2. Click **Add endpoint**
3. URL: `https://example.com/api/webhooks/stripe`
4. Select events:
   - ✅ `checkout.session.completed`
   - ✅ `payment_intent.succeeded`
   - ✅ `payment_intent.payment_failed`
5. Click **Add endpoint**
6. Copy **Signing Secret** (`whsec_...`)

**Update .env.local:**
```bash
cd ~/gateflow/admin-panel
nano .env.local
# Update line:
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

**Restart PM2:**
```bash
pm2 restart gateflow-admin
pm2 logs gateflow-admin --lines 20
```

---

## Verification Checklist

**AI: Run all checks before declaring success:**

```bash
# 1. PM2 status
pm2 status
# Should show: gateflow-admin | online

# 2. App responding locally
curl -I localhost:3333
# Should return: HTTP/1.1 200 OK

# 3. App responding via domain
curl -I https://example.com
# Should return: HTTP/2 200

# 4. SSL valid
curl -I https://example.com | grep -i "HTTP/2"
# Should show HTTP/2 (means SSL works)

# 5. Logs clean (no errors)
pm2 logs gateflow-admin --lines 100 --nostream | grep -i error
# Should be minimal/expected errors only

# 6. DNS resolves
nslookup example.com
# Should show VPS IP

# 7. PM2 auto-start configured
pm2 list
# Process should be saved
```

**All green? Success! ✅**

---

## Success Criteria

**AI: Mark deployment as successful when ALL true:**

1. ✅ PM2 shows `gateflow-admin` online
2. ✅ `curl localhost:3333` returns HTML
3. ✅ `curl https://example.com` returns 200 OK
4. ✅ SSL certificate valid (green lock in browser)
5. ✅ User can login at `https://example.com/login`
6. ✅ Test payment works (Stripe card: 4242 4242 4242 4242)
7. ✅ PM2 auto-start enabled (`pm2 startup` done)

**AI: Final message template:**
```
✅ GateFlow is successfully deployed on mikr.us!

🌐 URL: https://example.com
🔑 Login: https://example.com/login
💳 Test payment: Card 4242 4242 4242 4242

📊 Monitoring:
   pm2 status
   pm2 logs gateflow-admin
   pm2 monit

🔧 Management:
   pm2 restart gateflow-admin  (restart app)
   pm2 logs gateflow-admin     (view logs)
   pm2 stop gateflow-admin     (stop app)

💰 Cost: ~15 zł/month (mikr.us 2048 MB)

Next steps:
1. Login and configure Stripe (Settings → Stripe)
2. Create your first product
3. Test checkout flow
4. Switch to Live Mode when ready
```

---

## Update Workflow

**AI: Use this workflow for updates:**

```bash
cd ~/gateflow

# 1. Pull changes
git pull origin main

# 2. Check for new migrations
ls -la supabase/migrations/
# AI: Guide user to run new migrations in Supabase Dashboard

# 3. Install dependencies (fast with bun)
cd admin-panel
bun install

# 4. Build
bun run build

# 5. Restart PM2 (zero-downtime with graceful reload)
pm2 restart gateflow-admin

# 6. Verify
pm2 logs gateflow-admin --lines 50
pm2 status
curl -I https://example.com
```

---

## Troubleshooting (AI Decision Tree)

### Issue: PM2 won't start

**Diagnostic:**
```bash
pm2 logs gateflow-admin --err
pm2 describe gateflow-admin
```

**Common causes:**
1. **Missing .env.local** → Create file with all required vars
2. **Build not complete** → Run `bun run build` first
3. **Port 3333 occupied** → `lsof -i :3333` → Change PORT in ecosystem.config.js
4. **Bun not in PATH** → Check `~/.bun/bin/bun --version`

**Fix:**
```bash
# Stop PM2
pm2 delete gateflow-admin

# Fix the issue above
# Then restart
pm2 start ecosystem.config.js
```

### Issue: Build fails

**Diagnostic:**
```bash
cd ~/gateflow/admin-panel
bun run build 2>&1 | tee build.log
cat build.log
```

**Common causes:**
1. **Missing migrations** → Run all migrations in Supabase first
2. **Wrong .env variables** → Check SUPABASE_URL format
3. **Out of disk space** → `df -h` → Clean old files

**Fix:**
```bash
# Clean and rebuild
rm -rf .next
bun install
bun run build
```

### Issue: Can't access via domain (502/503)

**Diagnostic:**
```bash
# Check PM2
pm2 status
pm2 logs gateflow-admin

# Check local access
curl localhost:3333

# Check DNS
nslookup example.com
```

**Common causes:**
1. **PM2 not running** → `pm2 start ecosystem.config.js`
2. **Wrong port in Cytrus** → Check panel, should be 3333
3. **DNS not propagated** → Wait 5-15 minutes
4. **Firewall blocking** → mikr.us usually has UFW disabled by default

**Fix:**
```bash
# Restart PM2
pm2 restart gateflow-admin

# Verify local access
curl -v localhost:3333

# Check Cytrus panel - ensure backend is localhost:3333
```

### Issue: SSL not working

**Diagnostic:**
```bash
curl -I https://example.com
# Check error message
```

**Fix:**
- Wait 2-5 minutes for Let's Encrypt to issue cert
- Check Cytrus panel → SSL should show "Active"
- DNS must be correct first (A records pointing to VPS)
- If stuck, delete domain in Cytrus and re-add

### Issue: Stripe webhook failing

**Diagnostic:**
```bash
pm2 logs gateflow-admin | grep stripe
curl -X POST https://example.com/api/webhooks/stripe
```

**Fix:**
```bash
# Verify webhook secret in .env.local
grep STRIPE_WEBHOOK_SECRET ~/gateflow/admin-panel/.env.local

# Update secret
nano ~/gateflow/admin-panel/.env.local
# Save

# Restart
pm2 restart gateflow-admin
```

### Issue: Login (magic link) not working

**Diagnostic:**
- Check Supabase Dashboard → Authentication → Logs
- Check spam folder

**Fix:**
1. Verify SMTP configured in Supabase (Settings → Auth → SMTP)
2. Check email provider logs (SendGrid, Mailgun)
3. Verify `GOTRUE_URI_ALLOW_LIST` in Supabase includes domain

---

## Performance Tips (mikr.us Specific)

### Memory Optimization (2GB RAM)

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    max_memory_restart: "800M",  // Restart if app uses >800MB
    node_args: [
      "--max-old-space-size=768"  // Limit heap to 768MB
    ]
  }]
};
```

### Log Rotation

```bash
# Install log rotation
pm2 install pm2-logrotate

# Configure for 2GB VPS
pm2 set pm2-logrotate:max_size 50M     # Smaller files
pm2 set pm2-logrotate:retain 3         # Keep only 3 days
pm2 set pm2-logrotate:compress true
```

### Disable Cluster Mode

On mikr.us 2048, **fork mode** (1 instance) is better than cluster:
- Lower memory footprint
- Simpler management
- 2 vCores not enough to benefit from clustering

**Stick with:**
```javascript
instances: 1,
exec_mode: "fork"
```

---

## Security Checklist

Before marking deployment complete:

- [ ] `.env.local` has chmod 600
- [ ] `.env.local` not in git
- [ ] HTTPS working (green lock)
- [ ] Stripe keys match environment (test vs live)
- [ ] PM2 auto-start enabled (`pm2 startup`)
- [ ] First login creates admin user automatically

**Firewall:**
mikr.us usually has UFW disabled. If enabling:
```bash
sudo ufw allow 22     # SSH
sudo ufw allow 80     # HTTP (Cytrus)
sudo ufw allow 443    # HTTPS (Cytrus)
sudo ufw enable
```

---

## Additional Resources

- **mikr.us Docs:** https://mikr.us/faq (Polish)
- **Cytrus Guide:** In mikr.us panel
- **PM2 Basics:** https://pm2.keymetrics.io/docs/usage/quick-start/
- **Advanced PM2:** [deployment/advanced/PM2-VPS.md](./deployment/advanced/PM2-VPS.md)
- **Human Guide:** [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Stripe Testing:** [STRIPE-TESTING-GUIDE.md](./STRIPE-TESTING-GUIDE.md)

---

**Last updated:** 2026-01-11 (mikr.us + PM2 + Bun + Cytrus)
