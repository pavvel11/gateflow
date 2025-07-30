import { useTranslations } from 'next-intl';
import Link from 'next/link';
import TurnstileWidget from '@/components/TurnstileWidget';
import TermsCheckbox from '@/components/TermsCheckbox';
import { Product } from '../types';
import { shouldShowVisibleCaptcha } from '../utils/turnstileUtils';

interface MagicLinkStatusProps {
  product: Product;
  customerEmail?: string;
  magicLinkSent: boolean;
  termsAccepted: boolean;
  termsAlreadyHandled: boolean;
  captchaToken: string | null;
  captchaError: string | null;
  captchaTimeout: boolean;
  showInteractiveWarning: boolean;
  onTermsAccept: () => void;
  onCaptchaSuccess: (token: string) => void;
  onCaptchaError: (error: string | null) => void;
  onCaptchaTimeout: () => void;
  onBeforeInteractive: () => void;
  onAfterInteractive: () => void;
  sendMagicLink: () => Promise<void>;
}

export default function MagicLinkStatus({
  customerEmail,
  magicLinkSent,
  termsAccepted,
  termsAlreadyHandled,
  captchaToken,
  captchaError,
  captchaTimeout,
  showInteractiveWarning,
  onTermsAccept,
  onCaptchaSuccess,
  onCaptchaError,
  onCaptchaTimeout,
  onBeforeInteractive,
  onAfterInteractive,
}: MagicLinkStatusProps) {
  const t = useTranslations('paymentStatus');
  const tCompliance = useTranslations('compliance');
  const tSecurity = useTranslations('security');

  const termsOk = termsAlreadyHandled || termsAccepted;

  const needsCustomTerms = !termsAlreadyHandled && !termsAccepted;
  const needsTurnstile = !captchaToken;
  const shouldShowCaptchaVisible = shouldShowVisibleCaptcha();
  
  // Show validation block if:
  // 1. We need user action (terms or captcha)
  // 2. There's no captcha error
  // 3. Magic link hasn't been sent yet
  const showValidationBlock = !magicLinkSent && !captchaError && (
    needsCustomTerms || 
    (needsTurnstile && shouldShowCaptchaVisible) || 
    showInteractiveWarning
  );
  
  // SIMPLE: show spinner by default, hide it in 3 cases
  const shouldShowSpinner = customerEmail && 
                           termsOk && 
                           !magicLinkSent && 
                           !showValidationBlock &&
                           !captchaError; // Hide spinner when captcha fails

  return (
    <>
      <p className="text-gray-300 mb-6">{t('paymentProcessedSuccessfully')}</p>
      
      <div className="space-y-4">
        {showValidationBlock ? (
          <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-xl p-6 mb-6">
            <h3 className="text-xl font-bold text-amber-200 mb-6">
              ⚠️ {tCompliance('beforeSendingLink')}
            </h3>
            
            {/* Terms and Conditions Checkbox - only if terms not already handled */}
            {needsCustomTerms && (
              <div className="mb-6">
                <TermsCheckbox
                  checked={termsAccepted}
                  onChange={onTermsAccept}
                  termsUrl="/terms"
                  privacyUrl="/privacy"
                  variant="default"
                />
              </div>
            )}

            {/* Cloudflare Turnstile - show in yellow block when visible captcha is needed */}
            {needsTurnstile && shouldShowCaptchaVisible && (
              <TurnstileWidget
                onVerify={(token) => {
                  onCaptchaSuccess(token);
                  onCaptchaError(null); // Clear any previous errors
                  onAfterInteractive(); // Hide warning after successful verification
                }}
                onError={() => {
                  onCaptchaError(tSecurity('captchaVerificationFailed'));
                }}
                onTimeout={() => {
                  onCaptchaTimeout();
                  onCaptchaError(tSecurity('captchaTimeout'));
                }}
                onBeforeInteractive={onBeforeInteractive}
              />
            )}
            
          </div>
        ) : needsTurnstile && !shouldShowCaptchaVisible ? (
          // Always render invisible Turnstile when token is needed (outside yellow block)
          <div className="hidden">
            <TurnstileWidget
              onVerify={onCaptchaSuccess}
              onError={() => onCaptchaError(tSecurity('captchaVerificationFailed'))}
              onTimeout={() => {
                onCaptchaTimeout();
                onCaptchaError(tSecurity('captchaTimeout'));
              }}
              onBeforeInteractive={onBeforeInteractive}
            />
          </div>
        ) : magicLinkSent ? (
          // Show success message if magic link was sent successfully
          <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-green-300 mb-2">
              ✅ {t('magicLinkSent')}
            </h3>
            <p className="text-green-200 text-sm">
              {t('checkEmailForLoginLink', { email: customerEmail || '' })}
            </p>
          </div>
        ) : null}
        
        {/* SINGLE SPINNER OUTSIDE YELLOW BLOCK - shows in 2 cases */}
        {shouldShowSpinner && customerEmail && (
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 flex items-center justify-center mb-6">
            <div className="flex items-center space-x-3">
              <div className="animate-spin h-5 w-5 border-2 border-blue-400 border-t-transparent rounded-full"></div>
              <span className="text-blue-300 font-medium">
                {captchaToken ? t('sendingMagicLink') : 'Processing verification...'}
              </span>
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
                <Link href="/login?message=payment_completed_login_required" className="text-blue-400 hover:text-blue-300 underline">
                  {tSecurity('tryLoggingInAgain')}
                </Link>
                .
              </>
            ) : (
              <>
                {' '}{tSecurity('captchaErrorLoginPrompt')}{' '}
                <Link href="/login?message=payment_completed_login_required" className="text-blue-400 hover:text-blue-300 underline">
                  {tSecurity('tryLoggingInAgain')}
                </Link>
                .
              </>
            )}
          </div>
        )}
        {!captchaError && (
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
        )}
        <p className="text-gray-400 text-sm">
          {t('didNotReceiveEmail')}
        </p>
      </div>
    </>
  );
}
