/**
 * Currency Exchange Rate Service
 *
 * Flexible architecture for fetching exchange rates from various providers.
 * Easy to swap providers by changing the implementation.
 */

export interface ExchangeRateProvider {
  name: string;
  fetchRates(baseCurrency: string): Promise<ExchangeRates>;
}

export interface ExchangeRates {
  base: string;
  rates: { [currency: string]: number };
  timestamp: number;
  source: string;
}

/**
 * ExchangeRate-API.com Provider (FREE tier: 1500 requests/month)
 * Docs: https://www.exchangerate-api.com/docs/overview
 */
class ExchangeRateApiProvider implements ExchangeRateProvider {
  name = 'exchangerate-api';
  private apiKey: string;
  private baseUrl = 'https://v6.exchangerate-api.com/v6';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async fetchRates(baseCurrency: string): Promise<ExchangeRates> {
    const url = `${this.baseUrl}/${this.apiKey}/latest/${baseCurrency}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`ExchangeRate-API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.result !== 'success') {
      throw new Error(`ExchangeRate-API returned: ${data['error-type']}`);
    }

    return {
      base: data.base_code,
      rates: data.conversion_rates,
      timestamp: data.time_last_update_unix * 1000,
      source: this.name,
    };
  }
}

/**
 * Fixer.io Provider (Paid, highly reliable)
 * Docs: https://fixer.io/documentation
 */
class FixerIoProvider implements ExchangeRateProvider {
  name = 'fixer';
  private apiKey: string;
  private baseUrl = 'https://api.fixer.io';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async fetchRates(baseCurrency: string): Promise<ExchangeRates> {
    const url = `${this.baseUrl}/latest?access_key=${this.apiKey}&base=${baseCurrency}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Fixer.io error: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(`Fixer.io error: ${data.error?.type}`);
    }

    return {
      base: data.base,
      rates: data.rates,
      timestamp: data.timestamp * 1000,
      source: this.name,
    };
  }
}

/**
 * European Central Bank Provider (FREE, official EU rates)
 * No API key needed, but limited to EUR base only
 */
class ECBProvider implements ExchangeRateProvider {
  name = 'ecb';
  private baseUrl = 'https://api.exchangerate.host/latest';

  async fetchRates(baseCurrency: string): Promise<ExchangeRates> {
    // ECB only provides EUR as base, so we need to use exchangerate.host (free wrapper)
    const url = `${this.baseUrl}?base=${baseCurrency}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`ECB error: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(`ECB error: ${data.error}`);
    }

    return {
      base: data.base,
      rates: data.rates,
      timestamp: new Date(data.date).getTime(),
      source: this.name,
    };
  }
}

/**
 * Manual/Static Provider (fallback, uses hardcoded rates)
 */
class ManualProvider implements ExchangeRateProvider {
  name = 'manual';

  async fetchRates(baseCurrency: string): Promise<ExchangeRates> {
    // Static fallback rates (should be updated periodically)
    const staticRates: { [base: string]: { [currency: string]: number } } = {
      USD: {
        EUR: 0.92,
        GBP: 0.79,
        PLN: 4.03,
        JPY: 149.50,
        CAD: 1.35,
        AUD: 1.52,
      },
      EUR: {
        USD: 1.09,
        GBP: 0.86,
        PLN: 4.38,
        JPY: 162.50,
        CAD: 1.47,
        AUD: 1.65,
      },
      // Add more as needed
    };

    const rates = staticRates[baseCurrency];
    if (!rates) {
      throw new Error(`Manual provider: no rates for ${baseCurrency}`);
    }

    // Add self-referential rate
    rates[baseCurrency] = 1.0;

    return {
      base: baseCurrency,
      rates,
      timestamp: Date.now(),
      source: this.name,
    };
  }
}

/**
 * Currency Service - Main entry point
 */
export class CurrencyService {
  private provider: ExchangeRateProvider;

  constructor(providerType: 'exchangerate-api' | 'fixer' | 'ecb' | 'manual' = 'manual', apiKey?: string) {
    switch (providerType) {
      case 'exchangerate-api':
        if (!apiKey) throw new Error('ExchangeRate-API requires API key');
        this.provider = new ExchangeRateApiProvider(apiKey);
        break;
      case 'fixer':
        if (!apiKey) throw new Error('Fixer.io requires API key');
        this.provider = new FixerIoProvider(apiKey);
        break;
      case 'ecb':
        this.provider = new ECBProvider();
        break;
      case 'manual':
      default:
        this.provider = new ManualProvider();
    }
  }

  /**
   * Fetch latest rates from provider
   */
  async fetchRates(baseCurrency: string = 'USD'): Promise<ExchangeRates> {
    return this.provider.fetchRates(baseCurrency);
  }

  /**
   * Convert amount from one currency to another
   */
  convert(amount: number, from: string, to: string, rates: ExchangeRates): number {
    if (from === to) return amount;

    // If base matches 'from', use rate directly
    if (rates.base === from && rates.rates[to]) {
      return amount * rates.rates[to];
    }

    // If base matches 'to', use inverse rate
    if (rates.base === to && rates.rates[from]) {
      return amount / rates.rates[from];
    }

    // Cross-currency conversion through base
    const toBaseRate = rates.rates[from];
    const fromBaseRate = rates.rates[to];

    if (!toBaseRate || !fromBaseRate) {
      throw new Error(`Cannot convert ${from} to ${to}: missing rates`);
    }

    return (amount / toBaseRate) * fromBaseRate;
  }

  /**
   * Get provider name
   */
  getProviderName(): string {
    return this.provider.name;
  }
}

/**
 * Create currency service instance based on environment variables
 */
export function createCurrencyService(): CurrencyService {
  const provider = (process.env.NEXT_PUBLIC_CURRENCY_PROVIDER as any) || 'manual';
  const apiKey = process.env.CURRENCY_API_KEY;

  return new CurrencyService(provider, apiKey);
}
