# Backlog

## ✅ Recently Completed (Dec 2024 - Jan 2025)

### Payment & Checkout System
- ✅ **Custom Payment Form with Stripe Elements** (Dec 2024)
  - Payment Intent flow for custom checkout experience
  - Guest purchase support with magic link authentication
  - Email validation and profile data auto-load for logged-in users
  - Required first/last name fields with auto-population

- ✅ **EasyCart-Style Checkout UI** (Dec 2024)
  - Product showcase component (left side with image, features, price)
  - Streamlined payment form (right side)
  - Payment method tabs (card/P24/Blik)
  - Mobile-responsive two-column layout

- ✅ **T&C Acceptance in Checkout** (Dec 2024)
  - Moved terms acceptance from payment-status page to checkout form
  - Required checkbox for guests before payment
  - Stored in Stripe metadata for compliance
  - Refactored payment-status flow (removed `termsAlreadyHandled` parameter)

### GUS REGON API Integration (Dec 2024)
- ✅ **Polish Company Data Autofill**
  - NIP validation with checksum algorithm
  - SOAP client for GUS REGON API
  - Automatic company data fetch on NIP blur
  - AES-256-GCM encryption for API key storage
  - Admin panel integration for API key management
  - Rate limiting and CORS protection

### Testing Infrastructure (Dec 2024 - Jan 2025)
- ✅ **Comprehensive E2E Tests with Playwright**
  - Checkout flow validation tests (NIP, GUS integration, form validation)
  - Payment access flow tests (14 passing scenarios):
    - Access granting (logged-in users, timed/unlimited duration)
    - Order bump assignment
    - Failed payment scenarios (declined, expired, processing)
    - Access verification (with/without access, guest redirects)
  - Magic link auto-send flow (with Turnstile captcha mocking)
  - Real Stripe payment intents with test API keys
  - Bypass Stripe.js using `grant_product_access_service_role()` RPC

### Code Quality & Refactoring (Jan 2025)
- ✅ **Payment Status Flow Simplification**
  - Removed redundant `termsAlreadyHandled` parameter (always true after checkout refactor)
  - Cleaned up 7 files, removed ~36 lines of dead code
  - Simplified `useMagicLink`, `useTerms`, `MagicLinkStatus` hooks/components
  - Better code maintainability with clearer intent

---

## High Priority

### Omnibus Directive Compliance - 30-Day Price History Tracking
Implement EU Omnibus Directive (2019/2161) compliance by tracking and displaying the lowest price from the last 30 days when showing discounts.

**Legal Requirement:**
- **EU Directive 2019/2161** (Omnibus) requires displaying the lowest price from the past 30 days when advertising a discount
- **Enforcement:** Fines up to 4% of annual turnover or €2 million
- **Deadline:** Required since May 28, 2022 (already in effect!)
- **Scope:** Applies to all EU customers, including Poland (UOKiK enforcement)

**Reference Implementation:**
- WooCommerce plugin: https://github.com/iworks/omnibus/
- Stores price history in custom meta fields, tracks for 30+ days
- Displays "Previous lowest price: $X.XX" near product price

**Current State:**
- ❌ No price history tracking
- ❌ No automatic logging of price changes
- ❌ No display of historical lowest price
- ✅ Have `products` table with `price` column
- ✅ Have `audit_log` table (generic security audit trail - logs all DB changes in JSONB format, not optimized for price queries)
- ✅ Have coupons/discounts system
- ✅ **No production data yet** - no need to backfill historical prices

**Implementation Plan:**

**1. Database Layer (Migration)**

**Note:** We create a dedicated `product_price_history` table instead of using the existing `audit_log` because:
- `audit_log` stores all changes (products, users, orders) in generic JSONB format → slow queries
- `product_price_history` has typed columns (NUMERIC for price) + dedicated indexes → fast price queries
- `audit_log` is for security auditing ("who changed what"), `product_price_history` is for business logic (Omnibus compliance)

