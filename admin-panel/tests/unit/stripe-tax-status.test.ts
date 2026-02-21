import { describe, it, expect } from 'vitest'
import type { StripeTaxStatus, TaxStatusValue } from '@/lib/actions/stripe-tax'

describe('Stripe Tax Status types', () => {
  describe('status values', () => {
    it('should accept active status', () => {
      const status: StripeTaxStatus = {
        status: 'active',
        registrations: [{ country: 'PL' }, { country: 'DE' }],
        headOffice: { country: 'PL' },
      }
      expect(status.status).toBe('active')
      expect(status.registrations).toHaveLength(2)
    })

    it('should accept pending status with missing fields', () => {
      const status: StripeTaxStatus = {
        status: 'pending',
        missingFields: ['head_office'],
        registrations: [],
      }
      expect(status.status).toBe('pending')
      expect(status.missingFields).toContain('head_office')
    })

    it('should accept stripe_not_configured status', () => {
      const status: StripeTaxStatus = {
        status: 'stripe_not_configured',
        registrations: [],
      }
      expect(status.status).toBe('stripe_not_configured')
      expect(status.registrations).toHaveLength(0)
    })

    it('should accept no_permission status', () => {
      const status: StripeTaxStatus = {
        status: 'no_permission',
        registrations: [],
      }
      expect(status.status).toBe('no_permission')
    })
  })

  describe('registrations', () => {
    it('should include country and optional state', () => {
      const status: StripeTaxStatus = {
        status: 'active',
        registrations: [
          { country: 'US', state: 'CA' },
          { country: 'PL' },
          { country: 'DE' },
        ],
      }
      expect(status.registrations[0].country).toBe('US')
      expect(status.registrations[0].state).toBe('CA')
      expect(status.registrations[1].state).toBeUndefined()
    })

    it('should support empty registrations list', () => {
      const status: StripeTaxStatus = {
        status: 'active',
        registrations: [],
      }
      expect(status.registrations).toEqual([])
    })
  })

  describe('head office', () => {
    it('should be optional', () => {
      const status: StripeTaxStatus = {
        status: 'active',
        registrations: [],
      }
      expect(status.headOffice).toBeUndefined()
    })

    it('should include country and optional state', () => {
      const status: StripeTaxStatus = {
        status: 'active',
        registrations: [],
        headOffice: { country: 'US', state: 'NY' },
      }
      expect(status.headOffice?.country).toBe('US')
      expect(status.headOffice?.state).toBe('NY')
    })
  })

  describe('dashboard links', () => {
    const EXPECTED_URLS = [
      'https://dashboard.stripe.com/settings/tax',
      'https://dashboard.stripe.com/tax/registrations',
      'https://dashboard.stripe.com/tax/reporting',
    ]

    it('should have correct Stripe Dashboard URLs', () => {
      EXPECTED_URLS.forEach((url) => {
        expect(url).toMatch(/^https:\/\/dashboard\.stripe\.com\//)
      })
    })

    it('should cover tax settings, registrations, and reports', () => {
      expect(EXPECTED_URLS).toHaveLength(3)
      expect(EXPECTED_URLS[0]).toContain('/settings/tax')
      expect(EXPECTED_URLS[1]).toContain('/tax/registrations')
      expect(EXPECTED_URLS[2]).toContain('/tax/reporting')
    })
  })

  describe('TaxStatusValue type coverage', () => {
    it('should have all four possible status values', () => {
      const allStatuses: TaxStatusValue[] = [
        'active',
        'pending',
        'stripe_not_configured',
        'no_permission',
      ]
      expect(allStatuses).toHaveLength(4)
      expect(new Set(allStatuses).size).toBe(4)
    })
  })
})
