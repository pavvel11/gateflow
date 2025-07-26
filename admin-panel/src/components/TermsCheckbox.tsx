'use client'

import { useState } from 'react'
import Link from 'next/link'

interface TermsCheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  required?: boolean
  className?: string
  termsUrl?: string
  privacyUrl?: string
}

export default function TermsCheckbox({
  checked,
  onChange,
  required = true,
  className = '',
  termsUrl = '/terms',
  privacyUrl = '/privacy'
}: TermsCheckboxProps) {
  const [isFocused, setIsFocused] = useState(false)

  return (
    <div className={`flex items-start space-x-3 ${className}`}>
      <div className="flex items-center h-5">
        <input
          id="terms-checkbox"
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          required={required}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`w-4 h-4 text-purple-600 bg-white/10 border-white/20 rounded focus:ring-purple-500 focus:ring-2 transition-all ${
            isFocused ? 'ring-2 ring-purple-500' : ''
          }`}
        />
      </div>
      <div className="text-sm">
        <label htmlFor="terms-checkbox" className="text-gray-300 cursor-pointer">
          Zgadzam się z{' '}
          <Link
            href={termsUrl}
            className="text-purple-400 hover:text-purple-300 underline transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            Regulaminem
          </Link>
          {' '}i{' '}
          <Link
            href={privacyUrl}
            className="text-purple-400 hover:text-purple-300 underline transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            Polityką prywatności
          </Link>
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      </div>
    </div>
  )
}
