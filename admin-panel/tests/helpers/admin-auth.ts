import { Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { acceptAllCookies } from './consent';

// Supabase config
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

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
