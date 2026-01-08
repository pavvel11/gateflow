# MCP Server Implementation Plan for GateFlow

## Executive Summary

Plan implementacji:
1. **Uniwersalne REST API** (`/api/v1/*`) - jedno API dla wszystkich konsumentów
2. **MCP Server** - cienki wrapper tłumaczący protokół MCP na wywołania REST API
3. **Migracja frontendu** - admin panel przechodzi na `/api/v1/*` (stopniowo)

**Szacowany czas: 16-23 dni roboczych** (API + MCP + migracja frontendu)

---

## INSTRUKCJE IMPLEMENTACJI

> **WAŻNE - przestrzegać podczas całej implementacji:**

1. **Testy** - sam piszę i uruchamiam testy
2. **Istniejące testy** - uruchamiam tylko z obszaru nad którym pracuję (nie wszystkie)
3. **Failing tests** - analizuję czy to bug czy zamierzone działanie, poprawiam testy jeśli trzeba
4. **Migracje DB** - obecne są ZAMROŻONE, nie ruszać
5. **Nowe migracje** - nie tworzyć osobnej dla każdej zmiany, edytować te które stworzyłem
6. **Progress** - aktualizować w tym pliku (sekcja Progress Tracker poniżej)

---

## PROGRESS TRACKER

| Faza | Status | Data rozpoczęcia | Data zakończenia | Uwagi |
|------|--------|------------------|------------------|-------|
| 1. REST API `/api/v1/*` | ⏳ Not started | - | - | - |
| 2. MCP Server | ⏳ Not started | - | - | - |
| 3. Frontend Migration P1 | ⏳ Not started | - | - | - |
| 4. Frontend Migration P2 | ⏳ Not started | - | - | - |
| 5. Frontend Migration P3 | ⏳ Not started | - | - | - |
| 6. Cleanup | ⏳ Not started | - | - | - |

### Szczegółowy progress API endpoints

| Endpoint Group | Migracja | Nowe | Testy | Status |
|----------------|----------|------|-------|--------|
| Products | 0/5 | 0/3 | ❌ | ⏳ |
| Users | 0/5 | 0/4 | ❌ | ⏳ |
| Payments | 0/2 | 0/5 | ❌ | ⏳ |
| Coupons | 0/4 | 0/3 | ❌ | ⏳ |
| Analytics | 0/1 | 0/7 | ❌ | ⏳ |
| Webhooks | 0/5 | 0/0 | ❌ | ⏳ |
| Refund Requests | 0/2 | 0/1 | ❌ | ⏳ |
| System | 0/1 | 0/1 | ❌ | ⏳ |

---

## 0. Funkcjonalności MCP Server

### 0.1 Wzorce z popularnych MCP serwerów

| Serwer | Kluczowe cechy | Inspiracja dla GateFlow |
|--------|----------------|-------------------------|
| **GitHub MCP** | Toolsets (grupy narzędzi), Read-only mode, Dynamic discovery, 51 tools | Grupowanie tools, tryb read-only |
| **Stripe MCP** | Customer management, Subscriptions, Refunds, Search documentation | Podobny model (produkty, płatności, kupony) |
| **PostHog MCP** | Analytics, Feature flags, Error tracking | Analityka, insights |
| **Notion MCP** | CRUD pages, Search, Comments | Operacje CRUD |

### 0.2 Proponowane Toolsets (grupy narzędzi)

```
gateflow-mcp/
├── products      # Zarządzanie produktami
├── users         # Użytkownicy i dostępy
├── payments      # Płatności i zwroty
├── coupons       # Kody rabatowe
├── analytics     # Statystyki i raporty
├── webhooks      # Integracje
└── system        # Konfiguracja, health
```

### 0.3 Kompletna lista Tools (45 narzędzi)

#### Products Toolset (8 tools)
| Tool | Opis | Typ |
|------|------|-----|
| `list_products` | Lista produktów z filtrami (status, search, category) | read |
| `get_product` | Szczegóły produktu | read |
| `create_product` | Utwórz nowy produkt | write |
| `update_product` | Aktualizuj produkt | write |
| `delete_product` | Usuń produkt | destructive |
| `toggle_product_status` | Włącz/wyłącz produkt | write |
| `duplicate_product` | Duplikuj produkt (kopia) | write |
| `get_product_stats` | Statystyki sprzedaży produktu | read |

#### Users Toolset (8 tools)
| Tool | Opis | Typ |
|------|------|-----|
| `list_users` | Lista użytkowników z filtrami | read |
| `get_user` | Szczegóły użytkownika + dostępy | read |
| `search_users` | Wyszukaj po email/nazwie | read |
| `grant_access` | Nadaj dostęp do produktu | write |
| `revoke_access` | Odbierz dostęp | write |
| `extend_access` | Przedłuż dostęp | write |
| `bulk_grant_access` | Masowe nadanie dostępu | write |
| `get_user_purchases` | Historia zakupów użytkownika | read |

#### Payments Toolset (7 tools)
| Tool | Opis | Typ |
|------|------|-----|
| `list_payments` | Lista transakcji | read |
| `get_payment` | Szczegóły transakcji | read |
| `search_payments` | Wyszukaj po email/kwocie/dacie | read |
| `process_refund` | Wykonaj zwrot (pełny/częściowy) | write |
| `export_payments` | Eksport do CSV | read |
| `get_payment_receipt` | Pobierz paragon/fakturę | read |
| `list_failed_payments` | Lista nieudanych płatności | read |

#### Coupons Toolset (7 tools)
| Tool | Opis | Typ |
|------|------|-----|
| `list_coupons` | Lista kuponów | read |
| `get_coupon` | Szczegóły kuponu | read |
| `create_coupon` | Utwórz kupon | write |
| `update_coupon` | Aktualizuj kupon | write |
| `delete_coupon` | Usuń kupon | destructive |
| `get_coupon_stats` | Statystyki użycia kuponu | read |
| `deactivate_coupon` | Dezaktywuj kupon | write |

#### Analytics Toolset (8 tools)
| Tool | Opis | Typ |
|------|------|-----|
| `get_dashboard` | Przegląd dashboard | read |
| `get_revenue_stats` | Statystyki przychodów | read |
| `get_revenue_by_product` | Przychody per produkt | read |
| `get_sales_trends` | Trendy sprzedażowe (daily/weekly/monthly) | read |
| `get_top_products` | Najlepiej sprzedające się produkty | read |
| `get_conversion_stats` | Statystyki konwersji | read |
| `get_refund_stats` | Statystyki zwrotów | read |
| `compare_periods` | Porównanie okresów (MoM, YoY) | read |

