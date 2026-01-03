import { Page } from '@playwright/test';

/**
 * All available Klaro consent services
 */
const ALL_CONSENT_SERVICES = {
  'google-tag-manager': true,
  'facebook-pixel': true,
  'umami-analytics': true,
};

/**
 * Bypasses the Klaro consent banner by setting the consent cookie.
 * Accepts all tracking services by default.
 */
export async function acceptAllCookies(page: Page) {
  await page.context().addCookies([
    {
      name: 'gateflow_consent',
      value: JSON.stringify(ALL_CONSENT_SERVICES),
      domain: 'localhost',
      path: '/',
    },
  ]);
}

/**
 * Sets specific consent preferences.
 * @param page - Playwright page
 * @param consents - Object with service names as keys and boolean consent values
 */
export async function setConsentPreferences(page: Page, consents: Record<string, boolean>) {
  await page.context().addCookies([
    {
      name: 'gateflow_consent',
      value: JSON.stringify(consents),
      domain: 'localhost',
      path: '/',
    },
  ]);
}

/**
 * Clears consent cookie to simulate no consent given.
 */
export async function clearConsent(page: Page) {
  await page.context().clearCookies({ name: 'gateflow_consent' });
}
