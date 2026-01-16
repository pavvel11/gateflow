# Payment Method Configuration - Test Plan (ISTQB)

## Test Strategy Overview

**Feature**: Global Payment Method Configuration
**Risk Level**: HIGH (Critical business functionality - affects all payments)
**Testing Approach**: Risk-based, comprehensive coverage across all test levels

### Test Levels (ISTQB)

1. **Unit Testing** - Individual functions and utilities
2. **Integration Testing** - Module interactions (Server Actions + Stripe API)
3. **Component Testing** - React components in isolation
4. **API Testing** - REST endpoints
5. **System Testing (E2E)** - Complete user flows
6. **Acceptance Testing** - Business requirements validation
7. **Non-functional Testing** - Performance, Security, Usability

---

## 1. UNIT TESTS

**Tools**: Vitest
**Target Coverage**: >90% statement, >85% branch

### 1.1 Type Validation & Helper Functions (`/types/payment-config.ts`)

**Test Suite**: `payment-config-types.test.ts`

| Test Case ID | Test Case | Input | Expected Output | Technique |
|--------------|-----------|-------|-----------------|-----------|
| UT-TYPE-001 | isPaymentMethodValidForCurrency - No restrictions | method: {type: 'card', currency_restrictions: []}, currency: 'USD' | true | Equivalence Partitioning (EP) |
| UT-TYPE-002 | isPaymentMethodValidForCurrency - Valid restriction | method: {type: 'blik', currency_restrictions: ['PLN']}, currency: 'PLN' | true | EP - Valid partition |
| UT-TYPE-003 | isPaymentMethodValidForCurrency - Invalid restriction | method: {type: 'blik', currency_restrictions: ['PLN']}, currency: 'USD' | false | EP - Invalid partition |
| UT-TYPE-004 | isPaymentMethodValidForCurrency - Case insensitivity | method: {type: 'card', currency_restrictions: ['usd']}, currency: 'USD' | true | Boundary Value Analysis (BVA) |
| UT-TYPE-005 | filterPaymentMethodsByCurrency - Empty array | methods: [], currency: 'PLN' | [] | BVA - Lower bound |
| UT-TYPE-006 | filterPaymentMethodsByCurrency - All match | methods: [{card}, {blik}], currency: 'PLN' (both support PLN) | [{card}, {blik}] | EP - Valid |
| UT-TYPE-007 | filterPaymentMethodsByCurrency - Partial match | methods: [{card}, {blik: PLN only}], currency: 'USD' | [{card}] | EP - Mixed |
| UT-TYPE-008 | getOrderedPaymentMethods - Correct sorting | Unordered methods | Sorted by display_order | Algorithm validation |
| UT-TYPE-009 | isValidStripePMCId - Valid format | 'pmc_1234567890' | true | EP - Valid |
| UT-TYPE-010 | isValidStripePMCId - Invalid prefix | 'invalid_123' | false | EP - Invalid |
| UT-TYPE-011 | isValidStripePMCId - Null input | null | false | BVA - Null case |
| UT-TYPE-012 | isValidStripePMCId - Empty string | '' | false | BVA - Empty |
| UT-TYPE-013 | isValidStripePMCId - Too short | 'pmc_' | false | BVA - Min length |

### 1.2 Stripe API Helpers (`/lib/stripe/payment-method-configs.ts`)

**Test Suite**: `payment-method-configs.test.ts`

