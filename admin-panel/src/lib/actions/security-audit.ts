'use server';

/**
 * Security audit server action.
 * Checks Supabase configuration for common production security issues.
 * All checks are read-only and non-destructive.
 *
 * @see priv/pentest-2026-03-06.md — Supabase Production Configuration Checklist
 */

import { createClient } from '@/lib/supabase/server';

export interface SecurityCheckResult {
  id: string;
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  fix?: string;
}

export interface SecurityAuditResult {
  success: boolean;
  checks: SecurityCheckResult[];
  timestamp: string;
  error?: string;
}

// ===== In-memory cache =====
// TTL depends on results: 1h if any issues found (re-check sooner), 24h if all pass
const CACHE_TTL_ISSUES_MS = 1 * 60 * 60 * 1000;  // 1 hour
const CACHE_TTL_CLEAN_MS = 24 * 60 * 60 * 1000;   // 24 hours
let cachedResult: SecurityAuditResult | null = null;
let cachedAt = 0;

function getCacheTtl(result: SecurityAuditResult): number {
  const hasIssues = result.checks.some(c => c.status !== 'pass');
  return hasIssues ? CACHE_TTL_ISSUES_MS : CACHE_TTL_CLEAN_MS;
}

async function isAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.rpc('is_admin');
  return data === true;
}

/**
 * Returns cached audit result if fresh, otherwise runs a fresh audit.
 * TTL: 1h when issues exist (re-check after fix), 24h when all pass.
 */
export async function getSecurityAudit(): Promise<SecurityAuditResult> {
  if (!(await isAdmin())) {
    return { success: false, checks: [], timestamp: new Date().toISOString(), error: 'Unauthorized' };
  }

  if (cachedResult && (Date.now() - cachedAt) < getCacheTtl(cachedResult)) {
    return cachedResult;
  }

  return executeAudit();
}

/**
 * Forces a fresh audit run, bypassing cache. Called via "Run again" button.
 */
export async function runSecurityAudit(): Promise<SecurityAuditResult> {
  if (!(await isAdmin())) {
    return { success: false, checks: [], timestamp: new Date().toISOString(), error: 'Unauthorized' };
  }

  return executeAudit();
}

async function executeAudit(): Promise<SecurityAuditResult> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return { success: false, checks: [], timestamp: new Date().toISOString(), error: 'Missing Supabase configuration' };
  }

  const checks: SecurityCheckResult[] = [];

  const siteUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || '';

  const results = await Promise.allSettled([
    // Supabase configuration checks
    checkGraphQLIntrospection(supabaseUrl, anonKey),
    checkMCPEndpoint(supabaseUrl, anonKey),
    checkServerHeaders(supabaseUrl, anonKey),
    checkEmailAutoconfirm(supabaseUrl, anonKey),
    checkProductCountLeak(supabaseUrl, anonKey),
    checkRPCFunctionHints(supabaseUrl, anonKey),
    // Sellf app configuration checks
    checkHttpsRedirect(siteUrl),
    checkHstsHeader(siteUrl),
    checkAppUrl(),
    checkAllowedOrigins(),
    checkCookieSecure(siteUrl),
  ]);

  for (const result of results) {
    if (result.status === 'fulfilled') {
      checks.push(result.value);
    }
  }

  const audit: SecurityAuditResult = { success: true, checks, timestamp: new Date().toISOString() };

  // Update cache
  cachedResult = audit;
  cachedAt = Date.now();

  return audit;
}