```sql
-- Add Omnibus exempt flag to products table
ALTER TABLE products
ADD COLUMN omnibus_exempt BOOLEAN DEFAULT false NOT NULL;

COMMENT ON COLUMN products.omnibus_exempt IS
  'Exempt this product from Omnibus price history display (e.g., perishable goods, new arrivals)';

-- New table for price history
CREATE TABLE product_price_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  price NUMERIC NOT NULL CHECK (price >= 0),
  currency TEXT NOT NULL CHECK (length(currency) = 3),
  vat_rate DECIMAL(5,2),
  price_includes_vat BOOLEAN DEFAULT true,
  effective_from TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  effective_until TIMESTAMPTZ, -- NULL = current price
  changed_by UUID REFERENCES auth.users(id),
  change_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for fast queries
CREATE INDEX idx_product_price_history_product_date
  ON product_price_history(product_id, effective_from DESC);

-- Add global Omnibus setting to shop_config
-- Assuming shop_config.custom_settings already exists (like for Stripe, GUS keys)
-- If not, create a settings table:
CREATE TABLE IF NOT EXISTS compliance_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- Singleton table
  omnibus_enabled BOOLEAN DEFAULT true NOT NULL,
  omnibus_disclaimer_text TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE compliance_settings IS
  'Global compliance settings (Omnibus, GDPR, etc.) - singleton table';

-- Insert default row
INSERT INTO compliance_settings (id, omnibus_enabled)
VALUES (1, true)
ON CONFLICT (id) DO NOTHING;

-- Trigger to log price changes automatically
CREATE OR REPLACE FUNCTION log_product_price_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if price actually changed
  IF (TG_OP = 'UPDATE' AND
      (OLD.price != NEW.price OR
       OLD.currency != NEW.currency OR
       OLD.vat_rate != NEW.vat_rate)) OR
     TG_OP = 'INSERT' THEN

    -- Close previous price period
    IF TG_OP = 'UPDATE' THEN
      UPDATE product_price_history
      SET effective_until = NOW()
      WHERE product_id = OLD.id
        AND effective_until IS NULL;
    END IF;

    -- Insert new price record
    INSERT INTO product_price_history (
      product_id, price, currency, vat_rate,
      price_includes_vat, effective_from
    ) VALUES (
      NEW.id, NEW.price, NEW.currency, NEW.vat_rate,
      NEW.price_includes_vat, NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER product_price_change_trigger
  AFTER INSERT OR UPDATE OF price, currency, vat_rate
  ON products
  FOR EACH ROW
  EXECUTE FUNCTION log_product_price_change();
```

**2. Backend Functions**
```typescript
// src/lib/services/omnibus.ts

export async function isOmnibusEnabled(): Promise<boolean> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('compliance_settings')
    .select('omnibus_enabled')
    .eq('id', 1)
    .single();

  return data?.omnibus_enabled ?? false;
}

export async function getLowestPriceInLast30Days(
  productId: string
): Promise<{
  lowestPrice: number;
  currency: string;
  effectiveFrom: Date;
} | null> {
  const supabase = await createClient();

  // Check if Omnibus is globally enabled
  const globalEnabled = await isOmnibusEnabled();
  if (!globalEnabled) return null;

  // Check if product is exempt
  const { data: product } = await supabase
    .from('products')
    .select('omnibus_exempt')
    .eq('id', productId)
    .single();

  if (product?.omnibus_exempt) return null;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data, error } = await supabase
    .from('product_price_history')
    .select('price, currency, effective_from')
    .eq('product_id', productId)
    .gte('effective_from', thirtyDaysAgo.toISOString())
    .order('price', { ascending: true })
    .limit(1)
    .single();

  if (error || !data) return null;

  return {
    lowestPrice: data.price,
    currency: data.currency,
    effectiveFrom: new Date(data.effective_from),
  };
}

export function shouldDisplayOmnibusPrice(
  currentPrice: number,
  lowestPrice: number | null
): boolean {
  if (!lowestPrice) return false;
  // Only show if there's an actual discount
  return currentPrice < lowestPrice;
}
```