#### Webhooks Toolset (5 tools)
| Tool | Opis | Typ |
|------|------|-----|
| `list_webhooks` | Lista webhook endpoints | read |
| `create_webhook` | Utwórz webhook | write |
| `update_webhook` | Aktualizuj webhook | write |
| `delete_webhook` | Usuń webhook | destructive |
| `get_webhook_logs` | Logi dostaw + retry | read |

#### System Toolset (2 tools)
| Tool | Opis | Typ |
|------|------|-----|
| `get_system_health` | Status systemu | read |
| `get_api_usage` | Użycie API (rate limits) | read |

### 0.4 Resources (dane kontekstowe)

Resources to dane które AI może "zobaczyć" bez wywoływania tool:

| Resource URI | Opis | Auto-refresh |
|--------------|------|--------------|
| `gateflow://dashboard` | Aktualne statystyki dashboard | 5min |
| `gateflow://products/active` | Lista aktywnych produktów | 1min |
| `gateflow://alerts` | Aktywne alerty (pending refunds, failed webhooks) | 1min |
| `gateflow://recent-sales` | Ostatnie 10 transakcji | 1min |

### 0.5 Prompts (szablony workflow)

| Prompt | Opis | Argumenty |
|--------|------|-----------|
| `weekly-report` | Tygodniowy raport sprzedaży | `focus`: revenue/products/users |
| `product-analysis` | Analiza konkretnego produktu | `product_id` |
| `revenue-forecast` | Prognoza przychodów | `period`: week/month/quarter |
| `user-cohort-analysis` | Analiza kohortowa użytkowników | `cohort`: new/returning/churned |
| `coupon-effectiveness` | Analiza skuteczności kuponów | `coupon_id` (optional) |
| `refund-analysis` | Analiza przyczyn zwrotów | `period` |

### 0.6 Zaawansowane funkcje

#### Natural Language Queries
```
User: "Pokaż produkty które sprzedały się gorzej niż w zeszłym miesiącu"
AI: [używa get_sales_trends + compare_periods + list_products]
```

#### Bulk Operations
```
User: "Nadaj dostęp do kursu SQL wszystkim którzy kupili kurs Python"
AI: [używa search_users z filtrem + bulk_grant_access]
```

#### Smart Alerts (via Resources)
```typescript
// Resource gateflow://alerts zwraca:
{
  pending_refunds: 3,        // Refundy czekające na decyzję
  failed_webhooks: 12,       // Nieudane webhook delivery
  expiring_access: 45,       // Dostępy wygasające w 7 dni
  low_stock_coupons: 2       // Kupony bliskie limitu użycia
}
```

#### Audit Trail (dla bezpieczeństwa)
Każde write/destructive wywołanie logowane:
```typescript
{
  tool: "process_refund",
  user_id: "admin-123",
  params: { payment_id: "pay_xxx", amount: 99.00 },
  timestamp: "2025-01-08T10:30:00Z",
  source: "mcp"
}
```

### 0.7 Tryby pracy

| Tryb | Opis | Tools dostępne |
|------|------|----------------|
| `full` | Pełny dostęp (domyślny dla admina) | Wszystkie 45 |
| `read-only` | Tylko odczyt | 26 read tools |
| `analytics-only` | Tylko analityka | 8 analytics + dashboard |
| `support` | Dla supportu (read + refunds) | read + process_refund |

### 0.8 Porównanie z konkurencją

| Feature | Stripe MCP | GitHub MCP | **GateFlow MCP** |
|---------|------------|------------|------------------|
| CRUD operations | ✅ | ✅ | ✅ |
| Analytics/insights | ❌ | ❌ | ✅ |
| Bulk operations | ❌ | ✅ | ✅ |
| Natural language search | ✅ (docs) | ✅ (code) | ✅ (data) |
| Read-only mode | ❌ | ✅ | ✅ |
| Toolset grouping | ❌ | ✅ | ✅ |
| Smart alerts | ❌ | ❌ | ✅ |
| Prompts/workflows | ❌ | ✅ | ✅ |
| Audit trail | ❌ | ❌ | ✅ |

### 0.9 Przykłady użycia

```
👤 User: "Wygeneruj raport tygodniowy"
🤖 AI: [wywołuje prompt weekly-report]
     → get_dashboard
     → get_revenue_stats(period=week)
     → get_top_products(limit=5)
     → compare_periods(current=week, previous=week)

📊 Output:
## Raport Tygodniowy (1-8 Jan 2025)

### Przychód
- Ten tydzień: 12,450 PLN (+15% vs poprzedni)
- Transakcji: 89

### Top Produkty
1. Kurs Python (45 sprzedaży, 4,500 PLN)
2. Kurs SQL (23 sprzedaży, 2,300 PLN)
...

### Alerty
- 3 refund requests czeka na decyzję
- 12 webhooks failed (sprawdź logi)
```

```
👤 User: "Kto kupił kurs X ale nie ma dostępu do kursu Y?"
🤖 AI:
     → list_users(has_access_to=product_x_id)
     → filter: exclude users with access to product_y_id

📊 Output:
Znaleziono 127 użytkowników z dostępem do "Kurs X"
którzy nie mają dostępu do "Kurs Y".

Czy chcesz:
1. Wyeksportować listę (emails)?
2. Nadać im dostęp do "Kurs Y"?
3. Wysłać im kupon rabatowy?
```

---

## 1. Architektura

### Jedna warstwa API dla wszystkich

```
┌─────────────────────────────────────────────────────────────────┐
│                      Konsumenci API                             │
├─────────────────┬─────────────────┬─────────────────────────────┤
│   Admin Panel   │   MCP Server    │   Zewnętrzne integracje     │
│   (frontend)    │   (AI bridge)   │   (API keys)                │
└────────┬────────┴────────┬────────┴─────────────┬───────────────┘
         │                 │                      │
         └─────────────────┼──────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    /api/v1/* (PUBLIC REST API)                  │
│                                                                 │
│  Auth: Supabase JWT (admin panel, MCP)                          │
│        API Keys (zewnętrzne integracje)                         │
│                                                                 │
│  Features:                                                      │
│  - Cursor-based pagination                                      │
│  - Standardowe error responses                                  │
│  - OpenAPI 3.1 documentation                                    │
│  - Rate limiting                                                │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Supabase                                 │
│  - PostgreSQL + RLS                                             │
│  - Auth (OAuth 2.1)                                             │
└─────────────────────────────────────────────────────────────────┘
```