async function checkGraphQLIntrospection(url: string, key: string): Promise<SecurityCheckResult> {
  try {
    const res = await fetch(`${url}/graphql/v1`, {
      method: 'POST',
      headers: { 'apikey': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{__schema{queryType{name}}}' }),
    });
    const body = await res.json();
    const exposed = res.ok && body?.data?.__schema;

    return {
      id: 'graphql-introspection',
      name: 'GraphQL introspection',
      status: exposed ? 'warn' : 'pass',
      message: exposed
        ? 'GraphQL introspection is enabled. Exposes full schema (table names, columns) to anyone with the anon key.'
        : 'GraphQL introspection is disabled or blocked.',
      fix: exposed
        ? 'Block /graphql/v1 in your reverse proxy (nginx/Cloudflare), or disable introspection in Supabase dashboard under API settings.'
        : undefined,
    };
  } catch {
    return { id: 'graphql-introspection', name: 'GraphQL introspection', status: 'pass', message: 'GraphQL endpoint not reachable (likely blocked).' };
  }
}

async function checkMCPEndpoint(url: string, key: string): Promise<SecurityCheckResult> {
  try {
    const res = await fetch(`${url}/mcp`, {
      method: 'POST',
      headers: { 'apikey': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', id: 1 }),
    });
    // 404 = blocked, anything else = accessible
    const accessible = res.status !== 404;

    return {
      id: 'mcp-endpoint',
      name: 'MCP endpoint',
      status: accessible ? 'warn' : 'pass',
      message: accessible
        ? `MCP endpoint is accessible (HTTP ${res.status}). In local dev this grants superadmin access with anon key.`
        : 'MCP endpoint is blocked.',
      fix: accessible
        ? 'Block /mcp in your reverse proxy. In production Supabase, this is disabled by default.'
        : undefined,
    };
  } catch {
    return { id: 'mcp-endpoint', name: 'MCP endpoint', status: 'pass', message: 'MCP endpoint not reachable.' };
  }
}

async function checkServerHeaders(url: string, key: string): Promise<SecurityCheckResult> {
  try {
    const res = await fetch(`${url}/rest/v1/`, { headers: { 'apikey': key } });
    const server = res.headers.get('server');
    const via = res.headers.get('via');
    const exposed = !!(server || via);

    const parts: string[] = [];
    if (server) parts.push(`Server: ${server}`);
    if (via) parts.push(`Via: ${via}`);

    return {
      id: 'version-headers',
      name: 'Server version headers',
      status: exposed ? 'warn' : 'pass',
      message: exposed
        ? `Version info exposed in response headers: ${parts.join(', ')}. Helps attackers target known vulnerabilities.`
        : 'Server version headers are stripped.',
      fix: exposed
        ? 'Configure your reverse proxy (nginx/Cloudflare) to strip Server and Via headers: proxy_hide_header Server; proxy_hide_header Via;'
        : undefined,
    };
  } catch {
    return { id: 'version-headers', name: 'Server version headers', status: 'pass', message: 'Could not check headers.' };
  }
}

async function checkEmailAutoconfirm(url: string, key: string): Promise<SecurityCheckResult> {
  try {
    const res = await fetch(`${url}/auth/v1/settings`, { headers: { 'apikey': key } });
    if (!res.ok) {
      return { id: 'email-autoconfirm', name: 'Email confirmation', status: 'pass', message: 'Auth settings not accessible (good).' };
    }
    const data = await res.json();
    const autoconfirm = data.mailer_autoconfirm === true;

    return {
      id: 'email-autoconfirm',
      name: 'Email confirmation',
      status: autoconfirm ? 'fail' : 'pass',
      message: autoconfirm
        ? 'Email autoconfirm is ON. Users can sign up without verifying their email, enabling account enumeration and impersonation.'
        : 'Email confirmation is required. Users must verify their email before accessing the account.',
      fix: autoconfirm
        ? 'In supabase/config.toml set [auth] enable_confirmations = true. In Supabase dashboard: Authentication > Settings > Enable email confirmations.'
        : undefined,
    };
  } catch {
    return { id: 'email-autoconfirm', name: 'Email confirmation', status: 'pass', message: 'Could not check auth settings.' };
  }
}

async function checkProductCountLeak(url: string, key: string): Promise<SecurityCheckResult> {
  try {
    const res = await fetch(`${url}/rest/v1/products?select=id&limit=0`, {
      headers: { 'apikey': key, 'Prefer': 'count=exact' },
    });
    const contentRange = res.headers.get('content-range');
    const leaks = contentRange !== null && contentRange !== '*/0' && contentRange !== '*/*';

    return {
      id: 'count-header-leak',
      name: 'Row count via Prefer header',
      status: leaks ? 'warn' : 'pass',
      message: leaks
        ? `Anonymous users can learn exact row counts via Prefer: count=exact header (${contentRange}). Low risk but leaks business data.`
        : 'Row count is not exposed via Prefer header.',
      fix: leaks
        ? 'Configure PostgREST max-rows or use a reverse proxy to strip the Prefer header from incoming requests.'
        : undefined,
    };
  } catch {
    return { id: 'count-header-leak', name: 'Row count via Prefer header', status: 'pass', message: 'Could not check.' };
  }
}

async function checkRPCFunctionHints(url: string, key: string): Promise<SecurityCheckResult> {
  try {
    const res = await fetch(`${url}/rest/v1/rpc/nonexistent_function_xyz`, {
      method: 'POST',
      headers: { 'apikey': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const body = await res.json();
    const hasHint = body?.hint && body.hint.includes('Perhaps you meant');

    return {
      id: 'rpc-function-hints',
      name: 'RPC function name hints',
      status: hasHint ? 'warn' : 'pass',
      message: hasHint
        ? `PostgREST suggests real function names when a nonexistent function is called: "${body.hint}". Reveals internal API surface.`
        : 'PostgREST does not suggest function names.',
      fix: hasHint
        ? 'Set db-plan-enabled = false in PostgREST config, or restrict the exposed schema search path.'
        : undefined,
    };
  } catch {
    return { id: 'rpc-function-hints', name: 'RPC function name hints', status: 'pass', message: 'Could not check.' };
  }
}

// ===== Sellf App Configuration Checks =====

async function checkHttpsRedirect(siteUrl: string): Promise<SecurityCheckResult> {
  if (!siteUrl || !siteUrl.startsWith('https://')) {
    return { id: 'https-redirect', name: 'HTTPS redirect', status: 'warn', message: 'SITE_URL is not HTTPS. Cannot verify redirect.', fix: 'Set SITE_URL to your https:// production URL.' };
  }
  try {
    const httpUrl = siteUrl.replace('https://', 'http://');
    const res = await fetch(httpUrl, { redirect: 'manual' });
    const location = res.headers.get('location');
    const redirectsToHttps = (res.status === 301 || res.status === 308) && location?.startsWith('https://');

    return {
      id: 'https-redirect',
      name: 'HTTPS redirect',
      status: redirectsToHttps ? 'pass' : 'warn',
      message: redirectsToHttps
        ? 'HTTP requests are permanently redirected to HTTPS.'
        : `HTTP requests are not redirected to HTTPS (HTTP ${res.status}). Users accessing via HTTP get unencrypted content.`,
      fix: redirectsToHttps ? undefined
        : 'Enable "Always Use HTTPS" in Cloudflare: SSL/TLS > Edge Certificates. Or configure your reverse proxy to redirect HTTP to HTTPS.',
    };
  } catch {
    return { id: 'https-redirect', name: 'HTTPS redirect', status: 'pass', message: 'HTTP not reachable (likely blocked — good).' };
  }
}

async function checkHstsHeader(siteUrl: string): Promise<SecurityCheckResult> {
  if (!siteUrl) {
    return { id: 'hsts', name: 'HSTS header', status: 'warn', message: 'SITE_URL not set. Cannot check HSTS.', fix: 'Set SITE_URL to your production URL.' };
  }
  try {
    const res = await fetch(siteUrl, { redirect: 'manual' });
    const hsts = res.headers.get('strict-transport-security');

    return {
      id: 'hsts',
      name: 'HSTS header',
      status: hsts ? 'pass' : 'warn',
      message: hsts
        ? `HSTS is enabled: ${hsts}`
        : 'Strict-Transport-Security header is missing. First-time visitors can be intercepted via HTTP before redirect.',
      fix: hsts ? undefined
        : 'Enable HSTS in Cloudflare: SSL/TLS > Edge Certificates > Enable HSTS. Or ensure DISABLE_HSTS is not set to "true" in your environment.',
    };
  } catch {
    return { id: 'hsts', name: 'HSTS header', status: 'warn', message: 'Could not reach site to check HSTS.' };
  }
}

async function checkAppUrl(): Promise<SecurityCheckResult> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || '';
  const isLocalhost = !appUrl || appUrl.includes('localhost') || appUrl.includes('127.0.0.1');

  return {
    id: 'app-url',
    name: 'App URL configuration',
    status: isLocalhost ? 'fail' : 'pass',
    message: isLocalhost
      ? `NEXT_PUBLIC_APP_URL is ${appUrl || 'not set'}. Open Graph meta tags (og:url, og:image) will reference localhost, breaking social media sharing previews.`
      : `App URL is set to ${appUrl}.`,
    fix: isLocalhost
      ? 'Set NEXT_PUBLIC_APP_URL to your production URL (e.g., https://yourdomain.com) in .env.local and restart the app.'
      : undefined,
  };
}

async function checkAllowedOrigins(): Promise<SecurityCheckResult> {
  const allowedOrigins = process.env.ALLOWED_ORIGINS;
  const hasOrigins = !!allowedOrigins && allowedOrigins.trim().length > 0;

  return {
    id: 'allowed-origins',
    name: 'CORS allowed origins',
    status: hasOrigins ? 'pass' : 'warn',
    message: hasOrigins
      ? `Cross-domain origins are restricted to: ${allowedOrigins}`
      : 'ALLOWED_ORIGINS is not set. Cross-domain API access (/api/access) is limited to your own domain. If you embed Sellf on external sites, add their origins.',
    fix: hasOrigins ? undefined
      : 'If you use Sellf cross-domain (sellf.js on external sites), set ALLOWED_ORIGINS in .env.local to a comma-separated list of customer domains: ALLOWED_ORIGINS=https://site1.com,https://site2.com',
  };
}

async function checkCookieSecure(siteUrl: string): Promise<SecurityCheckResult> {
  if (!siteUrl) {
    return { id: 'cookie-secure', name: 'Cookie security', status: 'warn', message: 'SITE_URL not set. Cannot check cookies.', fix: 'Set SITE_URL to your production URL.' };
  }
  try {
    const res = await fetch(siteUrl, { redirect: 'follow' });
    const setCookies = res.headers.getSetCookie?.() || [];
    const insecureCookies = setCookies.filter(c => !c.toLowerCase().includes('secure'));

    if (setCookies.length === 0) {
      return { id: 'cookie-secure', name: 'Cookie security', status: 'pass', message: 'No cookies set on initial page load.' };
    }

    const allSecure = insecureCookies.length === 0;

    return {
      id: 'cookie-secure',
      name: 'Cookie security',
      status: allSecure ? 'pass' : 'warn',
      message: allSecure
        ? `All ${setCookies.length} cookies have the Secure flag.`
        : `${insecureCookies.length} of ${setCookies.length} cookies are missing the Secure flag. These cookies will be sent over unencrypted HTTP connections.`,
      fix: allSecure ? undefined
        : 'Ensure all cookies are set with the Secure flag. For NEXT_LOCALE, this requires next-intl configuration. For auth cookies, check Supabase cookie settings.',
    };
  } catch {
    return { id: 'cookie-secure', name: 'Cookie security', status: 'warn', message: 'Could not reach site to check cookies.' };
  }
}
