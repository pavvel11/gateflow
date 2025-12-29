import { useAuthCheck } from './useAuthCheck';
import { useCountdown } from './useCountdown';
import { useWindowDimensions } from './useWindowDimensions';
import { useMagicLink } from './useMagicLink';
import { useTurnstile } from './useTurnstile';
import { useTerms } from './useTerms';
import { PaymentStatus, Product } from '../types';

interface UsePaymentStatusParams {
  paymentStatus: PaymentStatus;
  customerEmail?: string;
  sessionId?: string;
  paymentIntentId?: string;
  product: Product;
  accessGranted: boolean;
  redirectUrl?: string;
}

export function usePaymentStatus({
  paymentStatus,
  customerEmail,
  sessionId,
  paymentIntentId,
  product,
  accessGranted,
  redirectUrl,
}: UsePaymentStatusParams) {
  const terms = useTerms();
  const turnstile = useTurnstile();

  const auth = useAuthCheck({
    paymentStatus,
    accessGranted
  });

  const countdown = useCountdown({
    paymentStatus,
    accessGranted,
    isUserAuthenticated: auth.isAuthenticated,
    productSlug: product.slug,
    redirectUrl,
  });

  const windowDimensions = useWindowDimensions();

  const magicLink = useMagicLink({
    paymentStatus,
    customerEmail,
    sessionId,
    paymentIntentId,
    product,
    termsAccepted: terms.accepted,
    captchaToken: turnstile.token,
    showInteractiveWarning: turnstile.showInteractiveWarning,
  });

  return {
    auth,
    countdown,
    windowDimensions,
    terms,
    turnstile,
    magicLink,
  };
}
