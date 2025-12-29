'use client';

import { useState, useEffect } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Product } from '@/types';
import { formatPrice } from '@/lib/constants';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { validateNIPChecksum, normalizeNIP } from '@/lib/validation/nip';

interface CustomPaymentFormProps {
  product: Product;
  email?: string;
  bumpProduct?: any;
  bumpSelected: boolean;
  appliedCoupon?: any;
  successUrl?: string;
  onChangeAccount?: () => void;
}

export default function CustomPaymentForm({
  product,
  email,
  bumpProduct,
  bumpSelected,
  appliedCoupon,
  successUrl,
  onChangeAccount
}: CustomPaymentFormProps) {
  const t = useTranslations('checkout');
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();

  const [guestEmail, setGuestEmail] = useState('');

  // Customer data - single name field
  const [fullName, setFullName] = useState('');

  // Terms & Conditions - only for guests (!email)
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Invoice data - optional (triggered by NIP input)
  const [nip, setNip] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('PL');

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  // GUS integration state
  const [isLoadingGUS, setIsLoadingGUS] = useState(false);
  const [gusError, setGusError] = useState<string | null>(null);
  const [nipError, setNipError] = useState<string | null>(null);
  const [gusSuccess, setGusSuccess] = useState(false);
  const [gusData, setGusData] = useState<any>(null);

  // Calculate prices
  const vatRate = product.vat_rate || 23;
  let subtotal = product.price;

  if (bumpSelected && bumpProduct) {
    subtotal += bumpProduct.bump_price;
  }

  // Apply coupon discount
  let discountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discount_type === 'percentage') {
      discountAmount = subtotal * (appliedCoupon.discount_value / 100);
    } else {
      discountAmount = appliedCoupon.discount_value;
    }
  }

  const totalGross = subtotal - discountAmount;
  const totalNet = product.price_includes_vat
    ? totalGross / (1 + vatRate / 100)
    : totalGross;
  const vatAmount = totalGross - totalNet;

  // Auto-load profile data for logged-in users
  useEffect(() => {
    async function loadProfileData() {
      if (!email) {
        setIsLoadingProfile(false);
        return; // Only load for logged-in users
      }

      setIsLoadingProfile(true);
      try {
        const response = await fetch('/api/profile/get', {
          headers: { 'Content-Type': 'application/json' },
        });

        if (response.ok) {
          const { data } = await response.json();
          if (data) {
            // Load customer name (prefer full_name, fallback to first + last)
            if (data.full_name) {
              setFullName(data.full_name);
            } else if (data.first_name || data.last_name) {
              setFullName(`${data.first_name || ''} ${data.last_name || ''}`.trim());
            }

            // Load invoice data if available
            if (data.tax_id) setNip(data.tax_id);
            if (data.company_name) setCompanyName(data.company_name);
            if (data.address_line1) setAddress(data.address_line1);
            if (data.city) setCity(data.city);
            if (data.zip_code) setPostalCode(data.zip_code);
            if (data.country) setCountry(data.country);
          }
        }
      } catch (error) {
        console.error('Failed to load profile data:', error);
        // Silent fail - user can enter data manually
      } finally {
        setIsLoadingProfile(false);
      }
    }

    loadProfileData();
  }, [email]);

  // GUS NIP auto-fill handler
  const handleNIPBlur = async () => {
    if (!nip || nip.length < 10) return;

    const normalized = normalizeNIP(nip);

    // Validate NIP checksum before calling API
    if (!validateNIPChecksum(normalized)) {
      setNipError('Nieprawidłowy numer NIP (błędna suma kontrolna)');
      setGusError(null);
      setGusSuccess(false);
      return;
    }

    setNipError(null);
    setIsLoadingGUS(true);
    setGusError(null);
    setGusSuccess(false);

    try {
      const response = await fetch('/api/gus/fetch-company-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nip: normalized }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        // Store GUS data
        setGusData(result.data);

        // Autofill company data
        setCompanyName(result.data.nazwa);

        // Build address string
        let addressStr = `${result.data.ulica} ${result.data.nrNieruchomosci}`;
        if (result.data.nrLokalu) {
          addressStr += `/${result.data.nrLokalu}`;
        }
        setAddress(addressStr.trim());

        setCity(result.data.miejscowosc);
        setPostalCode(result.data.kodPocztowy);
        setCountry('PL');
        setGusSuccess(true);
      } else {
        // GUS API returned error
        if (result.code === 'RATE_LIMIT_EXCEEDED') {
          setGusError('Zbyt wiele zapytań. Poczekaj chwilę i spróbuj ponownie.');
        } else if (result.code === 'NOT_FOUND') {
          setGusError('Nie znaleziono firmy w bazie GUS');
        } else if (result.code === 'NOT_CONFIGURED') {
          // Silent fail - GUS not configured, user can enter manually
          setGusError(null);
        } else if (result.code === 'INVALID_ORIGIN') {
          setGusError('Błąd bezpieczeństwa. Odśwież stronę i spróbuj ponownie.');
        } else {
          setGusError('Nie udało się pobrać danych z GUS. Wprowadź dane ręcznie.');
        }
      }
    } catch (error) {
      console.error('GUS fetch error:', error);
      setGusError('Nie udało się pobrać danych z GUS. Wprowadź dane ręcznie.');
    } finally {
      setIsLoadingGUS(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    const finalEmail = email || guestEmail;
    if (!finalEmail) {
      setErrorMessage(t('emailRequired', { defaultValue: 'Email is required' }));
      return;
    }

    if (!fullName || fullName.trim().length === 0) {
      setErrorMessage(t('nameRequired', { defaultValue: 'Name is required' }));
      return;
    }

    // Require T&C acceptance for guests
    if (!email && !termsAccepted) {
      setErrorMessage(t('termsRequired', { defaultValue: 'Please accept Terms and Conditions' }));
      return;
    }

    // Validate NIP if provided
    if (nip && nip.length > 0 && nip.length !== 10) {
      setErrorMessage('NIP musi mieć 10 cyfr');
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      // Update Payment Intent metadata with invoice data if NIP provided
      if (nip && nip.length === 10) {
        // Get the client secret from the PaymentElement
        const { error: submitError } = await elements.submit();
        if (submitError) {
          setErrorMessage(submitError.message || 'Failed to prepare payment');
          setIsProcessing(false);
          return;
        }

        // Get the payment intent client secret
        const paymentIntent = await stripe.retrievePaymentIntent(
          // The client secret is stored in the Elements context
          (elements as any)._commonOptions.clientSecret
        );

        if (paymentIntent.paymentIntent) {
          // Update metadata via API
          const updateResponse = await fetch('/api/update-payment-metadata', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              clientSecret: paymentIntent.paymentIntent.client_secret,
              fullName,
              termsAccepted: !email ? termsAccepted : undefined, // Only for guests
              needsInvoice: true,
              nip,
              companyName,
              address,
              city,
              postalCode,
              country,
            }),
          });

          if (!updateResponse.ok) {
            console.error('Failed to update payment metadata');
            // Continue anyway - metadata update is not critical for payment
          }
        }
      }

      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment/success?product_id=${product.id}&product=${product.slug}${successUrl ? `&success_url=${encodeURIComponent(successUrl)}` : ''}`,
          receipt_email: finalEmail,
          payment_method_data: {
            billing_details: {
              email: finalEmail,
              name: fullName,
            },
          },
        },
      });

      if (error) {
        setErrorMessage(error.message || 'Payment failed');
        setIsProcessing(false);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred');
      setIsProcessing(false);
    }
  };

  if (paymentSuccess) {
    return (
      <div className="p-6 bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-500/40 rounded-xl">
        <div className="flex items-center">
          <div className="flex-shrink-0 w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center mr-4">
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-green-300">{t('paymentSuccessful', { defaultValue: 'Payment Successful!' })}</h3>
            <p className="text-green-100/90 text-sm">{t('accessGranted')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Email Input - always visible at top */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
          {t('emailAddress')}
        </label>
        <input
          type="email"
          id="email"
          value={email || guestEmail}
          onChange={(e) => setGuestEmail(e.target.value)}
          placeholder={t('emailPlaceholder')}
          required
          disabled={!!email} // Disabled if user is logged in
          className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed"
        />
        {!email && <p className="mt-1 text-xs text-gray-400">{t('emailHelp')}</p>}
        {email && (
          <div className="mt-1 flex items-center justify-between">
            <p className="text-xs text-green-400">✓ {t('linkedToAccount')}</p>
            {onChangeAccount && (
              <button
                type="button"
                onClick={onChangeAccount}
                className="text-blue-400 hover:text-blue-300 text-xs underline transition-colors"
              >
                {t('changeAccount')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Full Name - single field */}
      <div>
        <label htmlFor="fullName" className="block text-sm font-medium text-gray-300 mb-2">
          {t('fullName', { defaultValue: 'Imię i nazwisko' })}
        </label>
        <input
          type="text"
          id="fullName"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Jan Kowalski"
          required
          disabled={isLoadingProfile}
          className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed"
        />
      </div>

      {/* Terms & Conditions - only for guests */}
      {!email && (
        <div className="py-1">
          <label className="flex items-start cursor-pointer group">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-blue-500 bg-white/5 border border-white/20 rounded focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors"
              required
            />
            <span className="ml-3 text-sm text-gray-400">
              {t('iAgree', { defaultValue: 'I agree to the' })}{' '}
              <a href="/terms" target="_blank" className="text-blue-400 hover:text-blue-300 underline transition-colors">
                {t('termsOfService', { defaultValue: 'Terms of Service' })}
              </a>
              {' '}{t('and', { defaultValue: 'and' })}{' '}
              <a href="/privacy" target="_blank" className="text-blue-400 hover:text-blue-300 underline transition-colors">
                {t('privacyPolicy', { defaultValue: 'Privacy Policy' })}
              </a>
              <span className="text-red-400 ml-1">*</span>
            </span>
          </label>
        </div>
      )}

      {/* Payment Element */}
      <div>
        {/*
          Payment methods must be enabled in Stripe Dashboard:
          https://dashboard.stripe.com/settings/payment_methods

          For Poland (PLN): Enable BLIK, Przelewy24, Cards
          For EUR: Enable SEPA Debit, iDEAL, Cards, Klarna
          For USD: Enable Cards, Cash App, Affirm
        */}
        <PaymentElement
          options={{
            layout: {
              type: 'tabs',
              defaultCollapsed: false,
            },
            // Set payment method order based on currency
            // For PLN (Poland): BLIK is most popular (65%+ market share), then Przelewy24, then card
            // For other currencies: optimize for that region
            paymentMethodOrder: product.currency === 'PLN'
              ? ['blik', 'p24', 'card']
              : product.currency === 'EUR'
              ? ['sepa_debit', 'ideal', 'card', 'klarna']
              : product.currency === 'USD'
              ? ['card', 'cashapp', 'affirm']
              : undefined, // Let Stripe determine optimal order for other currencies
            // Enable wallets and Link for supported currencies (USD, EUR, GBP, etc.)
            // Link provides 1-click autofill, Apple/Google Pay provide express checkout
            wallets: {
              applePay: 'auto',
              googlePay: 'auto',
            },
            // Hide email and name fields since we collect them above
            fields: {
              billingDetails: {
                email: 'never',
                name: 'never',
              },
            },
          }}
        />
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="p-4 bg-red-900/30 border border-red-500/50 rounded-lg">
          <p className="text-red-300 text-sm">{errorMessage}</p>
        </div>
      )}

      {/* NIP Field - Optional, triggers company fields */}
      <div className="space-y-3">
        <div>
          <label htmlFor="nip" className="block text-sm font-medium text-gray-300 mb-2">
            {t('nipLabel', { defaultValue: 'Numer NIP' })} <span className="text-gray-500 text-xs">(opcjonalne)</span>
          </label>
          <div className="relative">
            <input
              type="text"
              id="nip"
              value={nip}
              onChange={(e) => {
                setNip(e.target.value);
                setNipError(null);
                setGusError(null);
                setGusSuccess(false);
                setGusData(null);
              }}
              onBlur={handleNIPBlur}
              placeholder="0000000000"
              maxLength={10}
              className={`w-full px-3 py-2.5 bg-white/5 border ${
                nipError ? 'border-red-500/50' : gusSuccess ? 'border-green-500/50' : 'border-white/10'
              } rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                isLoadingGUS ? 'pr-10' : ''
              }`}
            />
            {isLoadingGUS && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <svg className="animate-spin h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            )}
          </div>
          {nipError && (
            <p className="mt-1 text-xs text-red-400">{nipError}</p>
          )}
          {gusError && (
            <p className="mt-1 text-xs text-yellow-400">⚠️ {gusError}</p>
          )}
          {gusSuccess && !isLoadingGUS && (
            <p className="mt-1 text-xs text-green-400">✓ Dane pobrane z bazy GUS</p>
          )}
        </div>

        {/* Company fields - show when NIP is provided or GUS data fetched */}
        {(nip.length === 10 || gusData || companyName) && (
          <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-gray-300 mb-2">
                {t('companyNameLabel', { defaultValue: 'Company Name' })}
              </label>
              <input
                type="text"
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Company Ltd."
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-300 mb-2">
                Adres
              </label>
              <input
                type="text"
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="ul. Przykładowa 123"
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="postalCode" className="block text-sm font-medium text-gray-300 mb-2">
                  Kod pocztowy
                </label>
                <input
                  type="text"
                  id="postalCode"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="00-000"
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-300 mb-2">
                  Miasto
                </label>
                <input
                  type="text"
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Warszawa"
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Order Summary - Compact (Zanfia/EasyCart-inspired) */}
      <div className="space-y-2 py-4 border-t border-white/10">
        {/* Show bump or coupon if present */}
        {(bumpSelected && bumpProduct) || (appliedCoupon && discountAmount > 0) ? (
          <>
            {/* Product Price */}
            <div className="flex justify-between text-sm text-gray-400">
              <span>{product.name}</span>
              <span>{formatPrice(product.price, product.currency)} {product.currency}</span>
            </div>

            {/* Bump Product */}
            {bumpSelected && bumpProduct && (
              <div className="flex justify-between text-sm text-gray-400">
                <span>{bumpProduct.bump_product_name || 'Additional Product'}</span>
                <span>{formatPrice(bumpProduct.bump_price, product.currency)} {product.currency}</span>
              </div>
            )}

            {/* Coupon Discount */}
            {appliedCoupon && discountAmount > 0 && (
              <div className="flex justify-between text-sm text-green-400">
                <span>{t('couponDiscount', { defaultValue: 'Discount' })} ({appliedCoupon.code})</span>
                <span>-{formatPrice(discountAmount, product.currency)} {product.currency}</span>
              </div>
            )}

            <div className="border-t border-white/10 my-2" />
          </>
        ) : null}

        {/* Total - Prominent */}
        <div className="flex justify-between items-baseline">
          <div>
            <div className="text-white font-semibold">
              {t('total', { defaultValue: 'Total' })}
            </div>
            {product.vat_rate && product.vat_rate > 0 && (
              <div className="text-xs text-gray-500">
                {t('netPrice')}: {formatPrice(totalNet, product.currency)} {product.currency} + {t('vat')} {vatRate}%
              </div>
            )}
          </div>
          <div className="text-2xl font-bold text-white">
            {formatPrice(totalGross, product.currency)} {product.currency}
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
      >
        {isProcessing ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            {t('processing', { defaultValue: 'Processing...' })}
          </span>
        ) : (
          t('payButton', { amount: `${formatPrice(totalGross, product.currency)} ${product.currency}`, defaultValue: `Pay ${formatPrice(totalGross, product.currency)} ${product.currency}` })
        )}
      </button>

      <p className="text-xs text-gray-500 text-center">
        🔒 Secure payment powered by Stripe
      </p>
    </form>
  );
}
