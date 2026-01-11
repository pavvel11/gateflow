# GateFlow - Lista Ficzerów

> **Wygenerowano**: 2026-01-06
> **Wersja**: 1.0
> **Status**: Production-ready

---

## Spis Treści

1. [Zaimplementowane Ficzery](#zaimplementowane-ficzery)
2. [Planowane Ficzery (TURBO Roadmap)](#planowane-ficzery-turbo-roadmap)
3. [Statystyki Projektu](#statystyki-projektu)

---

# Zaimplementowane Ficzery

## 1. Zarządzanie Produktami

### Podstawy Produktów
- **CRUD produktów** - Pełne tworzenie, edycja, usuwanie, duplikowanie
- **Slugi URL** - Unikalne, SEO-friendly adresy produktów
- **Status produktu** - Aktywny/Nieaktywny z kontrolą widoczności
- **Featured products** - Wyróżnianie produktów na stronie głównej
- **Opisy produktów** - Krótki + długi opis (markdown support)
- **Ikony i obrazy** - Icon URL, Image URL, Thumbnail URL

### Cennik i Promocje
- **Ceny w wielu walutach** - 26 walut (USD, EUR, PLN, GBP, JPY, CAD, AUD, etc.)
- **VAT handling** - Stawka VAT + opcja "cena zawiera VAT"
- **Sale price** - Cena promocyjna z:
  - Limitem czasowym (`sale_price_until`)
  - Limitem ilościowym (`sale_quantity_limit`)
  - Automatycznym licznikiem sprzedanych (`sale_quantity_sold`)
- **EU Omnibus Directive** - 30-dniowa historia cen, wyświetlanie najniższej ceny

### Pay What You Want (PWYW)
- **Toggle PWYW** - Włączanie trybu "zapłać ile chcesz"
- **Minimalna cena** - Limit 0.50 (wymóg Stripe)
- **Preset buttons** - Konfigurowalne przyciski z sugerowanymi kwotami
- **UI checkout** - Slider/input dla custom amount

### Dostępność Czasowa
- **Available from/until** - Okno czasowe dostępności produktu
- **Early bird pricing** - Specjalne ceny przed datą startu
- **Coming Soon badges** - Automatyczne etykiety dla produktów w przyszłości

### Dostęp do Produktu
- **Lifetime access** - Dostęp bez ograniczeń czasowych
- **Timed access** - Dostęp na X dni (`auto_grant_duration_days`)
- **Access expiry tracking** - Monitorowanie wygasających dostępów
- **Repurchase renewal** - Możliwość przedłużenia dostępu

---

## 2. Warianty Produktów (M:N)

### Grupy Wariantów
- **Variant groups** - Grupowanie produktów w warianty (np. Basic/Pro/Enterprise)
- **M:N relacja** - Jeden produkt może być w wielu grupach
- **Display order** - Kolejność wyświetlania wariantów
- **Featured variant** - Domyślnie wybrany wariant

### UI Wariantów
- **Variant selector page** - Strona wyboru wariantu przed checkout
- **Radio buttons/Dropdown** - Różne style wyboru
- **Link copying** - Kopiowanie linków do konkretnych wariantów

---

## 3. Kategorie i Tagi

### Kategorie (🏗️ Częściowo)
- **CRUD kategorii** - Pełne zarządzanie w `/dashboard/categories`
- **Hierarchia** - Parent/child categories (drzewo)
- **Slugi URL** - SEO-friendly adresy kategorii
- **M:N przypisanie** - Produkt może być w wielu kategoriach
- **Product Form** - Przypisywanie kategorii w edycji produktu

**Brakuje wykorzystania:**
- Filtrowanie na storefront
- Strony kategorii `/category/[slug]`
- Nawigacja po kategoriach
- Breadcrumbs

### Tagi (🏗️ Częściowo - tylko DB)
- **Tabele DB** - `tags`, `product_tags` (M:N)
- **Brak GUI** - Nie ma UI do zarządzania tagami
- **Brak wykorzystania** - Tagi nie są nigdzie używane

---

## 4. System Płatności

### Integracja Stripe
- **Stripe Elements** - Custom payment form (PCI DSS compliant)
- **Embedded Checkout** - Stripe checkout session
- **Payment Intent** - PaymentIntent API z idempotency
- **Stripe Configuration Wizard** - 5-krokowy wizard do konfiguracji:
  1. Welcome
  2. Mode Selection (Test/Live)
  3. Create Key (RAK - Restricted API Keys)
  4. Enter Key
  5. Success
- **Multi-mode support** - Test i Live mode osobno

### Checkout Flow
- **Guest checkout** - Zakupy bez konta
- **Magic link login** - Logowanie przez email (bez hasła)
- **Email validation** - Weryfikacja formatu + blokada disposable emails
- **Turnstile CAPTCHA** - Cloudflare protection
- **Terms acceptance** - Obowiązkowa akceptacja regulaminu

### Transakcje
- **Payment transactions table** - Pełna historia transakcji
- **Idempotency** - UNIQUE constraints na session_id i stripe_payment_intent_id
- **Race condition protection** - Optimistic locking z retries
- **Guest purchases** - Claiming zakupów po rejestracji konta

---

## 5. Kupony i Rabaty

### Typy Kuponów
- **Percentage discount** - Rabat procentowy (np. 20%)
- **Fixed amount** - Rabat kwotowy (np. 10 PLN)
- **Multi-currency support** - Fixed amount per waluta

### Ograniczenia Kuponów
- **Usage limits** - Global i per-user
- **Email whitelist** - Kupony tylko dla konkretnych emaili
- **Product whitelist** - Kupony tylko na konkretne produkty
- **Exclude order bumps** - Opcja wykluczenia bumpów z rabatu
- **Validity period** - Starts at / Expires at
- **Is public flag** - Omnibus compliance (czy kupon jest publiczny)

### Auto-Apply
- **Auto-apply coupon** - Automatyczne znalezienie kuponu dla emaila
- **URL parameter** - `?coupon=CODE` w URL

---

## 6. Order Bumps (Upsell)

### Konfiguracja
- **Main + Bump product** - Linkowanie produktów
- **Custom bump price** - Specjalna cena bumpa (lub default)
- **Bump title/description** - Dedykowane teksty marketingowe
- **Display order** - Kolejność bumpów
- **Access duration** - Osobny czas dostępu dla bumpa

### Checkout Integration
- **Bump checkbox** - Wyświetlanie w checkout
- **Two-product transaction** - Jedna transakcja, dwa produkty
- **Guest bump support** - Bump dla niezalogowanych

---

## 7. OTO System (One-Time Offers)

### Generowanie OTO
- **Post-purchase generation** - Automatyczny kupon po zakupie
- **Email binding** - Kupon tylko dla kupującego
- **Single-use** - usage_limit = 1
- **Time-limited** - Duration w minutach (default 15, max 1440)
- **Code format** - OTO-XXXXXXXX

### OTO Flow
- **Idempotency** - Jeden kupon per transakcja
- **Ownership check** - Sprawdzenie czy user już ma OTO produkt
- **Race condition protection** - UNIQUE constraint + exception handling
- **Countdown timer** - UI z odliczaniem
- **Auto-apply** - Automatyczne zastosowanie w checkout

### Admin Management
- **OTO configuration** - Source product → OTO product mapping
- **Discount settings** - Percentage/Fixed + value
- **Duration settings** - Czas ważności oferty
- **Active/Inactive toggle** - Włączanie/wyłączanie OTO

---

## 8. System Refundów

### Konfiguracja Produktu
- **is_refundable** - Czy produkt podlega zwrotowi
- **refund_period_days** - Ile dni na zwrot (np. 14, 30)

### Request Flow (Klient)
- **Request form** - Formularz z powodem zwrotu
- **My Purchases integration** - Przycisk w historii zakupów
- **Period validation** - Blokada po upływie terminu
- **Non-refundable handling** - Komunikat dla produktów bez zwrotu

### Admin Management
- **Pending requests** - Lista wniosków do rozpatrzenia
- **Approve/Reject** - Decyzja admina
- **Admin notes** - Notatki/odpowiedzi
- **Status tracking** - pending → approved/rejected → refunded
- **Stripe refund processing** - Automatyczny zwrot w Stripe

---

## 9. Waitlist (Lista Oczekujących)

### Konfiguracja
- **enable_waitlist** - Toggle per produkt
- **Inactive + waitlist = form** - Formularz dla nieaktywnych produktów
- **Inactive + no waitlist = 404** - Standardowy błąd

### Signup Flow
- **Email capture** - Zbieranie emaili
- **Terms acceptance** - Obowiązkowa zgoda
- **Turnstile CAPTCHA** - Ochrona przed botami
- **Webhook trigger** - `waitlist.signup` event

### Admin Features
- **Webhook configuration warnings** - Alert gdy brak webhooka
- **Products count** - Ile produktów ma włączony waitlist
- **Dashboard warning** - Powiadomienie o braku konfiguracji

---

## 10. Gatekeeper (Content Protection)

### Typy Ochrony
- **Page-level protection** - Cała strona wymaga dostępu
- **Element-level protection** - Konkretne elementy (klasa `.gateflow-protected`)
- **Multi-product** - Różne produkty na jednej stronie
- **Free content** - Publiczny content bez logowania

### Fallback Content
- **Custom fallback** - Własna treść dla osób bez dostępu
- **Upgrade buttons** - Przyciski do zakupu
- **Graceful degradation** - Działanie przy błędach API

### JavaScript SDK
- **gatekeeper.js** - Dynamiczny skrypt do ochrony
- **License validation** - Weryfikacja licencji GateFlow
- **Auto-detection** - Automatyczne wykrywanie chronionych elementów

---

## 11. Webhooks

### Konfiguracja
- **URL endpoint** - Adres docelowy
- **Events selection** - Wybór eventów:
  - `purchase.completed`
  - `lead.captured`
  - `waitlist.signup`
- **Secret key** - HMAC-SHA256 signature
- **Active/Inactive** - Toggle

### Delivery & Logging
- **Secure delivery** - HMAC signature w headerze
- **Webhook logs** - Historia wywołań
- **Status tracking** - success/failed/retried/archived
- **HTTP status** - Kod odpowiedzi
- **Response body** - Treść odpowiedzi
- **Duration tracking** - Czas wywołania (ms)

### Management
- **Test modal** - Testowanie webhook'a
- **Retry button** - Ponowne wysłanie
- **Logs filtering** - Filtrowanie po statusie
- **Archive functionality** - Archiwizacja logów

---

## 12. Analytics & Dashboard

### Dashboard Stats
- **Total revenue** - Suma przychodów (multi-currency)
- **Today's revenue** - Przychód z dzisiaj
- **Total orders** - Liczba zamówień
- **Active products** - Produkty aktywne
- **Active users** - Użytkownicy z dostępem

### Revenue Charts
- **Sales chart** - Wykres sprzedaży (daily aggregation)
- **Hourly breakdown** - Rozkład godzinowy
- **Product filter** - Filtrowanie po produkcie
- **Date range** - Wybór zakresu dat
- **Currency selector** - Wybór waluty wyświetlania

### Revenue Goals
- **Goal setting** - Cel przychodowy (global lub per-product)
- **Progress tracking** - Pasek postępu
- **Start date** - Data początkowa celu

### Real-time Updates
- **Supabase Realtime** - Live updates
- **Recent activity** - Ostatnie transakcje
- **Failed webhooks count** - Alert o błędach

---

## 13. Multi-Currency Support

### Konwersja Walut
- **26 walut** - USD, EUR, PLN, GBP, JPY, CAD, AUD, CHF, etc.
- **Currency providers** - ECB, ExchangeRate-API, Fixer.io
- **Encrypted API keys** - AES-256-GCM encryption
- **Auto-refresh** - Automatyczne odświeżanie kursów

### Display Modes
- **Converted view** - Wszystko w jednej walucie
- **Grouped view** - Osobno per waluta
- **Hide values toggle** - Ukrywanie kwot

---

## 14. Integracje Marketingowe

### Google Tag Manager
- **Container ID** - GTM-XXXXXXX
- **DataLayer events** - view_item, begin_checkout, purchase, etc.
- **Server-side container** - URL dla GTM Server

### Facebook Pixel
- **Pixel ID** - Identyfikator Pixela
- **Client-side tracking** - PageView, ViewContent, InitiateCheckout, Purchase
- **CAPI (Server-Side)** - Facebook Conversions API:
  - `/api/tracking/fb-capi` endpoint
  - Event deduplication via `event_id`
  - Hashed user data (email, IP)
  - Test event code support

### Google Consent Mode V2
- **Klaro integration** - Consent management
- **Cookie consent** - Blocking przed zgodą
- **Consent logging** - `consent_logs` table

### Umami Analytics
- **Website ID** - Identyfikator strony
- **Self-hosted URL** - Własna instancja Umami

### Custom Scripts
- **Script injection** - Własne skrypty
- **Head/Body placement** - Lokalizacja skryptu
- **Category tagging** - essential/analytics/marketing
- **GDPR compliance** - Blokowanie przed zgodą

---

## 15. GUS REGON Integration

### Funkcjonalność
- **NIP validation** - Weryfikacja 10-cyfrowego NIP
- **SOAP client** - Integracja z API GUS
- **Auto-fill** - Automatyczne wypełnianie danych firmy:
  - Nazwa firmy
  - Adres (ulica, numer, kod, miasto)
  - REGON

### Bezpieczeństwo
- **Encrypted API key** - AES-256-GCM
- **Rate limiting** - 5 req/min
- **CORS protection** - Origin/referer validation

---

## 16. Branding & Whitelabel

### Customization
- **Logo URL** - Własne logo (Supabase Storage upload)
- **Colors** - Primary, Secondary, Accent
- **Font family** - Inter, Roboto, Montserrat, Poppins, Playfair Display, System
- **Shop name** - Nazwa sklepu

### Preview
- **Real-time preview** - Podgląd zmian na żywo
- **Reset to defaults** - Przywracanie domyślnych

---

## 17. Legal & Compliance

### Dokumenty Prawne
- **Terms of Service URL** - Link do regulaminu
- **Privacy Policy URL** - Link do polityki prywatności
- **GDPR settings** - Ustawienia RODO

### EU Omnibus Directive
- **30-day price history** - Automatyczne śledzenie cen
- **Lowest price display** - Wyświetlanie najniższej ceny
- **Per-product exempt** - Wyłączenie dla konkretnych produktów
- **Global toggle** - Włączanie/wyłączanie globalnie

### Consent Management
- **Consent logging** - `consent_logs` table
- **Anonymous ID** - Identyfikator sesji
- **IP tracking** - Adres IP zgody
- **Consent version** - Wersja regulaminu

---

## 18. User Management

### Profile
- **Full name** - Imię i nazwisko
- **Company info** - Nazwa firmy, NIP
- **Address** - Pełny adres (ulica, miasto, kod, kraj)
- **Preferences** - Język, strefa czasowa

### Access Control
- **User product access** - Tabela dostępów
- **Grant/Revoke** - Przyznawanie/odbieranie
- **Temporal access** - Dostęp czasowy z expiry date
- **Admin override** - Admin może wszystko

### Admin Panel
- **Users list** - Lista z paginacją
- **Search & filter** - Wyszukiwanie po emailu
- **User details modal** - Szczegóły użytkownika
- **Access management modal** - Zarządzanie dostępami

---

## 19. Security

### Rate Limiting
- **Server-side only** - Bez client headers (bezpieczne)
- **Multi-layer** - Connection + JWT + time buckets
- **Per-function limits** - Różne limity per endpoint
- **Application rate limits** - Dla Next.js routes

### Encryption
- **AES-256-GCM** - API keys (Stripe, GUS, Currency)
- **IV + Tag** - Pełne szyfrowanie

### Authentication
- **Supabase Auth** - Email/password + OAuth
- **Magic links** - Passwordless login
- **First user = admin** - Automatyczna rola

### RLS Policies
- **Row Level Security** - Izolacja danych
- **Admin policies** - Pełny dostęp dla adminów
- **User policies** - Tylko własne dane
- **Public policies** - Publiczne produkty

### Audit Logging
- **audit_log table** - Wszystkie zmiany
- **admin_actions table** - Akcje adminów
- **Automatic triggers** - Bez manualnego logowania
- **CRITICAL/WARNING alerts** - Monitoring

---

## 20. REST API v1

### Endpointy
- **Products** - CRUD, OTO configuration, filters, pagination
- **Users** - Lista, szczegóły, wyszukiwanie po email
- **User Access** - Grant, revoke, extend access
- **Payments** - Lista, szczegóły, refunds, export CSV, stats
- **Coupons** - CRUD, stats, deactivation
- **Webhooks** - CRUD, logs, test, retry
- **Analytics** - Dashboard, revenue, top products
- **Refund Requests** - Lista, approve/reject
- **Variant Groups** - CRUD dla grup wariantów
- **Order Bumps** - CRUD dla order bumpów
- **System** - Health check, status

### Dokumentacja OpenAPI
- **Swagger UI** - Interaktywna dokumentacja pod `/api/v1/docs`
- **OpenAPI 3.1 spec** - JSON spec pod `/api/v1/docs/openapi.json`
- **Zod schemas** - Type-safe walidacja i generowanie spec

### Autentykacja
- **API Keys** - Format `gf_live_xxx` / `gf_test_xxx`
- **Bearer token** - `Authorization: Bearer gf_live_xxx`
- **X-API-Key header** - Alternatywna metoda
- **Scopes** - Granularne uprawnienia (`products:read`, `users:write`, `*`)
- **Rate limiting** - Per-key limits (default 60/min)

### API Keys Management
- **Create** - Generowanie klucza (pokazany tylko raz!)
- **List** - Lista kluczy (bez wartości)
- **Update** - Zmiana nazwy, scopów, rate limit
- **Rotate** - Rotacja z grace period
- **Revoke** - Dezaktywacja z powodem (audit trail)

### Bezpieczeństwo API Keys
- **SHA-256 hashing** - Klucze przechowywane jako hash
- **Session-only management** - API keys nie mogą zarządzać sobą
- **Audit logging** - `last_used_at`, `usage_count`, `last_used_ip`
- **Expiration** - Opcjonalna data wygaśnięcia

### Pagination
- **Cursor-based** - Wydajna paginacja dla dużych zbiorów
- **Offset-based** - Wsparcie dla legacy (deprecated)
- **Consistent response** - `{ data, pagination: { cursor, has_more } }`

---

## 21. MCP Server (Model Context Protocol)

### Architektura
- **Thin wrapper** - Cienka warstwa nad REST API v1
- **stdio transport** - Komunikacja przez stdin/stdout
- **Claude Desktop** - Integracja z Claude Desktop

### Tools (45 narzędzi)
- **Products** - 8 tools (list, get, create, update, delete, toggle, duplicate, stats)
- **Users** - 8 tools (list, get, search, grant_access, revoke_access, extend_access, bulk_grant, purchases)
- **Payments** - 7 tools (list, get, search, refund, export, failed, stats)
- **Coupons** - 7 tools (list, get, create, update, delete, stats, deactivate)
- **Analytics** - 8 tools (dashboard, revenue, by_product, trends, top_products, conversion, refund_stats, compare)
- **Webhooks** - 5 tools (list, create, update, delete, logs)
- **System** - 2 tools (health, api_usage)

### Resources (4 zasoby)
- `gateflow://dashboard` - Dane dashboard (5min refresh)
- `gateflow://products/active` - Aktywne produkty (1min refresh)
- `gateflow://alerts` - Alerty (pending refunds, failed webhooks)
- `gateflow://recent-sales` - Ostatnie sprzedaże (1min refresh)

### Prompts (6 promptów)
- `weekly-report` - Tygodniowe podsumowanie sprzedaży
- `product-analysis` - Analiza produktu
- `revenue-forecast` - Prognoza przychodów
- `user-cohort-analysis` - Analiza kohort użytkowników
- `coupon-effectiveness` - Efektywność kuponów
- `refund-analysis` - Analiza zwrotów

### Konfiguracja Claude Desktop
```json
{
  "mcpServers": {
    "gateflow": {
      "command": "npx",
      "args": ["tsx", "/path/to/mcp-server/src/index.ts"],
      "env": {
        "GATEFLOW_API_KEY": "gf_live_xxx...",
        "GATEFLOW_API_URL": "https://app.example.com"
      }
    }
  }
}
```

---

## 22. Bruno API Collection

### Kolekcja Bruno
- **Folder-based** - Kolekcja w `/bruno/` directory
- **Environment variables** - `BASE_URL`, `API_KEY`
- **All v1 endpoints** - Products, Users, Coupons, Webhooks, Analytics, System

### Przykładowe requesty
- `GET /api/v1/products` - Lista produktów
- `POST /api/v1/api-keys` - Tworzenie klucza API
- `GET /api/v1/analytics/dashboard` - Dashboard stats

### Konfiguracja
```
bruno/environments/local.bru.example → local.bru
```

---

## 23. Content Delivery

### Typy Dostarczania
- **Digital content** - Osadzona treść
- **File download** - Pliki do pobrania
- **Redirect** - Przekierowanie na zewnętrzny URL
- **Video embed** - Osadzone video

### Video Features
- **Bunny.net support** - Streaming video
- **Progress tracking** - `video_progress` table
- **Event tracking** - play/pause/seek/complete
- **Resume position** - Pamiętanie pozycji

---

## 24. Storefront (Frontend)

### Landing Page
- **Smart scenarios** - 4 warianty (admin/guest × z/bez produktów)
- **Featured products** - Wyróżnione produkty na górze
- **Product grid** - Siatka wszystkich produktów
- **Temporal badges** - Coming Soon, Limited Time, Sale

### Product Pages
- **Product showcase** - Opis, cena, obrazy
- **Checkout button** - Przycisk zakupu
- **Variant selector** - Wybór wariantu
- **Order bump display** - Wyświetlanie bumpów

### Customer Area
- **My Purchases** - Historia zakupów
- **My Products** - Dostępne produkty
- **Profile** - Edycja profilu
- **Refund requests** - Wnioski o zwrot

---

## 25. Internationalization

### Języki
- **English (en)** - Pełne wsparcie
- **Polish (pl)** - Pełne wsparcie

### Features
- **next-intl** - Framework i18n
- **URL-based locale** - `/en/...`, `/pl/...`
- **Language switcher** - Floating button
- **Translations** - Wszystkie UI strings

---

## 26. Testing

### E2E Tests (Playwright)
- **899 testów E2E** - Kompleksowe pokrycie
- **82 testy jednostkowe MCP** - Vitest
- **53 pliki testowe** - Modularna struktura

### Testowane Obszary
- Authentication flow
- Product management
- Payment processing
- Coupons & discounts
- Order bumps
- OTO system
- Refunds
- Waitlist
- Gatekeeper
- Integrations
- Branding
- Variants
- PWYW
- Omnibus
- GUS API

---

# Planowane Ficzery (TURBO Roadmap)

## Wysoki Priorytet

### 1. Upstash Redis Rate Limiting
- **Status**: Planned
- **Szacowany czas**: 2-3h
- **Opis**: Upgrade z in-memory na serverless Redis dla skalowalności w Vercel/Lambda

### 2. GTM Integration Phase 2
- **Status**: Planned
- **Opis**: Google OAuth App + one-click setup z automatycznym tworzeniem Container i Tags

### 3. Real-time Social Proof
- **Status**: Planned
- **Features**:
  - "Just Bought" popup (anonymizowana notyfikacja)
  - Aggregate Activity (X osób kupiło w 24h)
  - Live Viewer Count
  - Per-product configuration

### 4. Transactional Emails & Logs
- **Status**: Planned
- **Features**:
  - EmailLabs / AWS SES
  - `email_logs` table (Sent, Delivered, Bounced, Opened)
  - Admin UI do przeglądania
  - React Email / MJML templates

### 5. Follow-up Email Sequences
- **Status**: Planned
- **Features**:
  - Per-product email automation
  - Drag-and-drop Email Sequence Builder
  - Dynamic variables
  - Triggers: purchase, free download, access granted
  - Types: Welcome, Educational, Upsell, Re-engagement
  - Analytics: open rates, click rates, conversion rates

### 6. Invoicing Integration
- **Status**: Planned
- **Providers**: Fakturownia, iFirma
- **Future**: KSeF (Krajowy System e-Faktur) - 2-4 months

### 7. UTM & Affiliate Tracking
- **Status**: Planned
- **Szacowany czas**: 4-6h
- **Features**:
  - UTM capture (source, medium, campaign, term, content)
  - Affiliate ID tracking (`?ref=john123`)
  - `purchase_attribution` table
  - Revenue by UTM Source/Campaign
  - Affiliate performance analytics

---

## Średni Priorytet

### 8. Two-Sided Affiliate Program
- **Status**: Idea
- **Szacowany czas**: 2-4 weeks
- **Features**:
  - Self-service affiliate signup
  - Commission structures (percentage, fixed, tiered, recurring)
  - Buyer discount (two-sided benefit)
  - Payout management (PayPal, Bank, Store Credit)
  - Anti-fraud (self-referral prevention, IP detection)

### 9. AI Landing Page Generator
- **Status**: Planned
- **Features**:
  - One-click generation
  - AI copywriting (OpenAI/Anthropic)
  - Design automation
  - Checkout integration

### 10. Automated Review Collection
- **Status**: Planned
- **Features**:
  - Auto-request emails X days after purchase
  - Rich media (photos/videos)
  - Verified buyer badge
  - Checkout widget z top reviews

### 11. Privacy-First Cart Recovery
- **Status**: Planned
- **Features**:
  - Real-time email capture
  - GDPR compliant
  - Abandonment detection (30 min)
  - Automated follow-up
  - Dynamic coupon code

### 12. Stripe Subscriptions
- **Status**: Planned
- **Features**:
  - Stripe Billing integration
  - Subscription lifecycle events
  - "My Subscription" portal
  - Dunning management

### 13. Polish Payment Gateways
- **Status**: Planned
- **Providers**: PayU, Przelewy24, Tpay
- **Features**:
  - Payment generation
  - Webhooks
  - Refunds

### 14. Payment Balancer
- **Status**: Planned
- **Features**:
  - Failover switching
  - Smart routing by currency/fees
  - Zero-downtime switching

### 15. Advanced Video Player
- **Status**: Planned (Presto Player inspired)
- **Features**:
  - Custom styling (colors, buttons, logo)
  - Controls (speed, PiP, Sticky)
  - Overlays & CTAs at timestamps
  - Remember position, chapters
  - Protection (prevent downloads)
  - Analytics (watch %, heatmaps)

### 16. Self-Service Account Deletion
- **Status**: Planned
- **GDPR requirement**
- **Features**:
  - User deletes own account
  - Stripe subscriptions auto-cancel
  - Anonymize/soft delete
  - Session invalidation

---

## Niski Priorytet / Idee

### 17. Anonymous Analytics Collection
- Opt-in usage statistics
- No PII stored
- Feature adoption tracking

### 18. In-App File Hosting
- Supabase Storage, AWS S3, Cloudinary, Bunny CDN
- Upload UI
- Signed URLs, watermarking

### 19. Mux Video Integration
- Alternative video hosting

### 20. Related Products
- Cross-selling sections

### 21. Product Bundles
- Group multiple products
- Bundle discounts

### 22. Video Course Structure
- Chapters & Lessons
- Progress tracking
- Sequential unlocking
- Certificates
- Quiz integration

---

# Statystyki Projektu

## Baza Danych
| Metryka | Wartość |
|---------|---------|
| Migracje SQL | 6 |
| Tabele | 25+ |
| RPC Functions | 40+ |
| Triggers | 20+ |
| RLS Policies | 50+ |
| Indexes | 30+ |

## API
| Metryka | Wartość |
|---------|---------|
| API Routes | 120+ |
| REST API v1 endpoints | 50+ |
| Admin endpoints | 20+ |
| Public endpoints | 15+ |
| Webhook events | 3 |
| OpenAPI spec | ✓ (Swagger UI) |

## Frontend
| Metryka | Wartość |
|---------|---------|
| React Components | 100+ |
| Pages | 30+ |
| Languages | 2 (EN, PL) |
| UI Libraries | Tailwind CSS |

## Testing
| Metryka | Wartość |
|---------|---------|
| E2E Tests | 899+ |
| Unit Tests | 100+ |
| API v1 Tests | 232 |
| Test Files | 60+ |
| Test Framework | Playwright + Vitest |
| Pass Rate | 100% |

## MCP Server
| Metryka | Wartość |
|---------|---------|
| Tools | 45 |
| Resources | 4 |
| Prompts | 6 |
| Transport | stdio |

## Tech Stack
- **Frontend**: Next.js 16, TypeScript 5.9, Tailwind CSS 4
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **Payments**: Stripe (Elements, Checkout, Billing)
- **API**: REST API v1 + OpenAPI 3.1 + Zod schemas
- **AI Integration**: MCP Server for Claude Desktop
- **Security**: Cloudflare Turnstile, AES-256-GCM, API Keys
- **Testing**: Playwright + Vitest
- **i18n**: next-intl (EN, PL)

---

> **Ostatnia aktualizacja**: 2026-01-11
> **Autor**: Claude Code
