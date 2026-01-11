import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Setup Admin Client directly (bypass UI login for API testing)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing. Cannot run API tests.');
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
// Separate client for user authentication (to avoid corrupting supabaseAdmin's service role)
const supabaseAuth = createClient(SUPABASE_URL, ANON_KEY || '');

test.describe('API /api/users', () => {
  let adminUserId: string;
  let adminEmail: string;

  test.beforeAll(async () => {
    // 1. Create a fresh admin user
    const randomStr = Math.random().toString(36).substring(7);
    adminEmail = `api-test-${randomStr}@example.com`;
    
    const { data: { user }, error } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: 'password123',
      email_confirm: true,
      user_metadata: { full_name: 'API Admin' }
    });
    
    if (error) throw error;
    adminUserId = user!.id;

    // 2. Make them admin
    await supabaseAdmin
      .from('admin_users')
      .insert({ user_id: adminUserId });
  });

  test.afterAll(async () => {
    // Cleanup
    if (adminUserId) {
      await supabaseAdmin.auth.admin.deleteUser(adminUserId);
    }
  });

  test('GET /api/users should return 200 and support sorting', async ({ request }) => {
    // We need a session to call the API (since it checks requireAdminApi)
    // We can simulate a login to get an access_token, then pass it in headers?
    // OR, better: use the browser flow helper to get cookies.
    // BUT Playwright APIRequest context doesn't easily share cookies with Browser context unless we merge them.
    
    // Simpler: Just log in via REST API to get a session token
    // Use supabaseAuth (not supabaseAdmin) to avoid corrupting admin client's service role
    const { data: sessionData, error: loginError } = await supabaseAuth.auth.signInWithPassword({
      email: adminEmail,
      password: 'password123'
    });
    
    if (loginError) throw loginError;
    const accessToken = sessionData.session!.access_token;
    
    // Now call our API with the Bearer token?
    // Wait, our API uses cookie-based auth: `await createClient()` (server) reads cookies.
    // It MIGHT accept Authorization header too if configured? 
    // Standard Supabase SSR usually looks for cookies.
    
    // Let's try passing the cookie manually.
    const response = await request.get('/api/users', {
      params: {
        page: '1',
        limit: '10',
        search: '',
        sortBy: 'user_created_at',
        sortOrder: 'desc'
      },
      headers: {
        // Construct standard cookie string (depends on cookie name config)
        'Cookie': `sb-${process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID || 'token'}-auth-token=${accessToken};` // This is tricky to guess locally
      }
    });

    // Strategy B: Use Browser Context to login, then use page.request to fetch
    // This handles cookies automatically.
  });
});

test('GET /api/users via Browser Context', async ({ page, context }) => {
  // 1. Create Admin
  const randomStr = Math.random().toString(36).substring(7);
  const email = `api-test-${randomStr}@example.com`;
  const password = 'password123';

  const { data: { user } } = await supabaseAdmin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { full_name: 'API Tester' }
  });
  await supabaseAdmin.from('admin_users').insert({ user_id: user!.id });

  // 2. Login via Client SDK in browser (bypassing UI forms)
  await page.goto('/login'); // Load app to initialize Supabase client
  
  await page.evaluate(async ({ email, password, url, anonKey }) => {
    // @ts-ignore
    const { createBrowserClient } = await import('https://esm.sh/@supabase/ssr@0.5.2');
    const sb = createBrowserClient(url, anonKey);
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, { 
    email, 
    password, 
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!, 
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! 
  });

  // Reload to ensure Middleware picks up the session cookie
  await page.reload();

  
  // Wait for dashboard redirect or similar to confirm login
  // await expect(page).toHaveURL(/dashboard/); 

  // 3. Call API
  const response = await page.request.get('/api/users?page=1&limit=10&search=&sortBy=user_created_at&sortOrder=desc');
  
  const status = response.status();
  const body = await response.json();
  
  console.log('API Response:', status, body);
  
  // If 401, print why
  if (status === 401) console.log('Unauthorized error:', body);

  expect(status).toBe(200);
  expect(body.users).toBeInstanceOf(Array);
  
  // Verify structure
  if (body.users.length > 0) {
    const firstUser = body.users[0];
    expect(firstUser).toHaveProperty('email');
    expect(firstUser).toHaveProperty('stats');
    expect(firstUser.stats).toHaveProperty('total_products');
  }
});