**3. Frontend Components**
```typescript
// src/components/OmnibusPrice.tsx

interface OmnibusPriceProps {
  productId: string;
  currentPrice: number;
  currency: string;
}

export function OmnibusPrice({
  productId,
  currentPrice,
  currency
}: OmnibusPriceProps) {
  const [lowestPrice, setLowestPrice] = useState<number | null>(null);

  useEffect(() => {
    // Fetch lowest price from API
    fetch(`/api/products/${productId}/lowest-price`)
      .then(res => res.json())
      .then(data => setLowestPrice(data.lowestPrice));
  }, [productId]);

  if (!lowestPrice || currentPrice >= lowestPrice) {
    return null; // No discount, no need to show
  }

  const formatter = new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: currency,
  });

  return (
    <div className="text-sm text-gray-500 mt-2">
      Najniższa cena z ostatnich 30 dni: {formatter.format(lowestPrice)}
    </div>
  );
}
```

**4. Integration Points**
- `ProductShowcase.tsx` - Add `<OmnibusPrice />` component (checks flags internally)
- `ProductPurchaseView.tsx` - Display lowest price info
- Admin panel - Settings page for global Omnibus toggle
- Admin panel - Product edit page for per-product exempt flag
- Admin panel - Price history view and manual override option
- API route: `/api/products/[id]/lowest-price` (respects global + product flags)
- API route: `/api/compliance/omnibus/settings` (CRUD for global settings)

**5. Admin Panel Features**

**Global Settings (Dashboard → Settings → Compliance):**
- ✅ **Enable/Disable Omnibus Globally** - Master switch to turn off entire feature
- Custom disclaimer text (optional, for additional legal info)
- Link to EU compliance documentation

**Per-Product Settings (Product Edit Page):**
- ✅ **Exempt from Omnibus** - Checkbox to exclude specific products
  - Use cases: perishable goods, new arrivals (<30 days), rental services
  - Visual indicator in product list (badge/icon)
- View price history timeline for the product
- Manual entry of historical prices (for migration/initial setup)

**Price History Management:**
- Timeline view with all price changes
- Export price history for compliance audits (CSV/JSON)
- Bulk price update with automatic history tracking
- Filter by date range, product category

**Admin Dashboard Widget:**
- Products currently on discount with Omnibus info displayed
- Products exempt from Omnibus (for review)
- Price changes in last 30 days (audit trail)

**Implementation Complexity: MEDIUM**

**Pros:**
- Relatively straightforward database schema
- Automatic tracking via triggers (can reuse pattern from existing `audit_log` implementation)
- Dedicated `product_price_history` table with proper types and indexes (faster than JSONB queries)
- Frontend component is simple
- ✅ **Flexible on/off controls** - global + per-product settings
- Easy to comply with different market requirements (EU vs non-EU)
- ✅ **No backfill needed** - system not yet in production, history will build automatically from day 1

**Cons:**
- Need to handle edge cases:
  - Products on market < 30 days (can use `omnibus_exempt` flag)
  - Perishable goods (can use `omnibus_exempt` flag)
  - Progressive discounts (special handling)
- Need to decide: gross vs net price for comparison
- Admin UI for viewing/editing history adds complexity
- Two-layer settings (global + per-product) need clear UX

**Control Flags Usage:**

| Scenario | Global Enabled | Product Exempt | Display Lowest Price? |
|----------|---------------|----------------|----------------------|
| EU store, normal product | ✅ Yes | ❌ No | ✅ **Yes** |
| EU store, perishable goods | ✅ Yes | ✅ Yes | ❌ No |
| Non-EU store | ❌ No | ❌ No | ❌ No |
| Testing/staging | ❌ No | - | ❌ No |
| New product (<30 days) | ✅ Yes | ✅ Yes | ❌ No |

**Estimated Effort:** 2-3 days
- Day 1: Database migration, triggers, backend functions
- Day 2: Frontend components, API routes, integration
- Day 3: Admin panel, testing, edge cases, compliance verification

**References:**
- EU Directive 2019/2161: https://www.omniaretail.com/blog/how-retailers-can-stay-compliant-with-the-omnibus-directive-in-2025
- Price transparency requirements: https://www.pricen.ai/software-solutions/pricing-compliance-and-legal/how-omnibus-directive-is-changing-campaign-pricing-in-eu/
- WooCommerce reference implementation: https://github.com/iworks/omnibus/
- ECJ ruling (Sept 2024): https://www.twobirds.com/en/insights/2025/global/transparency-of-price-reductions-a-closer-look-at-the-legal-framework-in-the-eu