### MCP Server = Thin Wrapper

MCP server nie ma własnej logiki biznesowej - tylko tłumaczy protokół:

```typescript
// Każdy MCP tool to po prostu wywołanie REST API
server.tool("list_products", schema, async (params, ctx) => {
  const response = await fetch(`${API_URL}/api/v1/products?${qs(params)}`, {
    headers: { Authorization: `Bearer ${ctx.auth.token}` }
  });
  return formatMcpResponse(await response.json());
});
```

---

## 2. Faza 1: REST API `/api/v1/*`

### 2.1 Struktura endpointów

```
/api/v1/
├── products/
│   ├── GET    /                 # List products
│   ├── POST   /                 # Create product
│   ├── GET    /:id              # Get product
│   ├── PATCH  /:id              # Update product
│   ├── DELETE /:id              # Delete product
│   └── GET    /:id/stats        # Product statistics
│
├── users/
│   ├── GET    /                 # List users
│   ├── GET    /:id              # Get user details
│   ├── GET    /:id/access       # Get user's product access
│   ├── POST   /:id/access       # Grant access
│   └── DELETE /:id/access/:pid  # Revoke access
│
├── payments/
│   ├── GET    /                 # List transactions
│   ├── GET    /:id              # Get transaction
│   ├── POST   /:id/refund       # Process refund
│   └── GET    /export           # Export CSV
│
├── coupons/
│   ├── GET    /                 # List coupons
│   ├── POST   /                 # Create coupon
│   ├── GET    /:id              # Get coupon
│   ├── PATCH  /:id              # Update coupon
│   ├── DELETE /:id              # Delete coupon
│   └── GET    /:id/stats        # Coupon usage stats
│
├── analytics/
│   ├── GET    /dashboard        # Dashboard overview
│   ├── GET    /revenue          # Revenue stats
│   └── GET    /products         # Product performance
│
├── webhooks/
│   ├── GET    /                 # List endpoints
│   ├── POST   /                 # Create endpoint
│   ├── PATCH  /:id              # Update endpoint
│   ├── DELETE /:id              # Delete endpoint
│   ├── GET    /logs             # Delivery logs
│   └── POST   /:id/test         # Test webhook
│
└── refund-requests/
    ├── GET    /                 # List requests
    ├── POST   /:id/approve      # Approve
    └── POST   /:id/reject       # Reject
```

### 2.2 Standardy API

#### Request/Response Format

```typescript
// Pagination (cursor-based, NIE offset!)
interface PaginatedRequest {
  cursor?: string;
  limit?: number;  // default 50, max 100
  sort?: string;   // e.g. "-created_at" (desc)
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    next_cursor: string | null;
    has_more: boolean;
    total?: number;  // optional, expensive
  };
}

// Error response
interface ErrorResponse {
  error: {
    code: string;        // "PRODUCT_NOT_FOUND"
    message: string;     // "Product with ID xyz not found"
    details?: object;    // Additional context
  };
}

// Success response
interface SuccessResponse<T> {
  data: T;
}
```

#### HTTP Status Codes

| Code | Usage |
|------|-------|
| 200 | Success (GET, PATCH) |
| 201 | Created (POST) |
| 204 | No Content (DELETE) |
| 400 | Bad Request (validation) |
| 401 | Unauthorized (no/invalid token) |
| 403 | Forbidden (no permission) |
| 404 | Not Found |
| 409 | Conflict (duplicate) |
| 422 | Unprocessable Entity |
| 429 | Rate Limited |
| 500 | Internal Error |

#### Authentication

```typescript
// Header
Authorization: Bearer <supabase_jwt>
// lub
X-API-Key: <api_key>

// API keys stored in database
interface ApiKey {
  id: string;
  key_hash: string;      // bcrypt hash
  name: string;          // "Production integration"
  permissions: string[]; // ["products:read", "products:write"]
  created_at: string;
  expires_at?: string;
  last_used_at?: string;
}
```

### 2.3 Przykładowe implementacje

#### Products endpoint

```typescript
// src/app/api/v1/products/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const ListProductsSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  status: z.enum(['all', 'active', 'inactive']).default('all'),
  search: z.string().optional(),
  sort: z.string().default('-created_at'),
});

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  // Verify authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Invalid or missing token' } },
      { status: 401 }
    );
  }

  // Verify admin
  const { data: isAdmin } = await supabase.rpc('is_admin');
  if (!isAdmin) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Admin access required' } },
      { status: 403 }
    );
  }

  // Parse params
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = ListProductsSchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid parameters', details: parsed.error.flatten() } },
      { status: 400 }
    );
  }

  const { cursor, limit, status, search, sort } = parsed.data;

  // Build query
  let query = supabase
    .from('products')
    .select('id, name, slug, price, currency, is_active, created_at, updated_at');

  if (status !== 'all') {
    query = query.eq('is_active', status === 'active');
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%`);
  }

  // Cursor pagination
  if (cursor) {
    const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString());
    query = query.gt('created_at', decoded.created_at);
  }

  // Sorting
  const [sortField, sortDir] = sort.startsWith('-')
    ? [sort.slice(1), 'desc']
    : [sort, 'asc'];
  query = query.order(sortField as any, { ascending: sortDir === 'asc' });

  // Fetch limit + 1 to check has_more
  query = query.limit(limit + 1);

  const { data: products, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: { code: 'DATABASE_ERROR', message: error.message } },
      { status: 500 }
    );
  }

  const hasMore = products.length > limit;
  const items = hasMore ? products.slice(0, -1) : products;
  const lastItem = items[items.length - 1];

  return NextResponse.json({
    data: items,
    pagination: {
      next_cursor: hasMore
        ? Buffer.from(JSON.stringify({ created_at: lastItem.created_at })).toString('base64')
        : null,
      has_more: hasMore,
    }
  });
}

