import { createAdminClient } from '@/lib/supabase/admin';
import crypto from 'crypto';

interface WebhookPayload {
  event: string;
  timestamp: string;
  data: any;
}

const MOCK_PAYLOADS: Record<string, any> = {
  'purchase.completed': {
    email: 'customer@example.com',
    productId: 'prod_12345678',
    productName: 'Premium Course',
    amount: 4999,
    currency: 'usd',
    sessionId: 'cs_test_a1b2c3d4e5f6g7h8i9j0',
    isGuest: false,
    timestamp: new Date().toISOString()
  },
  'lead.captured': {
    email: 'lead@example.com',
    productId: 'prod_free_123',
    productName: 'Free Tutorial',
    userId: 'user_123abc',
    timestamp: new Date().toISOString()
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

export class WebhookService {
  /**
   * Triggers webhooks for a specific event to all subscribers.
   */
  static async trigger(event: string, data: any) {
    const supabase = createAdminClient();

    try {
      const { data: endpoints, error } = await supabase
        .from('webhook_endpoints')
        .select('id, url, secret')
        .eq('is_active', true)
        .contains('events', [event]);

      if (error) {
        console.error('Failed to fetch webhook endpoints:', error);
        return;
      }

      if (!endpoints || endpoints.length === 0) {
        return;
      }

      const timestamp = new Date().toISOString();
      const payload: WebhookPayload = { event, timestamp, data };

      // Execute in parallel
      const promises = endpoints.map(endpoint => 
        this.dispatchWebhook(endpoint, event, payload)
      );

      await Promise.allSettled(promises);

    } catch (err) {
      console.error('Error in WebhookService.trigger:', err);
    }
  }

  /**
   * Sends a test event to a specific endpoint
   */
  static async testEndpoint(endpointId: string, eventType: string = 'test.event') {
    const supabase = createAdminClient();
    
    const { data: endpoint, error } = await supabase
      .from('webhook_endpoints')
      .select('*')
      .eq('id', endpointId)
      .single();

    if (error || !endpoint) {
      throw new Error('Endpoint not found');
    }

    const mockData = MOCK_PAYLOADS[eventType] || MOCK_PAYLOADS['test.event'];
    const timestamp = new Date().toISOString();
    const payload: WebhookPayload = {
      event: eventType,
      timestamp,
      data: mockData,
    };

    return this.dispatchWebhook(endpoint, eventType, payload);
  }

  /**
   * Retries a specific webhook log entry.
   * Marks the old log as 'retried' if the retry request is dispatched successfully.
   */
  static async retry(logId: string) {
    const supabase = createAdminClient();

    const { data: log, error: logError } = await supabase
      .from('webhook_logs')
      .select('payload, endpoint_id, event_type')
      .eq('id', logId)
      .single();

    if (logError || !log) {
      throw new Error('Log entry not found');
    }

    const { data: endpoint, error: endpointError } = await supabase
      .from('webhook_endpoints')
      .select('id, url, secret')
      .eq('id', log.endpoint_id)
      .single();

    if (endpointError || !endpoint) {
      throw new Error('Endpoint not found');
    }

    const options = { headers: { 'X-GateFlow-Retry': 'true' } };
    const result = await this.dispatchWebhook(endpoint, log.event_type, log.payload, options);

    // If dispatch executed (even if it failed HTTP-wise, we logged a new attempt),
    // mark the OLD log as retried to clean up the queue.
    if (result.success || result.status > 0) {
      await supabase
        .from('webhook_logs')
        .update({ status: 'retried' })
        .eq('id', logId);
    }

    return result;
  }

  /**
   * Core dispatch logic (DRY)
   * Handles signing, sending, and logging.
   */
  private static async dispatchWebhook(
    endpoint: { id: string; url: string; secret: string }, 
    event: string, 
    payload: any,
    extraOptions: { headers?: Record<string, string> } = {}
  ) {
    const supabase = createAdminClient();
    const payloadString = JSON.stringify(payload);
    const signature = this.signPayload(payloadString, endpoint.secret);
    const timestamp = payload.timestamp || new Date().toISOString();
    
    let responseStatus = 0;
    let responseBody = '';
    let errorMessage = null;
    let status = 'failed';
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-GateFlow-Event': event,
          'X-GateFlow-Signature': signature,
          'X-GateFlow-Timestamp': timestamp,
          ...extraOptions.headers
        },
        body: payloadString,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      responseStatus = response.status;
      responseBody = await response.text();
      
      if (response.ok) {
        status = 'success';
      } else {
        status = 'failed';
        errorMessage = `HTTP ${response.status}`;
      }

    } catch (err: any) {
      status = 'failed';
      if (err.name === 'AbortError') {
        errorMessage = 'Request timed out (5s)';
        responseStatus = 408;
      } else {
        errorMessage = err.message;
        responseStatus = 0; // Network error
      }
    } finally {
      const duration = Date.now() - startTime;
      
      // Log result
      await supabase.from('webhook_logs').insert({
        endpoint_id: endpoint.id,
        event_type: event,
        payload: payload,
        status: status,
        http_status: responseStatus,
        response_body: responseBody ? responseBody.substring(0, 5000) : null,
        error_message: errorMessage,
        duration_ms: duration,
      });
    }

    return { success: status === 'success', status: responseStatus, error: errorMessage };
  }

  private static signPayload(payload: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }
}
