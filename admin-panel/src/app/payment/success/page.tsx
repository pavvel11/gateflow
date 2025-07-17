// app/payment/success/page.tsx
// Payment success page

import { Suspense } from 'react';
import { redirect } from 'next/navigation';

interface PaymentSuccessPageProps {
  searchParams: Promise<{ session_id?: string; product?: string }>;
}

async function PaymentSuccessContent({ searchParams }: PaymentSuccessPageProps) {
  const params = await searchParams;
  const sessionId = params.session_id;
  const productSlug = params.product;

  // If we have a product slug, redirect to it with success parameter
  if (productSlug) {
    redirect(`/p/${productSlug}?payment=success`);
  }

  // If we have a session ID but no product slug, show generic success page
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
        <button
          onClick={() => window.location.href = '/'}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          Continue
        </button>
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