export async function POST(request: NextRequest) {
  // Create product implementation...
}
```

#### Auth middleware (reusable)

```typescript
// src/lib/api/auth.ts
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export type AuthContext = {
  user: { id: string; email: string };
  isAdmin: boolean;
};

export async function withAuth(
  request: NextRequest,
  handler: (ctx: AuthContext) => Promise<NextResponse>,
  options: { requireAdmin?: boolean } = {}
): Promise<NextResponse> {
  const supabase = await createClient();

  // Try JWT first
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    // Try API key
    const apiKey = request.headers.get('X-API-Key');
    if (apiKey) {
      const keyUser = await validateApiKey(apiKey);
      if (keyUser) {
        return handler({ user: keyUser, isAdmin: keyUser.isAdmin });
      }
    }

    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Invalid or missing authentication' } },
      { status: 401 }
    );
  }

  const { data: isAdmin } = await supabase.rpc('is_admin');

  if (options.requireAdmin && !isAdmin) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Admin access required' } },
      { status: 403 }
    );
  }

  return handler({ user: { id: user.id, email: user.email! }, isAdmin: !!isAdmin });
}
```

### 2.4 OpenAPI Documentation

```typescript
// src/app/api/v1/openapi/route.ts
import { NextResponse } from 'next/server';

const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'GateFlow API',
    version: '1.0.0',
    description: 'REST API for GateFlow admin operations',
  },
  servers: [
    { url: 'https://app.gateflow.io/api/v1', description: 'Production' },
    { url: 'http://localhost:3000/api/v1', description: 'Development' },
  ],
  paths: {
    '/products': {
      get: {
        summary: 'List products',
        tags: ['Products'],
        parameters: [
          { name: 'cursor', in: 'query', schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50, maximum: 100 } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['all', 'active', 'inactive'] } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'List of products' },
          401: { description: 'Unauthorized' },
        },
      },
      post: {
        summary: 'Create product',
        // ...
      },
    },
    // ... more paths
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      apiKey: { type: 'apiKey', in: 'header', name: 'X-API-Key' },
    },
  },
  security: [{ bearerAuth: [] }, { apiKey: [] }],
};

export async function GET() {
  return NextResponse.json(openApiSpec);
}
```

---

## 3. Faza 2: MCP Server

### 3.1 Struktura projektu

```
/mcp-server/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts           # Entry point
│   ├── server.ts          # MCP server setup
│   ├── api-client.ts      # HTTP client for REST API
│   ├── tools/
│   │   ├── index.ts       # Register all tools
│   │   ├── products.ts
│   │   ├── users.ts
│   │   ├── analytics.ts
│   │   ├── payments.ts
│   │   ├── coupons.ts
│   │   └── webhooks.ts
│   ├── resources/
│   │   └── index.ts
│   └── prompts/
│       └── index.ts
└── claude-config.json     # Example Claude Desktop config
```

### 3.2 API Client

```typescript
// src/api-client.ts
const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

interface ApiClientOptions {
  token: string;
}

class ApiClient {
  constructor(private options: ApiClientOptions) {}

  private async request<T>(
    method: string,
    path: string,
    body?: object
  ): Promise<T> {
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${this.options.token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'API request failed');
    }

    return data;
  }

  get<T>(path: string) { return this.request<T>('GET', path); }
  post<T>(path: string, body: object) { return this.request<T>('POST', path, body); }
  patch<T>(path: string, body: object) { return this.request<T>('PATCH', path, body); }
  delete<T>(path: string) { return this.request<T>('DELETE', path); }
}

export function createApiClient(token: string) {
  return new ApiClient({ token });
}
```

### 3.3 Tools Implementation

```typescript
// src/tools/products.ts
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createApiClient } from '../api-client.js';

export function registerProductTools(server: McpServer) {

  // LIST PRODUCTS
  server.tool(
    'list_products',
    {
      status: z.enum(['all', 'active', 'inactive']).optional(),
      search: z.string().optional(),
      cursor: z.string().optional(),
      limit: z.number().max(100).default(50),
    },
    async (params, { auth }) => {
      const api = createApiClient(auth.token);
      const query = new URLSearchParams();

      if (params.status) query.set('status', params.status);
      if (params.search) query.set('search', params.search);
      if (params.cursor) query.set('cursor', params.cursor);
      query.set('limit', String(params.limit));

      const result = await api.get(`/api/v1/products?${query}`);

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    }
  );

  // GET PRODUCT
  server.tool(
    'get_product',
    { id: z.string().uuid() },
    async ({ id }, { auth }) => {
      const api = createApiClient(auth.token);
      const result = await api.get(`/api/v1/products/${id}`);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    }
  );

  // CREATE PRODUCT
  server.tool(
    'create_product',
    {
      name: z.string().min(1).max(200),
      slug: z.string().regex(/^[a-z0-9-]+$/),
      price: z.number().positive(),
      currency: z.enum(['PLN', 'EUR', 'USD']),
      description: z.string().optional(),
      is_active: z.boolean().default(false),
    },
    async (params, { auth }) => {
      const api = createApiClient(auth.token);
      const result = await api.post('/api/v1/products', params);
      return {
        content: [{
          type: 'text',
          text: `Product created:\nID: ${result.data.id}\nSlug: ${result.data.slug}`
        }]
      };
    }
  );

  // UPDATE PRODUCT
  server.tool(
    'update_product',
    {
      id: z.string().uuid(),
      name: z.string().optional(),
      price: z.number().positive().optional(),
      is_active: z.boolean().optional(),
      // ... other optional fields
    },
    async ({ id, ...updates }, { auth }) => {
      const api = createApiClient(auth.token);
      await api.patch(`/api/v1/products/${id}`, updates);
      return {
        content: [{ type: 'text', text: `Product ${id} updated successfully.` }]
      };
    }
  );

  // DELETE PRODUCT
  server.tool(
    'delete_product',
    {
      id: z.string().uuid(),
      confirm: z.literal(true).describe('Must be true to confirm deletion'),
    },
    async ({ id }, { auth }) => {
      const api = createApiClient(auth.token);
      await api.delete(`/api/v1/products/${id}`);
      return {
        content: [{ type: 'text', text: `Product ${id} deleted.` }]
      };
    }
  );
}
```

```typescript
// src/tools/analytics.ts
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createApiClient } from '../api-client.js';

