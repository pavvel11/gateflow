// app/payment/success/page.tsx
// Payment success page - handles both Embedded Checkout and PaymentIntent flows

import { Suspense } from 'react';
import { redirect } from 'next/navigation';

interface PaymentSuccessPageProps {
  searchParams: Promise<{
    session_id?: string;
    product?: string;
    payment_intent?: string;
    product_id?: string;
    redirect_status?: string;
    success_url?: string;
  }>;
}

async function PaymentSuccessContent({ searchParams }: PaymentSuccessPageProps) {
  const params = await searchParams;

  // Handle new PaymentIntent flow
  const paymentIntent = params.payment_intent;
  const productId = params.product_id;
  const redirectStatus = params.redirect_status;
  const successUrl = params.success_url;

  // Handle old Embedded Checkout flow
  const sessionId = params.session_id;
  const productSlug = params.product;

  // If we have success_url from OTO/funnel, redirect there
  if (successUrl && redirectStatus === 'succeeded') {
    redirect(successUrl);
  }

  // If we have a product slug (old flow), redirect to it with success parameter
  if (productSlug) {
    redirect(`/p/${productSlug}?payment=success`);
  }

  // If we have product_id (new flow), fetch product and redirect
  if (productId && redirectStatus === 'succeeded') {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/products/${productId}`);
      const data = await response.json();
      if (data.product?.slug) {
        redirect(`/p/${data.product.slug}?payment=success`);
      }
    } catch (error) {
      // If fetch fails, show success page anyway
      console.error('Failed to fetch product:', error);
    }
  }

  // If we have a session ID but no product slug, show generic success page (old flow)
  if (sessionId) {
    // You could fetch additional details here if needed
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="max-w-md mx-auto bg-gray-800 rounded-lg p-8 text-center">
        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Payment Successful!</h1>
        <p className="text-gray-400 mb-6">
          Your payment has been processed successfully. You now have access to your purchased product.
        </p>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage(props: PaymentSuccessPageProps) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <PaymentSuccessContent {...props} />
    </Suspense>
  );
}
