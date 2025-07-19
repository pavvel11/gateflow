import { createClient } from '@/lib/supabase/server';
import { getStripeServer } from '@/lib/stripe/server';
import { ProductValidationService, type ValidatedProduct } from '@/lib/services/product-validation';
import { 
  CheckoutError, 
  CheckoutErrorType, 
  CheckoutSessionOptions,
  CreateCheckoutRequest 
} from '@/types/checkout';
import { STRIPE_CONFIG, CHECKOUT_ERRORS, HTTP_STATUS } from '@/lib/stripe/config';

// Remove the local ProductForCheckout interface since we now use ValidatedProduct
type ProductForCheckout = ValidatedProduct;

/**
 * Professional checkout service with proper error handling and validation
 */
export class CheckoutService {
  private supabase!: Awaited<ReturnType<typeof createClient>>;
  private stripe: ReturnType<typeof getStripeServer>;
  private validationService!: ProductValidationService;

  constructor() {
    this.stripe = getStripeServer();
  }

  /**
   * Initialize the service (must be called before using other methods)
   */
  async initialize(): Promise<void> {
    this.supabase = await createClient();
    this.validationService = new ProductValidationService(this.supabase);
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

    if (request.email && !ProductValidationService.validateEmail(request.email)) {
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
      action_type_param: STRIPE_CONFIG.rate_limit.action_type,
      max_requests: STRIPE_CONFIG.rate_limit.max_requests,
      window_minutes: STRIPE_CONFIG.rate_limit.window_minutes,
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
   * Get and validate product for checkout (now uses ProductValidationService)
   */
  async getProduct(productId: string): Promise<ProductForCheckout> {
    try {
      return await this.validationService.validateProduct(productId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Product validation failed';
      
      if (message.includes('not found') || message.includes('inactive')) {
        throw new CheckoutError(
          CheckoutErrorType.PRODUCT_NOT_FOUND,
          CHECKOUT_ERRORS.PRODUCT_NOT_FOUND,
          HTTP_STATUS.NOT_FOUND
        );
      }
      
      if (message.includes('price')) {
        throw new CheckoutError(
          CheckoutErrorType.VALIDATION_ERROR,
          CHECKOUT_ERRORS.INVALID_PRICE,
          HTTP_STATUS.BAD_REQUEST
        );
      }
      
      throw new CheckoutError(
        CheckoutErrorType.VALIDATION_ERROR,
        message,
        HTTP_STATUS.BAD_REQUEST
      );
    }
  }

  /**
   * Validate temporal availability of product (now uses ProductValidationService)
   */
  validateTemporalAvailability(product: ProductForCheckout): void {
    try {
      ProductValidationService.validateTemporalAvailability(product);
    } catch (error) {
      throw new CheckoutError(
        CheckoutErrorType.PRODUCT_UNAVAILABLE,
        error instanceof Error ? error.message : 'Product not available for purchase',
        HTTP_STATUS.BAD_REQUEST
      );
    }
  }

    /**
   * Check if user already has access to prevent duplicate purchases (now uses ProductValidationService)
   */
  async checkExistingAccess(userId: string, productId: string): Promise<void> {
    const userAccess = await this.validationService.checkUserAccess(userId, productId);
    
    if (userAccess.hasAccess) {
      throw new CheckoutError(
        CheckoutErrorType.DUPLICATE_ACCESS,
        CHECKOUT_ERRORS.DUPLICATE_ACCESS,
        HTTP_STATUS.BAD_REQUEST
      );
    }
  }

  /**
   * Create Stripe checkout session
   */
  async createStripeSession(options: CheckoutSessionOptions): Promise<{ clientSecret: string; sessionId: string }> {
    try {
      // Prepare session configuration
      const sessionConfig: Record<string, unknown> = {
        ui_mode: STRIPE_CONFIG.session.ui_mode,
        payment_method_types: [...STRIPE_CONFIG.payment_method_types],
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
        mode: STRIPE_CONFIG.session.payment_mode,
        return_url: options.returnUrl,
        // Set redirect_on_completion to 'always' for proper server-side verification
        redirect_on_completion: 'always',
        metadata: {
          product_id: options.product.id,
          product_slug: options.product.slug,
          user_id: options.userId || '',
        },
        expires_at: Math.floor(Date.now() / 1000) + (STRIPE_CONFIG.session.expires_hours * 60 * 60),
        automatic_tax: STRIPE_CONFIG.session.automatic_tax,
        tax_id_collection: STRIPE_CONFIG.session.tax_id_collection,
        billing_address_collection: 'auto',
      };

      // Only add customer_email if it's a valid email
      if (options.email && options.email.trim() !== '') {
        sessionConfig.customer_email = options.email;
      }

      const session = await this.stripe.checkout.sessions.create(sessionConfig);

      if (!session.client_secret) {
        throw new CheckoutError(
          CheckoutErrorType.STRIPE_ERROR,
          CHECKOUT_ERRORS.STRIPE_SESSION_FAILED,
          HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
      }

      // Save session to payment_sessions table for webhook processing
      try {
        await this.supabase
          .from('payment_sessions')
          .insert({
            session_id: session.id,
            user_id: options.userId || null,
            product_id: options.product.id,
            amount: options.product.price,
            currency: options.product.currency,
            status: 'pending',
            expires_at: new Date(Date.now() + (STRIPE_CONFIG.session.expires_hours * 60 * 60 * 1000)).toISOString(),
            metadata: {
              product_slug: options.product.slug,
              customer_email: options.email
            }
          });
      } catch {
        // Don't throw error here - session is still valid even if we can't save to DB
      }

      return {
        clientSecret: session.client_secret,
        sessionId: session.id,
      };
    } catch (error) {
      if (error instanceof CheckoutError) {
        throw error;
      }
      
      // Log the actual Stripe error for debugging
      console.error('Stripe session creation error:', error);
      
      throw new CheckoutError(
        CheckoutErrorType.STRIPE_ERROR,
        `Failed to create checkout session: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
