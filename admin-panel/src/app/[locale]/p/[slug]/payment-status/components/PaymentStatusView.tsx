'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
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
  accessGranted: boolean;
  errorMessage: string;
  paymentStatus: string; // 'processing', 'completed', 'failed', 'expired', 'guest_purchase', 'magic_link_sent'
  customerEmail?: string; // Needed for magic link display
  sessionId?: string; // Make optional for free products
}

export default function PaymentStatusView({
  product,
  accessGranted,
  errorMessage,
  paymentStatus,
  customerEmail,
  sessionId,
}: PaymentStatusViewProps) {
  const router = useRouter();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [countdown, setCountdown] = useState(3);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const supabase = createClient();
  const t = useTranslations('paymentStatus');
  
  // Send magic link automatically for magic_link_sent status
  useEffect(() => {
    if (paymentStatus === 'magic_link_sent' && customerEmail && sessionId && !magicLinkSent) {
      const sendMagicLink = async () => {
        try {
          const redirectUrl = `${window.location.origin}/auth/callback?redirect_to=${encodeURIComponent(`/p/${product.slug}/payment-status?session_id=${sessionId}`)}`;
          
          const { error } = await supabase.auth.signInWithOtp({
            email: customerEmail,
            options: {
              emailRedirectTo: redirectUrl,
              shouldCreateUser: true
            }
          });
          
          if (!error) {
            setMagicLinkSent(true);
          } else {
            console.error('Error sending magic link:', error);
          }
        } catch (err) {
          console.error('Exception sending magic link:', err);
        }
      };
      
      sendMagicLink();
    }
  }, [paymentStatus, customerEmail, sessionId, magicLinkSent, supabase.auth, product.slug]);
  
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

  // Countdown and redirect for success
  useEffect(() => {
    if (paymentStatus === 'completed' && accessGranted) {
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
  }, [countdown, router, product.slug, paymentStatus, accessGranted]);

  // Get status display info
  const getStatusInfo = () => {
    switch (paymentStatus) {
      case 'completed':
        return {
          emoji: '🎉',
          title: t('accessGranted'),
          color: 'text-green-400',
          bgColor: 'from-green-900/20 to-green-800/20'
        };
      case 'failed':
        return {
          emoji: '❌',
          title: t('paymentFailed'),
          color: 'text-red-400',
          bgColor: 'from-red-900/20 to-red-800/20'
        };
      case 'email_validation_failed':
        return {
          emoji: '📧',
          title: 'Email Issue',
          color: 'text-red-400',
          bgColor: 'from-red-900/20 to-red-800/20'
        };
      case 'expired':
        return {
          emoji: '⏰',
          title: t('paymentExpired'),
          color: 'text-orange-400',
          bgColor: 'from-orange-900/20 to-orange-800/20'
        };
      case 'guest_purchase':
        return {
          emoji: '🔐',
          title: t('paymentCompleteAccountRequired'),
          color: 'text-yellow-400',
          bgColor: 'from-yellow-900/20 to-yellow-800/20'
        };
      case 'magic_link_sent':
        return {
          emoji: '🎉',
          title: t('paymentSuccessful'),
          color: 'text-green-400',
          bgColor: 'from-green-900/20 to-green-800/20'
        };
      case 'processing':
      default:
        return {
          emoji: '⏳',
          title: t('processingPayment'),
          color: 'text-blue-400',
          bgColor: 'from-blue-900/20 to-blue-800/20'
        };
    }
  };

  const statusInfo = getStatusInfo();

  // Handle different payment statuses
  if (paymentStatus === 'email_validation_failed') {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <div className={`max-w-4xl mx-auto p-8 bg-gradient-to-br ${statusInfo.bgColor} backdrop-blur-md border border-white/10 rounded-xl shadow-2xl text-center`}>
          <div className="text-5xl mb-4">{statusInfo.emoji}</div>
          <h2 className={`text-3xl font-bold ${statusInfo.color} mb-2`}>
            {statusInfo.title}
          </h2>
          <p className="text-gray-300 mb-6">{errorMessage}</p>
          
          <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
            <h3 className="text-lg font-semibold text-red-300 mb-2">⚠️ Disposable Email Detected</h3>
          </div>
          
          <div className="space-y-4">
            <button
              onClick={() => router.push(`/p/${product.slug}`)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              Try Again with Valid Email
            </button>
            <p className="text-gray-400 text-sm">
              Having trouble? <span className="text-blue-400 cursor-pointer hover:underline">Contact Support</span>
            </p>
          </div>
          
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

  if (paymentStatus === 'failed') {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <div className={`max-w-4xl mx-auto p-8 bg-gradient-to-br ${statusInfo.bgColor} backdrop-blur-md border border-white/10 rounded-xl shadow-2xl text-center`}>
          <div className="text-5xl mb-4">{statusInfo.emoji}</div>
          <h2 className={`text-3xl font-bold ${statusInfo.color} mb-2`}>
            {statusInfo.title}
          </h2>
          <p className="text-gray-300 mb-6">{errorMessage}</p>
          
          <div className="space-y-4">
            <button
              onClick={() => router.push(`/p/${product.slug}`)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              {t('tryAgain')}
            </button>
            <p className="text-gray-400 text-sm">
              {t('havingTrouble')} <span className="text-blue-400 cursor-pointer hover:underline">{t('contactSupport')}</span>
            </p>
          </div>
          
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

  if (paymentStatus === 'expired') {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <div className={`max-w-4xl mx-auto p-8 bg-gradient-to-br ${statusInfo.bgColor} backdrop-blur-md border border-white/10 rounded-xl shadow-2xl text-center`}>
          <div className="text-5xl mb-4">{statusInfo.emoji}</div>
          <h2 className={`text-3xl font-bold ${statusInfo.color} mb-2`}>
            {statusInfo.title}
          </h2>
          <p className="text-gray-300 mb-6">{errorMessage}</p>
          
          <div className="space-y-4">
            <button
              onClick={() => router.push(`/p/${product.slug}`)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              {t('startNewPayment')}
            </button>
            <p className="text-gray-400 text-sm">
              {t('paymentSessionsExpire')}
            </p>
          </div>
          
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

  if (paymentStatus === 'magic_link_sent') {
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
        
        <div className={`max-w-4xl mx-auto p-8 bg-gradient-to-br ${statusInfo.bgColor} backdrop-blur-md border border-white/10 rounded-xl shadow-2xl z-10 text-center`}>
          <div className="text-5xl mb-4">{statusInfo.emoji}</div>
          <h2 className={`text-3xl font-bold ${statusInfo.color} mb-2`}>
            {statusInfo.title}
          </h2>
          <p className="text-gray-300 mb-6">{t('paymentProcessedSuccessfully')}</p>
          
          <div className="space-y-4">
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-300 mb-2">{t('toAccessYourProduct')}</h3>
              <div className="text-sm text-gray-300 space-y-2">
                <p>{t('step1CheckEmail', { email: customerEmail ? `(${customerEmail})` : '' })}</p>
                <p>{t('step2ClickMagicLink')}</p>
                <p>{t('step3AutoRedirect')}</p>
              </div>
            </div>
            
            <p className="text-gray-400 text-sm">
              {t('didNotReceiveEmail')}
            </p>
          </div>
          
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

  if (paymentStatus === 'guest_purchase') {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <div className={`max-w-4xl mx-auto p-8 bg-gradient-to-br ${statusInfo.bgColor} backdrop-blur-md border border-white/10 rounded-xl shadow-2xl text-center`}>
          <div className="text-5xl mb-4">{statusInfo.emoji}</div>
          <h2 className={`text-3xl font-bold ${statusInfo.color} mb-2`}>
            {statusInfo.title}
          </h2>
          <p className="text-gray-300 mb-6">{errorMessage}</p>
          
          <div className="space-y-4">
            <button
              onClick={() => router.push('/login')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              {t('logInToAccess')}
            </button>
            <button
              onClick={() => router.push('/signup')}
              className="bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              {t('createAccount')}
            </button>
            <p className="text-gray-400 text-sm">
              {t('purchaseSavedLinked')}
            </p>
          </div>
          
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

  // Success state with access granted
  if (paymentStatus === 'completed' && accessGranted) {
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
        
        <div className={`max-w-4xl mx-auto p-8 bg-gradient-to-br ${statusInfo.bgColor} backdrop-blur-md border border-white/10 rounded-xl shadow-2xl z-10 text-center`}>
          <div className="text-5xl mb-4">{statusInfo.emoji}</div>
          <h2 className={`text-3xl font-bold ${statusInfo.color} mb-2`}>
            {statusInfo.title}
          </h2>
          <p className="text-gray-300 mb-6">
            {t('accessGrantedToProduct', { productName: product.name })}
          </p>
          <div className="text-6xl font-bold text-white tabular-nums">{countdown}</div>
          <p className="text-gray-400 mt-2">{t('redirectingToProduct')}</p>
          
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

  // Loading or processing state
  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className={`max-w-4xl mx-auto p-8 bg-gradient-to-br ${statusInfo.bgColor} backdrop-blur-md border border-white/10 rounded-xl shadow-2xl text-center`}>
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <h2 className={`text-2xl font-bold ${statusInfo.color} mb-2`}>
          {statusInfo.title}
        </h2>
        <p className="text-gray-300">{t('pleaseWaitVerifying')}</p>
        
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
