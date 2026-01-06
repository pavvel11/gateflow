'use client';

import React, { useState, useEffect } from 'react';
import { Product } from '@/types';
import { formatPrice } from '@/lib/constants';
import { useTranslations } from 'next-intl';

interface VariantLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialProduct?: Product;
}

interface ProductWithVariantInfo extends Product {
  isSelected: boolean;
  variantName: string;
}

const VariantLinkModal: React.FC<VariantLinkModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialProduct,
}) => {
  const t = useTranslations('admin.variants');
  const [products, setProducts] = useState<ProductWithVariantInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch all products
  useEffect(() => {
    if (!isOpen) return;

    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/products?limit=100');
        if (!response.ok) throw new Error('Failed to fetch products');

        const data = await response.json();
        const productsWithInfo: ProductWithVariantInfo[] = (data.products || []).map((p: Product) => ({
          ...p,
          isSelected: initialProduct?.id === p.id,
          variantName: p.variant_name || p.name,
        }));

        setProducts(productsWithInfo);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load products');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [isOpen, initialProduct]);

  const selectedProducts = products.filter(p => p.isSelected);

  const toggleProduct = (productId: string) => {
    setProducts(prev => prev.map(p => {
      if (p.id === productId) {
        return { ...p, isSelected: !p.isSelected };
      }
      return p;
    }));
  };

  const updateVariantName = (productId: string, name: string) => {
    setProducts(prev => prev.map(p => {
      if (p.id === productId) {
        return { ...p, variantName: name };
      }
      return p;
    }));
  };

  const handleSubmit = async () => {
    if (selectedProducts.length < 2) {
      setError(t('minProductsRequired'));
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const productIds = selectedProducts.map(p => p.id);
      const variantNames: Record<string, string> = {};
      selectedProducts.forEach(p => {
        variantNames[p.id] = p.variantName;
      });

      const response = await fetch('/api/admin/products/variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds, variantNames }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to link variants');
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link variants');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Modal */}
      <div
        className="relative bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {t('linkVariants')}
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t('linkVariantsDescription')}
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Product List */}
          <div className="flex-1 p-4 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
            <div className="mb-4">
              <input
                type="text"
                placeholder={t('searchProducts')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => toggleProduct(product.id)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      product.isSelected
                        ? 'bg-indigo-100 dark:bg-indigo-900/30 border-2 border-indigo-500'
                        : 'bg-gray-50 dark:bg-gray-700/50 border-2 border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'
                    } ${product.variant_group_id && !product.isSelected ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-lg">
                          {product.icon}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {product.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {product.slug}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {formatPrice(product.price, product.currency)}
                        </span>
                        {product.variant_group_id && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                            {t('inGroup')}
                          </span>
                        )}
                        {product.isSelected && (
                          <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected Products with Variant Names */}
          <div className="w-full md:w-80 p-4 bg-gray-50 dark:bg-gray-900/50 overflow-y-auto">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
              {t('selectedProducts')} ({selectedProducts.length})
            </h3>

            {selectedProducts.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('selectAtLeastTwo')}
              </p>
            ) : (
              <div className="space-y-3">
                {selectedProducts.map((product, index) => (
                  <div key={product.id} className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        #{index + 1}
                      </span>
                      <button
                        onClick={() => toggleProduct(product.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white mb-2 truncate">
                      {product.name}
                    </div>
                    <input
                      type="text"
                      placeholder={t('variantNamePlaceholder')}
                      value={product.variantName}
                      onChange={(e) => updateVariantName(product.id, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-md">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-500 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || selectedProducts.length < 2}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? t('linking') : t('linkProducts')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VariantLinkModal;
