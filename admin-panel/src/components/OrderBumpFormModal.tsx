'use client';

import React, { useState, useEffect } from 'react';
import { Product } from '@/types';

interface OrderBumpWithDetails {
  id: string;
  main_product_id: string;
  bump_product_id: string;
  bump_price: number | null;
  bump_title: string;
  bump_description: string | null;
  is_active: boolean;
  display_order: number;
  access_duration_days: number | null;
  main_product: {
    id: string;
    name: string;
  };
  bump_product: {
    id: string;
    name: string;
    price: number;
    currency: string;
  };
}

interface OrderBumpFormModalProps {
  products: Product[];
  loadingProducts: boolean;
  editingBump: OrderBumpWithDetails | null;
  onSubmit: (formData: any) => Promise<void>;
  onClose: () => void;
  isSubmitting: boolean;
}

const OrderBumpFormModal: React.FC<OrderBumpFormModalProps> = ({
  products,
  loadingProducts,
  editingBump,
  onSubmit,
  onClose,
  isSubmitting,
}) => {
  // Form state
  const [mainProductId, setMainProductId] = useState('');
  const [bumpProductId, setBumpProductId] = useState('');
  const [bumpPrice, setBumpPrice] = useState<string>('');
  const [useCustomPrice, setUseCustomPrice] = useState(false);
  const [bumpTitle, setBumpTitle] = useState('');
  const [bumpDescription, setBumpDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [accessDuration, setAccessDuration] = useState<string>('');
  const [accessDurationType, setAccessDurationType] = useState<'default' | 'custom' | 'unlimited'>('default');

  // Selected products for info display
  const selectedBumpProduct = products.find(p => p.id === bumpProductId);

  // Initialize form with editing data
  useEffect(() => {
    if (editingBump) {
      setMainProductId(editingBump.main_product_id);
      setBumpProductId(editingBump.bump_product_id);
      setBumpTitle(editingBump.bump_title);
      setBumpDescription(editingBump.bump_description || '');
      setIsActive(editingBump.is_active);
      
      // Initialize Access Duration Type
      if (editingBump.access_duration_days === null || editingBump.access_duration_days === undefined) {
        setAccessDurationType('default');
        setAccessDuration('');
      } else if (editingBump.access_duration_days === 0) {
        setAccessDurationType('unlimited');
        setAccessDuration('0');
      } else {
        setAccessDurationType('custom');
        setAccessDuration(editingBump.access_duration_days.toString());
      }

      // Check if custom price is set
      if (editingBump.bump_price !== null) {
        setUseCustomPrice(true);
        setBumpPrice(editingBump.bump_price.toString());
      } else {
        setUseCustomPrice(false);
        setBumpPrice('');
      }
    }
  }, [editingBump]);

  // Auto-generate bump title when bump product changes
  useEffect(() => {
    if (bumpProductId && !editingBump && !bumpTitle) {
      const product = products.find(p => p.id === bumpProductId);
      if (product) {
        const price = useCustomPrice && bumpPrice
          ? `$${bumpPrice}`
          : `$${product.price}`;
        setBumpTitle(`Yes, add "${product.name}" for just ${price}!`);
      }
    }
  }, [bumpProductId, useCustomPrice, bumpPrice, products, editingBump, bumpTitle]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formData: any = {
      bump_title: bumpTitle,
      bump_description: bumpDescription || null,
      is_active: isActive,
      display_order: 0, // Hardcoded as we only support single bump for now
    };

    // Add main_product_id and bump_product_id only for creation
    if (!editingBump) {
      formData.main_product_id = mainProductId;
      formData.bump_product_id = bumpProductId;
    } else {
      // For editing, only allow changing bump_product_id
      if (bumpProductId !== editingBump.bump_product_id) {
        formData.bump_product_id = bumpProductId;
      }
    }

    // Handle bump price
    if (useCustomPrice && bumpPrice) {
      formData.bump_price = parseFloat(bumpPrice);
    } else {
      formData.bump_price = null;
    }

    // Handle access duration
    if (accessDuration !== '') {
      formData.access_duration_days = parseInt(accessDuration);
    } else {
      formData.access_duration_days = null;
    }

    await onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full my-8">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {editingBump ? 'Edit Order Bump' : 'Create Order Bump'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Configure a one-click upsell offer for your product checkout
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Main Product Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Main Product <span className="text-red-500">*</span>
            </label>
            <select
              value={mainProductId}
              onChange={(e) => setMainProductId(e.target.value)}
              disabled={!!editingBump || loadingProducts}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Select main product...</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.price} {product.currency})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              The product that will display this bump offer on its checkout page
              {editingBump && ' (cannot be changed after creation)'}
            </p>
          </div>

          {/* Bump Product Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Bump Product <span className="text-red-500">*</span>
            </label>
            <select
              value={bumpProductId}
              onChange={(e) => setBumpProductId(e.target.value)}
              disabled={loadingProducts}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
            >
              <option value="">Select bump product...</option>
              {products
                .filter(p => p.id !== mainProductId) // Don't show main product in bump list
                .map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({product.price} {product.currency})
                  </option>
                ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              The complementary product to offer as an upsell
            </p>
          </div>

          {/* Custom Price Toggle */}
          {selectedBumpProduct && (
            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="useCustomPrice"
                  checked={useCustomPrice}
                  onChange={(e) => {
                    setUseCustomPrice(e.target.checked);
                    if (!e.target.checked) {
                      setBumpPrice('');
                    }
                  }}
                  className="mt-1 w-5 h-5 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                />
                <div className="flex-1">
                  <label htmlFor="useCustomPrice" className="block text-sm font-medium text-gray-900 dark:text-white cursor-pointer">
                    Use special bump price (discounted)
                  </label>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Regular price: {selectedBumpProduct.price} {selectedBumpProduct.currency}
                  </p>

                  {useCustomPrice && (
                    <div className="mt-3">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={bumpPrice}
                        onChange={(e) => setBumpPrice(e.target.value)}
                        placeholder={selectedBumpProduct.price.toString()}
                        required={useCustomPrice}
                        className="w-full px-4 py-2 border border-amber-300 dark:border-amber-700 rounded-lg focus:ring-2 focus:ring-amber-500 dark:bg-gray-700 dark:text-white"
                      />
                      {bumpPrice && parseFloat(bumpPrice) < selectedBumpProduct.price && (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                          💰 Savings: {(selectedBumpProduct.price - parseFloat(bumpPrice)).toFixed(2)} {selectedBumpProduct.currency}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Access Duration Configuration */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Access Duration Override
            </label>
            
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {/* Option 1: Default */}
              <div 
                onClick={() => { setAccessDurationType('default'); setAccessDuration(''); }}
                className={`cursor-pointer border rounded-lg p-3 text-center transition-all ${
                  accessDurationType === 'default' 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500 dark:ring-blue-400' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-500 bg-white dark:bg-gray-800'
                }`}
              >
                <div className={`text-sm font-medium ${accessDurationType === 'default' ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}>Default</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">From Product</div>
              </div>

              {/* Option 2: Custom */}
              <div 
                onClick={() => setAccessDurationType('custom')}
                className={`cursor-pointer border rounded-lg p-3 text-center transition-all ${
                  accessDurationType === 'custom' 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500 dark:ring-blue-400' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-500 bg-white dark:bg-gray-800'
                }`}
              >
                <div className={`text-sm font-medium ${accessDurationType === 'custom' ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}>Custom</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Set Days</div>
              </div>

              {/* Option 3: Unlimited */}
              <div 
                onClick={() => { setAccessDurationType('unlimited'); setAccessDuration('0'); }}
                className={`cursor-pointer border rounded-lg p-3 text-center transition-all ${
                  accessDurationType === 'unlimited' 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500 dark:ring-blue-400' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-500 bg-white dark:bg-gray-800'
                }`}
              >
                <div className={`text-sm font-medium ${accessDurationType === 'unlimited' ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}>Unlimited</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Lifetime</div>
              </div>
            </div>

            {/* Input for Custom Days */}
            {accessDurationType === 'custom' && (
              <div className="mt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="relative rounded-md shadow-sm">
                  <input
                    type="number"
                    min="1"
                    value={accessDuration === '0' ? '' : accessDuration} 
                    onChange={(e) => setAccessDuration(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white pr-12"
                    placeholder="e.g. 30"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 dark:text-gray-400 sm:text-sm">days</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bump Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Bump Title (Checkbox Label) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={bumpTitle}
              onChange={(e) => setBumpTitle(e.target.value)}
              placeholder='Yes, add "Quick Start Guide" for just $7!'
              required
              maxLength={255}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              The text shown next to the checkbox on the checkout page
            </p>
          </div>

          {/* Bump Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Bump Description (Optional)
            </label>
            <textarea
              value={bumpDescription}
              onChange={(e) => setBumpDescription(e.target.value)}
              placeholder="Get immediate access to our exclusive workbook with step-by-step exercises"
              maxLength={1000}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Additional details shown below the checkbox title
            </p>
          </div>

          {/* Active Status */}
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
              Active (show on checkout page)
            </label>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Saving...</span>
                </>
              ) : (
                <span>{editingBump ? 'Update Bump' : 'Create Bump'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrderBumpFormModal;
