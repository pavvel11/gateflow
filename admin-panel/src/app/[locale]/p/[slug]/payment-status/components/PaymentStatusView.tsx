'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useTranslations } from 'next-intl';
import Confetti from 'react-confetti';
import TurnstileWidget from '@/components/TurnstileWidget';
import TermsCheckbox from '@/components/TermsCheckbox';

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
  termsAlreadyHandled: boolean; // Whether terms are already handled (Stripe collected OR user authenticated)
}

export default function PaymentStatusView({
  product,
  accessGranted,
  errorMessage,
  paymentStatus,
  customerEmail,
  sessionId,
  termsAlreadyHandled,
}: PaymentStatusViewProps) {
  const router = useRouter();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [countdown, setCountdown] = useState(3);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [sendingMagicLink, setSendingMagicLink] = useState(false);
  const [showSpinnerForMinTime, setShowSpinnerForMinTime] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  const [captchaTimeout, setCaptchaTimeout] = useState(false);
  const [showInteractiveWarning, setShowInteractiveWarning] = useState(false);
  const [isUserAuthenticated, setIsUserAuthenticated] = useState<boolean | null>(null);
  const supabase = createClient();
  const t = useTranslations('paymentStatus');
  const tCompliance = useTranslations('compliance');
  const tSecurity = useTranslations('security');
  
  // Calculate if we should show spinner immediately - more aggressive approach
  const termsOk = termsAlreadyHandled || termsAccepted;
  const baseCondition = paymentStatus === 'magic_link_sent' && 
                       customerEmail && 
                       sessionId && 
                       !magicLinkSent && 
                       termsOk;
  const shouldShowSpinner = baseCondition || showSpinnerForMinTime; // Show spinner for minimum time
  
 
  // Send magic link automatically for magic_link_sent status
  useEffect(() => {
    // Terms validation: either already handled (Stripe) OR manually accepted
    const termsOk = termsAlreadyHandled || termsAccepted;
    // Turnstile validation: always required (dev uses dummy, prod uses real)
    const turnstileOk = captchaToken;
    
    // Set sending state as soon as conditions are met
    if (paymentStatus === 'magic_link_sent' && customerEmail && sessionId && !magicLinkSent && termsOk && turnstileOk && !sendingMagicLink) {
      setSendingMagicLink(true);
      
      const sendMagicLink = async () => {
        try {
          const redirectUrl = `${window.location.origin}/auth/callback?redirect_to=${encodeURIComponent(`/p/${product.slug}/payment-status?session_id=${sessionId}`)}`;
          
          const { error } = await supabase.auth.signInWithOtp({
            email: customerEmail,
            options: {
              emailRedirectTo: redirectUrl,
              shouldCreateUser: true,
              captchaToken: captchaToken || undefined,
            }
          });
          
          if (!error) {
            setMagicLinkSent(true);
            // Also hide spinner when magic link is sent (but minimum time timer might still be running)
            setTimeout(() => setShowSpinnerForMinTime(false), 100);
          } else {
            console.error('Error sending magic link:', error);
          }
        } catch (err) {
          console.error('Exception sending magic link:', err);
        } finally {
          setSendingMagicLink(false);
        }
      };
      
      sendMagicLink();
    }
  }, [paymentStatus, customerEmail, sessionId, magicLinkSent, sendingMagicLink, termsAccepted, captchaToken, supabase.auth, product.slug, termsAlreadyHandled]);
  
  // Show spinner for minimum time when conditions are met
  useEffect(() => {
    const termsOk = termsAlreadyHandled || termsAccepted;
    const shouldTriggerSpinner = paymentStatus === 'magic_link_sent' && 
                                customerEmail && 
                                sessionId && 
                                termsOk;
    
    // Only trigger spinner if not already showing and magicLink not sent yet
    if (shouldTriggerSpinner && !showSpinnerForMinTime && !magicLinkSent) {
      setShowSpinnerForMinTime(true);

      // Keep spinner visible for at least .1 seconds, even if magicLinkSent becomes true
      const timer = setTimeout(() => {
        setShowSpinnerForMinTime(false);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [paymentStatus, customerEmail, sessionId, magicLinkSent, showSpinnerForMinTime, termsAlreadyHandled, termsAccepted]);
  
  // Check authentication status and redirect if completed payment but user not authenticated
  useEffect(() => {
    if (paymentStatus === 'completed' && accessGranted) {
      const checkAuthAndRedirect = async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            // User not authenticated - redirect to login with message
            router.push('/login?message=payment_completed_login_required');
          } else {
            setIsUserAuthenticated(true);
          }
        } catch (error) {
          console.error('Error checking auth status:', error);
          // On error, assume not authenticated and redirect
          router.push('/login?message=payment_completed_login_required');
        }
      };
      
      checkAuthAndRedirect();
    }
  }, [paymentStatus, accessGranted, supabase.auth, router]);
  
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
    if (paymentStatus === 'completed' && accessGranted && isUserAuthenticated) {
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
  }, [countdown, router, product.slug, paymentStatus, accessGranted, isUserAuthenticated]);

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
          
          @keyframes fadeInPulse {
            0% { 
              opacity: 0; 
              transform: scale(0.95); 
              box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
            }
            50% { 
              transform: scale(1.02); 
              box-shadow: 0 0 0 10px rgba(59, 130, 246, 0);
            }
            100% { 
              opacity: 1; 
              transform: scale(1); 
              box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
            }
          }
          
          @keyframes slideInLeft {
            0% { 
              opacity: 0; 
              transform: translateX(-20px); 
            }
            100% { 
              opacity: 1; 
              transform: translateX(0); 
            }
          }
          
          .animate-fadeInPulse {
            animation: fadeInPulse 1.5s ease-out forwards;
          }
          
          .animate-slideInLeft {
            animation: slideInLeft 0.6s ease-out forwards;
            opacity: 0;
          }
          
          .delay-100 {
            animation-delay: 0.1s;
          }
          
          .delay-200 {
            animation-delay: 0.2s;
          }
          
          .delay-300 {
            animation-delay: 0.3s;
          }
        `}</style>
        
        <div className={`max-w-4xl mx-auto p-8 bg-gradient-to-br ${statusInfo.bgColor} backdrop-blur-md border border-white/10 rounded-xl shadow-2xl z-10 text-center`}>
          <div className="text-5xl mb-4">{statusInfo.emoji}</div>
          <h2 className={`text-3xl font-bold ${statusInfo.color} mb-2`}>
            {statusInfo.title}
          </h2>
          <p className="text-gray-300 mb-6">{t('paymentProcessedSuccessfully')}</p>
          
          <div className="space-y-4">
            {(() => {
              // Show validation block only if we need user action
              const needsCustomTerms = !termsAlreadyHandled && !termsAccepted;
              const needsTurnstile = !captchaToken;
              
              // Show block if:
              // 1. Terms needed (always show) OR
              // 2. Interactive captcha warning is shown (only when onBeforeInteractive triggers)
              const showValidationBlock = !magicLinkSent && (
                needsCustomTerms || 
                showInteractiveWarning
              );
              
              if (showValidationBlock) {
                return (
                  <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-xl p-6 mb-6">
                    <h3 className="text-xl font-bold text-amber-200 mb-4">
                      ⚠️ {tCompliance('beforeSendingLink')}:
                    </h3>
                    
                    {/* Terms and Conditions Checkbox - only if terms not already handled */}
                    {needsCustomTerms && (
                      <div className="mb-4">
                        <TermsCheckbox
                          checked={termsAccepted}
                          onChange={setTermsAccepted}
                          termsUrl="/terms"
                          privacyUrl="/privacy"
                          variant="prominent"
                        />
                      </div>
                    )}

                    {/* Cloudflare Turnstile - show in yellow block when interactive */}
                    {showInteractiveWarning && (
                      <>
                        <TurnstileWidget
                          onVerify={(token) => {
                            setCaptchaToken(token);
                            setCaptchaError(null); // Clear any previous errors
                            setShowInteractiveWarning(false); // Hide warning after successful verification
                          }}
                          onError={() => {
                            setCaptchaToken(null);
                            setCaptchaError(tSecurity('captchaVerificationFailed'));
                          }}
                          onTimeout={() => {
                            setCaptchaTimeout(true);
                            setCaptchaError(tSecurity('captchaTimeout'));
                          }}
                          onBeforeInteractive={() => {
                            setShowInteractiveWarning(true);
                          }}
                        />
                        
                        {process.env.NODE_ENV === 'development' && (
                          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 text-sm text-blue-300 mt-3">
                            💡 Set NEXT_PUBLIC_TURNSTILE_TEST_MODE in .env to test different scenarios
                          </div>
                        )}
                      </>
                    )}
                    
                    {/* Show sending spinner when magic link is being sent within validation block */}
                    {shouldShowSpinner && !magicLinkSent && (
                      <div className="mt-4 bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 flex items-center justify-center">
                        <div className="flex items-center space-x-3">
                          <div className="animate-spin h-5 w-5 border-2 border-blue-400 border-t-transparent rounded-full"></div>
                          <span className="text-blue-300 font-medium">{t('sendingMagicLink')}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              }
              
              // Always render invisible Turnstile when token is needed (outside yellow block)
              if (needsTurnstile && !showInteractiveWarning) {
                return (
                  <div className="hidden">
                    <TurnstileWidget
                      onVerify={(token) => {
                        setCaptchaToken(token);
                        setCaptchaError(null);
                      }}
                      onError={() => {
                        setCaptchaToken(null);
                        setCaptchaError(tSecurity('captchaVerificationFailed'));
                      }}
                      onTimeout={() => {
                        setCaptchaTimeout(true);
                        setCaptchaError(tSecurity('captchaTimeout'));
                      }}
                      onBeforeInteractive={() => {
                        setShowInteractiveWarning(true);
                      }}
                    />
                  </div>
                );
              }
              
              // Show success message if magic link was sent successfully
              if (magicLinkSent) {
                return (
                  <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 mb-6">
                    <h3 className="text-lg font-semibold text-green-300 mb-2">
                      ✅ {t('magicLinkSent')}
                    </h3>
                    <p className="text-green-200 text-sm">
                      {t('checkEmailForLoginLink', { email: customerEmail || '' })}
                    </p>
                  </div>
                );
              }
              
              return null;
            })()}
            
            {/* Show spinner when conditions are met but validation block is not shown */}
            {(() => {
              const needsCustomTerms = !termsAlreadyHandled && !termsAccepted;
              const showValidationBlock = !magicLinkSent && (needsCustomTerms || showInteractiveWarning);
              const showSpinnerOutside = shouldShowSpinner && !magicLinkSent && !showValidationBlock;
              
              return showSpinnerOutside;
            })() && (
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 flex items-center justify-center mb-6">
                <div className="flex items-center space-x-3">
                  <div className="animate-spin h-5 w-5 border-2 border-blue-400 border-t-transparent rounded-full"></div>
                  <span className="text-blue-300 font-medium">{t('sendingMagicLink')}</span>
                </div>
              </div>
            )}
            
            {/* Show captcha errors always (even for invisible captcha) */}
            {captchaError && (
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 text-sm text-red-300 mb-4">
                ❌ {captchaError}
                {captchaTimeout ? (
                  <>
                    {' '}{tSecurity('refreshPageOrLogin')}{' '}
                    <Link href="/login" className="text-blue-400 hover:text-blue-300 underline">
                      {tSecurity('tryLoggingInAgain')}
                    </Link>
                    .
                  </>
                ) : (
                  <>
                    {' '}{tSecurity('captchaErrorLoginPrompt')}{' '}
                    <Link href="/login" className="text-blue-400 hover:text-blue-300 underline">
                      {tSecurity('tryLoggingInAgain')}
                    </Link>
                    .
                  </>
                )}
              </div>
            )}
            
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 animate-fadeInPulse">
              <h3 className="text-lg font-semibold text-blue-300 mb-2 animate-pulse">
                🎯 {t('toAccessYourProduct')}
              </h3>
              <div className="text-sm text-gray-300 space-y-2">
                <p className="animate-slideInLeft delay-100">{t('step1CheckEmail', { email: customerEmail ? `(${customerEmail})` : '' })}</p>
                <p className="animate-slideInLeft delay-200">{t('step2ClickMagicLink')}</p>
                <p className="animate-slideInLeft delay-300">{t('step3AutoRedirect')}</p>
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

  // Success state with access granted - only show if user is authenticated
  if (paymentStatus === 'completed' && accessGranted && isUserAuthenticated) {
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
