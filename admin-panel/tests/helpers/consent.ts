import { Page } from '@playwright/test';

/**
 * Bypasses the Klaro consent banner by setting the consent cookie.
 */
export async function acceptAllCookies(page: Page) {
  await page.context().addCookies([
    {
      name: 'gateflow_consent',
      value: JSON.stringify({
        'google-tag-manager': true,
        'facebook-pixel': true
      }),
      domain: 'localhost',
      path: '/',
    },
  ]);
}
