# Custom Security Scan Instructions — Sellf

Review the PR diff for the following vulnerability categories.

## OWASP Top 10

### A01 — Broken Access Control
- API routes and server actions that mutate or read sensitive data without authentication check
- Missing authorization for role-restricted operations (admin-only endpoints accessible to any authenticated user)
- IDOR — using user-supplied IDs to access other users' resources instead of `auth.uid()` from session
- Exposed admin endpoints without rate limiting or IP restriction

### A02 — Cryptographic Failures
- Hardcoded secrets, API keys, or passwords in source code (not .env files)
- Weak or outdated algorithms (MD5, SHA1 for security purposes, DES, RC4)
- Sensitive data logged in plaintext (tokens, passwords, PII in `console.log` or audit logs)
- Missing encryption for sensitive data stored in database (payment keys, webhook secrets)
- IV reuse or static IV in symmetric encryption (AES-GCM requires a fresh random IV per call)

### A03 — Injection
- SQL injection via string concatenation or template literals with user input (use parameterized queries)
- XSS via `dangerouslySetInnerHTML` with unsanitized user content
- Command injection via `exec()`/`spawn()` with user-supplied strings
- Header injection in HTTP responses with user-controlled values
- Log injection — user input written directly to logs without sanitization

### A04 — Insecure Design
- Payment logic errors — access granted before payment confirmed, or without webhook verification
- Race conditions in purchase flow — concurrent requests could grant duplicate access or bypass checks
- Missing idempotency on payment processing (duplicate webhook delivery could charge twice)
- Business logic bypass — free product claim without rate limit, coupon stacking without validation

### A05 — Security Misconfiguration
- CORS misconfiguration — wildcard `*` on authenticated endpoints, or echoing `Origin` header without allowlist check
- Verbose error messages exposing stack traces, file paths, or internal details to clients
- Debug endpoints or development-only routes reachable in production
- Overly permissive Content Security Policy

### A07 — Identification and Authentication Failures
- Tokens or session identifiers in URLs (GET parameters, logged in Referer header)
- Missing expiry on auth tokens or magic links
- Insecure cookie flags — missing `HttpOnly`, `Secure`, or `SameSite` on auth cookies
- Account enumeration via different error messages for "user not found" vs "wrong password"

### A08 — Software and Data Integrity Failures
- Prompt injection — user-supplied strings interpolated into LLM system prompts instead of passed as separate `messages[].content`
- Unsafe deserialization of user-supplied JSON without schema validation
- Webhook payload processed without signature verification

### A09 — Security Logging and Monitoring Failures
- Auth failures, access control violations, or payment errors not logged
- Sensitive data (tokens, keys, PII) included in log entries
- Missing audit trail for admin actions (user deletion, refunds, config changes)

### A10 — Server-Side Request Forgery (SSRF)
- `fetch()` with URL derived from user input or database values without SSRF protection
- Missing `redirect: 'error'` on fetch calls that could follow attacker-controlled redirects
- Missing `AbortSignal.timeout()` — open-ended requests can be used for port scanning

## Stack-Specific Rules

### Next.js / App Router
- Server Actions without CSRF protection (missing custom header check for cross-origin calls)
- Middleware that can be bypassed — matcher patterns that miss API routes or auth-required pages
- `cookies().set()` called in Server Components (only valid in Route Handlers and Server Actions)

### Supabase / PostgreSQL
- Any query using service role client (`createAdminClient()`) without a preceding explicit admin check — service role bypasses all Row Level Security
- New tables or views created without RLS policies
- Database functions using `SECURITY DEFINER` without restricting access to appropriate roles

### Stripe
- Webhook handler processing payment data before calling `stripe.webhooks.constructEvent()` for signature verification
- Checkout session retrieved by ID without verifying it belongs to the current user

## Noise Reduction — Do NOT Flag

- `console.log` / `console.error` statements (intentional debug logging, reviewed separately)
- `any` TypeScript types in test files
- Missing input validation on internal server-to-server calls not reachable from outside
- The `isDemoMode()` pattern blocking mutations — intentional
- Hardcoded non-secret constants like `'disposable_email'`, `'DEMO_MODE'`, status strings
- Zod schema validation already present on the same input — do not flag the raw input before it hits the schema
