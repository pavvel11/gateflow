import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import PaymentStatusView from './components/PaymentStatusView';
import { verifyPaymentSession } from '@/lib/payment/verify-payment';

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ session_id?: string }>;
}

export default async function PaymentStatusPage({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  
  const { session_id } = resolvedSearchParams;
  const isStripePayment = !!session_id; // Has session_id = paid product, no session_id = free product
  
  const supabase = await createClient();
  
  // Get authenticated user (optional for guest purchases)
  const { data: { user } } = await supabase.auth.getUser();
  
  // For free products, user must be logged in
  if (!isStripePayment && !user) {
    redirect('/login');
  }

  // Get product details
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id, name, slug, description, icon')
    .eq('slug', resolvedParams.slug)
    .single();

  if (productError || !product) {
    redirect('/');
  }

  // Verify payment with Stripe and determine status
  let accessGranted = false;
  let errorMessage = '';
  let paymentStatus = 'processing'; // processing, completed, failed, expired, guest_purchase, magic_link_sent
  let customerEmail = '';

  try {
    if (isStripePayment) {
      // Handle paid product with Stripe session using direct function call
      const result = await verifyPaymentSession(session_id, user);
      console.log('Payment verification result:', result);

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
            customerEmail = result.customer_email || '';
          }
        } else if (result.is_guest_purchase && result.send_magic_link) {
          // Guest purchase saved - let frontend handle magic link
          paymentStatus = 'magic_link_sent';
          customerEmail = result.customer_email || '';
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
      // Handle free product (no session_id) - user must be logged in
      if (!user) {
        redirect('/login');
      }
      
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

  return (
    <PaymentStatusView
      product={product}
      accessGranted={accessGranted}
      paymentStatus={paymentStatus}
      errorMessage={errorMessage}
      customerEmail={customerEmail}
      sessionId={session_id}
    />
  );
}