export function registerAnalyticsTools(server: McpServer) {

  // DASHBOARD
  server.tool(
    'get_dashboard',
    {},
    async (_, { auth }) => {
      const api = createApiClient(auth.token);
      const result = await api.get('/api/v1/analytics/dashboard');

      const d = result.data;
      return {
        content: [{
          type: 'text',
          text: `## Dashboard

### Revenue
- Today: ${d.today_revenue} ${d.currency}
- This Month: ${d.month_revenue} ${d.currency}
- Total: ${d.total_revenue} ${d.currency}

### Products
- Active: ${d.active_products} / ${d.total_products}

### Users
- Total: ${d.total_users}
- With Access: ${d.users_with_access}

### Pending
- Refund Requests: ${d.pending_refunds}`
        }]
      };
    }
  );

  // REVENUE STATS
  server.tool(
    'get_revenue_stats',
    {
      period: z.enum(['week', 'month', 'quarter', 'year']).default('month'),
      product_id: z.string().uuid().optional(),
    },
    async (params, { auth }) => {
      const api = createApiClient(auth.token);
      const query = new URLSearchParams({ period: params.period });
      if (params.product_id) query.set('product_id', params.product_id);

      const result = await api.get(`/api/v1/analytics/revenue?${query}`);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    }
  );
}
```

### 3.4 Main Entry Point

```typescript
// src/index.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { registerProductTools } from './tools/products.js';
import { registerUserTools } from './tools/users.js';
import { registerAnalyticsTools } from './tools/analytics.js';
import { registerPaymentTools } from './tools/payments.js';
import { registerCouponTools } from './tools/coupons.js';
import { registerWebhookTools } from './tools/webhooks.js';

const server = new McpServer({
  name: 'gateflow',
  version: '1.0.0',
});

// Register tools
registerProductTools(server);
registerUserTools(server);
registerAnalyticsTools(server);
registerPaymentTools(server);
registerCouponTools(server);
registerWebhookTools(server);

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('GateFlow MCP Server started');
}

