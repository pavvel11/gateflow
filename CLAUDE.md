# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GateFlow is a professional content access control and monetization platform built on Next.js, Supabase, and Stripe. It consists of three main components:

1. **Client-side SDK** (`gatekeeper.js`): JavaScript library for content protection
2. **Admin Panel** (`admin-panel/`): Next.js 15 dashboard for product/user management
3. **Database Layer** (`supabase/`): PostgreSQL with Row Level Security (RLS)

The system implements page-level, element-level, and toggle-based content protection with integrated payment processing, magic link authentication, and freemium licensing.

## Development Commands

### Root Directory
```bash
# Start demo server for examples
npm run dev  # Serves on http://localhost:8000

# No testing/linting configured at root
```

### Admin Panel
```bash
cd admin-panel

# Development
npm run dev         # Next.js dev server with Turbopack (localhost:3000)
npm run build       # Production build
npm run start       # Production server
npm run lint        # ESLint

# Must be run from admin-panel directory
```

### Database (Supabase)
```bash
# Local development setup
npx supabase init
npx supabase start      # Start local Supabase (ports: 54321-54329)
npx supabase db reset   # Reset and run all migrations
npx supabase stop       # Stop local instance

# Database operations
npx supabase db push    # Push schema changes to remote
npx supabase db pull    # Pull schema from remote
npx supabase migration new <name>  # Create new migration

# Type generation
npx supabase gen types typescript --local > admin-panel/src/types/database.ts

# Access local services:
# - API: http://127.0.0.1:54321
# - Studio: http://127.0.0.1:54323
# - Inbucket (email testing): http://127.0.0.1:54324
```

### Testing Email Flows
When testing magic link authentication locally, emails are captured by Inbucket (not actually sent). View them at http://127.0.0.1:54324.

## Architecture Overview

### Three-Tier Architecture

**1. Client SDK (gatekeeper.js)**
- 1427 lines of vanilla JavaScript
- Dynamically loaded via `/api/gatekeeper?domain=...`
- Key classes: `CacheManager`, `LicenseManager`, `SessionManager`, `AccessControl`, `GateFlow`
- Implements three protection modes: page, element, hybrid
- Features: caching (5min TTL), batch access checking, cross-domain sessions, license verification

**2. Admin Panel (Next.js 15 + App Router)**
- TypeScript strict mode
- App Router with internationalization (English/Polish via next-intl)
- Key routes:
  - Public: `/`, `/p/[slug]` (product pages), `/login`, `/terms`, `/privacy`
  - Protected: `/dashboard`, `/my-products`
  - Admin: `/admin/products`, `/admin/users`, `/admin/payments`, `/admin/analytics`
- API endpoints: `/api/gatekeeper`, `/api/access`, `/api/session`, `/api/runtime-config`, `/api/create-embedded-checkout`, `/api/verify-payment`

**3. Database (PostgreSQL + Supabase)**
- Core tables: `products`, `user_product_access`, `payment_transactions`, `guest_purchases`, `rate_limits`, `audit_log`
- All tables have RLS policies
- Database functions for access control: `check_user_product_access()`, `batch_check_user_product_access()`, `grant_free_product_access()`
- Triggers: `handle_new_user_registration()` (first user → admin, claim guest purchases)
- Scheduled jobs: Rate limit cleanup (hourly via pg_cron)

### Data Flow Patterns

**Purchase Flow:**
1. User visits product page → clicks Purchase
2. `/api/create-embedded-checkout` creates Stripe session
3. User completes payment → Stripe webhook → `/api/webhooks/stripe`
4. Payment recorded in `payment_transactions`
5. If guest: `guest_purchases` created; if authenticated: `user_product_access` granted
6. User redirected with `session_id` → `/api/verify-payment` confirms access

**Access Check Flow:**
1. `gatekeeper.js` loads → detects protection mode
2. Gets Supabase session → batch checks access via `/api/access`
3. API calls `batch_check_user_product_access()` with RLS enforcement
4. Results cached (5min TTL) → DOM modified based on access