---

### Redis Rate Limiting (Upstash) - OPTIONAL OPTIMIZATION

**Current Implementation (Jan 2025):**
✅ **All rate limiting is now database-backed** (PostgreSQL) for consistency and production reliability.

**Rate Limiting Architecture:**
1. **Internal RPC Functions** - Use `check_rate_limit()` function with `rate_limits` table
   - Used by: `check_user_product_access`, `batch_check_user_product_access`, `claim_guest_purchases_for_user`, etc.
   - Prevents abuse of internal database functions

2. **Application-Level API Routes** - Use `check_application_rate_limit()` function with `application_rate_limits` table
   - Used by: `/lib/rate-limiting.ts`
   - API routes using this:
     - `/api/gus/fetch-company-data` - GUS REGON API calls
     - `/api/update-payment-metadata` - Payment metadata updates
     - `/api/coupons/verify` - Coupon validation
     - `/api/coupons/auto-apply` - Auto-apply coupons
     - `/api/public/products/claim-free` - Free product claims
     - `/api/public/products/[slug]/grant-access` - Product access grants
     - `/api/verify-payment` - Payment verification

**Migration History:**
- ❌ Previously had in-memory `Map<string, RateLimitEntry>` in `src/lib/rate-limit.ts` (deleted)
- ✅ Unified on database-backed rate limiting (Jan 2025)
- ✅ All API routes now use `checkRateLimit()` from `/lib/rate-limiting.ts`

**Future Optimization (Optional):**
If horizontal scaling becomes necessary, consider **Upstash Redis** for faster distributed rate limiting:
- Replace `check_application_rate_limit()` RPC function with Redis calls
- Add `@upstash/redis` dependency
- Environment variables: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

**Benefits of Redis upgrade:**
- ⚡ Faster than PostgreSQL queries (~10-50ms vs ~100-200ms)
- 🌍 Global edge caching with Upstash
- 💰 Lower database load (fewer writes to PostgreSQL)

**When to upgrade:**
- When deploying to multiple serverless regions
- When rate limit checks become a performance bottleneck (>100ms p95)
- When database write load from rate limiting becomes significant

**Current Performance:**
- PostgreSQL rate limiting: ~100-200ms per check (acceptable for current scale)
- Database-backed approach works well for single-region deployments
- No immediate need for Redis unless scaling globally

---

## Medium Priority

---

## Low Priority

### Better Date/DateTime Picker Component
**Current State:** Using native HTML5 `<input type="date">` and `<input type="datetime-local">` inputs.

**Issues:**
- Native date pickers have inconsistent styling across browsers
- Dark mode support varies by browser (Chrome/Safari respect `color-scheme: dark`, Firefox may not)
- Limited customization options for branding
- Calendar popup appearance depends on OS/browser (white background on some systems)

**What Works:**
- ✅ Zero dependencies, no library conflicts
- ✅ Built-in accessibility
- ✅ Mobile-friendly native pickers
- ✅ Timezone conversion working correctly (UTC ↔ local)
- ✅ Simple implementation, easy to maintain

**Future Improvement Options:**
1. **Build custom lightweight date picker** - Tailwind CSS only, no libraries
   - Full control over styling and dark mode
   - Consistent appearance across all browsers
   - Estimated effort: 1-2 days

2. **Find Tailwind v4 compatible library** - Research alternatives:
   - Check if react-day-picker v10+ supports Tailwind v4
   - Look for headless UI libraries (e.g., @headlessui/react, Ark UI)
   - Consider Radix UI primitives with custom styling
   - Estimated effort: 1 day research + 1 day integration

3. **Wait for shadcn/ui Tailwind v4 support**
   - Monitor https://github.com/shadcn-ui/ui for v4 compatibility
   - May become available in future versions
   - Zero effort, just waiting

**Priority:** Low - current solution is functional, just not aesthetically ideal.

**Estimated Effort:** 1-3 days depending on chosen approach.

---