main().catch(console.error);
```

### 3.5 Claude Desktop Config

```json
// ~/Library/Application Support/Claude/claude_desktop_config.json
{
  "mcpServers": {
    "gateflow": {
      "command": "npx",
      "args": ["tsx", "/path/to/mcp-server/src/index.ts"],
      "env": {
        "API_BASE_URL": "https://app.gateflow.io"
      }
    }
  }
}
```

---

## 4. Kompletne mapowanie: Obecne → Nowe → MCP Tool

### Legenda

| Symbol | Znaczenie |
|--------|-----------|
| ✅ | Endpoint istnieje, wymaga tylko migracji |
| 🆕 | Nowy endpoint do stworzenia |
| ➡️ | Mapowanie na MCP tool |
| 🔀 | Zmiana metody HTTP lub struktury |

---

### 4.1 Products (8 tools)

| Obecny endpoint | Nowy endpoint | MCP Tool | Status |
|-----------------|---------------|----------|--------|
| `GET /api/admin/products` | `GET /api/v1/products` | `list_products` | ✅ 🔀 cursor pagination |
| `GET /api/admin/products/[id]` | `GET /api/v1/products/:id` | `get_product` | ✅ |
| `POST /api/admin/products` | `POST /api/v1/products` | `create_product` | ✅ |
| `PUT /api/admin/products/[id]` | `PATCH /api/v1/products/:id` | `update_product` | ✅ 🔀 PUT→PATCH |
| `DELETE /api/admin/products/[id]` | `DELETE /api/v1/products/:id` | `delete_product` | ✅ |
| ❌ nie istnieje | `PATCH /api/v1/products/:id/status` | `toggle_product_status` | 🆕 |
| ❌ nie istnieje | `POST /api/v1/products/:id/duplicate` | `duplicate_product` | 🆕 |
| ❌ nie istnieje | `GET /api/v1/products/:id/stats` | `get_product_stats` | 🆕 |

**Dodatkowe obecne endpointy (OTO):**
| Obecny endpoint | Nowy endpoint | MCP Tool | Status |
|-----------------|---------------|----------|--------|
| `GET /api/admin/products/[id]/oto` | `GET /api/v1/products/:id/oto` | (brak - admin UI only) | ✅ opcjonalnie |
| `POST /api/admin/products/[id]/oto` | `POST /api/v1/products/:id/oto` | (brak - admin UI only) | ✅ opcjonalnie |

---

### 4.2 Users (8 tools)

| Obecny endpoint | Nowy endpoint | MCP Tool | Status |
|-----------------|---------------|----------|--------|
| `GET /api/users` | `GET /api/v1/users` | `list_users` | ✅ 🔀 cursor pagination |
| `GET /api/users/[id]/profile` | `GET /api/v1/users/:id` | `get_user` | ✅ |
| ❌ nie istnieje | `POST /api/v1/users/search` | `search_users` | 🆕 |
| `POST /api/users/[id]/access` | `POST /api/v1/users/:id/access` | `grant_access` | ✅ |
| `DELETE /api/users/[id]/access?product_id=x` | `DELETE /api/v1/users/:id/access/:productId` | `revoke_access` | ✅ 🔀 query→path |
| ❌ nie istnieje | `PATCH /api/v1/users/:id/access/:productId` | `extend_access` | 🆕 |
| ❌ nie istnieje | `POST /api/v1/users/bulk-access` | `bulk_grant_access` | 🆕 |
| ❌ nie istnieje | `GET /api/v1/users/:id/purchases` | `get_user_purchases` | 🆕 |

**Dodatkowe obecne endpointy:**
| Obecny endpoint | Nowy endpoint | MCP Tool | Status |
|-----------------|---------------|----------|--------|
| `GET /api/users/[id]/access` | `GET /api/v1/users/:id/access` | (część `get_user`) | ✅ merge |
| `POST /api/users` (grant/revoke) | rozbite na osobne | `grant_access` / `revoke_access` | ✅ 🔀 split |

---

### 4.3 Payments (7 tools)

| Obecny endpoint | Nowy endpoint | MCP Tool | Status |
|-----------------|---------------|----------|--------|
| `GET /api/admin/payments/sessions` | `GET /api/v1/payments` | `list_payments` | ✅ 🔀 cursor pagination |
| ❌ nie istnieje | `GET /api/v1/payments/:id` | `get_payment` | 🆕 |
| ❌ nie istnieje | `POST /api/v1/payments/search` | `search_payments` | 🆕 |
| `POST /api/admin/payments/refund` | `POST /api/v1/payments/:id/refund` | `process_refund` | ✅ 🔀 body→path |
| `POST /api/admin/payments/export` | `GET /api/v1/payments/export` | `export_payments` | ✅ 🔀 POST→GET |
| ❌ nie istnieje | `GET /api/v1/payments/:id/receipt` | `get_payment_receipt` | 🆕 |
| ❌ nie istnieje | `GET /api/v1/payments/failed` | `list_failed_payments` | 🆕 |

**Dodatkowe obecne endpointy:**
| Obecny endpoint | Nowy endpoint | MCP Tool | Status |
|-----------------|---------------|----------|--------|
| `GET /api/admin/payments/stats` | → przeniesione do analytics | `get_dashboard` | 🔀 move |
| `GET /api/admin/payments/transactions` | → merge z sessions | `list_payments` | 🔀 merge |

---

### 4.4 Coupons (7 tools)

| Obecny endpoint | Nowy endpoint | MCP Tool | Status |
|-----------------|---------------|----------|--------|
| `GET /api/admin/coupons` | `GET /api/v1/coupons` | `list_coupons` | ✅ 🔀 cursor pagination |
| ❌ nie istnieje | `GET /api/v1/coupons/:id` | `get_coupon` | 🆕 |
| `POST /api/admin/coupons` | `POST /api/v1/coupons` | `create_coupon` | ✅ |
| `PATCH /api/admin/coupons/[id]` | `PATCH /api/v1/coupons/:id` | `update_coupon` | ✅ |
| `DELETE /api/admin/coupons/[id]` | `DELETE /api/v1/coupons/:id` | `delete_coupon` | ✅ |
| ❌ nie istnieje | `GET /api/v1/coupons/:id/stats` | `get_coupon_stats` | 🆕 |
| ❌ nie istnieje | `PATCH /api/v1/coupons/:id/deactivate` | `deactivate_coupon` | 🆕 |

---

### 4.5 Analytics (8 tools) - WSZYSTKIE NOWE

| Obecny endpoint | Nowy endpoint | MCP Tool | Status |
|-----------------|---------------|----------|--------|
| `GET /api/admin/payments/stats` | `GET /api/v1/analytics/dashboard` | `get_dashboard` | 🔀 move+extend |
| ❌ nie istnieje | `GET /api/v1/analytics/revenue` | `get_revenue_stats` | 🆕 |
| ❌ nie istnieje | `GET /api/v1/analytics/revenue/by-product` | `get_revenue_by_product` | 🆕 |
| ❌ nie istnieje | `GET /api/v1/analytics/trends` | `get_sales_trends` | 🆕 |
| ❌ nie istnieje | `GET /api/v1/analytics/top-products` | `get_top_products` | 🆕 |
| ❌ nie istnieje | `GET /api/v1/analytics/conversion` | `get_conversion_stats` | 🆕 |
| ❌ nie istnieje | `GET /api/v1/analytics/refunds` | `get_refund_stats` | 🆕 |
| ❌ nie istnieje | `GET /api/v1/analytics/compare` | `compare_periods` | 🆕 |

---

### 4.6 Webhooks (5 tools)

| Obecny endpoint | Nowy endpoint | MCP Tool | Status |
|-----------------|---------------|----------|--------|
| `GET /api/admin/webhooks` | `GET /api/v1/webhooks` | `list_webhooks` | ✅ |
| `POST /api/admin/webhooks` | `POST /api/v1/webhooks` | `create_webhook` | ✅ |
| `PUT /api/admin/webhooks/[id]` | `PATCH /api/v1/webhooks/:id` | `update_webhook` | ✅ 🔀 PUT→PATCH |
| `DELETE /api/admin/webhooks/[id]` | `DELETE /api/v1/webhooks/:id` | `delete_webhook` | ✅ |
| `GET /api/admin/webhooks/logs` | `GET /api/v1/webhooks/logs` | `get_webhook_logs` | ✅ |

**Dodatkowe obecne endpointy (helper):**
| Obecny endpoint | Nowy endpoint | MCP Tool | Status |
|-----------------|---------------|----------|--------|
| `POST /api/admin/webhooks/logs/[id]/retry` | `POST /api/v1/webhooks/logs/:id/retry` | (część `get_webhook_logs`) | ✅ |
| `POST /api/admin/webhooks/logs/[id]/archive` | `DELETE /api/v1/webhooks/logs/:id` | (brak MCP) | ✅ |
| `POST /api/admin/webhooks/test` | `POST /api/v1/webhooks/:id/test` | (brak MCP) | ✅ 🔀 |

---

### 4.7 Refund Requests (3 tools → merge z payments)

| Obecny endpoint | Nowy endpoint | MCP Tool | Status |
|-----------------|---------------|----------|--------|
| `GET /api/admin/refund-requests` | `GET /api/v1/refund-requests` | `list_refund_requests` | ✅ |
| `PATCH /api/admin/refund-requests/[id]` (approve) | `POST /api/v1/refund-requests/:id/approve` | `approve_refund` | ✅ 🔀 |
| `PATCH /api/admin/refund-requests/[id]` (reject) | `POST /api/v1/refund-requests/:id/reject` | `reject_refund` | ✅ 🔀 |

---

### 4.8 Order Bumps (brak MCP - admin UI only)

| Obecny endpoint | Nowy endpoint | MCP Tool | Status |
|-----------------|---------------|----------|--------|
| `GET /api/admin/order-bumps` | `GET /api/v1/order-bumps` | ❌ brak | ✅ opcjonalnie |
| `POST /api/admin/order-bumps` | `POST /api/v1/order-bumps` | ❌ brak | ✅ opcjonalnie |
| `PATCH /api/admin/order-bumps/[id]` | `PATCH /api/v1/order-bumps/:id` | ❌ brak | ✅ opcjonalnie |
| `DELETE /api/admin/order-bumps/[id]` | `DELETE /api/v1/order-bumps/:id` | ❌ brak | ✅ opcjonalnie |

---

### 4.9 Variant Groups (brak MCP - admin UI only)

| Obecny endpoint | Nowy endpoint | MCP Tool | Status |
|-----------------|---------------|----------|--------|
| `GET /api/admin/variant-groups` | `GET /api/v1/variant-groups` | ❌ brak | ✅ opcjonalnie |
| `POST /api/admin/variant-groups` | `POST /api/v1/variant-groups` | ❌ brak | ✅ opcjonalnie |
| `PATCH /api/admin/variant-groups?groupId=x` | `PATCH /api/v1/variant-groups/:id` | ❌ brak | ✅ 🔀 |
| `DELETE /api/admin/variant-groups?groupId=x` | `DELETE /api/v1/variant-groups/:id` | ❌ brak | ✅ 🔀 |

---

### 4.10 System (2 tools)

| Obecny endpoint | Nowy endpoint | MCP Tool | Status |
|-----------------|---------------|----------|--------|
| `GET /api/health` | `GET /api/v1/system/health` | `get_system_health` | ✅ 🔀 move |
| ❌ nie istnieje | `GET /api/v1/system/usage` | `get_api_usage` | 🆕 |

---

### 4.11 Podsumowanie migracji

| Kategoria | Istniejące | Do migracji | Nowe | Razem v1 |
|-----------|------------|-------------|------|----------|
| Products | 5 | 5 | 3 | 8 |
| Users | 5 | 5 | 4 | 9 |
| Payments | 4 | 2 | 5 | 7 |
| Coupons | 4 | 4 | 3 | 7 |
| Analytics | 1 | 1 | 7 | 8 |
| Webhooks | 8 | 5 | 0 | 5 |
| Refund Requests | 2 | 2 | 1 | 3 |
| Order Bumps | 4 | 4 | 0 | 4 (opcja) |
| Variant Groups | 4 | 4 | 0 | 4 (opcja) |
| System | 1 | 1 | 1 | 2 |
| **RAZEM** | **38** | **33** | **24** | **57** |

### 4.12 Priorytety implementacji

**P1 - Core (MCP wymagane)**
1. Products (8 endpoints) - podstawa
2. Users (9 endpoints) - zarządzanie dostępami
3. Analytics (8 endpoints) - wszystkie nowe
4. Coupons (7 endpoints) - e-commerce core

**P2 - Operations (MCP przydatne)**
5. Payments (7 endpoints) - transakcje
6. Refund Requests (3 endpoints) - workflow
7. Webhooks (5 endpoints) - integracje

**P3 - Optional (tylko frontend)**
8. Order Bumps (4 endpoints) - admin UI
9. Variant Groups (4 endpoints) - admin UI
10. System (2 endpoints) - monitoring

---

## 5. Implementation Roadmap

### Faza 1: REST API (5-7 dni)

| Dzień | Zadania |
|-------|---------|
| 1 | Setup `/api/v1/` structure, auth middleware, error handling |
| 2 | Products endpoints (CRUD) |
| 3 | Users + access endpoints |
| 4 | Payments + refunds endpoints |
| 5 | Coupons + webhooks endpoints |
| 6 | Analytics endpoints |
| 7 | OpenAPI docs, testy |

### Faza 2: MCP Server (3-4 dni)

| Dzień | Zadania |
|-------|---------|
| 1 | Setup projektu, API client, auth |
| 2 | Product + User tools |
| 3 | Analytics + Payments + Coupons tools |
| 4 | Webhooks tools, testowanie z Claude Desktop |

### Faza 3: Polish & Deploy (2 dni)

| Dzień | Zadania |
|-------|---------|
| 1 | Error handling, rate limiting, logging |
| 2 | Dokumentacja, publikacja npm (opcjonalnie) |

**Tylko API + MCP: 10-13 dni roboczych**

> **Uwaga:** Pełny roadmap z migracją frontendu znajduje się w sekcji 6.9

---

## 6. Strategia migracji frontendu

### 6.1 Obecny stan

```
Obecnie:
├── /api/admin/*     ← Admin panel frontend
├── /api/public/*    ← Checkout, public pages
└── /api/*           ← Mixed (auth, webhooks, etc.)

Docelowo:
├── /api/v1/*        ← WSZYSTKO (admin, MCP, external)
├── /api/public/*    ← Checkout (bez zmian, inne use case)
└── /api/webhooks/*  ← Stripe webhooks (bez zmian)
```

### 6.2 Mapowanie endpointów

| Obecny endpoint | Nowy endpoint | Priorytet |
|-----------------|---------------|-----------|
| `GET /api/admin/products` | `GET /api/v1/products` | P1 |
| `POST /api/admin/products` | `POST /api/v1/products` | P1 |
| `GET /api/admin/products/[id]` | `GET /api/v1/products/:id` | P1 |
| `PUT /api/admin/products/[id]` | `PATCH /api/v1/products/:id` | P1 |
| `DELETE /api/admin/products/[id]` | `DELETE /api/v1/products/:id` | P1 |
| `GET /api/admin/coupons` | `GET /api/v1/coupons` | P2 |
| `POST /api/admin/coupons` | `POST /api/v1/coupons` | P2 |
| `GET /api/admin/payments/sessions` | `GET /api/v1/payments` | P2 |
| `GET /api/admin/payments/stats` | `GET /api/v1/analytics/dashboard` | P2 |
| `GET /api/users` | `GET /api/v1/users` | P2 |
| `POST /api/users` (grant access) | `POST /api/v1/users/:id/access` | P2 |
| `GET /api/admin/webhooks` | `GET /api/v1/webhooks` | P3 |
| `GET /api/admin/refund-requests` | `GET /api/v1/refund-requests` | P3 |

### 6.3 Różnice w response format

```typescript
// OBECNY format (niespójny)
// GET /api/admin/products
{
  products: [...],
  total: 100,
  page: 1,
  pageSize: 20
}

// NOWY format (standardowy)
// GET /api/v1/products
{
  data: [...],
  pagination: {
    next_cursor: "eyJjcmVhdGVkX2F0IjoiMjAyNS...",
    has_more: true
  }
}
```

### 6.4 Frontend API Client

Stwórz centralny API client który abstrakcuje różnice:

```typescript
// src/lib/api/client.ts
const API_VERSION = 'v1';

interface ListParams {
  cursor?: string;
  limit?: number;
  search?: string;
  [key: string]: unknown;
}

interface ListResponse<T> {
  data: T[];
  pagination: {
    next_cursor: string | null;
    has_more: boolean;
  };
}

class ApiClient {
  private baseUrl = `/api/${API_VERSION}`;

  async list<T>(resource: string, params: ListParams = {}): Promise<ListResponse<T>> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) query.set(key, String(value));
    });

    const response = await fetch(`${this.baseUrl}/${resource}?${query}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(error.error.code, error.error.message);
    }

    return response.json();
  }

  async get<T>(resource: string, id: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}/${resource}/${id}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(error.error.code, error.error.message);
    }

    const result = await response.json();
    return result.data;
  }

  async create<T>(resource: string, data: object): Promise<T> {
    const response = await fetch(`${this.baseUrl}/${resource}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(error.error.code, error.error.message);
    }

    const result = await response.json();
    return result.data;
  }

  async update<T>(resource: string, id: string, data: object): Promise<T> {
    const response = await fetch(`${this.baseUrl}/${resource}/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(error.error.code, error.error.message);
    }

    const result = await response.json();
    return result.data;
  }

  async delete(resource: string, id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${resource}/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(error.error.code, error.error.message);
    }
  }
}

class ApiError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export const api = new ApiClient();
```

### 6.5 React hooks z nowym API

```typescript
// src/hooks/useProducts.ts
import useSWR from 'swr';  // lub React Query
import { api } from '@/lib/api/client';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  currency: string;
  is_active: boolean;
}

export function useProducts(params: { status?: string; search?: string } = {}) {
  const { data, error, isLoading, mutate } = useSWR(
    ['products', params],
    () => api.list<Product>('products', params)
  );

  return {
    products: data?.data ?? [],
    pagination: data?.pagination,
    isLoading,
    error,
    refresh: mutate,
  };
}

export function useProduct(id: string) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? ['product', id] : null,
    () => api.get<Product>('products', id)
  );

  return {
    product: data,
    isLoading,
    error,
    refresh: mutate,
  };
}

export function useCreateProduct() {
  const create = async (data: Partial<Product>) => {
    return api.create<Product>('products', data);
  };

  return { create };
}

export function useUpdateProduct() {
  const update = async (id: string, data: Partial<Product>) => {
    return api.update<Product>('products', id, data);
  };

  return { update };
}
```

### 6.6 Plan migracji komponentów

```
Faza 1 (podczas budowy API):
├── Budujemy /api/v1/products
├── Tworzymy useProducts hook
├── Migrujemy ProductList.tsx
└── Migrujemy ProductForm.tsx

Faza 2 (po API):
├── Migrujemy Users pages
├── Migrujemy Coupons pages
└── Migrujemy Payments pages

Faza 3 (cleanup):
├── Migrujemy pozostałe pages
├── Usuwamy /api/admin/* endpoints
└── Usuwamy stare hooks/fetchers
```

### 6.7 Strategia backward compatibility

Podczas migracji, stare endpointy działają równolegle:

```typescript
// src/app/api/admin/products/route.ts
// DEPRECATED - redirect to v1

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Log deprecation warning
  console.warn('DEPRECATED: /api/admin/products - use /api/v1/products');

  // Option 1: Proxy to new endpoint
  const url = new URL(request.url);
  url.pathname = '/api/v1/products';
  return NextResponse.rewrite(url);

  // Option 2: Return deprecation header
  // const response = await handleOldLogic();
  // response.headers.set('Deprecation', 'true');
  // response.headers.set('Sunset', '2025-06-01');
  // return response;
}
```

### 6.8 Infinite scroll z cursor pagination

```typescript
// src/hooks/useInfiniteProducts.ts
import useSWRInfinite from 'swr/infinite';
import { api } from '@/lib/api/client';

export function useInfiniteProducts(params: { status?: string; search?: string } = {}) {
  const getKey = (pageIndex: number, previousPageData: any) => {
    // First page
    if (pageIndex === 0) return ['products', params, null];

    // No more pages
    if (!previousPageData?.pagination?.has_more) return null;

    // Next page with cursor
    return ['products', params, previousPageData.pagination.next_cursor];
  };

  const { data, error, isLoading, size, setSize, isValidating } = useSWRInfinite(
    getKey,
    ([, params, cursor]) => api.list('products', { ...params, cursor })
  );

  const products = data?.flatMap(page => page.data) ?? [];
  const hasMore = data?.[data.length - 1]?.pagination?.has_more ?? false;

  return {
    products,
    isLoading,
    isLoadingMore: isValidating && size > 1,
    error,
    hasMore,
    loadMore: () => setSize(size + 1),
  };
}
```

### 6.9 Zaktualizowany roadmap

| Faza | Dni | Zadania |
|------|-----|---------|
| **1. REST API** | 5-7 | Budowa `/api/v1/*` + API client + podstawowe hooks |
| **2. MCP Server** | 3-4 | Thin wrapper nad API |
| **3. Frontend Migration P1** | 2-3 | Products pages (list, create, edit, delete) |
| **4. Frontend Migration P2** | 3-4 | Users, Coupons, Payments pages |
| **5. Frontend Migration P3** | 2-3 | Webhooks, Refunds, pozostałe |
| **6. Cleanup** | 1-2 | Usunięcie `/api/admin/*`, testy |

**Łącznie: 16-23 dni roboczych**

(Migracja frontendu może być robiona stopniowo, równolegle z innymi zadaniami)

---

## 7. Korzyści tej architektury

1. **Single Source of Truth** - jedna warstwa API
2. **Reużywalność** - to samo API dla frontendu, MCP, zewnętrznych integracji
3. **Prostota MCP** - serwer to tylko ~500 linii kodu (thin wrapper)
4. **Łatwe testowanie** - API testowalne niezależnie od MCP
5. **Dokumentacja** - OpenAPI automatycznie dokumentuje wszystko
6. **Przyszłościowość** - API keys dla zewnętrznych developerów
7. **Dogfooding** - frontend używa tego samego API co zewnętrzni developerzy

---

## 8. Referencje

- [GitHub MCP Server](https://github.com/github/github-mcp-server) - oficjalny, używa GitHub REST API
- [Atlassian MCP Server](https://github.com/atlassian/atlassian-mcp-server) - używa Jira/Confluence REST API
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP Specification](https://modelcontextprotocol.io/specification/2025-11-25)