**Magic Link Authentication:**
1. User enters email → `/api/auth/magic-link`
2. Supabase sends email (captured by Inbucket locally)
3. User clicks link → redirected to `/#access_token=...`
4. `SessionManager.handleSessionFromUrl()` parses hash
5. `supabase.auth.setSession()` → session stored in HTTP-only cookies
6. User redirected to dashboard

### Cross-Domain Architecture

GateFlow supports protecting content across multiple domains:

- **Main Domain** (`MAIN_DOMAIN` env var): Hosts admin panel and API
- **Protected Domains**: Load `gatekeeper.js` and make credentialed requests to main domain
- **Session Sharing**: `/api/session` endpoint shares auth via CORS + `credentials: 'include'`
- **Security**: X-Requested-With and X-GateFlow-Origin headers for verification

## Critical Security Patterns

**SECURITY IS THE TOP PRIORITY.** Every change must consider security implications.

### Database Security

1. **RLS Policies Required**: Every table MUST have Row Level Security policies
2. **Never Trust Client Input**: All database functions validate and sanitize inputs
3. **Use auth.uid()**: Never pass user IDs as parameters; always use `auth.uid()` in functions
4. **Rate Limiting**: All public functions enforce rate limits via `check_rate_limit()`
5. **Parameterized Queries**: Use prepared statements, never string concatenation
6. **Idempotency**: Payment processing uses unique constraints on `session_id` + `stripe_payment_intent_id`

### Rate Limiting Anti-Spoofing

**CRITICAL**: The rate limiting system (`check_rate_limit()` function) implements multi-layer anti-spoofing:
- **ONLY uses `inet_client_addr()`** (TCP connection IP from server)
- **NEVER trusts client headers** (x-forwarded-for, x-real-ip can be spoofed)
- Fallback to `pg_backend_pid()` + timestamp bucket if IP unavailable
- Global anonymous rate limiting as final protection layer

When modifying rate limiting, you MUST maintain this security model.

### Injection Prevention

Prevent ALL injection attack vectors:
- SQL Injection: Use Supabase client with parameterized queries
- XSS: Sanitize all user inputs and outputs
- Command Injection: Never execute system commands with user data
- Header Injection: Validate HTTP headers
- Log Injection: Sanitize logged data

### API Security

- All admin endpoints check authentication via middleware
- Input validation using `admin-panel/src/lib/validations/`
- CORS configured for cross-domain access with credentials
- Error messages never expose sensitive data

## Key Implementation Details

### Dynamic Configuration System

**GatekeeperGenerator** (`admin-panel/src/lib/gatekeeper-generator.ts`):
- Reads `gatekeeper.js` and injects configuration at runtime
- Template replacement: `{{SUPABASE_URL}}`, `{{SUPABASE_ANON_KEY}}`, etc.
- Hash-based caching with 5-minute TTL
- Production: minification + optional obfuscation
- Version tracking via `BUILD_HASH`

**RuntimeConfig API** (`/api/runtime-config`):
- Exposes safe client-side config (Supabase URL, Stripe publishable key, etc.)
- Used by admin panel frontend
- Cached for 5 minutes

### Guest Checkout to Registered User Flow

1. Guest purchases product → stored in `payment_transactions` with email
2. `guest_purchases` table links email to purchase
3. User later registers with same email
4. `handle_new_user_registration()` trigger automatically claims purchases
5. Access granted via `user_product_access` table

This pattern allows purchasing before account creation, critical for conversion optimization.

### First User Admin Assignment

- `handle_new_user_registration()` trigger checks if user is first
- Uses advisory lock to prevent race conditions
- First user automatically gets `is_admin = true` in `user_metadata`
- Admin status cached in session for performance

### Original Content Preservation

Before modifying DOM, `gatekeeper.js` stores:
```javascript
document.body.setAttribute('data-original-content', document.body.innerHTML)
```

This allows:
- Restoration on access grant or errors
- Prevention of flash of protected content (FOPC)
- Graceful degradation when API fails