| Test Case ID | Test Case | Input | Expected Output | Technique |
|--------------|-----------|-------|-----------------|-----------|
| UT-STRIPE-001 | extractEnabledPaymentMethods - All enabled | PMC with all methods enabled | ['card', 'blik', 'p24', ...] | EP - Valid |
| UT-STRIPE-002 | extractEnabledPaymentMethods - None enabled | PMC with all disabled | [] | BVA - Empty result |
| UT-STRIPE-003 | extractEnabledPaymentMethods - Mixed enabled | PMC with card, blik enabled, rest disabled | ['card', 'blik'] | EP - Partial |
| UT-STRIPE-004 | getPaymentMethodInfo - Valid type | 'blik' | {type: 'blik', name: 'BLIK', ...} | EP - Valid |
| UT-STRIPE-005 | getPaymentMethodInfo - Invalid type | 'invalid_type' | null | EP - Invalid |
| UT-STRIPE-006 | isPaymentMethodSupportedForCurrency - Universal method | 'card', 'USD' | true | EP - Universal |
| UT-STRIPE-007 | isPaymentMethodSupportedForCurrency - Currency match | 'blik', 'PLN' | true | EP - Valid |
| UT-STRIPE-008 | isPaymentMethodSupportedForCurrency - Currency mismatch | 'blik', 'USD' | false | EP - Invalid |
| UT-STRIPE-009 | isPaymentMethodSupportedForCurrency - Case insensitive | 'blik', 'pln' | true | BVA - Case |
| UT-STRIPE-010 | filterPaymentMethodTypesByCurrency - All match | ['card', 'blik'], 'PLN' | ['card', 'blik'] | EP - All valid |
| UT-STRIPE-011 | filterPaymentMethodTypesByCurrency - Partial | ['card', 'blik', 'sepa_debit'], 'PLN' | ['card', 'blik'] | EP - Mixed |
| UT-STRIPE-012 | isValidPaymentMethodType - Valid | 'card' | true | EP - Valid |
| UT-STRIPE-013 | isValidPaymentMethodType - Invalid | 'fake_method' | false | EP - Invalid |

### 1.3 Server Actions Helpers (`/lib/actions/payment-config.ts`)

**Test Suite**: `payment-config-helpers.test.ts`

| Test Case ID | Test Case | Input | Expected Output | Technique |
|--------------|-----------|-------|-----------------|-----------|
| UT-ACTION-001 | getEffectivePaymentMethodOrder - Currency override exists | config with PLN override, currency='PLN' | PLN-specific order | Decision Table |
| UT-ACTION-002 | getEffectivePaymentMethodOrder - No override | config without PLN override, currency='PLN' | Global order | Decision Table |
| UT-ACTION-003 | getEffectivePaymentMethodOrder - Empty overrides | config.currency_overrides={}, currency='PLN' | Global order | BVA - Empty |
| UT-ACTION-004 | getEnabledPaymentMethodsForCurrency - Custom mode | custom config with 3 enabled methods | Filtered + sorted array | EP - Valid |
| UT-ACTION-005 | getEnabledPaymentMethodsForCurrency - Non-custom mode | automatic mode | [] (empty) | Decision Table |
| UT-ACTION-006 | getEnabledPaymentMethodsForCurrency - All disabled | custom with 0 enabled | [] | BVA - Zero |
| UT-ACTION-007 | getEnabledPaymentMethodsForCurrency - Currency filter | BLIK (PLN only), currency='USD' | [] (filtered out) | EP - Filter |

---

## 2. INTEGRATION TESTS

**Tools**: Vitest + Supabase Test Client
**Focus**: Module interactions, database operations, external API calls

### 2.1 Server Actions + Database

**Test Suite**: `payment-config-actions.integration.test.ts`

| Test Case ID | Test Case | Setup | Action | Expected Result | Technique |
|--------------|-----------|-------|--------|-----------------|-----------|
| IT-DB-001 | getPaymentMethodConfig - Success | DB with config row | Call getPaymentMethodConfig() | Returns config object | Happy path |
| IT-DB-002 | getPaymentMethodConfig - No config | Empty DB | Call getPaymentMethodConfig() | Returns null | Error path |
| IT-DB-003 | updatePaymentMethodConfig - Automatic mode | Admin user, valid input | Update to automatic | Success, DB updated | State Transition |
| IT-DB-004 | updatePaymentMethodConfig - Stripe preset mode | Admin user, valid PMC ID | Update to stripe_preset | Success, DB updated | State Transition |
| IT-DB-005 | updatePaymentMethodConfig - Custom mode | Admin user, 3 methods enabled | Update to custom | Success, methods saved | State Transition |
| IT-DB-006 | updatePaymentMethodConfig - Unauthorized | Non-admin user | Attempt update | Error 401, DB unchanged | Security test |
| IT-DB-007 | updatePaymentMethodConfig - Invalid PMC ID | Admin, invalid 'pmc_fake' | Attempt update | Error, Stripe validation fails | Negative test |
| IT-DB-008 | updatePaymentMethodConfig - No methods in custom | Admin, custom mode, 0 enabled | Attempt update | Error, validation fails | BVA - Zero |
| IT-DB-009 | updatePaymentMethodConfig - Mode transition | Automatic → Custom | Update | Old data cleared, new saved | State Transition |
| IT-DB-010 | getStripePaymentMethodConfigsCached - Fresh cache | Cache < 1h old | Call function | Returns cached, no API call | Cache hit |
| IT-DB-011 | getStripePaymentMethodConfigsCached - Stale cache | Cache > 1h old | Call function | Fetches new, updates cache | Cache miss |
| IT-DB-012 | getStripePaymentMethodConfigsCached - Force refresh | forceRefresh=true | Call function | Fetches new, ignores cache | Force update |
| IT-DB-013 | refreshStripePaymentMethodConfigs - Success | Admin user | Refresh | Cache invalidated, new data | Happy path |
| IT-DB-014 | refreshStripePaymentMethodConfigs - Unauthorized | Non-admin | Attempt refresh | Error 401 | Security test |

