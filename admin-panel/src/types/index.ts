export interface Product {
  id: string
  name: string
  slug: string
  description: string
  icon: string
  price: number
  currency: string
  theme: string
  stripe_price_id: string | null
  layout_template: string
  redirect_url?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  tenant_id?: string
}

export interface UserProductAccess {
  id: string
  user_id: string
  product_id: string
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