### Freemium Licensing Model

- **Free Tier**: Full features + "Powered by GateFlow" watermark
- **Pro Tier**: Watermark removal via domain licensing
- **Domain Fingerprinting**: Combines protocol, hostname, port, userAgent, platform
- **Anti-Tampering**: MutationObserver + periodic checks prevent watermark removal
- License verification via `/api/license/verify` with fallback endpoints

### Temporal Access Control

Products can have:
- `available_from`, `available_until`: Publication windows
- `auto_grant_duration_days`: Automatic expiration for free products

User access can have:
- `access_expires_at`: Individual expiration
- `access_duration_days`: Track access duration

All enforced at database level in RLS policies and access check functions.

## File Structure Context

```
gateflow/
├── gatekeeper.js                  # Core SDK (dynamically served by /api/gatekeeper)
├── config.js                      # Basic config template (not used directly)
├── config.example.js              # Configuration example
├── gateflow-config.example.js     # Advanced configuration example
├── index.html                     # Main landing page
├── templates/                     # 12+ pre-built HTML product pages
├── themes/                        # CSS themes (dark.css, light.css)
├── examples/                      # Demo implementations (1-12 numbered examples)
├── layouts/                       # Layout templates
├── supabase/
│   ├── config.toml                # Supabase local dev config
│   ├── migrations/                # SQL migrations (timestamped)
│   │   ├── 20250709_*.sql        # Initial schema + RLS
│   │   └── 20250717_*.sql        # Payment system
│   └── seed.sql                   # Sample data
└── admin-panel/
    ├── next.config.js
    ├── tailwind.config.ts
    └── src/
        ├── app/
        │   ├── [locale]/          # Internationalized routes (en, pl)
        │   │   ├── page.tsx       # Landing page
        │   │   ├── dashboard/     # User dashboard
        │   │   ├── my-products/   # User's purchased products
        │   │   ├── admin/         # Admin-only section
        │   │   │   ├── products/  # Product CRUD
        │   │   │   ├── users/     # User management
        │   │   │   ├── payments/  # Payment tracking
        │   │   │   └── analytics/ # Business metrics
        │   │   ├── p/[slug]/      # Dynamic product pages
        │   │   ├── login/         # Magic link auth
        │   │   └── auth/          # Auth callback handling
        │   └── api/
        │       ├── gatekeeper/route.ts       # Dynamic SDK generation
        │       ├── access/route.ts           # Access verification
        │       ├── session/route.ts          # Cross-domain sessions
        │       ├── runtime-config/route.ts   # Client config
        │       ├── create-embedded-checkout/route.ts
        │       ├── verify-payment/route.ts
        │       ├── validate-email/route.ts
        │       ├── webhooks/stripe/route.ts
        │       └── admin/                    # Admin API endpoints
        ├── components/
        │   ├── ui/                # Reusable UI components
        │   ├── DashboardLayout.tsx
        │   ├── LoginForm.tsx
        │   ├── ProductFormModal.tsx
        │   └── ...
        ├── lib/
        │   ├── actions/           # Server actions
        │   ├── api/               # API utilities
        │   ├── payment/           # Payment processing logic
        │   ├── services/          # Business logic
        │   ├── stripe/            # Stripe integration
        │   ├── supabase/          # Supabase clients
        │   │   ├── client.ts      # Browser client
        │   │   ├── server.ts      # Server component client
        │   │   └── middleware.ts  # Middleware client
        │   ├── validations/       # Input validation schemas
        │   ├── gatekeeper-generator.ts
        │   ├── config-generator.ts
        │   ├── js-processor.ts    # Minification/obfuscation
        │   ├── rate-limiting.ts
        │   ├── timezone.ts
        │   ├── logger.ts
        │   └── constants.ts
        ├── contexts/              # React contexts
        ├── types/
        │   └── database.ts        # Generated Supabase types
        ├── messages/              # i18n message files
        │   ├── en.json
        │   └── pl.json
        └── middleware.ts          # Next.js middleware (auth + i18n)
```