### 2.2 Stripe API Integration (Mocked)

**Test Suite**: `stripe-api-integration.test.ts`

| Test Case ID | Test Case | Mock Response | Expected Behavior | Technique |
|--------------|-----------|---------------|-------------------|-----------|
| IT-STRIPE-001 | fetchStripePaymentMethodConfigs - Success | Valid PMC list | Returns {success: true, data: [...]} | Happy path |
| IT-STRIPE-002 | fetchStripePaymentMethodConfigs - Empty list | Empty array | Returns {success: true, data: []} | BVA - Empty |
| IT-STRIPE-003 | fetchStripePaymentMethodConfigs - API error | Stripe throws error | Returns {success: false, error: '...'} | Error handling |
| IT-STRIPE-004 | fetchStripePaymentMethodConfigs - Network timeout | Timeout | Returns {success: false, error: 'timeout'} | Non-functional |
| IT-STRIPE-005 | fetchStripePaymentMethodConfig - Valid ID | PMC object | Returns {success: true, data: {...}} | Happy path |
| IT-STRIPE-006 | fetchStripePaymentMethodConfig - Invalid ID | 404 error | Returns {success: false, error: 'not found'} | Negative test |
| IT-STRIPE-007 | fetchStripePaymentMethodConfig - Stripe not configured | No API key | Returns {success: false, error: 'not configured'} | Configuration error |

### 2.3 Payment Intent Integration

**Test Suite**: `create-payment-intent.integration.test.ts`

| Test Case ID | Test Case | Config Mode | Product Currency | Expected PI Params | Technique |
|--------------|-----------|-------------|------------------|---------------------|-----------|
| IT-PI-001 | PaymentIntent - Automatic mode | automatic | PLN | automatic_payment_methods: {enabled: true} | Decision Table |
| IT-PI-002 | PaymentIntent - Stripe preset mode | stripe_preset, pmc_123 | EUR | payment_method_configuration: 'pmc_123' | Decision Table |
| IT-PI-003 | PaymentIntent - Custom mode | custom, [card, blik] | PLN | payment_method_types: ['card', 'blik'] | Decision Table |
| IT-PI-004 | PaymentIntent - Custom + currency filter | custom, [blik, card] | USD | payment_method_types: ['card'] (blik filtered) | Filter logic |
| IT-PI-005 | PaymentIntent - No config (fallback) | null | PLN | automatic_payment_methods: {enabled: true} | Fallback path |
| IT-PI-006 | PaymentIntent - Link enabled | Link toggle on | Any | payment_method_options.link.setup_future_usage: 'on_session' | Config propagation |
| IT-PI-007 | PaymentIntent - Link disabled | Link toggle off | Any | No payment_method_options.link | Config propagation |

---

## 3. COMPONENT TESTS

**Tools**: Vitest + React Testing Library
**Focus**: UI logic, user interactions, state management

### 3.1 PaymentMethodSettings Component

**Test Suite**: `PaymentMethodSettings.test.tsx`

