import { describe, it, expect } from 'vitest';

/**
 * Payment Status Redirect Logic Tests
 *
 * Based on the following decision table:
 *
 * LOGGED-IN USER (paymentStatus='completed', accessGranted=true, isAuthenticated=true):
 * | Configuration    | Owns OTO product | Expected behavior                    |
 * |------------------|------------------|--------------------------------------|
 * | OTO enabled      | No               | Show OTO offer, no redirect          |
 * | OTO enabled      | Yes              | Success page, no OTO, no redirect    |
 * | Redirect URL set | -                | Countdown → redirect to URL          |
 * | Nothing          | -                | Countdown → redirect to product page |
 *
 * GUEST USER (paymentStatus='magic_link_sent', accessGranted=false, isAuthenticated=false):
 * | Configuration    | Owns OTO product | Expected behavior                    |
 * |------------------|------------------|--------------------------------------|
 * | OTO enabled      | No               | OTO offer first, then magic link     |
 * | OTO enabled      | Yes              | Magic link only, stays on page       |
 * | Redirect URL set | -                | Magic link → countdown → redirect    |
 * | Nothing          | -                | Magic link only, stays on page       |
 */

/**
 * Helper function that mirrors the countdown trigger logic from useCountdown.ts
 */
function shouldStartCountdown(params: {
  paymentStatus: 'completed' | 'magic_link_sent' | 'processing' | 'failed' | 'expired';
  accessGranted: boolean;
  isUserAuthenticated: boolean;
  redirectUrl?: string;
  disableAutoRedirect?: boolean;
  magicLinkSent?: boolean;
}): boolean {
  const {
    paymentStatus,
    accessGranted,
    isUserAuthenticated,
    redirectUrl,
    disableAutoRedirect = false,
    magicLinkSent = false,
  } = params;

  // Don't run countdown if auto-redirect is disabled (OTO is shown)
  if (disableAutoRedirect) {
    return false;
  }

  // Authenticated user with completed payment
  const isAuthenticatedSuccess = paymentStatus === 'completed' && accessGranted && isUserAuthenticated;

  // Guest purchase with redirect URL AND magic link already sent
  const isGuestSuccessWithRedirect = paymentStatus === 'magic_link_sent' && !!redirectUrl && magicLinkSent;

  return !!(isAuthenticatedSuccess || isGuestSuccessWithRedirect);
}

/**
 * Helper function that mirrors the redirect destination logic
 */
function getRedirectDestination(params: {
  redirectUrl?: string;
  productSlug: string;
}): string {
  return params.redirectUrl || `/p/${params.productSlug}`;
}

