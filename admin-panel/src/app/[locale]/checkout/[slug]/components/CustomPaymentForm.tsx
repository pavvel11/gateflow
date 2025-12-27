'use client';

import { useState, useEffect } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Product } from '@/types';
import { formatPrice } from '@/lib/constants';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

interface CustomPaymentFormProps {
  product: Product;
  email?: string;
  bumpProduct?: any;
  bumpSelected: boolean;
  appliedCoupon?: any;
  successUrl?: string;
}

export default function CustomPaymentForm({
  product,
  email,
  bumpProduct,
  bumpSelected,
  appliedCoupon,
  successUrl
}: CustomPaymentFormProps) {
  const t = useTranslations('checkout');
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();

  const [guestEmail, setGuestEmail] = useState('');
  const [needsInvoice, setNeedsInvoice] = useState(false);
  const [nip, setNip] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);

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

    if (needsInvoice && (!nip || !companyName)) {
      setErrorMessage('NIP and Company Name are required for invoice');
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/checkout/success?product_id=${product.id}${successUrl ? `&success_url=${encodeURIComponent(successUrl)}` : ''}`,
          receipt_email: finalEmail,
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
      {/* Guest Email Input */}
      {!email && (
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
            {t('emailAddress')}
          </label>
          <input
            type="email"
            id="email"
            value={guestEmail}
            onChange={(e) => setGuestEmail(e.target.value)}
            placeholder={t('emailPlaceholder')}
            required
            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="mt-1 text-xs text-gray-400">{t('emailHelp')}</p>
        </div>
      )}

      {/* Price Summary */}
      <div className="p-4 bg-white/5 border border-white/10 rounded-lg space-y-2 text-sm">
        <h3 className="font-semibold text-white mb-3">{t('priceSummary', { defaultValue: 'Price Summary' })}</h3>

        {/* Product Price */}
        <div className="flex justify-between text-gray-300">
          <span>{product.name}</span>
          <span>{formatPrice(product.price, product.currency)} {product.currency}</span>
        </div>

        {/* Bump Product */}
        {bumpSelected && bumpProduct && (
          <div className="flex justify-between text-gray-300">
            <span>{bumpProduct.bump_product_name || 'Additional Product'}</span>
            <span>{formatPrice(bumpProduct.bump_price, product.currency)} {product.currency}</span>
          </div>
        )}

        {/* Coupon Discount */}
        {appliedCoupon && discountAmount > 0 && (
          <div className="flex justify-between text-green-400">
            <span>{t('couponDiscount', { defaultValue: 'Discount' })} ({appliedCoupon.code})</span>
            <span>-{formatPrice(discountAmount, product.currency)} {product.currency}</span>
          </div>
        )}

        {/* VAT Breakdown */}
        {product.vat_rate && product.vat_rate > 0 && (
          <>
            <div className="border-t border-white/10 my-2 pt-2" />
            <div className="flex justify-between text-gray-400 text-xs">
              <span>{t('netPrice')}:</span>
              <span>{formatPrice(totalNet, product.currency)} {product.currency}</span>
            </div>
            <div className="flex justify-between text-gray-400 text-xs">
              <span>{t('vat')} {vatRate}%:</span>
              <span>{formatPrice(vatAmount, product.currency)} {product.currency}</span>
            </div>
          </>
        )}

        {/* Total */}
        <div className="border-t border-white/10 my-2 pt-2" />
        <div className="flex justify-between text-white font-bold text-lg">
          <span>{t('total', { defaultValue: 'Total' })}:</span>
          <span>{formatPrice(totalGross, product.currency)} {product.currency}</span>
        </div>
      </div>

      {/* Invoice Fields */}
      <div className="space-y-3">
        <label className="flex items-center space-x-2 cursor-pointer group">
          <input
            type="checkbox"
            checked={needsInvoice}
            onChange={(e) => setNeedsInvoice(e.target.checked)}
            className="w-4 h-4 text-blue-600 bg-white/5 border-white/20 rounded focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
            {t('needInvoice', { defaultValue: 'I need an invoice' })}
          </span>
        </label>

        {needsInvoice && (
          <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
            <div>
              <label htmlFor="nip" className="block text-sm font-medium text-gray-300 mb-2">
                {t('nipLabel', { defaultValue: 'NIP (Tax ID)' })}
              </label>
              <input
                type="text"
                id="nip"
                value={nip}
                onChange={(e) => setNip(e.target.value)}
                placeholder="0000000000"
                required={needsInvoice}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
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
                required={needsInvoice}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        )}
      </div>

      {/* Payment Element */}
      <div>
        <PaymentElement />
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="p-4 bg-red-900/30 border border-red-500/50 rounded-lg">
          <p className="text-red-300 text-sm">{errorMessage}</p>
        </div>
      )}

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
