'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Confetti from 'react-confetti';

export default function PaymentSuccessPage({ params }: { params: Promise<{ locale: string, slug: string }> }) {
  const resolvedParams = use(params);
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
    const timer = setTimeout(() => {
      if (countdown > 1) {
        setCountdown(countdown - 1);
      } else {
        // Redirect back to product page
        router.push(`/p/${resolvedParams.slug}`);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, router, resolvedParams.slug]);

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
        <h2 className="text-3xl font-bold text-white mb-2">{t('paymentSuccessful')}</h2>
        <p className="text-gray-300 mb-6">{t('paymentSuccessMessage')}</p>
        <div className="text-6xl font-bold text-white tabular-nums">{countdown}</div>
        <p className="text-gray-400 mt-2">{t('loadingContent')}</p>
      </div>
    </div>
  );
}
