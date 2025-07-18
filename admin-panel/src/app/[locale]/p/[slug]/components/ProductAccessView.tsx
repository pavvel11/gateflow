'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Product } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import Confetti from 'react-confetti';

interface ProductAccessViewProps {
  product: Product;
  userAccess?: {
    access_expires_at?: string | null;
    access_duration_days?: number | null;
    access_granted_at: string;
  } | null;
}

export default function ProductAccessView({ product, userAccess }: ProductAccessViewProps) {
  const t = useTranslations('productView');
  const { user } = useAuth();
  
  const [showConfetti, setShowConfetti] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Check if this is a fresh access grant (from payment success)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentSuccess = urlParams.get('payment') === 'success';
    
    if (paymentSuccess) {
      setShowConfetti(true);
      
      // Set window dimensions for confetti
      const { innerWidth, innerHeight } = window;
      setDimensions({ width: innerWidth, height: innerHeight });

      const handleResize = () => {
        setDimensions({ width: window.innerWidth, height: window.innerHeight });
      };

      window.addEventListener('resize', handleResize, { passive: true });
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  // Handle countdown timer
  useEffect(() => {
    if (showConfetti && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
      
      return () => clearTimeout(timer);
    } else if (showConfetti && countdown === 0) {
      // Check for return URL
      const urlParams = new URLSearchParams(window.location.search);
      const returnUrl = urlParams.get('return_url');
      
      if (returnUrl) {
        try {
          const decodedUrl = decodeURIComponent(returnUrl);
          window.location.href = decodedUrl;
          return;
        } catch (error) {
          console.error('Error redirecting to return_url:', error);
        }
      }
      
      // No return URL, stop confetti and show content
      setShowConfetti(false);
    }
  }, [showConfetti, countdown]);

  // Show success animation
  if (showConfetti) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 overflow-hidden relative">
        <Confetti
          width={dimensions.width}
          height={dimensions.height}
          recycle={false}
          numberOfPieces={800}
          gravity={0.25}
          initialVelocityX={{ min: -10, max: 10 }}
          initialVelocityY={{ min: -20, max: 5 }}
        />
        <div className="max-w-4xl mx-auto p-8 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl z-10 text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-3xl font-bold text-white mb-2">{t('accessGranted')}</h2>
          <p className="text-gray-300 mb-6">{t('accessGrantedMessage', { productName: product.name })}</p>
          <div className="text-6xl font-bold text-white tabular-nums">{countdown}</div>
          <p className="text-gray-400 mt-2">{t('loadingContent')}</p>
        </div>
      </div>
    );
  }

  // Show the actual product content
  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="max-w-4xl mx-auto p-8 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">{product.icon}</div>
          <h1 className="text-3xl font-bold text-white mb-2">{product.name}</h1>
          <p className="text-gray-300">{product.description}</p>
          
          {userAccess && (
            <div className="mt-4 text-sm text-gray-400">
              Access granted on: {new Date(userAccess.access_granted_at).toLocaleDateString()}
              {userAccess.access_expires_at && (
                <span className="ml-2">
                  • Expires: {new Date(userAccess.access_expires_at).toLocaleDateString()}
                </span>
              )}
            </div>
          )}
        </div>
        
        {/* Product content would go here */}
        <div className="bg-black/20 border border-white/10 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-white mb-4">🎯 Your Content is Ready!</h2>
          <p className="text-gray-300 mb-4">
            This is where your product content would be displayed. You now have full access to:
          </p>
          <ul className="text-gray-300 space-y-2">
            <li>✅ All premium features</li>
            <li>✅ Exclusive content</li>
            <li>✅ Priority support</li>
          </ul>
          
          <div className="mt-6 pt-4 border-t border-white/10 text-sm text-gray-400">
            Welcome {user?.email || 'Guest'}! Enjoy your purchase.
          </div>
        </div>
      </div>
    </div>
  );
}
