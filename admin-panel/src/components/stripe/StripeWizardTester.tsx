'use client'

import { useState } from 'react'
import { StripeConfigWizard } from './StripeConfigWizard'
import { Settings } from 'lucide-react'

/**
 * Temporary testing component for the Stripe Configuration Wizard
 *
 * Usage: Add this component to any page to test the wizard
 * Example:
 * ```tsx
 * import { StripeWizardTester } from '@/components/stripe/StripeWizardTester'
 *
 * export default function TestPage() {
 *   return <StripeWizardTester />
 * }
 * ```
 */
export function StripeWizardTester() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <div className="fixed bottom-4 right-4 z-40">
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transition-colors"
        >
          <Settings className="w-5 h-5" />
          Test Stripe Wizard
        </button>
      </div>

      {isOpen && (
        <StripeConfigWizard
          onClose={() => setIsOpen(false)}
          onComplete={() => {
            console.log('✅ Wizard completed!')
            setIsOpen(false)
            // You can add a toast notification here
          }}
        />
      )}
    </>
  )
}
