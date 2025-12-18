// Error types for better error handling
export enum CheckoutErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  PRODUCT_NOT_FOUND = 'PRODUCT_NOT_FOUND',
  PRODUCT_UNAVAILABLE = 'PRODUCT_UNAVAILABLE',
  DUPLICATE_ACCESS = 'DUPLICATE_ACCESS',
  STRIPE_ERROR = 'STRIPE_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export class CheckoutError extends Error {
  constructor(
    public type: CheckoutErrorType,
    message: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'CheckoutError';
  }
}

// Request/Response types
export interface CreateCheckoutRequest {
  productId: string;
  email?: string;
  bumpProductId?: string; // Optional order bump product ID
}

export interface CreateCheckoutResponse {
  clientSecret: string;
  sessionId: string;
}

export interface CheckoutErrorResponse {
  error: string;
  type: CheckoutErrorType;
}

// Product types for checkout
export interface ProductForCheckout {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  is_active: boolean;
  available_from: string | null;
  available_until: string | null;
}

// User access types
export interface UserAccessData {
  access_expires_at: string | null;
  access_duration_days: number | null;
  access_granted_at: string;
}

// Checkout session options
export interface CheckoutSessionOptions {
  product: ProductForCheckout;
  bumpProduct?: ProductForCheckout; // Optional order bump product
  email?: string;
  userId?: string;
  returnUrl: string;
}
