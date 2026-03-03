/**
 * SECURITY TEST: Open Redirect in /api/auth/logout
 *
 * The logout endpoint accepts returnUrl in the POST body and returns
 * a redirectUrl in the JSON response. We verify that only safe
 * same-origin paths are accepted.
 */

import { test, expect } from '@playwright/test';

test.describe('Open Redirect - Logout Endpoint', () => {
  test('SECURITY: Should reject external URLs in returnUrl', async ({ request }) => {
    const externalUrl = 'https://evil-phishing-site.com/fake-login';

    const response = await request.post('/api/auth/logout', {
      data: { returnUrl: externalUrl },
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.redirectUrl).not.toContain('evil-phishing-site.com');
    expect(body.redirectUrl).toMatch(/^\//);
  });

  test('SECURITY: Should reject protocol-relative URLs', async ({ request }) => {
    const protoRelativeUrl = '//evil.com/phishing';

    const response = await request.post('/api/auth/logout', {
      data: { returnUrl: protoRelativeUrl },
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.redirectUrl).not.toContain('evil.com');
    expect(body.redirectUrl).toMatch(/^\//);
  });

  test('SECURITY: Should reject javascript: URLs', async ({ request }) => {
    const jsUrl = 'javascript:alert(1)';

    const response = await request.post('/api/auth/logout', {
      data: { returnUrl: jsUrl },
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.redirectUrl).not.toContain('javascript:');
    expect(body.redirectUrl).toMatch(/^\//);
  });

  test('Should allow safe relative paths', async ({ request }) => {
    const safePath = '/login';

    const response = await request.post('/api/auth/logout', {
      data: { returnUrl: safePath },
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.redirectUrl).toBe('/login');
  });

  test('Should default to / when no returnUrl', async ({ request }) => {
    const response = await request.post('/api/auth/logout', {
      data: {},
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.redirectUrl).toBe('/');
  });

  test('SECURITY: GET requests should return 405 Method Not Allowed', async ({ request }) => {
    const response = await request.get('/api/auth/logout', {
      maxRedirects: 0,
    });

    expect(response.status()).toBe(405);
  });
});