| Test Case ID | Test Case | User Action | Expected UI State | Technique |
|--------------|-----------|-------------|-------------------|-----------|
| CT-UI-001 | Component renders successfully | Mount component | Shows heading, mode selector, buttons | Smoke test |
| CT-UI-002 | Loading state displays | loading=true | Shows "Loading..." | State test |
| CT-UI-003 | Mode selector - Automatic selected | Click automatic radio | Radio checked, description visible | User interaction |
| CT-UI-004 | Mode selector - Stripe preset selected | Click stripe_preset radio | PMC selector appears | Conditional rendering |
| CT-UI-005 | Mode selector - Custom selected | Click custom radio | Payment methods list appears | Conditional rendering |
| CT-UI-006 | Stripe PMC dropdown - Options render | Load PMCs | Dropdown populated with options | Data binding |
| CT-UI-007 | Stripe PMC dropdown - Selection | Select PMC from dropdown | stripePmcId state updated | State management |
| CT-UI-008 | Refresh button - Click | Click refresh icon | refreshing=true, spinner animates | Loading state |
| CT-UI-009 | Custom methods - Toggle checkbox | Click BLIK checkbox | enabled state flips | State mutation |
| CT-UI-010 | Custom methods - Multiple toggles | Check card, blik, p24 | All 3 enabled in state | Multiple selections |
| CT-UI-011 | Payment order updates on toggle | Enable card → blik → p24 | Order array: ['card', 'blik', 'p24'] | Side effect |
| CT-UI-012 | Drag & drop - Start drag | Drag BLIK item | draggedIndex set | Event handling |
| CT-UI-013 | Drag & drop - Drop item | Drag BLIK from 0 to 2 | Order reordered | Complex interaction |
| CT-UI-014 | Drag & drop - End drag | Drop item | draggedIndex reset to null | Cleanup |
| CT-UI-015 | Express Checkout - Master toggle | Check master toggle | Sub-options appear | Conditional rendering |
| CT-UI-016 | Express Checkout - Sub-toggle | Check Apple Pay | enableApplePay=true | State update |
| CT-UI-017 | Save button - Click | Click Save | Calls updatePaymentMethodConfig() | Action dispatch |
| CT-UI-018 | Save button - Loading state | saving=true | Button disabled, shows spinner | Loading state |
| CT-UI-019 | Reset button - Click | Click Reset | Calls loadConfig(), shows toast | Action dispatch |
| CT-UI-020 | Validation - Custom no methods | Custom mode, 0 enabled, click Save | Shows error toast | Client-side validation |
| CT-UI-021 | Validation - Stripe preset no PMC | Stripe preset, no selection, click Save | Shows error toast | Client-side validation |

---

## 4. API TESTS

**Tools**: Vitest + Supertest (or direct Next.js API testing)
**Focus**: HTTP endpoints, request/response validation

### 4.1 create-payment-intent Route

**Test Suite**: `create-payment-intent-api.test.ts`

| Test Case ID | Test Case | Request Body | Config Mode | Expected Response | Status | Technique |
|--------------|-----------|--------------|-------------|-------------------|--------|-----------|
| API-PI-001 | Valid request - Automatic mode | Valid product, no coupon | automatic | {clientSecret, paymentIntentId} | 200 | Happy path |
| API-PI-002 | Valid request - Stripe preset | Valid product | stripe_preset, pmc_123 | {clientSecret, ...} | 200 | Happy path |
| API-PI-003 | Valid request - Custom mode | Valid product | custom, [card, blik] | {clientSecret, ...} | 200 | Happy path |
| API-PI-004 | Missing product ID | {productId: null} | Any | {error: 'Product ID required'} | 400 | Negative test |
| API-PI-005 | Invalid product ID | {productId: 'fake'} | Any | {error: 'Product not found'} | 404 | Negative test |
| API-PI-006 | User already has access | Product user owns | Any | {error: 'Already have access'} | 400 | Business logic |
| API-PI-007 | PWYW - Zero amount | {customAmount: 0} | Any | {error: 'Must be > 0'} | 400 | BVA - Zero |
| API-PI-008 | PWYW - Negative amount | {customAmount: -10} | Any | {error: 'Must be > 0'} | 400 | BVA - Negative |
| API-PI-009 | PWYW - Below minimum | {customAmount: 0.01}, min=1 | Any | {error: 'Must be >= 1'} | 400 | BVA - Below min |
| API-PI-010 | PWYW - Above maximum | {customAmount: 1000000} | Any | {error: 'Must be <= 999999.99'} | 400 | BVA - Above max |
| API-PI-011 | Rate limit exceeded | 61st request in 5min | Any | {error: 'Too many attempts'} | 429 | Non-functional |
| API-PI-012 | Config fallback | No config in DB | N/A | Uses automatic_payment_methods | 200 | Fallback logic |

---

