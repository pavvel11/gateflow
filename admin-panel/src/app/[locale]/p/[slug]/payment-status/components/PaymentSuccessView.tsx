'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Confetti from 'react-confetti';

interface PaymentStatusViewProps {
  product: {
    id: string;
    name: string;
    slug: string;
    description: string;
    icon: string;
  };
  paymentVerified: boolean;
  accessGranted: boolean;
  errorMessage: string;
  sessionId?: string; // Make optional for free products
}

export default function PaymentStatusView({
  product,
  paymentVerified,
  accessGranted,
  errorMessage,
  sessionId,
}: PaymentStatusViewProps) {
  const router = useRouter();
  const t = useTranslations('productView');
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [countdown, setCountdown] = useState(3);
  
  // Set window dimensions for confetti
  useEffect(() => {
    const { innerWidth, innerHeight } = window;
    setDimensions({ width: innerWidth, height: innerHeight });

    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Countdown and redirect
  useEffect(() => {
    if (paymentVerified && accessGranted) {
      const timer = setTimeout(() => {
        if (countdown > 1) {
          setCountdown(countdown - 1);
        } else {
          // Redirect back to product page
          router.push(`/p/${product.slug}`);
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [countdown, router, product.slug, paymentVerified, accessGranted]);

  // Error state
  if (errorMessage) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="max-w-4xl mx-auto p-8 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl text-center">
          <div className="text-5xl mb-4">
            {paymentVerified ? '⚠️' : '❌'}
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">
            {paymentVerified ? 'Action Required' : 'Payment Issue'}
          </h2>
          <p className="text-gray-300 mb-6">{errorMessage}</p>
          
          {/* Show login options if it's a guest purchase */}
          {paymentVerified && errorMessage.includes('log in') && (
            <div className="space-y-4">
              <button
                onClick={() => router.push('/login')}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
              >
                Go to Login
              </button>
              <p className="text-gray-400 text-sm">
                Don&apos;t have an account? <span className="text-blue-400 cursor-pointer hover:underline" onClick={() => router.push('/signup')}>Sign up here</span>
              </p>
            </div>
          )}
          
          <div className="mt-8 flex items-center justify-center gap-4">
            <div className="text-3xl">{product.icon}</div>
            <div>
              <h3 className="text-xl font-semibold text-white">{product.name}</h3>
              <p className="text-gray-300">{product.description}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (paymentVerified && accessGranted) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 overflow-hidden relative font-sans">
        <Confetti
          width={dimensions.width}
          height={dimensions.height}
          recycle={false}
          numberOfPieces={800}
          gravity={0.25}
          initialVelocityX={{ min: -10, max: 10 }}
          initialVelocityY={{ min: -20, max: 5 }}
        />
        
        <div 
          className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_20%_20%,#3a2d5b_0%,transparent_40%),radial-gradient(circle_at_80%_70%,#0f3460_0%,transparent_40%)]"
          style={{ animation: 'aurora 20s infinite linear' }}
        />
        
        <style jsx>{`
          @keyframes aurora {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
        `}</style>
        
        <div className="max-w-4xl mx-auto p-8 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl z-10 text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-3xl font-bold text-white mb-2">
            {sessionId ? t('paymentSuccessful') : t('accessGranted')}
          </h2>
          <p className="text-gray-300 mb-6">
            {sessionId 
              ? t('paymentSuccessMessage', { productName: product.name }) 
              : t('accessGrantedMessage', { productName: product.name })
            }
          </p>
          <div className="text-6xl font-bold text-white tabular-nums">{countdown}</div>
          <p className="text-gray-400 mt-2">{t('loadingContent')}</p>
          
          <div className="mt-8 flex items-center justify-center gap-4">
            <div className="text-3xl">{product.icon}</div>
            <div>
              <h3 className="text-xl font-semibold text-white">{product.name}</h3>
              <p className="text-gray-300">{product.description}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading or unexpected state
  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="max-w-4xl mx-auto p-8 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl text-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-white">Processing payment...</p>
      </div>
    </div>
  );
}
