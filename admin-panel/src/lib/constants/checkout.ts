// Checkout configuration constants
export const CHECKOUT_CONFIG = {
  RATE_LIMIT: {
    MAX_REQUESTS: 10,
    WINDOW_MINUTES: 1,
    ACTION_TYPE: 'checkout_creation'
  },
  SESSION: {
    EXPIRES_HOURS: 24,
    UI_MODE: 'embedded' as const,
    PAYMENT_MODE: 'payment' as const
  },
  VALIDATION: {
    EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    MIN_PRICE: 0.01
  }
} as const;

// Error messages
export const CHECKOUT_ERRORS = {
  PRODUCT_ID_REQUIRED: 'Product ID is required',
  INVALID_EMAIL: 'Invalid email format',
  PRODUCT_NOT_FOUND: 'Product not found or inactive',
  PRODUCT_UNAVAILABLE: 'Product not available for purchase',
  DUPLICATE_ACCESS: 'You already have access to this product',
  RATE_LIMIT_EXCEEDED: 'Too many checkout attempts. Please try again later.',
  STRIPE_SESSION_FAILED: 'Failed to create checkout session',
  INVALID_PRICE: 'Invalid product price'
} as const;

// HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500
} as const;