## 5. E2E TESTS (System Testing)

**Tools**: Playwright
**Focus**: Complete user journeys, cross-browser, real data

### 5.1 Admin Configuration Flow

**Test Suite**: `payment-config-admin.e2e.spec.ts`

| Test Case ID | Test Case | Precondition | Steps | Expected Result | Browsers |
|--------------|-----------|--------------|-------|-----------------|----------|
| E2E-ADMIN-001 | Complete automatic mode setup | Logged as admin | 1. Go to /dashboard/settings<br>2. Select automatic<br>3. Save | Success toast, config saved | Chrome, Firefox, Safari |
| E2E-ADMIN-002 | Complete Stripe preset setup | Logged as admin, Stripe connected | 1. Go to settings<br>2. Select stripe_preset<br>3. Choose PMC<br>4. Save | Success toast, config saved | Chrome |
| E2E-ADMIN-003 | Complete custom mode setup | Logged as admin | 1. Select custom<br>2. Enable card, blik, p24<br>3. Drag blik to top<br>4. Save | Success toast, order: [blik, card, p24] | Chrome |
| E2E-ADMIN-004 | Refresh Stripe PMCs | Logged as admin, stripe_preset mode | 1. Click refresh button<br>2. Wait for spinner | Spinner shows, list updates | Chrome |
| E2E-ADMIN-005 | Express Checkout configuration | Logged as admin | 1. Enable Express Checkout<br>2. Disable Apple Pay<br>3. Save | Config saved with apple_pay=false | Chrome |
| E2E-ADMIN-006 | Mode transition automatic → custom | Logged as admin, current: automatic | 1. Switch to custom<br>2. Enable methods<br>3. Save | Old config cleared, new saved | Chrome |
| E2E-ADMIN-007 | Mode transition custom → automatic | Logged as admin, current: custom | 1. Switch to automatic<br>2. Save | Custom methods cleared | Chrome |
| E2E-ADMIN-008 | Reset configuration | Logged as admin, unsaved changes | 1. Change mode<br>2. Click Reset | Config reverted to saved state | Chrome |
| E2E-ADMIN-009 | Validation error - Custom no methods | Logged as admin | 1. Select custom<br>2. Uncheck all methods<br>3. Click Save | Error toast, not saved | Chrome |
| E2E-ADMIN-010 | Validation error - Stripe no PMC | Logged as admin | 1. Select stripe_preset<br>2. Don't select PMC<br>3. Save | Error toast, not saved | Chrome |
| E2E-ADMIN-011 | Unauthorized access attempt | Logged as non-admin | 1. Try to access /dashboard/settings | Redirected to login or 403 | Chrome |

### 5.2 Checkout Payment Method Display

**Test Suite**: `payment-methods-checkout.e2e.spec.ts`

| Test Case ID | Test Case | Config Setup | Product | Steps | Expected Checkout UI | Browsers |
|--------------|-----------|--------------|---------|-------|----------------------|----------|
| E2E-CHECKOUT-001 | Automatic mode - PLN product | automatic | PLN product | 1. Go to checkout | PaymentElement shows all PLN methods | Chrome |
| E2E-CHECKOUT-002 | Automatic mode - USD product | automatic | USD product | 1. Go to checkout | PaymentElement shows all USD methods | Chrome |
| E2E-CHECKOUT-003 | Stripe preset - Custom PMC | stripe_preset, pmc with card+blik | PLN product | 1. Go to checkout | Only card and blik visible | Chrome |
| E2E-CHECKOUT-004 | Custom mode - PLN methods | custom, [blik, p24, card] | PLN product | 1. Go to checkout | PaymentElement shows blik, p24, card | Chrome |
| E2E-CHECKOUT-005 | Custom mode - Currency filter | custom, [blik, card] | USD product | 1. Go to checkout | Only card visible (blik filtered) | Chrome |
| E2E-CHECKOUT-006 | Payment method order - BLIK first | custom, order: [blik, card, p24] | PLN product | 1. Go to checkout | BLIK tab is first/default | Chrome |
| E2E-CHECKOUT-007 | Payment method order - Card first | custom, order: [card, blik] | PLN product | 1. Go to checkout | Card tab is first | Chrome |
| E2E-CHECKOUT-008 | Express Checkout - All enabled | Express: all on | USD product | 1. Go to checkout | Apple Pay, Google Pay, Link buttons visible | Chrome, Safari |
| E2E-CHECKOUT-009 | Express Checkout - Link only | Express: Link on, others off | USD product | 1. Go to checkout | Only Link button visible | Chrome |
| E2E-CHECKOUT-010 | Express Checkout - All disabled | Express: off | USD product | 1. Go to checkout | No express checkout section | Chrome |
| E2E-CHECKOUT-011 | Config fallback - No config | DB: no config row | Any product | 1. Go to checkout | automatic_payment_methods used | Chrome |
| E2E-CHECKOUT-012 | Complete payment - Custom config | custom, [card] | PLN product | 1. Fill form<br>2. Pay with card<br>3. Complete | Payment success | Chrome |

