# 📁 Advanced Deployment Options

Most users should use the main **[DEPLOYMENT.md](../DEPLOYMENT.md)** guide.

The files in this directory are for **advanced use cases**:

## When to use these?

### 🏢 [FULL-STACK.md](./advanced/FULL-STACK.md)
**Use if you need:**
- Full control over all infrastructure (11 Docker containers)
- Self-hosted Supabase (no cloud dependency)
- GDPR compliance (data residency requirements)
- High traffic (1M+ requests/month)
- Enterprise features

**Requirements:**
- 8GB+ RAM VPS
- DevOps experience
- 2-3 hours setup time
- ~$50-100/month hosting

---

### 🔧 [PM2-VPS.md](./advanced/PM2-VPS.md) - Advanced PM2
**Use if you need:**
- Production-grade PM2 setup
- Cluster mode (multi-core utilization)
- Zero-downtime deployments
- Advanced monitoring (PM2+, Prometheus, Grafana)
- Auto-scaling, log rotation
- CPU/Memory profiling

**Requirements:**
- PM2 expertise
- Node.js performance tuning knowledge
- 4GB+ RAM (for cluster mode)

**Note:** For basic PM2 setup, see [AI-DEPLOYMENT.md](../AI-DEPLOYMENT.md) instead.

---

### 🐳 [DOCKER-SIMPLE.md](./advanced/DOCKER-SIMPLE.md)
**Use if you:**
- Want Docker + Supabase Cloud (like main guide)
- Need more detailed explanation
- Want to understand all options

This is similar to the main guide but with more technical details.

---

## Still not sure?

**→ Use [DEPLOYMENT.md](../DEPLOYMENT.md)**

It's the recommended option for 90% of users.
