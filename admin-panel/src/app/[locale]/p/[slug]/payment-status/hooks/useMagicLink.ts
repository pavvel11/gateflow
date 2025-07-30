import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MagicLinkState, PaymentStatus, Product } from '../types';
import { SPINNER_MIN_TIME } from '../utils/helpers';

interface UseMagicLinkParams {
  paymentStatus: PaymentStatus;
  customerEmail?: string;
  sessionId?: string;
  product: Product;
  termsAlreadyHandled: boolean;
  termsAccepted: boolean;
  captchaToken: string | null;
  showInteractiveWarning: boolean;
}

export function useMagicLink({
  paymentStatus,
  customerEmail,
  sessionId,
  product,
  termsAlreadyHandled,
  termsAccepted,
  captchaToken,
  showInteractiveWarning,
}: UseMagicLinkParams): MagicLinkState & { sendMagicLink: () => Promise<void> } {
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [sendingMagicLink, setSendingMagicLink] = useState(false);
  const [showSpinnerForMinTime, setShowSpinnerForMinTime] = useState(false);
  const supabase = createClient();

  const sendMagicLinkInternal = useCallback(async () => {
    if (!customerEmail || !sessionId) return;
    
    setSendingMagicLink(true);
    
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
        setTimeout(() => setShowSpinnerForMinTime(false), 100);
      } else {
        console.error('Error sending magic link:', error);
      }
    } catch (err) {
      console.error('Exception sending magic link:', err);
    } finally {
      setSendingMagicLink(false);
    }
  }, [customerEmail, sessionId, product.slug, supabase.auth, captchaToken]);

  // Auto-send magic link when conditions are met
  useEffect(() => {
    const termsOk = termsAlreadyHandled || termsAccepted;
    const turnstileOk = captchaToken;
    
    if (paymentStatus === 'magic_link_sent' && 
        customerEmail && 
        sessionId && 
        !magicLinkSent && 
        termsOk && 
        turnstileOk && 
        !sendingMagicLink) {
      sendMagicLinkInternal();
    }
  }, [paymentStatus, customerEmail, sessionId, magicLinkSent, sendingMagicLink, termsAccepted, captchaToken, termsAlreadyHandled, sendMagicLinkInternal]);

  // Show spinner for minimum time - different logic for invisible vs interactive
  useEffect(() => {
    const termsOk = termsAlreadyHandled || termsAccepted;
    
    // For invisible captcha: show spinner early (when terms OK)
    // For interactive captcha: show spinner only when captcha token received
    const shouldTriggerSpinner = paymentStatus === 'magic_link_sent' && 
                                customerEmail && 
                                sessionId && 
                                termsOk && 
                                (captchaToken || !showInteractiveWarning); // Show early for invisible, late for interactive
    
    if (shouldTriggerSpinner && !showSpinnerForMinTime && !magicLinkSent) {
      setShowSpinnerForMinTime(true);
      
      const timer = setTimeout(() => {
        setShowSpinnerForMinTime(false);
      }, SPINNER_MIN_TIME);
      
      return () => clearTimeout(timer);
    }
  }, [paymentStatus, customerEmail, sessionId, magicLinkSent, showSpinnerForMinTime, termsAlreadyHandled, termsAccepted, captchaToken, showInteractiveWarning]); // Added showInteractiveWarning

  return {
    sent: magicLinkSent,
    sending: sendingMagicLink,
    showSpinnerForMinTime,
    sendMagicLink: sendMagicLinkInternal,
  };
}