---

## 6. DATABASE TESTS

**Tools**: Vitest + Supabase Test Client
**Focus**: RLS policies, triggers, constraints

### 6.1 RLS Policies

**Test Suite**: `payment-config-rls.test.ts`

| Test Case ID | Test Case | User Role | Action | Expected Result | Technique |
|--------------|-----------|-----------|--------|-----------------|-----------|
| DB-RLS-001 | Admin can SELECT | Admin | SELECT * FROM payment_method_config | Returns row | Policy test |
| DB-RLS-002 | Admin can UPDATE | Admin | UPDATE payment_method_config SET ... | Success | Policy test |
| DB-RLS-003 | Non-admin cannot SELECT | Guest | SELECT * FROM payment_method_config | 0 rows (policy blocks) | Security test |
| DB-RLS-004 | Non-admin cannot UPDATE | Guest | UPDATE payment_method_config SET ... | Error (policy blocks) | Security test |
| DB-RLS-005 | Service role can do anything | Service | SELECT/UPDATE/DELETE | Success | Policy test |
| DB-RLS-006 | Authenticated non-admin blocked | Authenticated user (not admin) | SELECT | 0 rows | Security test |

### 6.2 Constraints & Triggers

**Test Suite**: `payment-config-constraints.test.ts`

| Test Case ID | Test Case | Action | Expected Result | Technique |
|--------------|-----------|--------|-----------------|-----------|
| DB-CONS-001 | Singleton constraint - INSERT id=1 | INSERT with id=1 (duplicate) | Error (PRIMARY KEY violation) | Constraint test |
| DB-CONS-002 | Singleton constraint - INSERT id=2 | INSERT with id=2 | Error (CHECK constraint id=1) | Constraint test |
| DB-CONS-003 | Config mode constraint - Valid | UPDATE config_mode='custom' | Success | Constraint test |
| DB-CONS-004 | Config mode constraint - Invalid | UPDATE config_mode='invalid' | Error (CHECK violation) | Constraint test |
| DB-CONS-005 | JSONB type constraint - Valid | UPDATE custom_payment_methods='[...]' | Success | Constraint test |
| DB-CONS-006 | JSONB type constraint - Invalid | UPDATE custom_payment_methods='not json' | Error (invalid JSON) | Constraint test |
| DB-CONS-007 | PMC ID constraint - Stripe preset + valid | config_mode='stripe_preset', pmc_id='pmc_123' | Success | Complex constraint |
| DB-CONS-008 | PMC ID constraint - Stripe preset + null | config_mode='stripe_preset', pmc_id=NULL | Error (CHECK violation) | Complex constraint |
| DB-CONS-009 | PMC ID constraint - Automatic + null | config_mode='automatic', pmc_id=NULL | Success | Complex constraint |
| DB-CONS-010 | Updated_at trigger fires | UPDATE any field | updated_at auto-updated to NOW() | Trigger test |

---

## 7. NON-FUNCTIONAL TESTS

### 7.1 Performance Tests

**Test Suite**: `payment-config-performance.test.ts`

| Test Case ID | Test Case | Load | Metric | Acceptance Criteria |
|--------------|-----------|------|--------|---------------------|
| PERF-001 | getPaymentMethodConfig response time | 100 concurrent requests | Avg response time | < 200ms |
| PERF-002 | updatePaymentMethodConfig throughput | 50 updates/sec | Success rate | > 95% |
| PERF-003 | Stripe PMC cache effectiveness | 1000 requests within 1h | Cache hit rate | > 99% |
| PERF-004 | Admin UI render time | Fresh load | Time to interactive | < 2s |
| PERF-005 | Drag & drop responsiveness | Drag 10 items quickly | UI lag | < 100ms |
| PERF-006 | Payment Intent creation - Automatic | 100 concurrent requests | Avg response time | < 500ms |
| PERF-007 | Payment Intent creation - Custom | 100 concurrent requests (complex filter) | Avg response time | < 600ms |

