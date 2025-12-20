'use client';

import Confetti from 'react-confetti';
import { useTranslations } from 'next-intl';
import { usePaymentStatus } from '../hooks';
import { PaymentStatusViewProps } from '../types';
import { getStatusInfo } from '../utils/helpers';
import {
  ErrorStatus,
  ProcessingStatus,
  SuccessStatus,
  MagicLinkStatus,
  PaymentStatusLayout,
} from './';

export default function PaymentStatusView({
  product,
  accessGranted,
  errorMessage,
  paymentStatus,
  customerEmail,
  sessionId,
  termsAlreadyHandled,
  redirectUrl,
}: PaymentStatusViewProps) {
  const t = useTranslations('paymentStatus');
  
  const {
    auth,
    countdown,
    windowDimensions,
    terms,
    turnstile,
    magicLink,
  } = usePaymentStatus({
    paymentStatus,
    customerEmail,
    sessionId,
    product,
    accessGranted,
    termsAlreadyHandled,
    redirectUrl,
  });

  const statusInfo = getStatusInfo(paymentStatus, t);

  // Handle error states first
  if (errorMessage && (paymentStatus === 'failed' || paymentStatus === 'expired')) {
    return (
      <PaymentStatusLayout product={product} statusInfo={statusInfo}>
        <ErrorStatus product={product} errorMessage={errorMessage} />
      </PaymentStatusLayout>
    );
  }

  // Handle processing state
  if (paymentStatus === 'processing') {
    return (
      <PaymentStatusLayout product={product} statusInfo={statusInfo}>
        <ProcessingStatus />
      </PaymentStatusLayout>
    );
  }

  // Handle success state with auth check
  if (paymentStatus === 'completed' && accessGranted && auth.isAuthenticated) {
    return (
      <>
        {/* Full-page confetti overlay */}
        {windowDimensions.width > 0 && (
          <div className="fixed inset-0 pointer-events-none z-50">
            <Confetti
              width={windowDimensions.width}
              height={windowDimensions.height}
              recycle={false}
              numberOfPieces={800}
              gravity={0.25}
              initialVelocityX={{ min: -10, max: 10 }}
              initialVelocityY={{ min: -20, max: 5 }}
            />
          </div>
        )}
        <PaymentStatusLayout 
          product={product} 
          statusInfo={statusInfo}
        >
          <SuccessStatus 
            product={product}
            windowDimensions={windowDimensions}
            countdown={countdown}
          />
        </PaymentStatusLayout>
      </>
    );
  }

  // Handle magic link flow
  if (paymentStatus === 'magic_link_sent' || paymentStatus === 'guest_purchase') {
    return (
      <>
        {/* Full-page confetti overlay for magic link sent */}
        {paymentStatus === 'magic_link_sent' && windowDimensions.width > 0 && (
          <div className="fixed inset-0 pointer-events-none z-50">
            <Confetti
              width={windowDimensions.width}
              height={windowDimensions.height}
              recycle={false}
              numberOfPieces={800}
              gravity={0.25}
              initialVelocityX={{ min: -10, max: 10 }}
              initialVelocityY={{ min: -20, max: 5 }}
            />
          </div>
        )}
        
        <PaymentStatusLayout 
          product={product} 
          statusInfo={statusInfo}
        >
          <MagicLinkStatus
            product={product}
            customerEmail={customerEmail}
            magicLinkSent={magicLink.sent}
            termsAccepted={terms.accepted}
            termsAlreadyHandled={terms.alreadyHandled}
            captchaToken={turnstile.token}
            captchaError={turnstile.error}
            captchaTimeout={turnstile.timeout}
            showInteractiveWarning={turnstile.showInteractiveWarning}
            magicLinkError={magicLink.error}
            onTermsAccept={terms.acceptTerms}
            onCaptchaSuccess={turnstile.setToken}
            onCaptchaError={turnstile.setError}
            onCaptchaTimeout={() => turnstile.setTimeout(true)}
            onBeforeInteractive={() => turnstile.setShowInteractiveWarning(true)}
            onAfterInteractive={() => turnstile.setShowInteractiveWarning(false)}
            sendMagicLink={magicLink.sendMagicLink}
          />
        </PaymentStatusLayout>
      </>
    );
  }

  // Fallback to error state
  return (
    <PaymentStatusLayout product={product} statusInfo={statusInfo}>
      <ErrorStatus 
        product={product} 
        errorMessage={errorMessage || `Unknown payment status: ${paymentStatus}`} 
      />
    </PaymentStatusLayout>
  );
}