## Documentation and File Management

### File Management Guidelines

**IMPORTANT: Avoid creating new .md files unnecessarily!**

When documenting changes or adding information:

1. **Update Existing Files First**: Before creating a new .md file, check if the information belongs in an existing file
2. **Core Documentation Files**:
   - `README.md` - Main project documentation
   - `CLAUDE.md` - AI assistant instructions (this file)
   - `DEPLOYMENT-SIMPLE.md` - Simple production deployment guide
   - `DEPLOYMENT.md` - Full stack deployment guide
   - `templates/README.md` - Template customization guide
3. **When to Create New Files**:
   - Only when information doesn't fit naturally in core docs
   - When creating a substantial, standalone guide (>1000 words)
   - When documenting a separate, independent feature/module
4. **When NOT to Create New Files**:
   - For small feature explanations (add to README.md)
   - For deployment notes (add to appropriate DEPLOYMENT file)
   - For architecture notes (add to CLAUDE.md)
   - For quick tips or FAQs (add to README.md)

**Examples of Removed Redundant Files**:
- ❌ `DOCKER-COMPOSE-GUIDE.md` - Information consolidated into README.md
- ❌ `STATIC-FILES.md` - Information consolidated into README.md
- ❌ `examples/README.md` - Basic info added to README.md
- ❌ `themes/README.md` - Basic info added to README.md
- ❌ `layouts/README.md` - Basic info added to README.md
- ❌ `admin-panel/DOCKERFILE-EXPLAINED.md` - Brief section added to DEPLOYMENT-SIMPLE.md

**Principle**: Keep documentation lean and consolidated. Less is more!

## Development Guidelines

### When Making Changes

1. **Security First**: Every change must consider security implications
2. **Test RLS Policies**: Changes to database schema require testing RLS policies
3. **Validate Inputs**: All user inputs must be validated client-side AND server-side
4. **Rate Limiting**: New public endpoints must enforce rate limits
5. **Audit Logging**: Admin actions should be logged to `audit_log` table
6. **TypeScript Strict**: All TypeScript must pass strict mode checks
7. **Error Handling**: Never expose sensitive information in error messages
8. **No Workarounds**: NEVER implement quick fixes or workarounds just to make something work. Always find and fix the root cause. Follow best practices and maintain code quality. Update dependencies when needed instead of patching around issues.

### When Adding Features

1. **Database First**: Design schema with RLS policies before implementing
2. **API Security**: Protect endpoints with authentication checks
3. **Documentation**: Update CLAUDE.md if architecture changes
4. **Internationalization**: Add translations to both `en.json` and `pl.json`
5. **Performance**: Consider caching strategies for expensive operations

### When Fixing Bugs

1. **Root Cause**: Understand the root cause before fixing
2. **Security Impact**: Check if bug has security implications
3. **Test Coverage**: Ensure fix doesn't break existing functionality
4. **Audit Trail**: Check audit logs if bug relates to admin actions

### Database Migrations

When creating new migrations:
```bash
npx supabase migration new descriptive_name
```

Migration checklist:
- [ ] Add RLS policies for new tables
- [ ] Test policies with different user roles
- [ ] Add indexes for foreign keys and frequently queried columns
- [ ] Include rollback strategy in comments
- [ ] Validate all constraints and checks
- [ ] Test with `npx supabase db reset`

### TypeScript Type Generation

After schema changes, regenerate types:
```bash
npx supabase gen types typescript --local > admin-panel/src/types/database.ts
```

This ensures type safety between database and TypeScript code.

## Important Configuration

### Environment Variables

**Admin Panel** (`.env.local` in `admin-panel/`):
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# URLs
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
MAIN_DOMAIN=localhost:3000