### 7.2 Security Tests

**Test Suite**: `payment-config-security.test.ts`

| Test Case ID | Test Case | Attack Vector | Expected Defense | OWASP Top 10 |
|--------------|-----------|---------------|------------------|--------------|
| SEC-001 | SQL Injection - config_mode | 'automatic'; DROP TABLE-- | Parameterized query blocks | A03 - Injection |
| SEC-002 | XSS in PMC name | '<script>alert(1)</script>' | Sanitized on render | A03 - Injection |
| SEC-003 | CSRF on update action | Forged request from external site | CSRF token validation | A01 - Broken Access |
| SEC-004 | Mass Assignment - extra fields | {config_mode: 'custom', is_admin: true} | Extra field ignored | A01 - Broken Access |
| SEC-005 | IDOR - Update another shop's config | User from shop A updates shop B | 403 Forbidden | A01 - Broken Access |
| SEC-006 | Privilege Escalation | Non-admin tries admin action | 401/403 blocked | A01 - Broken Access |
| SEC-007 | Path Traversal in PMC ID | '../../../etc/passwd' | Validation blocks | A03 - Injection |
| SEC-008 | DoS via large payload | 10MB JSON in custom_payment_methods | Request size limit | A05 - Security Misconfiguration |
| SEC-009 | Rate limit bypass | 1000 requests in 1 sec | Rate limiter blocks | A07 - ID & Auth Failures |

### 7.3 Usability Tests

**Test Suite**: Manual/Automated accessibility testing

| Test Case ID | Test Case | Tool | Acceptance Criteria |
|--------------|-----------|------|---------------------|
| USAB-001 | Keyboard navigation | Manual | All interactive elements accessible via Tab |
| USAB-002 | Screen reader compatibility | NVDA/JAWS | All labels, buttons, errors announced |
| USAB-003 | Color contrast | axe DevTools | WCAG AA compliance (4.5:1 ratio) |
| USAB-004 | Mobile responsiveness | Chrome DevTools | Usable on 320px width |
| USAB-005 | Error messages clarity | Manual | Non-technical users understand errors |
| USAB-006 | Loading states | Manual | Clear feedback during async operations |

---

## 8. ACCEPTANCE TESTS (User Stories)

### User Story 1: Admin wants to use Stripe's default payment methods

**Acceptance Criteria**:
- AC1: Admin can select "Automatic" mode
- AC2: No additional configuration required
- AC3: All Stripe-enabled methods appear at checkout
- AC4: Configuration saves successfully

**Tests**: E2E-ADMIN-001, E2E-CHECKOUT-001, E2E-CHECKOUT-002

### User Story 2: Admin wants to use a custom Stripe PMC

**Acceptance Criteria**:
- AC1: Admin can select "Stripe Preset" mode
- AC2: Admin can see list of PMCs from Stripe Dashboard
- AC3: Admin can select a specific PMC
- AC4: Only methods in selected PMC appear at checkout

**Tests**: E2E-ADMIN-002, E2E-CHECKOUT-003

### User Story 3: Admin wants to manually configure payment methods

**Acceptance Criteria**:
- AC1: Admin can select "Custom" mode
- AC2: Admin can enable/disable specific methods
- AC3: Admin can reorder methods via drag & drop
- AC4: Only enabled methods appear at checkout in specified order

**Tests**: E2E-ADMIN-003, E2E-CHECKOUT-004, E2E-CHECKOUT-006

### User Story 4: Admin wants to configure Express Checkout

**Acceptance Criteria**:
- AC1: Admin can toggle Express Checkout on/off
- AC2: Admin can enable/disable Apple Pay, Google Pay, Link individually
- AC3: Enabled express methods appear at checkout
- AC4: Disabled methods don't appear

**Tests**: E2E-ADMIN-005, E2E-CHECKOUT-008, E2E-CHECKOUT-009, E2E-CHECKOUT-010

---

## 9. TEST EXECUTION SCHEDULE

### Priority Matrix (Risk-based)

