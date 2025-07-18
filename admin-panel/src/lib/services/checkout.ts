import { createClient } from '@/lib/supabase/server';
import { getStripeServer } from '@/lib/stripe/server';
import { 
  CheckoutError, 
  CheckoutErrorType, 
  ProductForCheckout, 
  CheckoutSessionOptions,
  CreateCheckoutRequest 
} from '@/types/checkout';
import { CHECKOUT_CONFIG, CHECKOUT_ERRORS, HTTP_STATUS } from '@/lib/constants/checkout';

/**
 * Professional checkout service with proper error handling and validation
 */
export class CheckoutService {
  private supabase!: Awaited<ReturnType<typeof createClient>>;
  private stripe: ReturnType<typeof getStripeServer>;

  constructor() {
    this.stripe = getStripeServer();
  }

  /**
   * Initialize the service (must be called before using other methods)
   */
  async initialize(): Promise<void> {
    this.supabase = await createClient();
  }

  /**
   * Validate checkout request data
   */
  async validateRequest(request: CreateCheckoutRequest): Promise<void> {
    if (!request.productId) {
      throw new CheckoutError(
        CheckoutErrorType.VALIDATION_ERROR,
        CHECKOUT_ERRORS.PRODUCT_ID_REQUIRED,
        HTTP_STATUS.BAD_REQUEST
      );
    }

    if (request.email && !CHECKOUT_CONFIG.VALIDATION.EMAIL_REGEX.test(request.email)) {
      throw new CheckoutError(
        CheckoutErrorType.VALIDATION_ERROR,
        CHECKOUT_ERRORS.INVALID_EMAIL,
        HTTP_STATUS.BAD_REQUEST
      );
    }
  }

  /**
   * Check rate limiting for checkout creation
   */
  async checkRateLimit(identifier: string): Promise<void> {
    const { data: rateLimitOk, error } = await this.supabase.rpc('check_rate_limit', {
      identifier_param: identifier,
      action_type_param: CHECKOUT_CONFIG.RATE_LIMIT.ACTION_TYPE,
      max_requests: CHECKOUT_CONFIG.RATE_LIMIT.MAX_REQUESTS,
      window_minutes: CHECKOUT_CONFIG.RATE_LIMIT.WINDOW_MINUTES,
    });

    if (error || !rateLimitOk) {
      throw new CheckoutError(
        CheckoutErrorType.RATE_LIMIT_ERROR,
        CHECKOUT_ERRORS.RATE_LIMIT_EXCEEDED,
        HTTP_STATUS.TOO_MANY_REQUESTS
      );
    }
  }

  /**
   * Get and validate product for checkout
   */
  async getProduct(productId: string): Promise<ProductForCheckout> {
    const { data: product, error } = await this.supabase
      .from('products')
      .select('id, slug, name, description, price, currency, is_active, available_from, available_until')
      .eq('id', productId)
      .eq('is_active', true)
      .single();

    if (error || !product) {
      throw new CheckoutError(
        CheckoutErrorType.PRODUCT_NOT_FOUND,
        CHECKOUT_ERRORS.PRODUCT_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND
      );
    }

    // Validate product price
    if (product.price < CHECKOUT_CONFIG.VALIDATION.MIN_PRICE) {
      throw new CheckoutError(
        CheckoutErrorType.VALIDATION_ERROR,
        CHECKOUT_ERRORS.INVALID_PRICE,
        HTTP_STATUS.BAD_REQUEST
      );
    }

    return product;
  }

  /**
   * Validate temporal availability of product
   */
  validateTemporalAvailability(product: ProductForCheckout): void {
    const now = new Date();
    const availableFrom = product.available_from ? new Date(product.available_from) : null;
    const availableUntil = product.available_until ? new Date(product.available_until) : null;
    
    const isTemporallyAvailable = 
      (!availableFrom || availableFrom <= now) && 
      (!availableUntil || availableUntil > now);
    
    if (!isTemporallyAvailable) {
      throw new CheckoutError(
        CheckoutErrorType.PRODUCT_UNAVAILABLE,
        CHECKOUT_ERRORS.PRODUCT_UNAVAILABLE,
        HTTP_STATUS.BAD_REQUEST
      );
    }
  }

