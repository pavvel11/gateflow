/**
 * Payment Method Configuration Settings
 *
 * Admin UI for configuring global payment method settings.
 * Supports three modes: automatic, Stripe preset, custom
 *
 * @see /supabase/migrations/20260115000000_payment_method_configuration.sql
 * @see /admin-panel/src/lib/actions/payment-config.ts
 */

'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useToast } from '@/contexts/ToastContext';
import {
  getPaymentMethodConfig,
  updatePaymentMethodConfig,
  getStripePaymentMethodConfigsCached,
  refreshStripePaymentMethodConfigs,
  resetToRecommendedConfig,
} from '@/lib/actions/payment-config';
import { getAvailablePaymentMethods } from '@/lib/stripe/payment-method-configs';
import type {
  PaymentMethodConfig,
  PaymentConfigMode,
  PaymentMethodMetadata,
  StripePaymentMethodConfig,
  PaymentMethodInfo,
} from '@/types/payment-config';
import { RefreshCw, AlertTriangle, Check, GripVertical, RotateCcw } from 'lucide-react';

export default function PaymentMethodSettings() {
  const { addToast } = useToast();
  const t = useTranslations('settings');

  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [resettingToRecommended, setResettingToRecommended] = useState(false);

  const [configMode, setConfigMode] = useState<PaymentConfigMode>('automatic');
  const [stripePmcId, setStripePmcId] = useState<string>('');
  const [stripePmcName, setStripePmcName] = useState<string>('');
  const [customPaymentMethods, setCustomPaymentMethods] = useState<PaymentMethodMetadata[]>([]);
  const [paymentMethodOrder, setPaymentMethodOrder] = useState<string[]>([]);
  const [enableExpressCheckout, setEnableExpressCheckout] = useState(true);
  const [enableApplePay, setEnableApplePay] = useState(true);
  const [enableGooglePay, setEnableGooglePay] = useState(true);
  const [enableLink, setEnableLink] = useState(true);

  // Stripe PMCs
  const [stripePmcs, setStripePmcs] = useState<StripePaymentMethodConfig[]>([]);
  const [stripePmcsLoading, setStripePmcsLoading] = useState(false);

  // Available payment methods metadata
  const [availablePaymentMethods] = useState<PaymentMethodInfo[]>(getAvailablePaymentMethods());

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Load initial config
  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    try {
      setLoading(true);
      const config = await getPaymentMethodConfig();

      if (config) {
        setConfigMode(config.config_mode);
        setStripePmcId(config.stripe_pmc_id || '');
        setStripePmcName(config.stripe_pmc_name || '');
        setCustomPaymentMethods(config.custom_payment_methods || []);
        setPaymentMethodOrder(config.payment_method_order || []);
        setEnableExpressCheckout(config.enable_express_checkout);
        setEnableApplePay(config.enable_apple_pay);
        setEnableGooglePay(config.enable_google_pay);
        setEnableLink(config.enable_link);

        // Initialize custom payment methods if empty
        if (config.config_mode === 'custom' && config.custom_payment_methods.length === 0) {
          initializeCustomPaymentMethods();
        }
      }
    } catch (error) {
      console.error('Failed to load payment config:', error);
      addToast(t('paymentMethods.messages.error'), 'error');
    } finally {
      setLoading(false);
    }
  }

  // Initialize custom payment methods with common defaults
  function initializeCustomPaymentMethods() {
    const defaults: PaymentMethodMetadata[] = [
      { type: 'card', enabled: true, display_order: 0, currency_restrictions: [] },
      { type: 'blik', enabled: false, display_order: 1, currency_restrictions: ['PLN'] },
      { type: 'p24', enabled: false, display_order: 2, currency_restrictions: ['PLN', 'EUR'] },
      { type: 'sepa_debit', enabled: false, display_order: 3, currency_restrictions: ['EUR'] },
      { type: 'ideal', enabled: false, display_order: 4, currency_restrictions: ['EUR'] },
    ];
    setCustomPaymentMethods(defaults);
  }

  // Load Stripe PMCs
  async function loadStripePmcs() {
    try {
      setStripePmcsLoading(true);
      const result = await getStripePaymentMethodConfigsCached();
      if (result.success && result.data) {
        setStripePmcs(result.data);
      } else {
        addToast(result.error || t('paymentMethods.stripeConfig.error'), 'error');
      }
    } catch (error) {
      console.error('Failed to load Stripe PMCs:', error);
      addToast(t('paymentMethods.stripeConfig.error'), 'error');
    } finally {
      setStripePmcsLoading(false);
    }
  }

  // Refresh Stripe PMCs (force cache invalidation)
  async function handleRefreshStripePmcs() {
    try {
      setRefreshing(true);
      const result = await refreshStripePaymentMethodConfigs();
      if (result.success) {
        await loadStripePmcs();
        addToast(t('paymentMethods.messages.refreshSuccess'), 'success');
      } else {
        addToast(result.error || t('paymentMethods.stripeConfig.error'), 'error');
      }
    } catch (error) {
      console.error('Failed to refresh Stripe PMCs:', error);
      addToast(t('paymentMethods.stripeConfig.error'), 'error');
    } finally {
      setRefreshing(false);
    }
  }

  // Save configuration
  async function handleSave() {
    try {
      setSaving(true);

      // Validation
      if (configMode === 'stripe_preset' && !stripePmcId) {
        addToast(t('paymentMethods.validation.noStripePMC'), 'error');
        return;
      }

      if (configMode === 'custom') {
        const enabledCount = customPaymentMethods.filter((pm) => pm.enabled).length;
        if (enabledCount === 0) {
          addToast(t('paymentMethods.validation.noMethods'), 'error');
          return;
        }
      }

      const result = await updatePaymentMethodConfig({
        config_mode: configMode,
        stripe_pmc_id: configMode === 'stripe_preset' ? stripePmcId : null,
        stripe_pmc_name: configMode === 'stripe_preset' ? stripePmcName : null,
        custom_payment_methods: configMode === 'custom' ? customPaymentMethods : [],
        payment_method_order: paymentMethodOrder,
        enable_express_checkout: enableExpressCheckout,
        enable_apple_pay: enableApplePay,
        enable_google_pay: enableGooglePay,
        enable_link: enableLink,
      });

      if (result.success) {
        addToast(t('paymentMethods.messages.saveSuccess'), 'success');
      } else {
        addToast(result.error || t('paymentMethods.messages.saveError'), 'error');
      }
    } catch (error) {
      console.error('Failed to save payment config:', error);
      addToast(t('paymentMethods.messages.saveError'), 'error');
    } finally {
      setSaving(false);
    }
  }

  // Reset to current saved config
  function handleReset() {
    loadConfig();
    addToast(t('paymentMethods.messages.configReset'), 'info');
  }

  // Reset to recommended configuration
  async function handleResetToRecommended() {
    try {
      setResettingToRecommended(true);
      const result = await resetToRecommendedConfig();
      if (result.success) {
        addToast(t('paymentMethods.messages.resetSuccess'), 'success');
        await loadConfig();
      } else {
        addToast(result.error || t('paymentMethods.messages.error'), 'error');
      }
    } catch (error) {
      console.error('Failed to reset to recommended config:', error);
      addToast(t('paymentMethods.messages.error'), 'error');
    } finally {
      setResettingToRecommended(false);
    }
  }

  // Handle mode change
  function handleModeChange(mode: PaymentConfigMode) {
    setConfigMode(mode);

    // Load Stripe PMCs when switching to stripe_preset mode
    if (mode === 'stripe_preset' && stripePmcs.length === 0) {
      loadStripePmcs();
    }

    // Initialize custom methods when switching to custom mode
    if (mode === 'custom' && customPaymentMethods.length === 0) {
      initializeCustomPaymentMethods();
    }
  }

  // Toggle payment method enabled state
  function togglePaymentMethod(type: string) {
    setCustomPaymentMethods((prev) =>
      prev.map((pm) => (pm.type === type ? { ...pm, enabled: !pm.enabled } : pm))
    );
  }

  // Update payment method order via drag and drop
  function handleDragStart(index: number) {
    setDraggedIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newOrder = [...paymentMethodOrder];
    const draggedItem = newOrder[draggedIndex];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(index, 0, draggedItem);

    setPaymentMethodOrder(newOrder);
    setDraggedIndex(index);
  }

  function handleDragEnd() {
    setDraggedIndex(null);
  }

  // Get payment method info
  function getPaymentMethodDisplayInfo(type: string): PaymentMethodInfo {
    return (
      availablePaymentMethods.find((pm) => pm.type === type) || {
        type,
        name: type,
        icon: '💳',
        currencies: ['*'],
      }
    );
  }

  // Update payment method order when custom methods change
  useEffect(() => {
    if (configMode === 'custom') {
      const enabledTypes = customPaymentMethods
        .filter((pm) => pm.enabled)
        .sort((a, b) => a.display_order - b.display_order)
        .map((pm) => pm.type);

      setPaymentMethodOrder(enabledTypes);
    }
  }, [customPaymentMethods, configMode]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {t('paymentMethods.title')}
        </h3>
        <p className="text-gray-600 dark:text-gray-400">{t('paymentMethods.buttons.loading')}</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          {t('paymentMethods.title')}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('paymentMethods.subtitle')}
        </p>
      </div>

      {/* Configuration Mode Selector */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          {t('paymentMethods.mode.label')}
        </label>
        <div className="space-y-3">
          {/* Automatic Mode */}
          <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer transition-colors hover:border-purple-300 dark:hover:border-purple-600" style={{ borderColor: configMode === 'automatic' ? '#9333ea' : '' }}>
            <input
              type="radio"
              name="config_mode"
              checked={configMode === 'automatic'}
              onChange={() => handleModeChange('automatic')}
              className="mt-1 h-4 w-4 text-purple-600"
            />
            <div className="ml-3 flex-1">
              <div className="font-medium text-gray-900 dark:text-white">
                {t('paymentMethods.mode.automatic')}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t('paymentMethods.mode.automaticDescription')}
              </div>
            </div>
          </label>

          {/* Stripe Preset Mode */}
          <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer transition-colors hover:border-purple-300 dark:hover:border-purple-600" style={{ borderColor: configMode === 'stripe_preset' ? '#9333ea' : '' }}>
            <input
              type="radio"
              name="config_mode"
              checked={configMode === 'stripe_preset'}
              onChange={() => handleModeChange('stripe_preset')}
              className="mt-1 h-4 w-4 text-purple-600"
            />
            <div className="ml-3 flex-1">
              <div className="font-medium text-gray-900 dark:text-white">
                {t('paymentMethods.mode.stripePreset')}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t('paymentMethods.mode.stripePresetDescription')}
              </div>
            </div>
          </label>

          {/* Custom Mode */}
          <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer transition-colors hover:border-purple-300 dark:hover:border-purple-600" style={{ borderColor: configMode === 'custom' ? '#9333ea' : '' }}>
            <input
              type="radio"
              name="config_mode"
              checked={configMode === 'custom'}
              onChange={() => handleModeChange('custom')}
              className="mt-1 h-4 w-4 text-purple-600"
            />
            <div className="ml-3 flex-1">
              <div className="font-medium text-gray-900 dark:text-white">
                {t('paymentMethods.mode.custom')}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t('paymentMethods.mode.customDescription')}
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Stripe PMC Selector (only for stripe_preset mode) */}
      {configMode === 'stripe_preset' && (
        <div className="mb-8 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            {t('paymentMethods.stripeConfig.title')}
          </label>
          <div className="flex gap-2">
            <select
              value={stripePmcId}
              onChange={(e) => {
                const selectedPmc = stripePmcs.find((pmc) => pmc.id === e.target.value);
                setStripePmcId(e.target.value);
                setStripePmcName(selectedPmc?.name || '');
              }}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              disabled={stripePmcsLoading}
            >
              <option value="">{t('paymentMethods.stripeConfig.selectPlaceholder')}</option>
              {stripePmcs.map((pmc) => (
                <option key={pmc.id} value={pmc.id}>
                  {pmc.name} ({pmc.id})
                </option>
              ))}
            </select>
            <button
              onClick={handleRefreshStripePmcs}
              disabled={refreshing}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
              title={t('paymentMethods.stripeConfig.refresh')}
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
          {stripePmcsLoading && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{t('paymentMethods.stripeConfig.refreshing')}</p>
          )}
        </div>
      )}

      {/* Custom Payment Methods (only for custom mode) */}
      {configMode === 'custom' && (
        <div className="mb-8 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            {t('paymentMethods.customConfig.title')}
          </label>
          <div className="space-y-2">
            {customPaymentMethods.map((pm) => {
              const info = getPaymentMethodDisplayInfo(pm.type);
              return (
                <label
                  key={pm.type}
                  className="flex items-center p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={pm.enabled}
                    onChange={() => togglePaymentMethod(pm.type)}
                    className="h-4 w-4 text-purple-600"
                  />
                  <span className="ml-3 text-2xl">{info.icon}</span>
                  <div className="ml-3 flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">{info.name}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {pm.currency_restrictions && pm.currency_restrictions.length > 0
                        ? pm.currency_restrictions.join(', ')
                        : t('paymentMethods.customConfig.currencyNote')}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Payment Method Order (drag & drop) */}
      {paymentMethodOrder.length > 0 && (
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            {t('paymentMethods.customConfig.orderTitle')}
          </label>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            {t('paymentMethods.customConfig.orderDescription')}
          </p>
          <div className="space-y-2">
            {paymentMethodOrder.map((type, index) => {
              const info = getPaymentMethodDisplayInfo(type);
              return (
                <div
                  key={type}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className="flex items-center p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg cursor-move hover:border-purple-400 dark:hover:border-purple-600 transition-colors"
                  style={{ opacity: draggedIndex === index ? 0.5 : 1 }}
                >
                  <GripVertical className="w-5 h-5 text-gray-400 mr-2" />
                  <span className="text-lg font-medium text-gray-700 dark:text-gray-300 mr-2">
                    {index + 1}.
                  </span>
                  <span className="text-2xl mr-3">{info.icon}</span>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">{info.name}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Express Checkout Toggles */}
      <div className="mb-8 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          {t('paymentMethods.expressCheckout.title')}
        </label>
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={enableExpressCheckout}
              onChange={(e) => setEnableExpressCheckout(e.target.checked)}
              className="h-4 w-4 text-purple-600"
            />
            <span className="ml-3 text-gray-900 dark:text-white font-medium">
              {t('paymentMethods.expressCheckout.enable')}
            </span>
          </label>
          {enableExpressCheckout && (
            <div className="ml-7 space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={enableApplePay}
                  onChange={(e) => setEnableApplePay(e.target.checked)}
                  className="h-4 w-4 text-purple-600"
                />
                <span className="ml-3 text-gray-700 dark:text-gray-300">{t('paymentMethods.expressCheckout.applePay')}</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={enableGooglePay}
                  onChange={(e) => setEnableGooglePay(e.target.checked)}
                  className="h-4 w-4 text-purple-600"
                />
                <span className="ml-3 text-gray-700 dark:text-gray-300">{t('paymentMethods.expressCheckout.googlePay')}</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={enableLink}
                  onChange={(e) => setEnableLink(e.target.checked)}
                  className="h-4 w-4 text-purple-600"
                />
                <span className="ml-3 text-gray-700 dark:text-gray-300">{t('paymentMethods.expressCheckout.link')}</span>
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Recommended Configuration */}
      <div className="mb-8 p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
        <div className="flex items-start justify-between">
          <div>
            <label className="block text-sm font-medium text-purple-700 dark:text-purple-300 mb-1">
              {t('paymentMethods.recommended.title')}
            </label>
            <p className="text-sm text-purple-600 dark:text-purple-400">
              {t('paymentMethods.recommended.description')}
            </p>
            <p className="text-xs text-purple-500 dark:text-purple-500 mt-1">
              {t('paymentMethods.recommended.features')}
            </p>
          </div>
          <button
            onClick={handleResetToRecommended}
            disabled={resettingToRecommended || saving}
            className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
          >
            {resettingToRecommended ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                {t('paymentMethods.buttons.loading')}
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4" />
                {t('paymentMethods.recommended.reset')}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <button
          onClick={handleReset}
          disabled={saving}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          {t('paymentMethods.buttons.reset')}
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              {t('paymentMethods.buttons.saving')}
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              {t('paymentMethods.buttons.save')}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
