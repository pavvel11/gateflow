'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
type TermsCheckboxVariant = 'default' | 'prominent' | 'hidden';

interface TermsCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  required?: boolean;
  className?: string;
  termsUrl?: string;
  privacyUrl?: string;
  variant?: TermsCheckboxVariant;
}

export default function TermsCheckbox({
  checked,
  onChange,
  required = true,
  className = '',
  termsUrl = '/terms',
  privacyUrl = '/privacy',
  variant = 'default',
}: TermsCheckboxProps) {
  const [isFocused, setIsFocused] = useState(false)
  const t = useTranslations('compliance')

  // Don't render anything for hidden variant
  if (variant === 'hidden') {
    return null;
  }

  if (variant === 'prominent') {
    return (
      <div className={`bg-amber-500/10 border-2 border-amber-500/30 rounded-xl p-6 ${className}`}>
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0 mt-1">
            <input
              id="terms-checkbox"
              type="checkbox"
              checked={checked}
              onChange={(e) => onChange(e.target.checked)}
              required={required}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className={`w-5 h-5 text-amber-500 bg-transparent border-2 border-amber-500/50 rounded focus:ring-amber-500 focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all ${
                isFocused ? 'ring-2 ring-amber-500' : ''
              }`}
              aria-describedby="terms-checkbox-description"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="terms-checkbox" className="block cursor-pointer">
              <div className="text-amber-200 font-semibold text-lg mb-2">
                ⚠️ {t('termsRequired')}
              </div>
              <div className="text-amber-100 text-sm leading-relaxed" id="terms-checkbox-description">
                {t('iAgreeWith')}{' '}
                <Link
                  href={termsUrl}
                  className="text-amber-300 hover:text-amber-200 underline font-medium transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t('termsOfService')}
                </Link>
                {' '}{t('and')}{' '}
                <Link
                  href={privacyUrl}
                  className="text-amber-300 hover:text-amber-200 underline font-medium transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t('privacyPolicy')}
                </Link>
                {required && <span className="text-amber-300 ml-1">*</span>}
              </div>
            </label>
          </div>
        </div>
      </div>
    );
  }

  // Default variant: minimalist
  return (
    <div className={className}>
      <label htmlFor="terms-checkbox" className="flex items-center space-x-2 cursor-pointer">
        <input
          id="terms-checkbox"
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          required={required}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 transition-all ${isFocused ? 'ring-2 ring-blue-500' : ''}`}
          aria-describedby="terms-checkbox-description"
        />
        <span className="text-sm text-gray-200" id="terms-checkbox-description">
          {t('iAgreeWith')}{' '}
          <Link
            href={termsUrl}
            className="underline hover:text-blue-300"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('termsOfService')}
          </Link>
          {' '}{t('and')}{' '}
          <Link
            href={privacyUrl}
            className="underline hover:text-blue-300"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('privacyPolicy')}
          </Link>
          {required && <span className="text-blue-300 ml-1">*</span>}
        </span>
      </label>
    </div>
  );
}
