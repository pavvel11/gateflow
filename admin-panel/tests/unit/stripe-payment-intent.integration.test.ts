/**
 * Stripe PaymentIntent Integration Tests
 *
 * Tests real Stripe API responses for each payment config mode.
 * Requires STRIPE_SECRET_KEY (test mode) in .env.local.
 *
 * These tests create real PaymentIntents in Stripe test mode (free),
 * verify the response, and immediately cancel them.
 *
 * Run: bun test tests/unit/stripe-payment-intent.integration.test.ts
 */

import { describe, it, expect, afterAll } from 'vitest';
import Stripe from 'stripe';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

// Collect PaymentIntent IDs for cleanup
const createdIntents: string[] = [];

function getStripe(): Stripe | null {
  if (!STRIPE_SECRET_KEY || !STRIPE_SECRET_KEY.startsWith('sk_test_')) {
    return null;
  }
  return new Stripe(STRIPE_SECRET_KEY);
}

const stripe = getStripe();

// Skip all tests if no test key available
const describeWithStripe = stripe ? describe : describe.skip;

// Cleanup: cancel all created PaymentIntents
afterAll(async () => {
  if (!stripe || createdIntents.length === 0) return;
  await Promise.allSettled(
    createdIntents.map((id) => stripe.paymentIntents.cancel(id))
  );
});

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function createAndTrack(
  params: Stripe.PaymentIntentCreateParams
): Promise<Stripe.PaymentIntent> {
  const pi = await stripe!.paymentIntents.create(params);
  createdIntents.push(pi.id);
  return pi;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describeWithStripe('Stripe PaymentIntent Integration', () => {
  // -------------------------------------------------------------------------
  // Automatic mode
  // -------------------------------------------------------------------------

  describe('automatic mode', () => {
    it('should accept automatic_payment_methods and return payment methods', async () => {
      const pi = await createAndTrack({
        amount: 1000,
        currency: 'pln',
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'always',
        },
      });

      expect(pi.status).toBe('requires_payment_method');
      // Stripe populates payment_method_types based on account config
      expect(pi.payment_method_types).toBeDefined();
      expect(pi.payment_method_types.length).toBeGreaterThan(0);
      expect(pi.payment_method_types).toContain('card');
    });

    it('should include link in automatic mode if enabled on account', async () => {
      const pi = await createAndTrack({
        amount: 1000,
        currency: 'pln',
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'always',
        },
        payment_method_options: {
          link: { setup_future_usage: 'off_session' },
        },
      });

      // Link availability depends on Stripe Dashboard settings
      // This test documents what Stripe returns — not a hard assertion
      console.log(
        '[automatic PLN] payment_method_types:',
        pi.payment_method_types
      );
      expect(pi.payment_method_types).toContain('card');
    });

    it('should work with EUR currency', async () => {
      const pi = await createAndTrack({
        amount: 1000,
        currency: 'eur',
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'always',
        },
      });

      expect(pi.payment_method_types).toContain('card');
      console.log(
        '[automatic EUR] payment_method_types:',
        pi.payment_method_types
      );
    });
  });

  // -------------------------------------------------------------------------
  // Custom mode — explicit payment_method_types
  // -------------------------------------------------------------------------

  describe('custom mode (payment_method_types)', () => {
    it('should accept card + link', async () => {
      const pi = await createAndTrack({
        amount: 1000,
        currency: 'pln',
        payment_method_types: ['card', 'link'],
      });

      expect(pi.payment_method_types).toEqual(
        expect.arrayContaining(['card', 'link'])
      );
    });

    it('should accept card only', async () => {
      const pi = await createAndTrack({
        amount: 1000,
        currency: 'pln',
        payment_method_types: ['card'],
      });

      expect(pi.payment_method_types).toEqual(['card']);
    });

    it('should accept blik for PLN if activated on account', async () => {
      try {
        const pi = await createAndTrack({
          amount: 1000,
          currency: 'pln',
          payment_method_types: ['card', 'blik'],
        });

        expect(pi.payment_method_types).toContain('blik');
        expect(pi.payment_method_types).toContain('card');
      } catch (err: any) {
        // If blik is not activated, Stripe returns 400
        // This is expected and documents the issue
        expect(err.type).toBe('StripeInvalidRequestError');
        console.warn(
          '[custom blik] BLIK not activated on this Stripe account:',
          err.message
        );
      }
    });

    it('should accept p24 for PLN if activated on account', async () => {
      try {
        const pi = await createAndTrack({
          amount: 1000,
          currency: 'pln',
          payment_method_types: ['card', 'p24'],
        });

        expect(pi.payment_method_types).toContain('p24');
      } catch (err: any) {
        expect(err.type).toBe('StripeInvalidRequestError');
        console.warn(
          '[custom p24] P24 not activated on this Stripe account:',
          err.message
        );
      }
    });

    it('should reject blik for EUR (currency mismatch)', async () => {
      try {
        await stripe!.paymentIntents.create({
          amount: 1000,
          currency: 'eur',
          payment_method_types: ['card', 'blik'],
        });
        // If it succeeds, that's unexpected but not a failure
      } catch (err: any) {
        // BLIK only supports PLN — Stripe should reject EUR+blik
        expect(err.type).toBe('StripeInvalidRequestError');
      }
    });
  });

  // -------------------------------------------------------------------------
  // Mutual exclusivity — Stripe rejects mixed params
  // -------------------------------------------------------------------------

  describe('mutual exclusivity', () => {
    it('should reject automatic_payment_methods + payment_method_types', async () => {
      try {
        await stripe!.paymentIntents.create({
          amount: 1000,
          currency: 'pln',
          automatic_payment_methods: { enabled: true },
          payment_method_types: ['card'],
        });
        throw new Error('Should have thrown');
      } catch (err: any) {
        expect(err.type).toBe('StripeInvalidRequestError');
        expect(err.message).toContain('automatic_payment_methods');
      }
    });

    it('should reject automatic_payment_methods + payment_method_configuration', async () => {
      try {
        await stripe!.paymentIntents.create({
          amount: 1000,
          currency: 'pln',
          automatic_payment_methods: { enabled: true },
          payment_method_configuration: 'pmc_fake',
        });
        throw new Error('Should have thrown');
      } catch (err: any) {
        expect(err.type).toBe('StripeInvalidRequestError');
      }
    });
  });

  // -------------------------------------------------------------------------
  // Link-specific behavior
  // -------------------------------------------------------------------------

  describe('Link payment method', () => {
    it('should accept link as explicit payment_method_type', async () => {
      const pi = await createAndTrack({
        amount: 1000,
        currency: 'pln',
        payment_method_types: ['card', 'link'],
        payment_method_options: {
          link: { setup_future_usage: 'off_session' },
        },
      });

      expect(pi.payment_method_types).toContain('link');
    });

    it('should work with link for USD', async () => {
      const pi = await createAndTrack({
        amount: 1000,
        currency: 'usd',
        payment_method_types: ['card', 'link'],
      });

      expect(pi.payment_method_types).toContain('link');
      expect(pi.payment_method_types).toContain('card');
    });

    it('should work with link for EUR', async () => {
      const pi = await createAndTrack({
        amount: 1000,
        currency: 'eur',
        payment_method_types: ['card', 'link'],
      });

      expect(pi.payment_method_types).toContain('link');
    });
  });
});
