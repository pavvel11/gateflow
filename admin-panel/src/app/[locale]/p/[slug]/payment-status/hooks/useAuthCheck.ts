import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { PaymentStatus, AuthStatus } from '../types';

interface UseAuthCheckParams {
  paymentStatus: PaymentStatus;
  accessGranted: boolean;
}

export function useAuthCheck({ paymentStatus, accessGranted }: UseAuthCheckParams): AuthStatus {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (paymentStatus === 'completed' && accessGranted) {
      setIsChecking(true);
      
      const checkAuthAndRedirect = async () => {
        try {
          const supabase = await createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            // User not authenticated - redirect to login with message
            router.push('/login?message=payment_completed_login_required');
          } else {
            setIsAuthenticated(true);
          }
        } catch (error) {
          console.error('Error checking auth status:', error);
          // On error, assume not authenticated and redirect
          router.push('/login?message=payment_completed_login_required');
        } finally {
          setIsChecking(false);
        }
      };
      
      checkAuthAndRedirect();
    }
  }, [paymentStatus, accessGranted, router]);

  return {
    isAuthenticated,
    isChecking,
  };
}
