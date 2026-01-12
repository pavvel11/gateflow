/**
 * API Integration Tests: Webhooks
 *
 * Tests the /api/v1/webhooks endpoints
 */

import { describe, it, expect, afterAll } from 'vitest';
import { get, post, patch, del, testData, cleanup, deleteTestApiKey } from './setup';

interface Webhook {
  id: string;
  url: string;
  events: string[];
  is_active: boolean;
  secret: string;
  created_at: string;
}

interface WebhookLog {
  id: string;
  webhook_id: string;
  event_type: string;
  status_code: number | null;
  success: boolean;
  created_at: string;
}

interface ApiResponse<T> {
  data?: T;
  error?: { code: string; message: string };
  pagination?: { cursor: string | null; has_more: boolean };
}

describe('Webhooks API', () => {
  const createdWebhookIds: string[] = [];

  afterAll(async () => {
    await cleanup({ webhooks: createdWebhookIds });
    await deleteTestApiKey();
  });

  describe('GET /api/v1/webhooks', () => {
    it('returns a list of webhooks', async () => {
      const { status, data } = await get<ApiResponse<Webhook[]>>('/api/v1/webhooks');

      expect(status).toBe(200);
      expect(data.data).toBeDefined();
      expect(Array.isArray(data.data)).toBe(true);
    });
  });

  describe('POST /api/v1/webhooks', () => {
    it('creates a new webhook', async () => {
      const webhookData = testData.webhook();
      const { status, data } = await post<ApiResponse<Webhook>>('/api/v1/webhooks', webhookData);

      expect(status).toBe(201);
      expect(data.data).toBeDefined();
      expect(data.data!.url).toBe(webhookData.url);
      expect(data.data!.events).toEqual(webhookData.events);
      expect(data.data!.secret).toBeDefined(); // Secret should be returned on creation

      if (data.data?.id) {
        createdWebhookIds.push(data.data.id);
      }
    });

    it('creates webhook with multiple events', async () => {
      const webhookData = testData.webhook({
        events: ['payment.completed', 'payment.failed', 'access.granted'],
      });
      const { status, data } = await post<ApiResponse<Webhook>>('/api/v1/webhooks', webhookData);

      expect(status).toBe(201);
      expect(data.data!.events).toHaveLength(3);

      if (data.data?.id) {
        createdWebhookIds.push(data.data.id);
      }
    });

    it('validates URL format', async () => {
      const { status, data } = await post<ApiResponse<Webhook>>('/api/v1/webhooks', {
        url: 'not-a-valid-url',
        events: ['payment.completed'],
      });

      expect(status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('validates events array', async () => {
      const { status, data } = await post<ApiResponse<Webhook>>('/api/v1/webhooks', {
        url: 'https://example.com/webhook',
        events: [], // Empty events
      });

      expect(status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('rejects private IP URLs (SSRF protection)', async () => {
      const { status, data } = await post<ApiResponse<Webhook>>('/api/v1/webhooks', {
        url: 'http://localhost:8080/webhook',
        events: ['payment.completed'],
      });

      expect(status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('rejects internal network URLs (SSRF protection)', async () => {
      const { status, data } = await post<ApiResponse<Webhook>>('/api/v1/webhooks', {
        url: 'http://192.168.1.1/webhook',
        events: ['payment.completed'],
      });

      expect(status).toBe(400);
      expect(data.error).toBeDefined();
    });
  });

  describe('GET /api/v1/webhooks/:id', () => {
    it('returns a single webhook', async () => {
      // Create a webhook first
      const { data: createData } = await post<ApiResponse<Webhook>>('/api/v1/webhooks', testData.webhook());
      const webhookId = createData.data!.id;
      createdWebhookIds.push(webhookId);

      const { status, data } = await get<ApiResponse<Webhook>>(`/api/v1/webhooks/${webhookId}`);

      expect(status).toBe(200);
      expect(data.data!.id).toBe(webhookId);
    });

    it('returns 404 for non-existent webhook', async () => {
      const { status, data } = await get<ApiResponse<Webhook>>('/api/v1/webhooks/00000000-0000-0000-0000-000000000000');

      expect(status).toBe(404);
      expect(data.error!.code).toBe('NOT_FOUND');
    });
  });

  describe('PATCH /api/v1/webhooks/:id', () => {
    it('updates webhook URL', async () => {
      const { data: createData } = await post<ApiResponse<Webhook>>('/api/v1/webhooks', testData.webhook());
      const webhookId = createData.data!.id;
      createdWebhookIds.push(webhookId);

      const newUrl = 'https://new-webhook.example.com/endpoint';
      const { status, data } = await patch<ApiResponse<Webhook>>(`/api/v1/webhooks/${webhookId}`, {
        url: newUrl,
      });

      expect(status).toBe(200);
      expect(data.data!.url).toBe(newUrl);
    });

    it('updates webhook events', async () => {
      const { data: createData } = await post<ApiResponse<Webhook>>('/api/v1/webhooks', testData.webhook());
      const webhookId = createData.data!.id;
      createdWebhookIds.push(webhookId);

      const newEvents = ['payment.completed', 'refund.processed'];
      const { status, data } = await patch<ApiResponse<Webhook>>(`/api/v1/webhooks/${webhookId}`, {
        events: newEvents,
      });

      expect(status).toBe(200);
      expect(data.data!.events).toEqual(newEvents);
    });

    it('deactivates webhook', async () => {
      const { data: createData } = await post<ApiResponse<Webhook>>('/api/v1/webhooks', testData.webhook());
      const webhookId = createData.data!.id;
      createdWebhookIds.push(webhookId);

      const { status, data } = await patch<ApiResponse<Webhook>>(`/api/v1/webhooks/${webhookId}`, {
        is_active: false,
      });

      expect(status).toBe(200);
      expect(data.data!.is_active).toBe(false);
    });
  });

  describe('DELETE /api/v1/webhooks/:id', () => {
    it('deletes a webhook', async () => {
      const { data: createData } = await post<ApiResponse<Webhook>>('/api/v1/webhooks', testData.webhook());
      const webhookId = createData.data!.id;

      const { status } = await del<ApiResponse<null>>(`/api/v1/webhooks/${webhookId}`);
      expect(status).toBe(204);

      // Verify it's gone
      const { status: getStatus } = await get<ApiResponse<Webhook>>(`/api/v1/webhooks/${webhookId}`);
      expect(getStatus).toBe(404);
    });
  });

  describe('GET /api/v1/webhooks/logs', () => {
    it('returns webhook logs', async () => {
      const { status, data } = await get<ApiResponse<WebhookLog[]>>('/api/v1/webhooks/logs');

      expect(status).toBe(200);
      expect(data.data).toBeDefined();
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('supports pagination', async () => {
      const { status, data } = await get<ApiResponse<WebhookLog[]>>('/api/v1/webhooks/logs?limit=10');

      expect(status).toBe(200);
      expect(data.pagination).toBeDefined();
    });
  });

  describe('POST /api/v1/webhooks/:id/test', () => {
    it('sends a test webhook', async () => {
      // Create a webhook first
      const { data: createData } = await post<ApiResponse<Webhook>>('/api/v1/webhooks', testData.webhook());
      const webhookId = createData.data!.id;
      createdWebhookIds.push(webhookId);

      const { status, data } = await post<ApiResponse<{ success: boolean; status_code: number }>>(
        `/api/v1/webhooks/${webhookId}/test`,
        {}
      );

      // Test webhook might succeed or fail depending on the endpoint
      expect([200, 400, 500]).toContain(status);
    });

    it('returns 404 for non-existent webhook', async () => {
      const { status, data } = await post<ApiResponse<null>>(
        '/api/v1/webhooks/00000000-0000-0000-0000-000000000000/test',
        {}
      );

      expect(status).toBe(404);
      expect(data.error).toBeDefined();
    });
  });
});
