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

    // Enhanced email validation with disposable domain checking
    if (request.email) {
      console.log(`🔍 Validating email: ${request.email}`);
      const isValidEmail = await ProductValidationService.validateEmail(request.email);
      console.log(`✅ Email validation result for ${request.email}: ${isValidEmail}`);
      if (!isValidEmail) {
        console.log(`❌ Blocking disposable email: ${request.email}`);
        throw new CheckoutError(
          CheckoutErrorType.VALIDATION_ERROR,
          'Invalid or disposable email address not allowed',
          HTTP_STATUS.BAD_REQUEST
        );
      }
    }
  }

  /**
   * Check rate limiting for checkout creation
   */
  async checkRateLimit(): Promise<void> {
    const { data: rateLimitOk, error } = await this.supabase.rpc('check_rate_limit', {
      function_name_param: STRIPE_CONFIG.rate_limit.action_type,
      max_calls: STRIPE_CONFIG.rate_limit.max_requests,
      time_window_seconds: STRIPE_CONFIG.rate_limit.window_minutes * 60,
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
      const { coupon } = options;
      
      // Calculate discounted price for main product
      let mainProductPrice = options.product.price;
      if (coupon) {
        if (coupon.discount_type === 'percentage') {
          mainProductPrice = mainProductPrice * (1 - coupon.discount_value / 100);
        } else if (coupon.discount_type === 'fixed') {
          // Subtract fixed amount from main product, minimum $0.50 (Stripe min)
          mainProductPrice = Math.max(0.5, mainProductPrice - coupon.discount_value);
        }
      }

      // Build line items array (main product + optional bump)
      const lineItems = [
        {
          price_data: {
            currency: options.product.currency.toLowerCase(),
            product_data: {
              name: options.product.name,
              description: options.product.description || undefined,
            },
            unit_amount: Math.round(mainProductPrice * 100),
          },
          quantity: 1,
        },
      ];

      // Add bump product as second line item if provided
      if (options.bumpProduct) {
        let bumpPrice = options.bumpProduct.price;
        // Percentage discounts apply to bump unless excluded
        if (coupon && coupon.discount_type === 'percentage' && !coupon.exclude_order_bumps) {
          bumpPrice = bumpPrice * (1 - coupon.discount_value / 100);
        }
        
        lineItems.push({
          price_data: {
            currency: options.bumpProduct.currency.toLowerCase(),
            product_data: {
              name: options.bumpProduct.name,
              description: options.bumpProduct.description || undefined,
            },
            unit_amount: Math.round(bumpPrice * 100),
          },
          quantity: 1,
        });
      }

      // Prepare session configuration
      const sessionConfig: Record<string, unknown> = {
        ui_mode: STRIPE_CONFIG.session.ui_mode,
        payment_method_types: [...STRIPE_CONFIG.payment_method_types],
        line_items: lineItems,
        mode: STRIPE_CONFIG.session.payment_mode,
        return_url: options.returnUrl,
        // Set redirect_on_completion to 'always' for proper server-side verification
        redirect_on_completion: 'always',
        metadata: {
          product_id: options.product.id,
          product_slug: options.product.slug,
          user_id: options.userId || null,
          // Add bump product metadata if present
          ...(options.bumpProduct && {
            bump_product_id: options.bumpProduct.id,
            has_bump: 'true',
          }),
          // Add coupon metadata if present
          ...(coupon && {
            coupon_id: coupon.id,
            coupon_code: coupon.code,
            has_coupon: 'true'
          }),
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

      // Add terms of service collection if enabled
      const collectTermsOfService = process.env.STRIPE_COLLECT_TERMS_OF_SERVICE === 'true' || process.env.STRIPE_COLLECT_TERMS_OF_SERVICE === '1';
      if (collectTermsOfService) {
        sessionConfig.consent_collection = {
          terms_of_service: 'required',
        };
      }

      const session = await this.stripe.checkout.sessions.create(sessionConfig);

      if (!session.client_secret) {
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
    await this.checkRateLimit();

    // Get and validate product
    const product = await this.getProduct(request.productId);
    this.validateTemporalAvailability(product);

    // Check existing access for logged-in users
    if (userId) {
      await this.checkExistingAccess(userId, product.id);
    }

    // Handle order bump if provided
    let bumpProduct: ProductForCheckout | undefined;
    if (request.bumpProductId) {
      try {
        bumpProduct = await this.getProduct(request.bumpProductId);
        this.validateTemporalAvailability(bumpProduct);

        // Fetch special bump price from order_bumps table
        const { data: bumpData } = await this.supabase
          .from('order_bumps')
          .select('bump_price')
          .eq('main_product_id', request.productId)
          .eq('bump_product_id', request.bumpProductId)
          .eq('is_active', true)
          .single();

        if (bumpData && bumpData.bump_price !== null) {
          // Override the product price with the special bump price
          // Create a new object to avoid mutating cached data if any
          bumpProduct = {
            ...bumpProduct,
            price: bumpData.bump_price
          };
        }
      } catch (error) {
        console.error('Error validating bump product:', error);
        // Continue without bump if validation fails
        bumpProduct = undefined;
      }
    }

    // Handle coupon verification
    let couponInfo: any = undefined;
    if (request.couponCode) {
      console.log(`🎟 Verifying coupon: ${request.couponCode} for email: ${request.email}`);
      try {
        const { data: vResult } = await this.supabase.rpc('verify_coupon', {
          code_param: request.couponCode.toUpperCase(),
          product_id_param: product.id,
          customer_email_param: request.email || null
        });

        console.log(`🎟 Coupon verification result:`, JSON.stringify(vResult, null, 2));

        if (vResult && vResult.valid) {
          couponInfo = {
            id: vResult.id,
            code: vResult.code,
            discount_type: vResult.discount_type,
            discount_value: vResult.discount_value,
            exclude_order_bumps: vResult.exclude_order_bumps
          };
          console.log(`🎟 Discount applied: ${couponInfo.discount_type} ${couponInfo.discount_value}`);
        }
      } catch (error) {
        console.error('Error verifying coupon during checkout:', error);
      }
    } else {
      console.log('🎟 No coupon code provided in request');
    }

    // Create Stripe session
    return await this.createStripeSession({
      product,
      bumpProduct,
      email: request.email,
      userId,
      returnUrl,
      coupon: couponInfo
    });
  }
}