describe('Payment Status Redirect Logic', () => {
  describe('Countdown Trigger Conditions', () => {
    describe('Logged-in User Scenarios', () => {
      const loggedInUserBase = {
        paymentStatus: 'completed' as const,
        accessGranted: true,
        isUserAuthenticated: true,
      };

      it('should NOT start countdown when OTO is active (disableAutoRedirect=true)', () => {
        const result = shouldStartCountdown({
          ...loggedInUserBase,
          disableAutoRedirect: true, // OTO is shown
          redirectUrl: undefined,
        });

        expect(result).toBe(false);
      });

      it('should start countdown when payment completed and user authenticated', () => {
        const result = shouldStartCountdown({
          ...loggedInUserBase,
          redirectUrl: undefined,
        });

        expect(result).toBe(true);
      });

      it('should start countdown when redirect URL is set', () => {
        const result = shouldStartCountdown({
          ...loggedInUserBase,
          redirectUrl: 'https://example.com/thank-you',
        });

        expect(result).toBe(true);
      });

      it('should NOT start countdown when user is not authenticated', () => {
        const result = shouldStartCountdown({
          ...loggedInUserBase,
          isUserAuthenticated: false,
        });

        expect(result).toBe(false);
      });

      it('should NOT start countdown when access is not granted', () => {
        const result = shouldStartCountdown({
          ...loggedInUserBase,
          accessGranted: false,
        });

        expect(result).toBe(false);
      });

      it('should NOT start countdown when payment status is not completed', () => {
        const result = shouldStartCountdown({
          ...loggedInUserBase,
          paymentStatus: 'processing',
        });

        expect(result).toBe(false);
      });
    });

    describe('Guest User Scenarios', () => {
      const guestUserBase = {
        paymentStatus: 'magic_link_sent' as const,
        accessGranted: false,
        isUserAuthenticated: false,
      };

      it('should NOT start countdown when magic link not yet sent', () => {
        const result = shouldStartCountdown({
          ...guestUserBase,
          redirectUrl: 'https://example.com/redirect',
          magicLinkSent: false,
        });

        expect(result).toBe(false);
      });

      it('should start countdown after magic link is sent when redirect URL is set', () => {
        const result = shouldStartCountdown({
          ...guestUserBase,
          redirectUrl: 'https://example.com/thank-you',
          magicLinkSent: true,
        });

        expect(result).toBe(true);
      });

      it('should NOT start countdown when no redirect URL (stays on magic link page)', () => {
        const result = shouldStartCountdown({
          ...guestUserBase,
          redirectUrl: undefined,
          magicLinkSent: true,
        });

        expect(result).toBe(false);
      });

      it('should NOT start countdown when OTO is active (disableAutoRedirect=true)', () => {
        const result = shouldStartCountdown({
          ...guestUserBase,
          redirectUrl: 'https://example.com/redirect',
          magicLinkSent: true,
          disableAutoRedirect: true,
        });

        expect(result).toBe(false);
      });

      it('should NOT start countdown when magic link sent but no redirect URL', () => {
        const result = shouldStartCountdown({
          ...guestUserBase,
          redirectUrl: undefined,
          magicLinkSent: true,
        });

        expect(result).toBe(false);
      });
    });
  });

  describe('Redirect Destination', () => {
    it('should redirect to custom URL when provided', () => {
      const destination = getRedirectDestination({
        redirectUrl: 'https://example.com/thank-you',
        productSlug: 'my-product',
      });

      expect(destination).toBe('https://example.com/thank-you');
    });

    it('should redirect to product page when no custom URL', () => {
      const destination = getRedirectDestination({
        redirectUrl: undefined,
        productSlug: 'my-product',
      });

      expect(destination).toBe('/p/my-product');
    });
  });
});

