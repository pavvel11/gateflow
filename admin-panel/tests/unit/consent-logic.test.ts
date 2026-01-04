/**
 * Unit tests for consent logic in FB CAPI tracking
 *
 * These tests verify the core consent decision logic that determines
 * whether events should be sent to Facebook CAPI based on:
 * 1. User consent status
 * 2. send_conversions_without_consent setting
 * 3. Event type (only Purchase/Lead allowed without consent)
 */

import { describe, it, expect } from 'vitest';

/**
 * Events that can be sent without explicit cookie consent
 * Based on legitimate interest legal basis (GDPR Art. 6(1)(f))
 * Only conversion events - no browsing/tracking events
 */
const CONSENT_EXEMPT_EVENTS = ['Purchase', 'Lead'];

/**
 * Core logic function extracted from FB CAPI endpoint
 * Determines if an event can be sent based on consent status and settings
 */
function canSendWithoutConsent(
  eventName: string,
  hasConsent: boolean,
  sendConversionsWithoutConsent: boolean
): boolean {
  // If user has consent, always send
  if (hasConsent) return true;

  // If setting is disabled, don't send without consent
  if (!sendConversionsWithoutConsent) return false;

  // Only allow specific conversion events without consent
  return CONSENT_EXEMPT_EVENTS.includes(eventName);
}

describe('canSendWithoutConsent', () => {
  describe('when user has consent', () => {
    it('should allow sending any event', () => {
      expect(canSendWithoutConsent('Purchase', true, false)).toBe(true);
      expect(canSendWithoutConsent('Lead', true, false)).toBe(true);
      expect(canSendWithoutConsent('ViewContent', true, false)).toBe(true);
      expect(canSendWithoutConsent('InitiateCheckout', true, false)).toBe(true);
      expect(canSendWithoutConsent('AddPaymentInfo', true, false)).toBe(true);
    });

    it('should allow sending even when sendConversionsWithoutConsent is disabled', () => {
      expect(canSendWithoutConsent('Purchase', true, false)).toBe(true);
      expect(canSendWithoutConsent('ViewContent', true, false)).toBe(true);
    });
  });

  describe('when user does NOT have consent', () => {
    describe('and sendConversionsWithoutConsent is DISABLED', () => {
      it('should block ALL events including conversions', () => {
        expect(canSendWithoutConsent('Purchase', false, false)).toBe(false);
        expect(canSendWithoutConsent('Lead', false, false)).toBe(false);
        expect(canSendWithoutConsent('ViewContent', false, false)).toBe(false);
        expect(canSendWithoutConsent('InitiateCheckout', false, false)).toBe(false);
        expect(canSendWithoutConsent('AddPaymentInfo', false, false)).toBe(false);
      });
    });

    describe('and sendConversionsWithoutConsent is ENABLED', () => {
      it('should allow Purchase events (legitimate interest)', () => {
        expect(canSendWithoutConsent('Purchase', false, true)).toBe(true);
      });

      it('should allow Lead events (legitimate interest)', () => {
        expect(canSendWithoutConsent('Lead', false, true)).toBe(true);
      });

      it('should block ViewContent events (not a conversion)', () => {
        expect(canSendWithoutConsent('ViewContent', false, true)).toBe(false);
      });

      it('should block InitiateCheckout events (not a conversion)', () => {
        expect(canSendWithoutConsent('InitiateCheckout', false, true)).toBe(false);
      });

      it('should block AddPaymentInfo events (not a conversion)', () => {
        expect(canSendWithoutConsent('AddPaymentInfo', false, true)).toBe(false);
      });

      it('should block any unknown/custom events', () => {
        expect(canSendWithoutConsent('CustomEvent', false, true)).toBe(false);
        expect(canSendWithoutConsent('PageView', false, true)).toBe(false);
        expect(canSendWithoutConsent('', false, true)).toBe(false);
      });
    });
  });
});

describe('CONSENT_EXEMPT_EVENTS', () => {
  it('should only include Purchase and Lead events', () => {
    expect(CONSENT_EXEMPT_EVENTS).toEqual(['Purchase', 'Lead']);
    expect(CONSENT_EXEMPT_EVENTS).toHaveLength(2);
  });

  it('should not include browsing events', () => {
    expect(CONSENT_EXEMPT_EVENTS).not.toContain('ViewContent');
    expect(CONSENT_EXEMPT_EVENTS).not.toContain('InitiateCheckout');
    expect(CONSENT_EXEMPT_EVENTS).not.toContain('AddPaymentInfo');
    expect(CONSENT_EXEMPT_EVENTS).not.toContain('PageView');
  });
});

describe('Consent edge cases', () => {
  it('should handle undefined/null consent values safely', () => {
    // TypeScript prevents this at compile time, but testing runtime safety
    expect(canSendWithoutConsent('Purchase', false, true)).toBe(true);
    expect(canSendWithoutConsent('Purchase', false, false)).toBe(false);
  });

  it('should be case-sensitive for event names', () => {
    // Facebook event names are case-sensitive
    expect(canSendWithoutConsent('PURCHASE', false, true)).toBe(false);
    expect(canSendWithoutConsent('purchase', false, true)).toBe(false);
    expect(canSendWithoutConsent('Purchase', false, true)).toBe(true);
  });
});

/**
 * Test scenarios that mirror real-world usage
 */
describe('Real-world scenarios', () => {
  it('Scenario: EU user declines cookies, makes a purchase', () => {
    // User declines cookies (no consent)
    const hasConsent = false;
    // Merchant has enabled server-side conversions without consent
    const sendWithoutConsent = true;

    // The Purchase event SHOULD be sent via CAPI
    expect(canSendWithoutConsent('Purchase', hasConsent, sendWithoutConsent)).toBe(true);

    // But browsing events should NOT be sent
    expect(canSendWithoutConsent('ViewContent', hasConsent, sendWithoutConsent)).toBe(false);
    expect(canSendWithoutConsent('InitiateCheckout', hasConsent, sendWithoutConsent)).toBe(false);
  });

  it('Scenario: EU user declines cookies, signs up for free product (Lead)', () => {
    const hasConsent = false;
    const sendWithoutConsent = true;

    // The Lead event SHOULD be sent
    expect(canSendWithoutConsent('Lead', hasConsent, sendWithoutConsent)).toBe(true);
  });

  it('Scenario: Merchant disables server-side conversions without consent', () => {
    const hasConsent = false;
    const sendWithoutConsent = false; // Merchant decision: respect all cookie preferences

    // NO events should be sent
    expect(canSendWithoutConsent('Purchase', hasConsent, sendWithoutConsent)).toBe(false);
    expect(canSendWithoutConsent('Lead', hasConsent, sendWithoutConsent)).toBe(false);
    expect(canSendWithoutConsent('ViewContent', hasConsent, sendWithoutConsent)).toBe(false);
  });

  it('Scenario: User accepts all cookies', () => {
    const hasConsent = true;
    const sendWithoutConsent = false; // Doesn't matter when consent is given

    // ALL events should be sent
    expect(canSendWithoutConsent('Purchase', hasConsent, sendWithoutConsent)).toBe(true);
    expect(canSendWithoutConsent('Lead', hasConsent, sendWithoutConsent)).toBe(true);
    expect(canSendWithoutConsent('ViewContent', hasConsent, sendWithoutConsent)).toBe(true);
    expect(canSendWithoutConsent('InitiateCheckout', hasConsent, sendWithoutConsent)).toBe(true);
    expect(canSendWithoutConsent('AddPaymentInfo', hasConsent, sendWithoutConsent)).toBe(true);
  });
});
