export interface Product {
  id: string
  name: string
  slug: string
  description: string
  icon: string
  price: number
  currency: string
  layout_template: string
  is_active: boolean
  is_featured: boolean
  // Temporal availability fields
  available_from?: string | null
  available_until?: string | null
  // Auto-grant access duration for users
  auto_grant_duration_days?: number | null
  // Content delivery fields (clean implementation)
  content_delivery_type: 'redirect' | 'content'
  content_config: ProductContentConfig
  // Funnel / OTO settings
  success_redirect_url?: string | null
  pass_params_to_redirect: boolean
  created_at: string
  updated_at: string
  tenant_id?: string
}

export interface ProductContentConfig {
  // For redirect type
  redirect_url?: string
  // For content type
  content_items?: ContentItem[]
}

export interface ContentItem {
  id: string
  type: 'video_embed' | 'download_link' | 'hosted_video' | 'hosted_file' // Extensible for future
  title: string
  description?: string
  config: ContentItemConfig
  order: number
  is_active: boolean
}

export interface ContentItemConfig {
  // For video_embed
  embed_url?: string
  embed_code?: string
  // Video embed options
  autoplay?: boolean
  loop?: boolean
  muted?: boolean
  preload?: boolean
  controls?: boolean
  // For download_link
  download_url?: string
  file_name?: string
  file_size?: string
  // For future hosted content
  hosted_file_id?: string
  mime_type?: string
  // Common settings
  thumbnail_url?: string
  duration?: string
  access_level?: 'basic' | 'premium' | 'vip'
}

export interface UserProductAccess {
  id: string
  user_id: string
  product_id: string
  access_granted_at: string
  access_expires_at?: string | null
  access_duration_days?: number | null
  created_at: string
  tenant_id?: string
  
  // Include these fields from the view for convenience
  product_slug?: string
  product_name?: string
  product_price?: number
  product_currency?: string
}

export interface AdminUser {
  id: string
  email: string
  created_at: string
}

export interface AuditLog {
  id: string
  action: string
  user_id: string
  details: Record<string, unknown>
  created_at: string
}

export interface GatekeeperConfig {
  supabaseUrl: string
  supabaseAnonKey: string
  productSlug?: string
  enableMultitenant?: boolean
}

export interface User {
  id: string
  email: string
  created_at: string
  email_confirmed_at?: string
  last_sign_in_at?: string
  raw_app_meta_data?: Record<string, unknown>
  raw_user_meta_data?: Record<string, unknown>
}

export interface UserWithAccess extends User {
  product_access: {
    product_slug: string
    product_name: string
    product_price?: number
    product_currency?: string
    product_icon?: string
    product_is_active?: boolean
    granted_at: string
  }[]
  
  // Statistics
  stats?: {
    total_products: number
    total_value: number
    last_access_granted_at: string | null
    first_access_granted_at: string | null
  }
}

export interface WebhookConfig {
  id: string
  name: string
  endpoint_url: string
  is_enabled: boolean
  is_global: boolean
  product_id?: string | null
  secret_key?: string | null
  headers: Record<string, string>
  retry_attempts: number
  timeout_seconds: number
  tenant_id?: string
  created_at: string
  updated_at: string
}

export interface WebhookLog {
  id: string
  webhook_config_id: string
  user_id?: string | null
  product_id?: string | null
  endpoint_url: string
  request_payload: Record<string, unknown>
  request_headers: Record<string, string>
  response_status?: number | null
  response_body?: string | null
  response_headers: Record<string, string>
  attempt_number: number
  is_successful: boolean
  error_message?: string | null
  duration_ms?: number | null
  tenant_id?: string
  created_at: string
}

export interface WebhookPayload {
  event: 'access_granted'
  timestamp: string
  user: {
    id: string
    email: string
    created_at: string
    email_confirmed_at?: string | null
    last_sign_in_at?: string | null
    user_metadata?: Record<string, unknown>
  }
  product: {
    id: string
    name: string
    slug: string
    description: string
    icon: string
    price: number
    currency: string
    is_featured: boolean
    created_at: string
  }
}

// Payment-related types for admin panel
export interface PaymentTransaction {
  id: string;
  user_id: string;
  product_id: string;
  amount: number;
  currency: string;
  status: 'completed' | 'failed' | 'pending' | 'refunded';
  payment_method: string;
  stripe_payment_intent_id: string;
  refund_id?: string;
  refund_amount?: number;
  refund_reason?: string;
  refunded_at?: string;
  created_at: string;
  updated_at: string;
  user?: {
    email: string;
    full_name?: string;
  };
  product?: {
    name: string;
    type: string;
  };
}

export interface PaymentSession {
  id: string;
  user_id: string;
  product_id: string;
  stripe_session_id: string;
  status: 'pending' | 'completed' | 'expired' | 'canceled';
  amount: number;
  currency: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
  user?: {
    email: string;
    full_name?: string;
  };
  product?: {
    name: string;
    type: string;
  };
}

export interface PaymentStats {
  totalRevenue: number;
  totalTransactions: number;
  totalRefunded: number;
  totalPending: number;
  averageOrderValue: number;
  revenueChange: number;
  transactionsChange: number;
  recentActivity: {
    completedToday: number;
    failedToday: number;
    refundedToday: number;
  };
}

export interface AdminAction {
  id: string;
  admin_id: string;
  action: string;
  target_type: string;
  target_id: string;
  details?: Record<string, unknown>;
  created_at: string;
}