describe('Payment Status View Scenarios', () => {
  /**
   * Helper that mirrors the view logic in PaymentStatusView.tsx
   */
  function determineViewState(params: {
    paymentStatus: string;
    accessGranted: boolean;
    isAuthenticated: boolean;
    hasOtoOffer: boolean;
    magicLinkSent: boolean;
    redirectUrl?: string;
  }): {
    showOtoOffer: boolean;
    showSuccessWithCountdown: boolean;
    showMagicLinkStatus: boolean;
    showCountdownInMagicLink: boolean;
  } {
    const { paymentStatus, accessGranted, isAuthenticated, hasOtoOffer, magicLinkSent, redirectUrl } = params;

    // Logged-in user success
    if (paymentStatus === 'completed' && accessGranted && isAuthenticated) {
      return {
        showOtoOffer: hasOtoOffer,
        showSuccessWithCountdown: !hasOtoOffer,
        showMagicLinkStatus: false,
        showCountdownInMagicLink: false,
      };
    }

    // Guest user (magic_link_sent)
    if (paymentStatus === 'magic_link_sent') {
      const showOtoForGuest = hasOtoOffer && !magicLinkSent;
      return {
        showOtoOffer: showOtoForGuest,
        showSuccessWithCountdown: false,
        showMagicLinkStatus: !showOtoForGuest,
        showCountdownInMagicLink: !showOtoForGuest && magicLinkSent && !!redirectUrl,
      };
    }

    // Default/error state
    return {
      showOtoOffer: false,
      showSuccessWithCountdown: false,
      showMagicLinkStatus: false,
      showCountdownInMagicLink: false,
    };
  }

  describe('Logged-in User View Logic', () => {
    const loggedInBase = {
      paymentStatus: 'completed',
      accessGranted: true,
      isAuthenticated: true,
      magicLinkSent: false,
    };

    it('should show OTO offer when hasOtoOffer=true', () => {
      const state = determineViewState({
        ...loggedInBase,
        hasOtoOffer: true,
      });

      expect(state.showOtoOffer).toBe(true);
      expect(state.showSuccessWithCountdown).toBe(false);
      expect(state.showMagicLinkStatus).toBe(false);
    });

    it('should show success with countdown when no OTO', () => {
      const state = determineViewState({
        ...loggedInBase,
        hasOtoOffer: false,
      });

      expect(state.showOtoOffer).toBe(false);
      expect(state.showSuccessWithCountdown).toBe(true);
      expect(state.showMagicLinkStatus).toBe(false);
    });

    it('should show success with countdown when OTO was skipped (user owns product)', () => {
      // OTO was configured but user owns it, so hasOtoOffer=false
      const state = determineViewState({
        ...loggedInBase,
        hasOtoOffer: false, // Skipped because user owns OTO product
      });

      expect(state.showOtoOffer).toBe(false);
      expect(state.showSuccessWithCountdown).toBe(true);
    });
  });

  describe('Guest User View Logic', () => {
    const guestBase = {
      paymentStatus: 'magic_link_sent',
      accessGranted: false,
      isAuthenticated: false,
    };

    it('should show OTO offer first when hasOtoOffer=true and magic link not sent', () => {
      const state = determineViewState({
        ...guestBase,
        hasOtoOffer: true,
        magicLinkSent: false,
      });

      expect(state.showOtoOffer).toBe(true);
      expect(state.showMagicLinkStatus).toBe(false);
    });

    it('should show magic link status after OTO skip', () => {
      const state = determineViewState({
        ...guestBase,
        hasOtoOffer: true,
        magicLinkSent: true, // After OTO skip, magic link gets sent
      });

      expect(state.showOtoOffer).toBe(false);
      expect(state.showMagicLinkStatus).toBe(true);
    });

    it('should show magic link status when no OTO configured', () => {
      const state = determineViewState({
        ...guestBase,
        hasOtoOffer: false,
        magicLinkSent: false,
      });

      expect(state.showOtoOffer).toBe(false);
      expect(state.showMagicLinkStatus).toBe(true);
    });

    it('should show countdown in magic link status when redirect URL is set and magic link sent', () => {
      const state = determineViewState({
        ...guestBase,
        hasOtoOffer: false,
        magicLinkSent: true,
        redirectUrl: 'https://example.com/thanks',
      });

      expect(state.showMagicLinkStatus).toBe(true);
      expect(state.showCountdownInMagicLink).toBe(true);
    });

    it('should NOT show countdown in magic link status when no redirect URL', () => {
      const state = determineViewState({
        ...guestBase,
        hasOtoOffer: false,
        magicLinkSent: true,
        redirectUrl: undefined,
      });

      expect(state.showMagicLinkStatus).toBe(true);
      expect(state.showCountdownInMagicLink).toBe(false);
    });

    it('should NOT show countdown in magic link status when magic link not yet sent', () => {
      const state = determineViewState({
        ...guestBase,
        hasOtoOffer: false,
        magicLinkSent: false,
        redirectUrl: 'https://example.com/thanks',
      });

      expect(state.showMagicLinkStatus).toBe(true);
      expect(state.showCountdownInMagicLink).toBe(false);
    });
  });
});

