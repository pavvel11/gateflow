'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Product } from '@/types';
import IconSelector from './IconSelector';
import { getIconEmoji } from '@/utils/themeUtils';
import { CURRENCIES, getCurrencySymbol } from '@/lib/constants';
import { BaseModal, ModalHeader, ModalBody, ModalFooter, ModalSection, Button, Message } from './ui/Modal';

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
  is_featured: boolean;
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
    is_featured: false,
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
        is_featured: product.is_featured || false,
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
        is_featured: false,
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
    <BaseModal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalHeader
        title={product ? 'Edit Product' : 'Create New Product'}
        subtitle={product ? `Editing ${product.name}` : 'Add a new product to your catalog'}
        icon={
          <span className="text-2xl">{formData.icon}</span>
        }
        badge={formData.is_active ? 
          { text: 'Active', variant: 'success' } : 
          { text: 'Inactive', variant: 'neutral' }
        }
      />

      <ModalBody>
        {error && (
          <Message
            type="error"
            title="Error"
            message={error}
            className="mb-6"
          />
        )}

        <form id="product-form" onSubmit={handleSubmit} className="space-y-6">
          {/* Product Preview */}
          <ModalSection>
            <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
              <div className="w-16 h-16 flex items-center justify-center bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                <span className="text-3xl" aria-label="Product icon">{formData.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                  {formData.name || 'Product Name'}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                  {formData.slug || 'product-slug'}
                </p>
                <div className="flex items-center space-x-2 mt-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    formData.price === 0 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                  }`}>
                    {formData.price === 0 ? 'Free' : `${getCurrencySymbol(formData.currency)}${formData.price}`}
                  </span>
                  {formData.is_featured && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                      ⭐ Featured
                    </span>
                  )}
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
                      Preview
                    </a>
                  )}
                </div>
              </div>
            </div>
          </ModalSection>

          {/* Basic Information */}
          <ModalSection title="Basic Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Product Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  ref={nameInputRef}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="Enter product name"
                  required
                />
              </div>

              <div>
                <label htmlFor="slug" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  URL Slug
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">(auto-generated)</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="slug"
                    name="slug"
                    value={formData.slug}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white pr-12"
                    placeholder="product-url-slug"
                    required
                  />
                  {!slugModified && (
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 rounded px-2 py-1">
                      Auto
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {currentDomain ? `${currentDomain}/p/` : 'https://example.com/p/'}<strong>{formData.slug || 'product-slug'}</strong>
                </p>
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Describe your product"
                required
              />
            </div>
          </ModalSection>

          {/* Pricing & Visual */}
          <ModalSection title="Pricing & Visual">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Price
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 dark:text-gray-400 text-sm min-w-[24px]">
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
                      
                      if (inputValue === '') {
                        setPriceDisplayValue('0');
                        setFormData(prev => ({ ...prev, price: 0 }));
                        return;
                      }
                      
                      if (!/^[\d,.]*$/.test(inputValue)) return;
                      
                      const processedValue = inputValue.replace(',', '.');
                      const dotCount = (processedValue.match(/\./g) || []).length;
                      if (dotCount > 1) return;
                      
                      if (/^\d*\.?\d{0,2}$/.test(processedValue)) {
                        const numericValue = parseFloat(processedValue);
                        setPriceDisplayValue(inputValue);
                        setFormData(prev => ({
                          ...prev,
                          price: isNaN(numericValue) ? 0 : numericValue
                        }));
                      }
                    }}
                    placeholder={formData.currency === 'PLN' || formData.currency === 'CHF' ? `0,00 ${getCurrencySymbol(formData.currency)}` : "0.00"}
                    className={`${(formData.currency === 'PLN' || formData.currency === 'CHF') ? 'pl-3' : 'pl-12'} pr-20 w-full py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white`}
                    required
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <select
                      id="currency"
                      name="currency"
                      value={formData.currency}
                      onChange={handleInputChange}
                      className="h-full py-0 pl-2 pr-7 border-transparent bg-transparent text-gray-500 dark:text-gray-400 text-sm rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                  Set to 0 for free products. Use comma or dot for decimal separator.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Product Icon
                </label>
                <IconSelector 
                  selectedIcon={formData.icon} 
                  onSelectIcon={handleIconSelect} 
                />
              </div>
            </div>
          </ModalSection>

          {/* Advanced Settings */}
          <ModalSection title="Advanced Settings">
            <div className="space-y-4">
              <div>
                <label htmlFor="redirect_url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Redirect URL
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">(optional)</span>
                </label>
                <input
                  type="url"
                  id="redirect_url"
                  name="redirect_url"
                  placeholder="https://example.com/your-content"
                  value={formData.redirect_url || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  URL to redirect users after gaining access. Leave empty to show default product page.
                </p>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleCheckboxChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-3 block text-sm font-medium text-gray-900 dark:text-gray-100">
                  Product is active and visible to users
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_featured"
                  name="is_featured"
                  checked={formData.is_featured}
                  onChange={handleCheckboxChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_featured" className="ml-3 block text-sm font-medium text-gray-900 dark:text-gray-100">
                  Featured product (highlighted in listings)
                </label>
              </div>
            </div>
          </ModalSection>
        </form>
      </ModalBody>

      <ModalFooter>
        <Button onClick={onClose} variant="secondary">
          Cancel
        </Button>
        <Button
          type="submit"
          form="product-form"
          disabled={isSubmitting}
          loading={isSubmitting}
          variant="primary"
        >
          {product ? 'Update Product' : 'Create Product'}
        </Button>
      </ModalFooter>
    </BaseModal>
  );
};

export default ProductFormModal;
