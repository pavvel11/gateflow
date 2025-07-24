'use server';

import { DisposableEmailService } from '@/lib/services/disposable-email';

export async function validateEmailAction(email: string): Promise<{
  isValid: boolean;
  isDisposable: boolean;
  error?: string;
}> {
  try {
    return await DisposableEmailService.validateEmail(email);
  } catch (error) {
    console.error('Email validation action error:', error);
    return {
      isValid: false,
      isDisposable: false,
      error: 'Failed to validate email'
    };
  }
}
