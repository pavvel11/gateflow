import { PaymentStatus, StatusInfo } from '../types';

export function getStatusInfo(paymentStatus: PaymentStatus, t: (key: string) => string): StatusInfo {
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
}

export const CONFETTI_CONFIG = {
  numberOfPieces: 800,
  gravity: 0.25,
  initialVelocityX: { min: -10, max: 10 },
  initialVelocityY: { min: -20, max: 5 },
  recycle: false,
} as const;

export const SPINNER_MIN_TIME = 100; // milliseconds
export const COUNTDOWN_START = 3; // seconds
