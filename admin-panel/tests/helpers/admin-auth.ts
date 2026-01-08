import { Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { acceptAllCookies } from './consent';

// Supabase config - require explicit env vars, fallback only to local Supabase CLI defaults
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';

// Local Supabase CLI 2.71+ uses new opaque API keys (sb_publishable_, sb_secret_)
// These are the default keys for local development - safe for local testing only
const LOCAL_SERVICE_ROLE_KEY = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';
const LOCAL_ANON_KEY = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';

// Only allow local demo keys when using local Supabase (127.0.0.1) in dev/test
const isLocalDev = (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development')
  && SUPABASE_URL.includes('127.0.0.1');
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || (isLocalDev ? LOCAL_SERVICE_ROLE_KEY : '');
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || (isLocalDev ? LOCAL_ANON_KEY : '');

if (!SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required. Set it in .env.local or run local Supabase.');
}
if (!ANON_KEY) {
  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required. Set it in .env.local or run local Supabase.');
}

export const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

/**
 * Creates a test admin user
 * @param prefix - Prefix for the email address
 * @returns Object with email and cleanup function
 */
export async function createTestAdmin(prefix: string = 'test-admin') {
  const randomStr = Math.random().toString(36).substring(7);
  const email = `${prefix}-${Date.now()}-${randomStr}@example.com`;
  const password = 'password123';

  const { data: { user }, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError) throw createError;

  await supabaseAdmin
    .from('admin_users')
    .insert({ user_id: user!.id });

  const cleanup = async () => {
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const testUser = users?.users.find(u => u.email === email);
    if (testUser) {
      await supabaseAdmin.from('admin_users').delete().eq('user_id', testUser.id);
      await supabaseAdmin.auth.admin.deleteUser(testUser.id);
    }
  };

  return { email, password, cleanup };
}

/**
 * Logs in as admin user
 * @param page - Playwright page
 * @param email - Admin email
 * @param password - Admin password
 */
export async function loginAsAdmin(page: Page, email: string, password: string) {
  await acceptAllCookies(page);

  // Hide Klaro consent banner
  await page.addInitScript(() => {
    const addStyle = () => {
      if (document.head) {
        const style = document.createElement('style');
        style.innerHTML = '#klaro { display: none !important; }';
        document.head.appendChild(style);
      } else {
        setTimeout(addStyle, 10);
      }
    };
    addStyle();
  });

  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  await page.evaluate(async ({ email, password, supabaseUrl, anonKey }) => {
    // @ts-ignore - dynamic ESM import works in browser context
    const { createBrowserClient } = await import('https://esm.sh/@supabase/ssr@0.5.2');
    const supabase = createBrowserClient(supabaseUrl, anonKey);
    await supabase.auth.signInWithPassword({ email, password });
  }, {
    email,
    password,
    supabaseUrl: SUPABASE_URL,
    anonKey: ANON_KEY,
  });

  await page.goto('/pl/dashboard');
  // Wait for dashboard to load - look for sidebar navigation
  await page.waitForSelector('nav, [role="navigation"], aside', { timeout: 15000 });
}

/**
 * Get admin bearer token for API requests
 * Creates a test admin user and returns their JWT token
 * @returns Bearer token string
 */
export async function getAdminBearerToken(): Promise<string> {
  // Create test admin user
  const randomStr = Math.random().toString(36).substring(7);
  const email = `api-admin-${Date.now()}-${randomStr}@example.com`;
  const password = 'password123';

  const { data: { user }, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError) throw createError;

  // Add to admin_users
  await supabaseAdmin
    .from('admin_users')
    .insert({ user_id: user!.id });

  // Sign in to get JWT token
  const { data: { session }, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError || !session) {
    throw new Error('Failed to sign in admin user');
  }

  return session.access_token;
}
