'use client'

import { Shield, Lock, Key, CheckCircle2, ArrowRight } from 'lucide-react'
import { useStripeConfig } from '../context/StripeConfigContext'
import { useTranslations } from 'next-intl'

export function Step1Welcome() {
  const t = useTranslations('stripe.wizard.step1')
  const { nextStep } = useStripeConfig()

  return (
    <div className="max-w-2xl mx-auto">
      {/* Hero Section */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-sf-accent-soft  mb-4">
          <Shield className="w-8 h-8 text-sf-accent" />
        </div>
        <h3 className="text-2xl font-bold text-sf-heading mb-2">
          {t('title', { defaultValue: 'Secure Stripe Integration' })}
        </h3>
        <p className="text-sf-body">
          {t('subtitle', {
            defaultValue:
              'Configure your Stripe API keys using Restricted API Keys (RAK) for maximum security',
          })}
        </p>
      </div>

      {/* What are RAKs */}
      <div className="bg-sf-accent-soft p-6 mb-6">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <Key className="w-5 h-5 text-sf-accent mt-0.5" />
          </div>
          <div>
            <h4 className="font-semibold text-sf-heading mb-2">
              {t('whatIsRAK.title', { defaultValue: 'What are Restricted API Keys?' })}
            </h4>
            <p className="text-sm text-sf-body mb-3">
              {t('whatIsRAK.description', {
                defaultValue:
                  'Restricted API Keys (RAK) allow you to grant specific permissions to your application, following the principle of least privilege. Instead of using full access keys, you only grant the permissions Sellf actually needs.',
              })}
            </p>
            <div className="text-sm text-sf-body">
              <strong>{t('whatIsRAK.recommended', { defaultValue: 'Recommended by Stripe' })}</strong>{' '}
              {t('whatIsRAK.recommendedText', {
                defaultValue: 'for self-hosted integrations and production environments.',
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Benefits */}
      <div className="space-y-3 mb-8">
        <h4 className="font-semibold text-sf-heading mb-4">
          {t('benefits.title', { defaultValue: 'Why use this wizard?' })}
        </h4>

        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-sf-success mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-sf-heading">
              {t('benefits.encrypted.title', { defaultValue: 'Encrypted Storage' })}
            </p>
            <p className="text-sm text-sf-body">
              {t('benefits.encrypted.description', {
                defaultValue: 'Your API keys are encrypted with AES-256-GCM before being stored in the database.',
              })}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-sf-success mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-sf-heading">
              {t('benefits.guided.title', { defaultValue: 'Guided Setup' })}
            </p>
            <p className="text-sm text-sf-body">
              {t('benefits.guided.description', {
                defaultValue:
                  'Step-by-step instructions with visual guides to create your Restricted API Key in Stripe.',
              })}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-sf-success mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-sf-heading">
              {t('benefits.validation.title', { defaultValue: 'Automatic Validation' })}
            </p>
            <p className="text-sm text-sf-body">
              {t('benefits.validation.description', {
                defaultValue:
                  'We automatically test your key and verify it has all required permissions.',
              })}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-sf-success mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-sf-heading">
              {t('benefits.rotation.title', { defaultValue: 'Key Rotation Tracking' })}
            </p>
            <p className="text-sm text-sf-body">
              {t('benefits.rotation.description', {
                defaultValue:
                  'Tracks when your key was created so you know when to rotate it (recommended every 90 days).',
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Alternative Method */}
      <div className="bg-sf-raised p-4 mb-8 border border-sf-border">
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-sf-body mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-sf-heading mb-1">
              {t('alternative.title', { defaultValue: 'Alternative: .env Configuration' })}
            </p>
            <p className="text-sm text-sf-body">
              {t('alternative.description', {
                defaultValue:
                  'Developers can also configure Stripe by setting STRIPE_SECRET_KEY directly in .env file. Both methods are equally supported.',
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Time Estimate */}
      <div className="text-center text-sm text-sf-muted mb-6">
        ⏱️ {t('timeEstimate', { defaultValue: 'Estimated time: 5-10 minutes' })}
      </div>

      {/* Action Button */}
      <div className="flex justify-center">
        <button
          onClick={nextStep}
          className="inline-flex items-center gap-2 px-6 py-3 bg-sf-accent-bg text-white font-semibold hover:bg-sf-accent-hover transition-colors"
        >
          {t('startButton', { defaultValue: 'Start Configuration' })}
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
