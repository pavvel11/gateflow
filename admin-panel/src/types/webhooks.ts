export interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  description?: string;
  is_active: boolean;
  secret: string;
  created_at: string;
}

export interface WebhookLog {
  id: string;
  endpoint_id: string;
  event_type: string;
  payload: any;
  
  // New fields
  status: 'success' | 'failed' | 'retried' | 'archived';
  http_status: number; // Formerly response_status
  
  response_body: string;
  error_message?: string;
  duration_ms: number;
  created_at: string;
  
  endpoint?: {
    id: string;
    url: string;
    description?: string;
  };
}

export const WEBHOOK_EVENTS = [
  { value: 'purchase.completed', label: 'Purchase Completed' },
  { value: 'lead.captured', label: 'Lead Captured (Free Product)' },
  // { value: 'subscription.started', label: 'Subscription Started' }, // TODO: Implement when Subscriptions are ready
  // { value: 'refund.issued', label: 'Refund Issued' }, // TODO: Implement when Refunds are ready
];