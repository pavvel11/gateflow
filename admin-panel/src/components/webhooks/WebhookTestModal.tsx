'use client';

import React, { useState, useEffect } from 'react';
import { WebhookEndpoint } from '@/types/webhooks';
import { BaseModal, ModalHeader, ModalBody, ModalFooter, Button } from '../ui/Modal';
import { useTranslations } from 'next-intl';

interface WebhookTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTest: (eventType: string) => Promise<void>;
  endpoint: WebhookEndpoint | null;
  isSending: boolean;
}

// Mock payloads for preview (client-side version)
const MOCK_PAYLOADS: Record<string, any> = {
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
    timestamp: new Date().toISOString(),
    system: { version: '1.0.0', environment: 'production' }
  }
};

export default function WebhookTestModal({
  isOpen,
  onClose,
  onTest,
  endpoint,
  isSending
}: WebhookTestModalProps) {
  const t = useTranslations('admin.webhooks');
  const tCommon = useTranslations('common');
  const [selectedEvent, setSelectedEvent] = useState<string>('');

  useEffect(() => {
    if (endpoint) {
      setSelectedEvent(endpoint.events[0] || 'test.event');
    }
  }, [endpoint, isOpen]);

  const getEventLabel = (eventValue: string) => {
    if (eventValue === 'test.event') return 'Generic Test Event';
    const key = eventValue.replace('.', '_');
    try {
      return t(`events_list.${key}`);
    } catch {
      return eventValue;
    }
  };

  if (!endpoint) return null;

  const currentPayload = MOCK_PAYLOADS[selectedEvent] || MOCK_PAYLOADS['test.event'];

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader title={t('test')} />
      <ModalBody>
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Select an event type to send a mock payload to:
            <br />
            <span className="font-mono text-xs mt-1 block p-2 bg-gray-100 dark:bg-gray-900 rounded">
              {endpoint.url}
            </span>
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Event Type
            </label>
            <select
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            >
              <option value="test.event">Generic Test Event</option>
              {endpoint.events.map((ev) => (
                <option key={ev} value={ev}>
                  {getEventLabel(ev)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Example Payload
            </label>
            <div className="bg-gray-900 dark:bg-gray-950 rounded-lg p-4 border border-gray-700 max-h-96 overflow-y-auto">
              <pre className="text-xs font-mono text-gray-100">
                <code>{JSON.stringify({
                  event: selectedEvent,
                  timestamp: new Date().toISOString(),
                  data: currentPayload
                }, null, 2)}</code>
              </pre>
            </div>
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button onClick={onClose} variant="secondary">
          {tCommon('cancel')}
        </Button>
        <Button onClick={() => onTest(selectedEvent)} loading={isSending} variant="primary">
          Send Test
        </Button>
      </ModalFooter>
    </BaseModal>
  );
}
