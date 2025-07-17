// app/payment/error/page.tsx
// Payment error page

import { Suspense } from 'react';
import Link from 'next/link';

interface PaymentErrorPageProps {
  searchParams: Promise<{ reason?: string }>;
}

async function PaymentErrorContent({ searchParams }: PaymentErrorPageProps) {
  const params = await searchParams;
  const reason = params.reason;

  const getErrorMessage = (reason?: string) => {
    switch (reason) {
      case 'payment_failed':
        return 'Your payment could not be processed. Please check your payment details and try again.';
      case 'session_not_found':
        return 'Payment session not found. Please try starting the purchase process again.';
      case 'cancelled':
        return 'Payment was cancelled. You can try again anytime.';
      default:
        return 'An error occurred during payment processing. Please try again.';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="max-w-md mx-auto bg-gray-800 rounded-lg p-8 text-center">
        <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Payment Failed</h1>
        <p className="text-gray-400 mb-6">
          {getErrorMessage(reason)}
        </p>
        <div className="space-y-3">
          <button
            onClick={() => window.history.back()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="block w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PaymentErrorPage(props: PaymentErrorPageProps) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <PaymentErrorContent {...props} />
    </Suspense>
  );
}
