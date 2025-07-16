'use client';

import React from 'react';
import { useTranslations } from 'next-intl';

interface ProductAvailabilityBannerProps {
  product: {
    available_from?: string | null;
    available_until?: string | null;
    is_active: boolean;
  };
  isAuthenticated?: boolean;
}

export default function ProductAvailabilityBanner({ product, isAuthenticated = false }: ProductAvailabilityBannerProps) {
  const t = useTranslations('availabilityBanner');
  const now = new Date();
  const availableFrom = product.available_from ? new Date(product.available_from) : null;
  const availableUntil = product.available_until ? new Date(product.available_until) : null;
  
  // Check various availability states
  const isNotYetAvailable = availableFrom && availableFrom > now;
  const isExpired = availableUntil && availableUntil < now;
  const isExpiringSoon = availableUntil && !isExpired && availableUntil.getTime() - now.getTime() <= 7 * 24 * 60 * 60 * 1000; // 7 days
  const isExpiring24h = availableUntil && !isExpired && availableUntil.getTime() - now.getTime() <= 24 * 60 * 60 * 1000; // 24 hours
  
  const formatTimeRemaining = (date: Date) => {
    const diff = date.getTime() - now.getTime();
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
    
    if (days > 0) {
      const daysText = days === 1 ? t('days') : t('daysPlural');
      const hoursText = hours === 1 ? t('hours') : t('hoursPlural');
      return `${days} ${daysText} ${hours} ${hoursText}`;
    } else if (hours > 0) {
      const hoursText = hours === 1 ? t('hours') : t('hoursPlural');
      const minutesText = minutes === 1 ? t('minutes') : t('minutesPlural');
      return `${hours} ${hoursText} ${minutes} ${minutesText}`;
    } else {
      const minutesText = minutes === 1 ? t('minutes') : t('minutesPlural');
      return `${minutes} ${minutesText}`;
    }
  };
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Product not active (admin disabled)
  if (!product.is_active) {
    return (
      <div className="mb-6 p-4 bg-gray-500/20 border border-gray-500/30 rounded-xl">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-gray-300">{t('productUnavailable')}</h3>
            <p className="text-sm text-gray-400 mt-1">
              {t('productUnavailableMessage')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Product not yet available (future launch)
  if (isNotYetAvailable && availableFrom) {
    return (
      <div className="mb-6 p-4 bg-blue-500/20 border border-blue-500/30 rounded-xl">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-300">{t('comingSoon')}</h3>
            <p className="text-sm text-blue-400 mt-1">
              {t('comingSoonMessage', { date: formatDate(availableFrom) })}
            </p>
            <p className="text-xs text-blue-300 mt-1">
              ⏰ {t('availableIn', { time: formatTimeRemaining(availableFrom) })}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Product expired (past availability)
  if (isExpired && availableUntil) {
    return (
      <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-300">{t('offerExpired')}</h3>
            <p className="text-sm text-red-400 mt-1">
              {t('offerExpiredMessage', { 
                date: formatDate(availableUntil), 
                type: isAuthenticated ? t('newAccess') : t('purchase') 
              })}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Product expiring soon (scarcity marketing)
  if (isExpiringSoon && availableUntil) {
    return (
      <div className={`mb-6 p-4 rounded-xl ${
        isExpiring24h 
          ? 'bg-red-500/20 border border-red-500/30 animate-pulse' 
          : 'bg-orange-500/20 border border-orange-500/30'
      }`}>
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className={`h-5 w-5 ${isExpiring24h ? 'text-red-400' : 'text-orange-400'}`} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className={`text-sm font-medium ${isExpiring24h ? 'text-red-300' : 'text-orange-300'}`}>
              {isExpiring24h ? `⚠️ ${t('lastChance')}` : `🔥 ${t('limitedTimeOffer')}`}
            </h3>
            <p className={`text-sm mt-1 ${isExpiring24h ? 'text-red-400' : 'text-orange-400'}`}>
              {isExpiring24h 
                ? t('lastChanceMessage', { time: formatTimeRemaining(availableUntil) })
                : t('limitedTimeMessage', { time: formatTimeRemaining(availableUntil) })
              }
            </p>
            <p className="text-xs text-gray-300 mt-1">
              {t('offerEnds', { date: formatDate(availableUntil) })}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // No banner needed (product is normally available)
  return null;
}
