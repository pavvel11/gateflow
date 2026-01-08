/**
 * Mock payloads for webhook testing and preview.
 * Used by both server-side WebhookService and client-side WebhookTestModal.
 */
export const WEBHOOK_MOCK_PAYLOADS: Record<string, any> = {
  'purchase.completed': {
    customer: {
      email: 'customer@example.com',
      firstName: 'Jan',
      lastName: 'Kowalski',
      userId: null
    },
    product: {
      id: 'prod_12345678',
      name: 'Premium Course',
      slug: 'premium-course',
      price: 4999,
      currency: 'usd',
      icon: '🎓'
    },
    bumpProduct: null,
    order: {
      amount: 4999,
      currency: 'usd',
      sessionId: 'cs_test_a1b2c3d4e5f6g7h8i9j0',
      paymentIntentId: 'pi_test_123',
      couponId: null,
      isGuest: false
    },
    invoice: {
      needsInvoice: true,
      nip: '1234567890',
      companyName: 'Przykładowa Firma Sp. z o.o.',
      address: 'ul. Testowa 123/45',
      city: 'Warszawa',
      postalCode: '00-001',
      country: 'PL'
    }
  },
  'lead.captured': {
    customer: {
      email: 'lead@example.com',
      userId: 'user_123abc'
    },
    product: {
      id: 'prod_free_123',
      name: 'Free Tutorial',
      slug: 'free-tutorial',
      price: 0,
      currency: 'USD',
      icon: '📚'
    }
  },
  'waitlist.signup': {
    customer: {
      email: 'interested@example.com'
    },
    product: {
      id: 'prod_upcoming_123',
      name: 'Upcoming Course',
      slug: 'upcoming-course',
      price: 9900,
      currency: 'PLN',
      icon: '🚀'
    }
  },
  'subscription.started': {
    email: 'subscriber@example.com',
    planId: 'price_monthly_123',
    amount: 2900,
    currency: 'usd',
    status: 'active'
  },
  'refund.issued': {
    email: 'customer@example.com',
    amount: 4999,
    currency: 'usd',
    reason: 'requested_by_customer'
  },
  'test.event': {
    message: 'This is a test event from GateFlow',
    system: { version: '1.0.0', environment: 'production' }
  }
};
