'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
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
          }
        } catch {
          // Silent error handling
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
          title: sessionId ? 'Payment Successful' : 'Access Granted',
          color: 'text-green-400',
          bgColor: 'from-green-900/20 to-green-800/20'
        };
      case 'failed':
        return {
          emoji: '❌',
          title: 'Payment Failed',
          color: 'text-red-400',
          bgColor: 'from-red-900/20 to-red-800/20'
        };
      case 'expired':
        return {
          emoji: '⏰',
          title: 'Payment Expired',
          color: 'text-orange-400',
          bgColor: 'from-orange-900/20 to-orange-800/20'
        };
      case 'guest_purchase':
        return {
          emoji: '🔐',
          title: 'Payment Complete - Account Required',
          color: 'text-yellow-400',
          bgColor: 'from-yellow-900/20 to-yellow-800/20'
        };
      case 'magic_link_sent':
        return {
          emoji: '📧',
          title: 'Check Your Email',
          color: 'text-blue-400',
          bgColor: 'from-blue-900/20 to-blue-800/20'
        };
      case 'processing':
      default:
        return {
          emoji: '⏳',
          title: 'Processing Payment',
          color: 'text-blue-400',
          bgColor: 'from-blue-900/20 to-blue-800/20'
        };
    }
  };

  const statusInfo = getStatusInfo();

  // Handle different payment statuses
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
              Try Again
            </button>
            <p className="text-gray-400 text-sm">
              Having trouble? <span className="text-blue-400 cursor-pointer hover:underline">Contact support</span>
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
              Start New Payment
            </button>
            <p className="text-gray-400 text-sm">
              Payment sessions expire after 24 hours for security
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
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <div className={`max-w-4xl mx-auto p-8 bg-gradient-to-br ${statusInfo.bgColor} backdrop-blur-md border border-white/10 rounded-xl shadow-2xl text-center`}>
          <div className="text-5xl mb-4">{statusInfo.emoji}</div>
          <h2 className={`text-3xl font-bold ${statusInfo.color} mb-2`}>
            {statusInfo.title}
          </h2>
          <p className="text-gray-300 mb-6">{errorMessage}</p>
          
          <div className="space-y-4">
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-300 mb-2">What&apos;s next?</h3>
              <div className="text-sm text-gray-300 space-y-2">
                <p>1. Check your email inbox {customerEmail && `(${customerEmail})`} and spam folder</p>
                <p>2. Click the magic link in the email</p>
                <p>3. You&apos;ll be automatically logged in and redirected to your product</p>
              </div>
            </div>
            
            <p className="text-gray-400 text-sm">
              Didn&apos;t receive the email? Check your spam folder or contact support.
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
              Log In to Access
            </button>
            <button
              onClick={() => router.push('/signup')}
              className="bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              Create Account
            </button>
            <p className="text-gray-400 text-sm">
              Your purchase is saved and will be linked to your account
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
            {sessionId 
              ? `Payment successful! You now have access to ${product.name}` 
              : `Access granted to ${product.name}`
            }
          </p>
          <div className="text-6xl font-bold text-white tabular-nums">{countdown}</div>
          <p className="text-gray-400 mt-2">Redirecting to product...</p>
          
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
        <p className="text-gray-300">Please wait while we verify your payment with Stripe...</p>
        
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
