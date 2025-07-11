'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Product } from '@/types';
import IconSelector from './IconSelector';
import { getIconEmoji } from '@/utils/themeUtils';
import { CURRENCIES, getCurrencySymbol } from '@/lib/constants';

interface ProductFormModalProps {
  product?: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: ProductFormData) => Promise<void>;
  isSubmitting: boolean;
  error: string | null;
}

export interface ProductFormData {
  name: string;
  slug: string;
  description: string;
  price: number;
  currency: string;
  redirect_url?: string | null;
  is_active: boolean;
  icon: string;
}

const ProductFormModal: React.FC<ProductFormModalProps> = ({
  product,
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  error
}) => {
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    slug: '',
    description: '',
    price: 0,
    currency: 'USD',
    redirect_url: '',
    is_active: true,
    icon: 'cube'
  });
  
  // Separate state for the displayed price input value
  const [priceDisplayValue, setPriceDisplayValue] = useState<string>('');
  
  const [slugModified, setSlugModified] = useState(false);
  const [currentDomain, setCurrentDomain] = useState<string>('');
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (product) {
      // For existing products, we'll use the icon directly
      setFormData({
        name: product.name,
        slug: product.slug,
        description: product.description,
        price: product.price,
        currency: product.currency || 'USD',
        redirect_url: product.redirect_url || '',
        is_active: product.is_active,
        icon: product.icon || getIconEmoji('rocket') // Use emoji directly
      });
      // Set display value for price - always show the value, even for zero
      setPriceDisplayValue(product.price.toString().replace('.', ','));
      setSlugModified(true); // Don't auto-generate slug when editing
    } else {
      // For new products, use the emoji from the start
      setFormData({
        name: '',
        slug: '',
        description: '',
        price: 0,
        currency: 'USD',
        redirect_url: '',
        is_active: true,
        icon: getIconEmoji('rocket') // Use emoji directly for new products
      });
      setPriceDisplayValue('');
      setSlugModified(false);
    }
    
    // Focus the name input when the modal opens
    if (isOpen) {
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    }
  }, [product, isOpen]);
  
  // Get the current domain when the component mounts
  useEffect(() => {
    if (typeof window !== 'undefined' && isOpen) {
      // Get origin (protocol + domain), e.g. https://admin.example.com
      const origin = window.location.origin;
      
      // For admin subdomain, convert to main domain for products
      // e.g. https://admin.example.com -> https://example.com
      const mainDomain = origin.replace(/\/\/admin\./, '//');
      
      setCurrentDomain(mainDomain);
    }
  }, [isOpen]);

  // Generate slug from product name
  const generateSlug = useCallback((name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/--+/g, '-') // Replace multiple hyphens with single hyphen
      .trim();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (name === 'name' && !slugModified) {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        slug: generateSlug(value)
      }));
    } else if (name === 'slug') {
      setSlugModified(true);
      setFormData(prev => ({
        ...prev,
        [name]: generateSlug(value)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' 
          ? (e.target as HTMLInputElement).checked 
          : value
      }));
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleIconSelect = (icon: string) => {
    // The IconSelector now directly returns the emoji character
    // So we can just use it directly
    setFormData(prev => ({
      ...prev,
      icon: icon // The icon is already the emoji character
    }));
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      aria-labelledby="product-form-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl p-6 shadow-xl animate-modal-appear">
        <div className="flex items-center justify-between mb-4">
          <h3 id="product-form-title" className="text-lg font-medium text-gray-900 dark:text-white">
            {product ? 'Edit Product' : 'Create New Product'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 rounded-full p-1 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-gray-500"
            aria-label="Close modal"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error</h3>
                <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            </div>
          </div>
        )}

        <form 
          onSubmit={handleSubmit} 
          className="space-y-4"
          onKeyDown={(e) => {
            // Close on Escape key
            if (e.key === 'Escape') {
              onClose();
            }
          }}>
          {/* Product Preview */}
          <div className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="w-12 h-12 flex items-center justify-center">
              <span className="text-3xl" aria-label="Product icon">{formData.icon}</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">{formData.name || 'Product Name'}</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">{formData.slug || 'product-slug'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                ref={nameInputRef}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label htmlFor="slug" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Slug <span className="text-xs text-gray-500 dark:text-gray-400">(auto-generated, can be customized)</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="slug"
                  name="slug"
                  value={formData.slug}
                  onChange={handleInputChange}
                  className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                    !slugModified ? 'pr-10' : ''
                  }`}
                  required
                  aria-describedby="slug-description"
                />
                {!slugModified && (
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 rounded px-1 py-0.5">
                    Auto
                  </span>
                )}
              </div>
              <p id="slug-description" className="mt-1 text-xs text-gray-500 dark:text-gray-400 mb-1">
                URL: {currentDomain ? `${currentDomain}/p/` : 'https://example.com/p/'}<strong>{formData.slug || 'product-slug'}</strong>
              </p>
              {formData.slug && (
                <a
                  href={`/p/${formData.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Preview product page
                </a>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Price
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 dark:text-gray-400 sm:text-sm min-w-[24px]">
                    {formData.currency === 'PLN' || formData.currency === 'CHF' ? '' : getCurrencySymbol(formData.currency)}
                  </span>
                </div>
                <input
                  type="text"
                  inputMode="decimal"
                  id="price"
                  name="price"
                  value={priceDisplayValue}
                  onChange={(e) => {
                    const inputValue = e.target.value;
                    
                    // Allow empty input (convert to '0')
                    if (inputValue === '') {
                      setPriceDisplayValue('0');
                      setFormData(prev => ({
                        ...prev,
                        price: 0
                      }));
                      return;
                    }
                    
                    // Allow digits, comma, and dot
                    if (!/^[\d,.]*$/.test(inputValue)) {
                      return; // Don't update if invalid characters
                    }
                    
                    // Replace comma with dot for processing
                    const processedValue = inputValue.replace(',', '.');
                    
                    // Ensure only one decimal point
                    const dotCount = (processedValue.match(/\./g) || []).length;
                    if (dotCount > 1) {
                      return; // Don't allow multiple decimal points
                    }
                    
                    // Check if it's a valid number format
                    if (/^\d*\.?\d{0,2}$/.test(processedValue)) {
                      const numericValue = parseFloat(processedValue);
                      
                      // Update both display value and form data
                      setPriceDisplayValue(inputValue);
                      setFormData(prev => ({
                        ...prev,
                        price: isNaN(numericValue) ? 0 : numericValue
                      }));
                    }
                  }}
                  placeholder={formData.currency === 'PLN' || formData.currency === 'CHF' ? `0,00 ${getCurrencySymbol(formData.currency)}` : "0,00"}
                  className={`${(formData.currency === 'PLN' || formData.currency === 'CHF') ? 'pl-3' : 'pl-12'} block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-150`}
                  required
                  aria-describedby="price-currency"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <select
                    id="currency"
                    name="currency"
                    value={formData.currency}
                    onChange={handleInputChange}
                    className="h-full py-0 pl-2 pr-7 border-transparent bg-transparent text-gray-500 dark:text-gray-400 sm:text-sm rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    aria-label="Currency"
                  >
                    {CURRENCIES.map(currency => (
                      <option key={currency.code} value={currency.code}>
                        {currency.code}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Enter price in {CURRENCIES.find(c => c.code === formData.currency)?.name || formData.currency}.
              </p>
            </div>

            <div>
              <label htmlFor="icon" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Icon
              </label>
              <IconSelector 
                selectedIcon={formData.icon} 
                onSelectIcon={handleIconSelect} 
              />
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="redirect_url" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Redirect URL <span className="text-xs text-gray-500 dark:text-gray-400">(optional)</span>
            </label>
            <div className="mt-1 relative">
              <input
                type="url"
                id="redirect_url"
                name="redirect_url"
                placeholder="https://example.com/your-protected-page.html"
                value={formData.redirect_url || ''}
                onChange={handleInputChange}
                className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                URL to redirect users after authentication. Leave empty to use default product page.
              </p>
            </div>
          </div>

          <div className="flex items-center mt-4">
            <input
              type="checkbox"
              id="is_active"
              name="is_active"
              checked={formData.is_active}
              onChange={handleCheckboxChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900 dark:text-gray-100">
              Active
            </label>
          </div>

          <div className="flex justify-between items-center pt-6 border-t border-gray-200 dark:border-gray-700 mt-6">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Use buttons to close this form
            </p>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 ease-in-out transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {product ? 'Updating...' : 'Creating...'}
                  </span>
                ) : (
                  product ? 'Update Product' : 'Create Product'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductFormModal;
