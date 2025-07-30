'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Product } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useRouter } from 'next/navigation';
import { validateEmailAction } from '@/lib/actions/validate-email';
import TurnstileWidget from '@/components/TurnstileWidget';
import TermsCheckbox from '@/components/TermsCheckbox';

interface FreeProductFormProps {
  product: Product;
}

export default function FreeProductForm({ product }: FreeProductFormProps) {
  const t = useTranslations('productView');
  const { user } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info' | null; text: string }>({
    type: null,
    text: '',
  });

  const handleFreeAccess = async () => {
    if (user) {
      // Logged in user - grant access directly
      try {
        setLoading(true);
        
        const response = await fetch(`/api/public/products/${product.slug}/grant-access`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          const errorData = await response.json();
          addToast(errorData.error || 'Failed to request access', 'error');
          return;
        }

        const data = await response.json();
        addToast(data.message || 'Access granted successfully!', 'success');
        
        // Redirect to success page (no session_id needed for free products)
        router.push(`/p/${product.slug}/payment-status`);
      } catch {
        addToast('An unexpected error occurred', 'error');
      } finally {
        setLoading(false);
      }
    } else {
      // Not logged in - send magic link
      await handleMagicLinkSubmit();
    }
  };

  const handleMagicLinkSubmit = async () => {
    if (!email) {
      setMessage({ type: 'error', text: 'Please enter your email address' });
      return;
    }

    // Check if terms are accepted for non-logged in users
    if (!termsAccepted) {
      setMessage({ type: 'error', text: t('compliance.pleaseAcceptTerms') });
      return;
    }

    // Check if Turnstile token is present for non-logged in users
    if (!captchaToken) {
      setMessage({ type: 'error', text: t('compliance.securityVerificationRequired') });
      return;
    }

    // Enhanced email validation with disposable domain checking
    try {
      const emailValidation = await validateEmailAction(email);
      if (!emailValidation.isValid) {
        setMessage({ type: 'error', text: emailValidation.error || 'Invalid or disposable email address not allowed' });
        return;
      }
    } catch {
      setMessage({ type: 'error', text: 'Please enter a valid email address' });
      return;
    }

    setLoading(true);
    setMessage({ type: 'info', text: t('sendingMagicLink') });
    
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      
      const redirectUrl = `${window.location.origin}/auth/callback?redirect_to=${encodeURIComponent(`/auth/product-access?product=${product.slug}`)}`;
      
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: redirectUrl,
          captchaToken: captchaToken || undefined,
        },
      });

      if (error) {
        setMessage({ type: 'error', text: error.message });
        return;
      }

      setMessage({ 
        type: 'success', 
        text: t('checkEmailForMagicLink') 
      });
      
    } catch {
      setMessage({ type: 'error', text: 'An unexpected error occurred' });
    } finally {
      setLoading(false);
    }
  };

  const renderProductInfo = () => (
    <div className="w-1/2 pr-8 border-r border-white/10">
      <div className="flex items-center mb-6">
        <div className="text-5xl mr-6">{product.icon}</div>
        <div>
          <h1 className="text-2xl font-bold text-white">{product.name}</h1>
          <p className="text-gray-300">{product.description}</p>
        </div>
      </div>
      <div className="text-3xl font-bold text-green-400">
        {t('free')}
      </div>
    </div>
  );

  const renderForm = () => (
    <div className="w-1/2 pl-8">
      <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20">
        <h2 className="text-xl font-semibold text-white mb-4">
          {user ? t('getYourFreeProduct') : t('getInstantAccess')}
        </h2>
        
        {message.type && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${
            message.type === 'success' ? 'bg-green-800/30 border border-green-500/30 text-green-200' :
            message.type === 'error' ? 'bg-red-800/30 border border-red-500/30 text-red-200' :
            'bg-blue-800/30 border border-blue-500/30 text-blue-200'
          }`}>
            {message.text}
          </div>
        )}

        {!user && (
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
              {t('emailAddress')}
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border border-white/20 rounded-lg bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={t('enterEmailAddress')}
              required
              disabled={loading}
            />
          </div>
        )}

        {!user && (
          <>
            {/* Terms and Conditions Checkbox */}
            <TermsCheckbox
              checked={termsAccepted}
              onChange={setTermsAccepted}
              termsUrl="/terms"
              privacyUrl="/privacy"
            />

            {/* Cloudflare Turnstile - always visible now, with different behavior for dev/prod */}
            <TurnstileWidget
              onVerify={setCaptchaToken}
              onError={() => setCaptchaToken(null)}
            />
            
            {process.env.NODE_ENV === 'development' && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-sm text-blue-300">
                💡 Set NEXT_PUBLIC_TURNSTILE_TEST_MODE in .env to test different scenarios
              </div>
            )}
          </>
        )}

        <button
          onClick={handleFreeAccess}
          disabled={
            loading || 
            (!user && (!email || !termsAccepted || (process.env.NODE_ENV === 'production' && !captchaToken)))
          }
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
              {t('processing')}
            </div>
          ) : (
            user ? t('getFreeAccess') : t('sendMagicLink')
          )}
        </button>

        {!user && (
          <p className="text-xs text-gray-400 mt-3 text-center">
            {t('magicLinkExplanation')}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="max-w-4xl mx-auto p-8 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl">
        <div className="flex">
          {renderProductInfo()}
          {renderForm()}
        </div>
      </div>
    </div>
  );
}