  /**
   * Check if user already has access to prevent duplicate purchases
   */
  async checkExistingAccess(userId: string, productId: string): Promise<void> {
    const { data: existingAccess } = await this.supabase
      .from('user_product_access')
      .select('access_expires_at')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .single();

    if (existingAccess) {
      const expiresAt = existingAccess.access_expires_at 
        ? new Date(existingAccess.access_expires_at) 
        : null;
      const isExpired = expiresAt && expiresAt < new Date();
      
      if (!isExpired) {
        throw new CheckoutError(
          CheckoutErrorType.DUPLICATE_ACCESS,
          CHECKOUT_ERRORS.DUPLICATE_ACCESS,
          HTTP_STATUS.BAD_REQUEST
        );
      }
    }
  }

  /**
   * Create Stripe checkout session
   */
  async createStripeSession(options: CheckoutSessionOptions): Promise<{ clientSecret: string; sessionId: string }> {
    try {
      console.log('Creating Stripe session with options:', {
        ui_mode: CHECKOUT_CONFIG.SESSION.UI_MODE,
        customer_email: options.email,
        product_name: options.product.name,
        product_price: options.product.price,
        currency: options.product.currency,
        return_url: options.returnUrl
      });

      // Prepare session configuration
      const sessionConfig: Record<string, unknown> = {
        ui_mode: CHECKOUT_CONFIG.SESSION.UI_MODE,
        line_items: [
          {
            price_data: {
              currency: options.product.currency.toLowerCase(),
              product_data: {
                name: options.product.name,
                description: options.product.description || undefined,
              },
              unit_amount: Math.round(options.product.price * 100),
            },
            quantity: 1,
          },
        ],
        mode: CHECKOUT_CONFIG.SESSION.PAYMENT_MODE,
        return_url: options.returnUrl,
        // Set redirect_on_completion to 'always' for proper server-side verification
        redirect_on_completion: 'always',
        metadata: {
          product_id: options.product.id,
          product_slug: options.product.slug,
          user_id: options.userId || '',
        },
        expires_at: Math.floor(Date.now() / 1000) + (CHECKOUT_CONFIG.SESSION.EXPIRES_HOURS * 60 * 60),
        automatic_tax: { enabled: false },
        billing_address_collection: 'auto',
      };

      // Only add customer_email if it's a valid email
      if (options.email && options.email.trim() !== '') {
        sessionConfig.customer_email = options.email;
        console.log('Adding customer_email to session:', options.email);
      } else {
        console.log('No customer_email provided, user will need to enter email manually');
      }

      const session = await this.stripe.checkout.sessions.create(sessionConfig);

      console.log('Stripe session created successfully:', {
        sessionId: session.id,
        hasClientSecret: !!session.client_secret
      });

      if (!session.client_secret) {
        console.error('Stripe session created but no client_secret returned');
        throw new CheckoutError(
          CheckoutErrorType.STRIPE_ERROR,
          CHECKOUT_ERRORS.STRIPE_SESSION_FAILED,
          HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
      }

      return {
        clientSecret: session.client_secret,
        sessionId: session.id,
      };
    } catch (error) {
      console.error('Stripe session creation failed:', error);
      
      if (error instanceof CheckoutError) {
        throw error;
      }
      
      // Log detailed Stripe error
      if (error && typeof error === 'object' && 'type' in error) {
        const stripeError = error as {
          type?: string;
          code?: string;
          message?: string;
          param?: string;
        };
        console.error('Stripe API error details:', {
          type: stripeError.type,
          code: stripeError.code,
          message: stripeError.message,
          param: stripeError.param
        });
      }
      
      throw new CheckoutError(
        CheckoutErrorType.STRIPE_ERROR,
        CHECKOUT_ERRORS.STRIPE_SESSION_FAILED,
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Complete checkout flow - main orchestration method
   */
  async createCheckoutSession(
    request: CreateCheckoutRequest, 
    returnUrl: string,
    userId?: string
  ): Promise<{ clientSecret: string; sessionId: string }> {
    // Initialize service
    await this.initialize();
    
    // Validate request
    await this.validateRequest(request);
    
    // Rate limiting check
    const identifier = userId || 'anonymous';
    await this.checkRateLimit(identifier);
    
    // Get and validate product
    const product = await this.getProduct(request.productId);
    this.validateTemporalAvailability(product);
    
    // Check existing access for logged-in users
    if (userId) {
      await this.checkExistingAccess(userId, product.id);
    }
    
    // Create Stripe session
    return await this.createStripeSession({
      product,
      email: request.email,
      userId,
      returnUrl
    });
  }
}
