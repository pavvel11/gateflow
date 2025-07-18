import { createClient } from '@/lib/supabase/server';
import { getStripeServer } from '@/lib/stripe/server';
import { redirect } from 'next/navigation';
import PaymentSuccessView from './components/PaymentSuccessView';

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ session_id?: string }>;
}

export default async function PaymentSuccessPage({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  
  const { session_id } = resolvedSearchParams;
  const isStripePayment = !!session_id; // Has session_id = paid product, no session_id = free product
  
  const supabase = await createClient();
  
  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
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

  // Verify payment with Stripe
  const stripe = getStripeServer();
  let paymentVerified = false;
  let accessGranted = false;
  let errorMessage = '';

  try {
    if (isStripePayment) {
      // Handle paid product with Stripe session
      const session = await stripe.checkout.sessions.retrieve(session_id, {
        expand: ['line_items', 'payment_intent']
      });

      if (!session) {
        redirect(`/p/${resolvedParams.slug}`);
      }

      // Check if session belongs to current user or has correct product
      const sessionUserId = session.metadata?.user_id;
      const sessionProductId = session.metadata?.product_id;
      
      if (sessionUserId && sessionUserId !== user.id) {
        redirect(`/p/${resolvedParams.slug}`);
      }

      if (sessionProductId !== product.id) {
        redirect(`/p/${resolvedParams.slug}`);
      }

      // Check session status
      if (session.status === 'open') {
        redirect(`/checkout/${resolvedParams.slug}`);
      }

      if (session.status === 'complete' && session.payment_status === 'paid') {
        paymentVerified = true;

        // Check if access already exists
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
          }
        }

        // Grant access if not already granted
        if (!accessGranted) {
          // Get product auto_grant_duration_days
          const { data: productWithDuration } = await supabase
            .from('products')
            .select('auto_grant_duration_days')
            .eq('id', product.id)
            .single();

          // Calculate access expiry
          let accessExpiresAt: string | null = null;
          if (productWithDuration?.auto_grant_duration_days) {
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + productWithDuration.auto_grant_duration_days);
            accessExpiresAt = expiryDate.toISOString();
          }

          // Grant access
          const { error: accessError } = await supabase
            .from('user_product_access')
            .upsert({
              user_id: user.id,
              product_id: product.id,
              access_granted_at: new Date().toISOString(),
              access_expires_at: accessExpiresAt,
              access_duration_days: productWithDuration?.auto_grant_duration_days,
            }, {
              onConflict: 'user_id,product_id'
            });

          if (accessError) {
            console.error('Error granting access:', accessError);
            errorMessage = 'Payment successful but failed to grant access. Please contact support.';
          } else {
            accessGranted = true;
          }
        }
      } else {
        errorMessage = 'Payment was not successful. Please try again.';
      }
    } else {
      // Handle free product (no session_id)
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
          paymentVerified = true; // For free products, we set this to true to show success
          accessGranted = true;
        }
      }
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    errorMessage = 'Unable to verify payment. Please contact support.';
  }

  return (
    <PaymentSuccessView
      product={product}
      paymentVerified={paymentVerified}
      accessGranted={accessGranted}
      errorMessage={errorMessage}
      sessionId={session_id}
    />
  );
}
