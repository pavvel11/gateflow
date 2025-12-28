import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import PaymentStatusView from './components/PaymentStatusView';
import { verifyPaymentSession, verifyPaymentIntent } from '@/lib/payment/verify-payment';
import { PaymentStatus } from './types';

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{
    session_id?: string;
    payment_intent?: string;
    success_url?: string
  }>;
}

export default async function PaymentStatusPage({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const { session_id, payment_intent } = resolvedSearchParams;
  const isStripePayment = !!(session_id || payment_intent); // Has session_id or payment_intent = paid product
  
  const supabase = await createClient();
  
  // Get authenticated user (optional for guest purchases)
  const { data: { user } } = await supabase.auth.getUser();
  console.log('Payment status page - user:', user ? { id: user.id, email: user.email } : null);
  
  // For free products, user must be logged in
  if (!isStripePayment && !user) {
    redirect('/login');
  }

  // Get product details
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id, name, slug, description, icon, success_redirect_url, pass_params_to_redirect')
    .eq('slug', resolvedParams.slug)
    .single();

  if (productError || !product) {
    redirect('/');
  }

  // Verify payment with Stripe and determine status
  let accessGranted = false;
  let errorMessage = '';
  let paymentStatus: PaymentStatus = 'processing'; // processing, completed, failed, expired, guest_purchase, magic_link_sent
  let customerEmail = '';
  let userExistsInDatabase = false; // Track if user exists in database

  try {
    if (isStripePayment && session_id) {
      // Handle paid product with Stripe Checkout Session (embedded checkout flow)
      const result = await verifyPaymentSession(session_id, user);
      customerEmail = result.customer_email || '';
      
      console.log('Payment verification result:', {
        scenario: result.scenario,
        access_granted: result.access_granted,
        send_magic_link: result.send_magic_link,
        requires_login: result.requires_login,
        is_guest_purchase: result.is_guest_purchase,
        user_id: user?.id || 'null'
      });

      // Check if user exists in database based on scenario
      userExistsInDatabase = result.scenario === 'existing_user_email';

      if (result.status === 'expired') {
        paymentStatus = 'expired';
        errorMessage = 'Payment session has expired. Please try again.';
      } else if (result.status === 'complete' && result.payment_status === 'paid') {
        if (result.access_granted) {
          accessGranted = true;
          paymentStatus = 'completed';
          
          if (result.scenario === 'existing_user_email' && result.requires_login && result.send_magic_link) {
            // User exists but needs to login - let frontend handle magic link
            paymentStatus = 'magic_link_sent';
          }
        } else if (result.scenario === 'email_validation_failed_server_side') {
          // Email validation failed without refund
          paymentStatus = 'email_validation_failed';
          errorMessage = result.error || 'Invalid email address detected.';
        } else if (result.is_guest_purchase && result.send_magic_link) {
          // Guest purchase saved - let frontend handle magic link
          paymentStatus = 'magic_link_sent';
        } else {
          errorMessage = result.error || 'Unknown error occurred';
          paymentStatus = 'failed';
        }
      } else if (result.error) {
        errorMessage = result.error;
        paymentStatus = 'failed';
      } else {
        paymentStatus = 'processing';
      }
    } else if (isStripePayment && payment_intent) {
      // Handle Payment Intent flow (custom payment form)
      const result = await verifyPaymentIntent(payment_intent, user);
      customerEmail = result.customer_email || '';

      console.log('Payment Intent verification result:', {
        status: result.status,
        access_granted: result.access_granted,
        send_magic_link: result.send_magic_link,
        requires_login: result.requires_login,
        is_guest_purchase: result.is_guest_purchase,
        user_id: user?.id || 'null'
      });

      // Check if user exists in database based on scenario
      userExistsInDatabase = result.scenario === 'existing_user_email';

      if (result.status === 'succeeded') {
        if (result.access_granted) {
          accessGranted = true;
          paymentStatus = 'completed';

          if (result.scenario === 'existing_user_email' && result.requires_login && result.send_magic_link) {
            // User exists but needs to login - let frontend handle magic link
            paymentStatus = 'magic_link_sent';
          }
        } else if (result.scenario === 'email_validation_failed_server_side') {
          // Email validation failed without refund
          paymentStatus = 'email_validation_failed';
          errorMessage = result.error || 'Invalid email address detected.';
        } else if (result.is_guest_purchase && result.send_magic_link) {
          // Guest purchase saved - let frontend handle magic link
          paymentStatus = 'magic_link_sent';
        } else {
          errorMessage = result.error || 'Unknown error occurred';
          paymentStatus = 'failed';
        }
      } else if (result.error) {
        errorMessage = result.error;
        paymentStatus = 'failed';
      } else {
        paymentStatus = 'processing';
      }
    } else {
      // Handle free product (no session_id and no payment_intent) - user must be logged in
      if (!user) {
        redirect('/login');
      }
      
      customerEmail = user.email || '';
      
      const { data: existingAccess } = await supabase
        .from('user_product_access')
        .select('access_expires_at')
        .eq('user_id', user.id)
        .eq('product_id', product.id)
        .single();

      if (existingAccess) {
        const expiresAt = existingAccess.access_expires_at 
          ? new Date(existingAccess.access_expires_at) 
          : null;
        const isExpired = expiresAt && expiresAt < new Date();
        
        if (!isExpired) {
          accessGranted = true;
          paymentStatus = 'completed';
        } else {
          paymentStatus = 'expired';
          errorMessage = 'Your access has expired. Please purchase again.';
        }
      } else {
        // Grant access for free product
        const { error: accessError } = await supabase
          .from('user_product_access')
          .insert({
            user_id: user.id,
            product_id: product.id,
            access_granted_at: new Date().toISOString(),
            access_expires_at: null, // Free products don't expire
            access_duration_days: null,
          });

        if (accessError) {
          paymentStatus = 'failed';
          errorMessage = 'Failed to grant access to free product';
        } else {
          accessGranted = true;
          paymentStatus = 'completed';
        }
      }
    }
  } catch {
    paymentStatus = 'failed';
    errorMessage = 'An error occurred while verifying payment status';
  }

  // Calculate Funnel/OTO Redirect URL
  let finalRedirectUrl: string | undefined = undefined;

  if (accessGranted && paymentStatus === 'completed') {
    const params = resolvedSearchParams;
    const overrideRedirectUrl = params.success_url;
    const targetUrl = overrideRedirectUrl || product.success_redirect_url;

    if (targetUrl) {
      if (product.pass_params_to_redirect) {
        try {
          let urlObj: URL;
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

          if (targetUrl.startsWith('/')) {
            // Relative URL - use base URL
            urlObj = new URL(targetUrl, baseUrl);
          } else if (targetUrl.startsWith('http')) {
            // Absolute URL
            urlObj = new URL(targetUrl);
          } else {
            // Domain only - assume https
            urlObj = new URL(`https://${targetUrl}`);
          }
          
          if (customerEmail) urlObj.searchParams.set('email', customerEmail);
          urlObj.searchParams.set('productId', product.id);
          if (session_id) urlObj.searchParams.set('sessionId', session_id);
          
          // Pass all other incoming search params except internal ones
          Object.keys(params).forEach(key => {
            if (!['session_id', 'success_url'].includes(key)) {
              const val = params[key as keyof typeof params];
              if (val) urlObj.searchParams.set(key, val);
            }
          });

          finalRedirectUrl = urlObj.toString();
        } catch (e) {
          console.error('Error parsing redirect URL:', targetUrl);
          // Fallback to raw URL if parsing fails, but respect relative paths
          finalRedirectUrl = targetUrl;
        }
      } else {
        finalRedirectUrl = targetUrl;
      }
      console.log('OTO Redirect configured:', finalRedirectUrl);
    }
  }

  // Check if terms are already handled:
  // NEW LOGIC: T&C are now accepted in checkout, not on payment-status page
  // - Logged in users: already accepted during registration
  // - Guests: accept T&C in checkout form (stored in metadata.terms_accepted)
  const userIsAuthenticated = !!user;

  // Always true now because:
  // - Authenticated users already accepted terms during registration
  // - Guests accept terms in checkout (verified in payment processing)
  const termsAlreadyHandled = true;

  return (
    <PaymentStatusView
      product={product}
      accessGranted={accessGranted}
      paymentStatus={paymentStatus}
      errorMessage={errorMessage}
      customerEmail={customerEmail}
      sessionId={session_id}
      paymentIntentId={payment_intent}
      termsAlreadyHandled={termsAlreadyHandled}
      redirectUrl={finalRedirectUrl}
    />
  );
}
