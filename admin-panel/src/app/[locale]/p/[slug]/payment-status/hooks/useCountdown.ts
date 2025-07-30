import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { COUNTDOWN_START } from '../utils/helpers';
import { PaymentStatus } from '../types';

interface UseCountdownParams {
  paymentStatus: PaymentStatus;
  accessGranted: boolean;
  isUserAuthenticated: boolean | null;
  productSlug: string;
}

export function useCountdown({ 
  paymentStatus, 
  accessGranted, 
  isUserAuthenticated, 
  productSlug 
}: UseCountdownParams) {
  const [countdown, setCountdown] = useState(COUNTDOWN_START);
  const router = useRouter();

  useEffect(() => {
    if (paymentStatus === 'completed' && accessGranted && isUserAuthenticated) {
      const timer = setTimeout(() => {
        if (countdown > 1) {
          setCountdown(countdown - 1);
        } else {
          // Redirect back to product page
          router.push(`/p/${productSlug}`);
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [countdown, router, productSlug, paymentStatus, accessGranted, isUserAuthenticated]);

  return countdown;
}