describe('Server-side Redirect Logic (page.tsx)', () => {
  /**
   * Helper that mirrors OTO offer calculation logic
   */
  function calculateOtoOfferInfo(params: {
    otoEnabled: boolean;
    otoProductSlug?: string;
    customerHasOtoAccess: boolean;
  }): { hasOto: boolean; otoProductSlug?: string } | undefined {
    const { otoEnabled, otoProductSlug, customerHasOtoAccess } = params;

    if (!otoEnabled || !otoProductSlug) {
      return undefined;
    }

    if (customerHasOtoAccess) {
      return undefined; // OTO skipped
    }

    return { hasOto: true, otoProductSlug };
  }

  /**
   * Helper that mirrors final redirect URL calculation
   */
  function calculateFinalRedirectUrl(params: {
    isSuccessfulPayment: boolean;
    otoOfferInfo?: { hasOto: boolean };
    otoWasSkipped: boolean;
    successRedirectUrl?: string | null;
  }): string | undefined {
    const { isSuccessfulPayment, otoOfferInfo, otoWasSkipped, successRedirectUrl } = params;

    if (!isSuccessfulPayment) {
      return undefined;
    }

    if (otoOfferInfo) {
      return undefined; // OTO takes priority
    }

    if (otoWasSkipped) {
      return undefined; // User owns OTO product, no redirect
    }

    return successRedirectUrl || undefined;
  }

  describe('OTO Offer Info Calculation', () => {
    it('should return OTO info when OTO enabled and user does NOT own OTO product', () => {
      const result = calculateOtoOfferInfo({
        otoEnabled: true,
        otoProductSlug: 'premium-course',
        customerHasOtoAccess: false,
      });

      expect(result).toBeDefined();
      expect(result?.hasOto).toBe(true);
      expect(result?.otoProductSlug).toBe('premium-course');
    });

    it('should return undefined when user already owns OTO product', () => {
      const result = calculateOtoOfferInfo({
        otoEnabled: true,
        otoProductSlug: 'premium-course',
        customerHasOtoAccess: true,
      });

      expect(result).toBeUndefined();
    });

    it('should return undefined when OTO is not enabled', () => {
      const result = calculateOtoOfferInfo({
        otoEnabled: false,
        otoProductSlug: undefined,
        customerHasOtoAccess: false,
      });

      expect(result).toBeUndefined();
    });
  });

  describe('Final Redirect URL Calculation', () => {
    it('should NOT set redirect URL when OTO offer is active', () => {
      const result = calculateFinalRedirectUrl({
        isSuccessfulPayment: true,
        otoOfferInfo: { hasOto: true },
        otoWasSkipped: false,
        successRedirectUrl: 'https://example.com/thanks',
      });

      expect(result).toBeUndefined();
    });

    it('should NOT set redirect URL when OTO was skipped (user owns product)', () => {
      const result = calculateFinalRedirectUrl({
        isSuccessfulPayment: true,
        otoOfferInfo: undefined,
        otoWasSkipped: true,
        successRedirectUrl: 'https://example.com/thanks',
      });

      expect(result).toBeUndefined();
    });

    it('should set redirect URL when no OTO and redirect URL is configured', () => {
      const result = calculateFinalRedirectUrl({
        isSuccessfulPayment: true,
        otoOfferInfo: undefined,
        otoWasSkipped: false,
        successRedirectUrl: 'https://example.com/thanks',
      });

      expect(result).toBe('https://example.com/thanks');
    });

    it('should NOT set redirect URL when no redirect URL is configured', () => {
      const result = calculateFinalRedirectUrl({
        isSuccessfulPayment: true,
        otoOfferInfo: undefined,
        otoWasSkipped: false,
        successRedirectUrl: null,
      });

      expect(result).toBeUndefined();
    });

    it('should NOT set redirect URL when payment was not successful', () => {
      const result = calculateFinalRedirectUrl({
        isSuccessfulPayment: false,
        otoOfferInfo: undefined,
        otoWasSkipped: false,
        successRedirectUrl: 'https://example.com/thanks',
      });

      expect(result).toBeUndefined();
    });
  });

  describe('Full Scenario Tests', () => {
    // Scenario 1: Logged-in user, OTO enabled, doesn't own OTO
    it('Scenario: Logged-in + OTO enabled + does NOT own OTO → Show OTO, no redirect', () => {
      const otoOfferInfo = calculateOtoOfferInfo({
        otoEnabled: true,
        otoProductSlug: 'upsell-product',
        customerHasOtoAccess: false,
      });

      const finalRedirectUrl = calculateFinalRedirectUrl({
        isSuccessfulPayment: true,
        otoOfferInfo,
        otoWasSkipped: false,
        successRedirectUrl: null, // Not applicable when OTO is enabled
      });

      expect(otoOfferInfo?.hasOto).toBe(true);
      expect(finalRedirectUrl).toBeUndefined();
    });

    // Scenario 2: Logged-in user, OTO enabled, owns OTO
    it('Scenario: Logged-in + OTO enabled + owns OTO → No OTO, no redirect', () => {
      const otoOfferInfo = calculateOtoOfferInfo({
        otoEnabled: true,
        otoProductSlug: 'upsell-product',
        customerHasOtoAccess: true, // User already owns it
      });

      const finalRedirectUrl = calculateFinalRedirectUrl({
        isSuccessfulPayment: true,
        otoOfferInfo,
        otoWasSkipped: true, // OTO was skipped
        successRedirectUrl: null,
      });

      expect(otoOfferInfo).toBeUndefined();
      expect(finalRedirectUrl).toBeUndefined();
    });

    // Scenario 3: Logged-in user, redirect URL configured
    it('Scenario: Logged-in + Redirect URL → Countdown + redirect', () => {
      const otoOfferInfo = calculateOtoOfferInfo({
        otoEnabled: false,
        otoProductSlug: undefined,
        customerHasOtoAccess: false,
      });

      const finalRedirectUrl = calculateFinalRedirectUrl({
        isSuccessfulPayment: true,
        otoOfferInfo,
        otoWasSkipped: false,
        successRedirectUrl: 'https://example.com/thank-you',
      });

      expect(otoOfferInfo).toBeUndefined();
      expect(finalRedirectUrl).toBe('https://example.com/thank-you');
    });

    // Scenario 4: Logged-in user, nothing configured
    it('Scenario: Logged-in + nothing configured → Countdown + redirect to product', () => {
      const otoOfferInfo = calculateOtoOfferInfo({
        otoEnabled: false,
        otoProductSlug: undefined,
        customerHasOtoAccess: false,
      });

      const finalRedirectUrl = calculateFinalRedirectUrl({
        isSuccessfulPayment: true,
        otoOfferInfo,
        otoWasSkipped: false,
        successRedirectUrl: null,
      });

      expect(otoOfferInfo).toBeUndefined();
      expect(finalRedirectUrl).toBeUndefined();
      // In this case, useCountdown will redirect to /p/{slug}
    });

    // Scenario 5: Guest user, OTO enabled, doesn't own OTO
    it('Scenario: Guest + OTO enabled + does NOT own OTO → Show OTO, then magic link', () => {
      const otoOfferInfo = calculateOtoOfferInfo({
        otoEnabled: true,
        otoProductSlug: 'upsell-product',
        customerHasOtoAccess: false,
      });

      expect(otoOfferInfo?.hasOto).toBe(true);
      // Guest will see OTO first, then magic link after skip/accept
    });

    // Scenario 6: Guest user, redirect URL configured
    it('Scenario: Guest + Redirect URL → Magic link, countdown, redirect', () => {
      const otoOfferInfo = calculateOtoOfferInfo({
        otoEnabled: false,
        otoProductSlug: undefined,
        customerHasOtoAccess: false,
      });

      const finalRedirectUrl = calculateFinalRedirectUrl({
        isSuccessfulPayment: true,
        otoOfferInfo,
        otoWasSkipped: false,
        successRedirectUrl: 'https://example.com/thank-you',
      });

      expect(otoOfferInfo).toBeUndefined();
      expect(finalRedirectUrl).toBe('https://example.com/thank-you');
      // Guest will see magic link status with countdown after magic link is sent
    });

    // Scenario 7: Guest user, nothing configured
    it('Scenario: Guest + nothing configured → Magic link only, stays on page', () => {
      const otoOfferInfo = calculateOtoOfferInfo({
        otoEnabled: false,
        otoProductSlug: undefined,
        customerHasOtoAccess: false,
      });

      const finalRedirectUrl = calculateFinalRedirectUrl({
        isSuccessfulPayment: true,
        otoOfferInfo,
        otoWasSkipped: false,
        successRedirectUrl: null,
      });

      expect(otoOfferInfo).toBeUndefined();
      expect(finalRedirectUrl).toBeUndefined();
      // Guest stays on magic link page with no redirect
    });
  });
});