| Test Level | Priority | Estimated Time | Dependencies |
|------------|----------|----------------|--------------|
| Unit Tests | P0 (Critical) | 4 hours | None |
| Integration Tests | P0 (Critical) | 6 hours | Unit tests pass |
| Component Tests | P1 (High) | 3 hours | Unit tests pass |
| API Tests | P0 (Critical) | 3 hours | Integration tests pass |
| E2E Tests (Happy paths) | P0 (Critical) | 4 hours | All above pass |
| E2E Tests (Edge cases) | P1 (High) | 3 hours | Happy paths pass |
| Database Tests | P1 (High) | 2 hours | Integration tests pass |
| Performance Tests | P2 (Medium) | 3 hours | E2E tests pass |
| Security Tests | P0 (Critical) | 4 hours | API tests pass |
| Usability Tests | P2 (Medium) | 2 hours | E2E tests pass |

**Total Estimated Time**: 34 hours (4-5 days)

### Execution Order

**Phase 1 - Foundation (Day 1-2)**:
1. Unit Tests (4h) - MUST PASS 100%
2. Integration Tests (6h) - MUST PASS >95%
3. Component Tests (3h) - MUST PASS >90%
4. API Tests (3h) - MUST PASS 100%

**Phase 2 - System Validation (Day 3-4)**:
5. E2E Happy Paths (4h) - MUST PASS 100%
6. E2E Edge Cases (3h) - MUST PASS >90%
7. Database Tests (2h) - MUST PASS 100%
8. Security Tests (4h) - MUST PASS 100%

**Phase 3 - Quality Assurance (Day 5)**:
9. Performance Tests (3h) - Meet acceptance criteria
10. Usability Tests (2h) - No critical issues

---

## 10. DEFECT MANAGEMENT

### Severity Classification

| Severity | Definition | Example | Action |
|----------|------------|---------|--------|
| P0 - Blocker | System cannot function | Payment Intent creation fails | Fix immediately |
| P1 - Critical | Major functionality broken | Drag & drop doesn't work | Fix before release |
| P2 - High | Feature partially broken | Validation message unclear | Fix in current sprint |
| P3 - Medium | Minor functionality issue | UI glitch on edge case | Fix in next sprint |
| P4 - Low | Cosmetic issue | Typo in label | Backlog |

### Exit Criteria

**Release Readiness**:
- ✅ All P0 unit tests pass (100%)
- ✅ All P0 integration tests pass (100%)
- ✅ All P0 E2E tests pass (100%)
- ✅ All P0 security tests pass (100%)
- ✅ Performance tests meet acceptance criteria
- ✅ No open P0 or P1 defects
- ✅ Code coverage >85%
- ✅ All acceptance criteria met

---

## 11. TOOLS & ENVIRONMENTS

| Tool | Purpose | Version |
|------|---------|---------|
| Vitest | Unit + Integration tests | Latest |
| React Testing Library | Component tests | Latest |
| Playwright | E2E tests | Latest |
| Supabase Test Client | Database tests | Latest |
| axe DevTools | Accessibility tests | Latest |
| k6 / Artillery | Performance tests | Latest |

**Test Environments**:
- **Local**: Developer machine (Supabase local, mock Stripe)
- **CI/CD**: GitHub Actions (automated on PR)
- **Staging**: Production-like environment (real Stripe test mode)

---

## 12. RISK ASSESSMENT

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Stripe API change breaks integration | Medium | High | Contract testing, API version pinning |
| Database migration fails in production | Low | Critical | Test migration on staging first, rollback plan |
| Performance degradation under load | Medium | High | Load testing before release |
| Security vulnerability in admin UI | Low | Critical | Security testing, penetration testing |
| Browser compatibility issues | Low | Medium | Cross-browser E2E tests |
| RLS policy bypass | Low | Critical | Comprehensive RLS testing |

---

## SUMMARY

**Total Test Cases**: 150+
- Unit: 33
- Integration: 21
- Component: 21
- API: 12
- E2E: 23
- Database: 10
- Performance: 7
- Security: 9
- Usability: 6
- Acceptance: 4 stories

**Coverage Goals**:
- Statement: >90%
- Branch: >85%
- Function: >90%
- Line: >90%

**Estimated Effort**: 34 hours / 4-5 days

This comprehensive test plan ensures production-ready quality with minimal risk.
