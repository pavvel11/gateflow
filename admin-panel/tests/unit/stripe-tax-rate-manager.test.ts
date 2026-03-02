import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies before importing
vi.mock('@/lib/stripe/server', () => ({
  getStripeServer: vi.fn(),
}))

vi.mock('@/lib/actions/shop-config', () => ({
  getShopConfig: vi.fn(),
  updateShopConfig: vi.fn(),
}))

import { getOrCreateStripeTaxRate } from '@/lib/stripe/tax-rate-manager'
import { getStripeServer } from '@/lib/stripe/server'
import { getShopConfig, updateShopConfig } from '@/lib/actions/shop-config'

const mockedGetStripeServer = vi.mocked(getStripeServer)
const mockedGetShopConfig = vi.mocked(getShopConfig)
const mockedUpdateShopConfig = vi.mocked(updateShopConfig)

const makeMockStripe = (overrides: Record<string, unknown> = {}) => ({
  taxRates: {
    retrieve: vi.fn(),
    create: vi.fn(),
    ...overrides,
  },
})

describe('getOrCreateStripeTaxRate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedUpdateShopConfig.mockResolvedValue({ success: true })
  })

  it('should return cached tax rate when valid', async () => {
    const mockStripe = makeMockStripe({
      retrieve: vi.fn().mockResolvedValue({
        id: 'txr_cached',
        active: true,
        percentage: 23,
        inclusive: true,
      }),
    })
    mockedGetStripeServer.mockResolvedValue(mockStripe as any)
    mockedGetShopConfig.mockResolvedValue({
      id: '1',
      shop_name: 'Test',
      default_currency: 'USD',
      omnibus_enabled: false,
      custom_settings: {},
      created_at: '',
      updated_at: '',
      stripe_tax_rate_cache: { '23.00_inclusive': 'txr_cached' },
    } as any)

    const result = await getOrCreateStripeTaxRate({ percentage: 23, inclusive: true })

    expect(result).toBe('txr_cached')
    expect(mockStripe.taxRates.retrieve).toHaveBeenCalledWith('txr_cached')
    expect(mockStripe.taxRates.create).not.toHaveBeenCalled()
  })

  it('should create new tax rate when cache is empty', async () => {
    const mockStripe = makeMockStripe({
      create: vi.fn().mockResolvedValue({ id: 'txr_new' }),
    })
    mockedGetStripeServer.mockResolvedValue(mockStripe as any)
    mockedGetShopConfig.mockResolvedValue({
      id: '1',
      shop_name: 'Test',
      default_currency: 'USD',
      omnibus_enabled: false,
      custom_settings: {},
      created_at: '',
      updated_at: '',
      stripe_tax_rate_cache: {},
    } as any)

    const result = await getOrCreateStripeTaxRate({ percentage: 23, inclusive: true })

    expect(result).toBe('txr_new')
    expect(mockStripe.taxRates.create).toHaveBeenCalledWith({
      display_name: 'VAT',
      percentage: 23,
      inclusive: true,
      description: 'VAT 23% (inclusive)',
    })
    expect(mockedUpdateShopConfig).toHaveBeenCalledWith({
      stripe_tax_rate_cache: { '23.00_inclusive': 'txr_new' },
    })
  })

  it('should create new tax rate when cached one is inactive', async () => {
    const mockStripe = makeMockStripe({
      retrieve: vi.fn().mockResolvedValue({
        id: 'txr_old',
        active: false,
        percentage: 23,
        inclusive: true,
      }),
      create: vi.fn().mockResolvedValue({ id: 'txr_replacement' }),
    })
    mockedGetStripeServer.mockResolvedValue(mockStripe as any)
    mockedGetShopConfig.mockResolvedValue({
      id: '1',
      shop_name: 'Test',
      default_currency: 'USD',
      omnibus_enabled: false,
      custom_settings: {},
      created_at: '',
      updated_at: '',
      stripe_tax_rate_cache: { '23.00_inclusive': 'txr_old' },
    } as any)

    const result = await getOrCreateStripeTaxRate({ percentage: 23, inclusive: true })

    expect(result).toBe('txr_replacement')
    expect(mockStripe.taxRates.create).toHaveBeenCalled()
    expect(mockedUpdateShopConfig).toHaveBeenCalledWith({
      stripe_tax_rate_cache: { '23.00_inclusive': 'txr_replacement' },
    })
  })

  it('should create new tax rate when retrieve throws (deleted/invalid)', async () => {
    const mockStripe = makeMockStripe({
      retrieve: vi.fn().mockRejectedValue(new Error('No such tax rate')),
      create: vi.fn().mockResolvedValue({ id: 'txr_fresh' }),
    })
    mockedGetStripeServer.mockResolvedValue(mockStripe as any)
    mockedGetShopConfig.mockResolvedValue({
      id: '1',
      shop_name: 'Test',
      default_currency: 'USD',
      omnibus_enabled: false,
      custom_settings: {},
      created_at: '',
      updated_at: '',
      stripe_tax_rate_cache: { '23.00_inclusive': 'txr_deleted' },
    } as any)

    const result = await getOrCreateStripeTaxRate({ percentage: 23, inclusive: true })

    expect(result).toBe('txr_fresh')
    expect(mockStripe.taxRates.create).toHaveBeenCalled()
  })

  it('should create new tax rate when cached percentage mismatches', async () => {
    const mockStripe = makeMockStripe({
      retrieve: vi.fn().mockResolvedValue({
        id: 'txr_wrong',
        active: true,
        percentage: 19, // mismatches requested 23
        inclusive: true,
      }),
      create: vi.fn().mockResolvedValue({ id: 'txr_correct' }),
    })
    mockedGetStripeServer.mockResolvedValue(mockStripe as any)
    mockedGetShopConfig.mockResolvedValue({
      id: '1',
      shop_name: 'Test',
      default_currency: 'USD',
      omnibus_enabled: false,
      custom_settings: {},
      created_at: '',
      updated_at: '',
      stripe_tax_rate_cache: { '23.00_inclusive': 'txr_wrong' },
    } as any)

    const result = await getOrCreateStripeTaxRate({ percentage: 23, inclusive: true })

    expect(result).toBe('txr_correct')
  })

  it('should use exclusive cache key for exclusive tax', async () => {
    const mockStripe = makeMockStripe({
      create: vi.fn().mockResolvedValue({ id: 'txr_excl' }),
    })
    mockedGetStripeServer.mockResolvedValue(mockStripe as any)
    mockedGetShopConfig.mockResolvedValue({
      id: '1',
      shop_name: 'Test',
      default_currency: 'USD',
      omnibus_enabled: false,
      custom_settings: {},
      created_at: '',
      updated_at: '',
      stripe_tax_rate_cache: {},
    } as any)

    await getOrCreateStripeTaxRate({ percentage: 8, inclusive: false })

    expect(mockStripe.taxRates.create).toHaveBeenCalledWith(
      expect.objectContaining({
        percentage: 8,
        inclusive: false,
        description: 'VAT 8% (exclusive)',
      }),
    )
    expect(mockedUpdateShopConfig).toHaveBeenCalledWith({
      stripe_tax_rate_cache: { '8.00_exclusive': 'txr_excl' },
    })
  })

  it('should use custom displayName when provided', async () => {
    const mockStripe = makeMockStripe({
      create: vi.fn().mockResolvedValue({ id: 'txr_gst' }),
    })
    mockedGetStripeServer.mockResolvedValue(mockStripe as any)
    mockedGetShopConfig.mockResolvedValue({
      id: '1',
      shop_name: 'Test',
      default_currency: 'USD',
      omnibus_enabled: false,
      custom_settings: {},
      created_at: '',
      updated_at: '',
      stripe_tax_rate_cache: {},
    } as any)

    await getOrCreateStripeTaxRate({ percentage: 10, inclusive: true, displayName: 'GST' })

    expect(mockStripe.taxRates.create).toHaveBeenCalledWith(
      expect.objectContaining({
        display_name: 'GST',
        description: 'GST 10% (inclusive)',
      }),
    )
  })

  it('should include country when provided', async () => {
    const mockStripe = makeMockStripe({
      create: vi.fn().mockResolvedValue({ id: 'txr_pl' }),
    })
    mockedGetStripeServer.mockResolvedValue(mockStripe as any)
    mockedGetShopConfig.mockResolvedValue({
      id: '1',
      shop_name: 'Test',
      default_currency: 'USD',
      omnibus_enabled: false,
      custom_settings: {},
      created_at: '',
      updated_at: '',
      stripe_tax_rate_cache: {},
    } as any)

    await getOrCreateStripeTaxRate({ percentage: 23, inclusive: true, country: 'PL' })

    expect(mockStripe.taxRates.create).toHaveBeenCalledWith(
      expect.objectContaining({ country: 'PL' }),
    )
  })

  it('should handle null shop config (no cache)', async () => {
    const mockStripe = makeMockStripe({
      create: vi.fn().mockResolvedValue({ id: 'txr_nocache' }),
    })
    mockedGetStripeServer.mockResolvedValue(mockStripe as any)
    mockedGetShopConfig.mockResolvedValue(null)

    const result = await getOrCreateStripeTaxRate({ percentage: 23, inclusive: true })

    expect(result).toBe('txr_nocache')
    expect(mockStripe.taxRates.create).toHaveBeenCalled()
  })

  it('should preserve existing cache entries when adding new one', async () => {
    const mockStripe = makeMockStripe({
      create: vi.fn().mockResolvedValue({ id: 'txr_8pct' }),
    })
    mockedGetStripeServer.mockResolvedValue(mockStripe as any)
    mockedGetShopConfig.mockResolvedValue({
      id: '1',
      shop_name: 'Test',
      default_currency: 'USD',
      omnibus_enabled: false,
      custom_settings: {},
      created_at: '',
      updated_at: '',
      stripe_tax_rate_cache: { '23.00_inclusive': 'txr_existing' },
    } as any)

    await getOrCreateStripeTaxRate({ percentage: 8, inclusive: true })

    expect(mockedUpdateShopConfig).toHaveBeenCalledWith({
      stripe_tax_rate_cache: {
        '23.00_inclusive': 'txr_existing',
        '8.00_inclusive': 'txr_8pct',
      },
    })
  })
})