# Cloudflare Turnstile (CAPTCHA)
NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY=...
CLOUDFLARE_TURNSTILE_SECRET_KEY=...
```

### Local Development URLs

- Admin Panel: http://localhost:3000
- Examples: http://localhost:8000
- Supabase API: http://127.0.0.1:54321
- Supabase Studio: http://127.0.0.1:54323
- Email Testing (Inbucket): http://127.0.0.1:54324

## Known Patterns & Conventions

### Naming Conventions

- **Database**: snake_case (e.g., `user_product_access`)
- **TypeScript**: camelCase for variables/functions, PascalCase for components/types
- **Files**: kebab-case for file names (e.g., `gatekeeper-generator.ts`)
- **API Routes**: kebab-case in URL paths (e.g., `/api/runtime-config`)

### Code Organization

- Server-side logic in `lib/` directory
- Client components in `components/` directory
- Server actions in `lib/actions/`
- API routes in `app/api/`
- Shared types in `types/`

### Authentication Patterns

- Use `createClient()` from appropriate Supabase client:
  - Browser: `@/lib/supabase/client`
  - Server Components: `@/lib/supabase/server`
  - Middleware: `@/lib/supabase/middleware`
  - API Routes: `@/lib/supabase/server`

### Error Handling

- Use try-catch blocks for all async operations
- Return structured errors: `{ error: string, details?: any }`
- Log errors with `logger.error()` (includes context)
- Never expose stack traces to client in production

## Testing Strategy

Currently, no automated tests are configured. When adding tests:

1. **Unit Tests**: Test individual functions (especially in `lib/`)
2. **Integration Tests**: Test API endpoints with different auth states
3. **Security Tests**: Test RLS policies, rate limiting, input validation
4. **E2E Tests**: Test complete flows (purchase, authentication, access control)

Recommended tools: Vitest for unit tests, Playwright for E2E.

## Troubleshooting

### Database Connection Issues
- Ensure Supabase is running: `npx supabase status`
- Check `supabase/config.toml` for correct ports
- Verify `.env.local` has correct `SUPABASE_URL` and keys

### Magic Link Not Working Locally
- Check Inbucket at http://127.0.0.1:54324 for captured emails
- Verify `additional_redirect_urls` in `supabase/config.toml`
- Check browser console for auth errors

### Access Control Not Working
- Open browser DevTools → Console for gatekeeper.js logs
- Verify product slug matches database
- Check RLS policies in Supabase Studio
- Confirm user has active session

### CORS Issues with Cross-Domain Access
- Verify `MAIN_DOMAIN` environment variable
- Check CORS headers in `/api/session` and `/api/access` routes
- Ensure `credentials: 'include'` in fetch requests

## Important Notes

- **No Testing/Linting at Root**: The root `package.json` has placeholder scripts only
- **Docker Not Configured**: Despite references, no Docker files exist currently
- **Production vs Local**: Configuration generation behaves differently (minification, obfuscation)
- **First Run**: First user to register automatically becomes admin
- **Guest Purchases**: Purchases made before registration are auto-claimed on signup
- **Rate Limits**: Aggressive rate limiting on public functions; adjust if needed for testing
- **Caching**: 5-minute TTL on access checks; clear cache when testing access changes
- **Locales**: Only English (en) and Polish (pl) are configured

## Security Checklist for Code Review

When reviewing or writing code, verify:

- [ ] RLS policies exist for all new tables
- [ ] Database functions use `auth.uid()`, not parameters
- [ ] All user inputs are validated and sanitized
- [ ] API endpoints check authentication where needed
- [ ] Rate limiting is enforced on public endpoints
- [ ] Error messages don't expose sensitive data
- [ ] Parameterized queries used (no string concatenation)
- [ ] CORS configured correctly for cross-domain features
- [ ] Secrets never committed to repository
- [ ] Audit logging for admin actions

## Additional Resources

- Supabase Documentation: https://supabase.com/docs
- Next.js App Router: https://nextjs.org/docs/app
- Stripe Integration: https://stripe.com/docs/api
- next-intl (i18n): https://next-intl-docs.vercel.app/

---

**Remember**: Security is not optional. It's the foundation of every feature. Always think security first, then functionality.
