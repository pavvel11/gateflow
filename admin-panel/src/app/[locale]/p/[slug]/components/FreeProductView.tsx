'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Product } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useRouter } from 'next/navigation';

interface FreeProductViewProps {
  product: Product;
}

export default function FreeProductView({ product }: FreeProductViewProps) {
  const t = useTranslations('productView');
  const { user } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
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
        
        // Redirect to success page
        router.push(`/p/${product.slug}/payment-success`);
      } catch (err) {
        console.error('Error in handleFreeAccess:', err);
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

    setLoading(true);
    setMessage({ type: 'info', text: t('sendingMagicLink') });
    
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      
      const urlParams = new URLSearchParams(window.location.search);
      const returnUrl = urlParams.get('return_url');
      
      let redirectUrl = `/auth/product-access?product=${product.slug}`;
      if (returnUrl) {
        redirectUrl += `&return_url=${encodeURIComponent(returnUrl)}`;
      }
      
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?redirect_to=${encodeURIComponent(redirectUrl)}`,
        },
      });
      
      if (error) {
        setMessage({ type: 'error', text: t('error', { message: error.message }) });
      } else {
        setMessage({ type: 'success', text: t('checkEmailForMagicLink') });
      }
    } catch {
      setMessage({ type: 'error', text: t('unexpectedError') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="max-w-4xl mx-auto p-8 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl">
        <div className="flex">
          {/* Product Info */}
          <div className="w-1/2 pr-8 border-r border-white/10">
            <div className="flex items-center mb-6">
              <div className="text-5xl mr-6">{product.icon}</div>
              <div>
                <h1 className="text-2xl font-bold text-white">{product.name}</h1>
                <p className="text-gray-300">{product.description}</p>
              </div>
            </div>
            <div className="text-3xl font-bold text-white">
              {t('free')}
            </div>
          </div>
          
          {/* Free Access Form */}
          <div className="w-1/2 pl-8">
            <h2 className="text-2xl font-semibold text-white mb-4">{t('getYourFreeProduct')}</h2>
            <p className="text-gray-400 mb-6">
              {user ? t('clickForInstantAccess') : t('enterEmailForDownload')}
            </p>
            
            {!user && (
              <div className="mb-4">
                <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-2">
                  {t('emailAddressLabel')}
                </label>
                <input
                  type="email"
                  id="email"
                  className="w-full bg-black/20 border border-white/10 text-white rounded-lg py-3 px-4 focus:bg-black/30 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 outline-none transition"
                  placeholder={t('emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleFreeAccess()}
                />
              </div>
            )}
            
            <button
              onClick={handleFreeAccess}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3.5 px-4 rounded-lg transition transform hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || (!user && !email)}
            >
              {loading ? (user ? t('gettingAccess') : t('sending')) : (user ? t('getInstantAccess') : t('sendMagicLink'))}
            </button>
            
            {message.type && (
              <div 
                className={`mt-4 p-4 rounded-lg ${
                  message.type === 'success' ? 'bg-green-800/50 text-green-200 border border-green-500/30' :
                  message.type === 'error' ? 'bg-red-800/50 text-red-200 border border-red-500/30' :
                  'bg-blue-800/50 text-blue-200 border border-blue-500/30'
                }`}
              >
                {message.text}
              </div>
            )}
            
            <div className="text-center mt-6 text-xs text-gray-500">
              {t('securedBy')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
