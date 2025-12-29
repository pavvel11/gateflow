'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Product, ContentItem } from '@/types';
import { ProductContentConfig } from '@/types';
import DateTimePicker from './ui/DateTimePicker';
import IconSelector from './IconSelector';
import { getIconEmoji } from '@/utils/themeUtils';
import { CURRENCIES, getCurrencySymbol } from '@/lib/constants';
import { BaseModal, ModalHeader, ModalBody, ModalFooter, ModalSection, Button, Message } from './ui/Modal';
import { useTranslations } from 'next-intl';
import { parseVideoUrl, isTrustedVideoPlatform } from '@/lib/videoUtils';
import { getCategories, getProductCategories, Category } from '@/lib/actions/categories';
import { getDefaultCurrency } from '@/lib/actions/shop-config';

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
  long_description?: string | null; // Detailed Markdown description for checkout
  price: number;
  currency: string;
  is_active: boolean;
  is_featured: boolean;
  icon: string;
  // Temporal availability fields
  available_from?: string | null;
  available_until?: string | null;
  // Auto-grant access duration for users
  auto_grant_duration_days?: number | null;
  // Content delivery fields
  content_delivery_type: 'redirect' | 'content';
  content_config: {
    redirect_url?: string;
    content_items?: ContentItem[]; // We'll manage content items separately
  };
  // Funnel / OTO settings
  success_redirect_url?: string | null;
  pass_params_to_redirect: boolean;
  // Categories
  categories: string[];
}

const ProductFormModal: React.FC<ProductFormModalProps> = ({
  product,
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  error
}) => {
  const t = useTranslations('admin.products.form');
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    slug: '',
    description: '',
    long_description: '',
    price: 0,
    currency: 'USD',
    is_active: true,
    is_featured: false,
    icon: 'cube',
    available_from: '',
    available_until: '',
    auto_grant_duration_days: null,
    content_delivery_type: 'content',
    content_config: {
      content_items: []
    },
    success_redirect_url: '',
    pass_params_to_redirect: false,
    categories: []
  });
  
  // Separate state for the displayed price input value
  const [priceDisplayValue, setPriceDisplayValue] = useState<string>('');

  const [slugModified, setSlugModified] = useState(false);
  const [currentDomain, setCurrentDomain] = useState<string>('');
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Products list for OTO selection
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Categories management
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // Default currency from shop config
  const [defaultCurrency, setDefaultCurrency] = useState<string>('USD');

  // URL validation state - maps content item index to validation status
  const [urlValidation, setUrlValidation] = useState<Record<number, { isValid: boolean; message: string }>>({});

  useEffect(() => {
    if (isOpen) {
        // Fetch all categories
        const fetchCats = async () => {
            setLoadingCategories(true);
            try {
                const cats = await getCategories();
                setAllCategories(cats);
            } catch (err) {
                console.error('Failed to fetch categories', err);
            } finally {
                setLoadingCategories(false);
            }
        };
        fetchCats();

        // Fetch default currency for new products
        if (!product) {
            getDefaultCurrency().then(currency => {
                setDefaultCurrency(currency);
            }).catch(err => {
                console.error('Failed to fetch default currency', err);
            });
        }
    }
  }, [isOpen, product]);

  useEffect(() => {
    if (product) {
      // For existing products, we'll use the icon directly
      setFormData({
        name: product.name,
        slug: product.slug,
        description: product.description,
        long_description: product.long_description || '',
        price: product.price,
        currency: product.currency || 'USD',
        is_active: product.is_active,
        is_featured: product.is_featured || false,
        icon: product.icon || getIconEmoji('rocket'), // Use emoji directly
        available_from: product.available_from || '',
        available_until: product.available_until || '',
        auto_grant_duration_days: product.auto_grant_duration_days || null,
        content_delivery_type: product.content_delivery_type || 'content',
        content_config: product.content_config || { content_items: [] },
        success_redirect_url: product.success_redirect_url || '',
        pass_params_to_redirect: product.pass_params_to_redirect || false,
        categories: [] // Will be populated below
      });
      
      // Fetch assigned categories
      getProductCategories(product.id).then(catIds => {
          setFormData(prev => ({ ...prev, categories: catIds }));
      }).catch(err => console.error(err));

      // Set display value for price - always show the value, even for zero
      setPriceDisplayValue(product.price.toString().replace('.', ','));
      setSlugModified(true); // Don't auto-generate slug when editing
    } else {
      // For new products, use the emoji from the start and default currency from shop config
      setFormData({
        name: '',
        slug: '',
        description: '',
        long_description: '',
        price: 0,
        currency: defaultCurrency, // Use default currency from shop config
        is_active: true,
        is_featured: false,
        icon: getIconEmoji('rocket'), // Use emoji directly for new products
        available_from: '',
        available_until: '',
        auto_grant_duration_days: null,
        content_delivery_type: 'content',
        content_config: { content_items: [] },
        success_redirect_url: '',
        pass_params_to_redirect: false,
        categories: []
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
  }, [product, isOpen, defaultCurrency]);

  
  // Fetch products for OTO dropdown
  useEffect(() => {
    const fetchProducts = async () => {
      if (!isOpen) return;
      try {
        setLoadingProducts(true);
        const res = await fetch('/api/admin/products?limit=1000&status=active');
        const data = await res.json();
        setProducts(data.products || []);
      } catch (err) {
        console.error('Failed to fetch products', err);
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchProducts();
  }, [isOpen]);

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

  // Handler for product select dropdown
  const handleProductSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedSlug = e.target.value;
    if (!selectedSlug) return;
    
    // Preserve existing query params if any
    const currentUrl = formData.success_redirect_url || '';
    const queryParams = currentUrl.includes('?') ? currentUrl.split('?')[1] : '';
    
    // Construct new URL
    const newUrl = `/checkout/${selectedSlug}${queryParams ? `?${queryParams}` : ''}`;
    setFormData(prev => ({ ...prev, success_redirect_url: newUrl }));
  };

  // Handler for hide bump checkbox
  const handleHideBumpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    let currentUrl = formData.success_redirect_url || '';
    
    try {
      // Use dummy base for relative URLs
      const isRelative = currentUrl.startsWith('/');
      const baseUrl = 'http://dummy.com';
      const urlObj = new URL(currentUrl, baseUrl);
      
      if (isChecked) {
        urlObj.searchParams.set('hide_bump', 'true');
      } else {
        urlObj.searchParams.delete('hide_bump');
      }
      
      // Get the path + search
      let newUrlString = isRelative 
        ? urlObj.pathname + urlObj.search 
        : urlObj.toString();
        
      setFormData(prev => ({ ...prev, success_redirect_url: newUrlString }));
    } catch {
      // Fallback for invalid URLs - simple string manipulation
      if (isChecked && !currentUrl.includes('hide_bump=true')) {
         const separator = currentUrl.includes('?') ? '&' : '?';
         setFormData(prev => ({ ...prev, success_redirect_url: `${currentUrl}${separator}hide_bump=true` }));
      } else if (!isChecked) {
         setFormData(prev => ({ ...prev, success_redirect_url: currentUrl.replace(/[?&]hide_bump=true/, '') }));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all content items with URLs before submission
    if (formData.content_delivery_type === 'content') {
      const contentItems = (formData.content_config as ProductContentConfig)?.content_items || [];
      const invalidItems: number[] = [];

      contentItems.forEach((item, index) => {
        if (item.type === 'video_embed' || item.type === 'download_link') {
          const url = item.type === 'video_embed'
            ? item.config?.embed_url
            : item.config?.download_url;

          if (url) {
            const validation = validateContentItemUrl(url, item.type);
            if (!validation.isValid) {
              invalidItems.push(index);
              // Update validation state to show errors
              setUrlValidation(prev => ({
                ...prev,
                [index]: validation
              }));
            }
          }
        }
      });

      // Block submission if there are invalid URLs
      if (invalidItems.length > 0) {
        return; // Don't submit the form
      }
    }

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

  // Validate content item URL
  const validateContentItemUrl = useCallback((url: string, type: 'video_embed' | 'download_link'): { isValid: boolean; message: string } => {
    if (!url || url.trim() === '') {
      return { isValid: false, message: 'URL is required' };
    }

    if (type === 'video_embed') {
      // Validate video embed URL
      const parsed = parseVideoUrl(url);
      if (!parsed.isValid) {
        if (!isTrustedVideoPlatform(url)) {
          return {
            isValid: false,
            message: 'Untrusted platform. Supported: YouTube, Vimeo, Bunny.net, Loom, Wistia, DailyMotion, Twitch'
          };
        }
        return {
          isValid: false,
          message: 'Invalid video URL format. Please check the URL.'
        };
      }
      return {
        isValid: true,
        message: `✓ ${parsed.platform === 'youtube' ? 'YouTube' : parsed.platform === 'vimeo' ? 'Vimeo' : parsed.platform === 'bunny' ? 'Bunny.net' : parsed.platform === 'loom' ? 'Loom' : parsed.platform === 'wistia' ? 'Wistia' : parsed.platform === 'dailymotion' ? 'DailyMotion' : parsed.platform === 'twitch' ? 'Twitch' : 'Valid'} video detected`
      };
    } else if (type === 'download_link') {
      // Validate download URL
      try {
        const urlObj = new URL(url);

        // Must be HTTPS
        if (urlObj.protocol !== 'https:') {
          return {
            isValid: false,
            message: 'Download URL must use HTTPS'
          };
        }

        // Check for trusted storage providers
        const trustedStorageProviders = [
          'amazonaws.com',        // AWS S3
          'googleapis.com',       // Google Cloud Storage
          'supabase.co',          // Supabase Storage
          'cdn.',                 // Generic CDN
          'storage.',             // Generic Storage
          'bunny.net',            // Bunny CDN
          'b-cdn.net',            // Bunny CDN
          'drive.google.com',     // Google Drive
          'docs.google.com',      // Google Drive
          'dropbox.com',          // Dropbox
          'dl.dropboxusercontent.com', // Dropbox direct links
          'onedrive.live.com',    // OneDrive
          '1drv.ms',              // OneDrive short links
          'sharepoint.com',       // Microsoft SharePoint
          'box.com',              // Box
          'mega.nz',              // Mega
          'mediafire.com',        // MediaFire
          'wetransfer.com',       // WeTransfer
          'sendspace.com',        // SendSpace
          'cloudinary.com',       // Cloudinary
          'imgix.net',            // Imgix CDN
          'fastly.net'            // Fastly CDN
        ];

        const isTrustedStorage = trustedStorageProviders.some(provider =>
          urlObj.hostname.includes(provider)
        );

        if (!isTrustedStorage) {
          return {
            isValid: false,
            message: 'URL must be from a trusted storage provider (AWS, Google Drive, Dropbox, OneDrive, CDN, etc.)'
          };
        }

        return {
          isValid: true,
          message: '✓ Valid download URL'
        };
      } catch {
        return {
          isValid: false,
          message: 'Invalid URL format'
        };
      }
    }

    return { isValid: false, message: 'Unknown type' };
  }, []);

  if (!isOpen) return null;

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} size="xl" closeOnBackdropClick={false}>
      <ModalHeader
        title={product ? t('editProduct') : t('createNewProduct')}
        subtitle={product ? t('editing', { name: product.name }) : t('addToYourCatalog')}
        icon={
          <span className="text-2xl">{formData.icon}</span>
        }
        badge={formData.is_active ? 
          { text: t('active'), variant: 'success' } : 
          { text: t('inactive'), variant: 'neutral' }
        }
      />

      <ModalBody>
        {error && (
          <Message
            type="error"
            title={t('error')}
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
                    {formData.price === 0 ? t('free') : `${getCurrencySymbol(formData.currency)}${formData.price}`}
                  </span>
                  {formData.is_featured && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                      ⭐ {t('featured')}
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
                      {t('preview')}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </ModalSection>

          {/* Basic Information */}
          <ModalSection title={t('basicInformation')}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('productName')}
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  ref={nameInputRef}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder={t('enterProductName')}
                  required
                />
              </div>

              <div>
                <label htmlFor="slug" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('urlSlug')}
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">({t('autoGenerated')})</span>
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

            <div>
              <label htmlFor="long_description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Detailed Description (Markdown)
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">(Optional - for checkout page)</span>
              </label>
              <textarea
                id="long_description"
                name="long_description"
                value={formData.long_description || ''}
                onChange={handleInputChange}
                rows={8}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white font-mono text-sm"
                placeholder="## What's included?&#10;&#10;- Feature 1&#10;- Feature 2&#10;&#10;### Why choose this?&#10;&#10;Because it's **awesome**!"
              />
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1">
                <span>💡</span>
                <span>Tip: If you don't know Markdown syntax, ask any AI to create formatted content for you</span>
              </p>
            </div>
          </ModalSection>

          {/* Pricing & Visual */}
          <ModalSection title="Pricing & Visual">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('price')}
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
                  {t('setToZeroForFree')}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('productIcon')}
                </label>
                <IconSelector 
                  selectedIcon={formData.icon} 
                  onSelectIcon={handleIconSelect} 
                />
              </div>
            </div>
          </ModalSection>

          {/* Temporal Availability Settings */}
          <ModalSection title={t('temporalAvailability')}>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DateTimePicker
                  label={t('availableFrom')}
                  value={formData.available_from || ''}
                  onChange={(value) => setFormData(prev => ({ ...prev, available_from: value }))}
                  placeholder={t('selectStartDate')}
                  description={t('productAvailableFrom')}
                  showTimeSelect={true}
                />

                <DateTimePicker
                  label={t('availableUntil')}
                  value={formData.available_until || ''}
                  onChange={(value) => setFormData(prev => ({ ...prev, available_until: value }))}
                  placeholder={t('selectEndDate')}
                  description={t('productUnavailableAfter')}
                  showTimeSelect={true}
                  minDate={formData.available_from ? new Date(formData.available_from) : undefined}
                />
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">{t('temporalAvailabilityTitle')}</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      {t('temporalAvailabilityDescription')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </ModalSection>

          {/* Auto-Grant Access Settings */}
          <ModalSection title={t('autoGrantAccessSettings')}>
            <div className="space-y-4">
              <div>
                <label htmlFor="auto-grant-duration" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('defaultAccessDuration')}
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">({t('optional')})</span>
                </label>
                <input
                  type="number"
                  id="auto-grant-duration"
                  name="auto_grant_duration_days"
                  value={formData.auto_grant_duration_days || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    auto_grant_duration_days: e.target.value ? Number(e.target.value) : null
                  }))}
                  min="1"
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder={t('durationPlaceholder')}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {t('accessExpireAfter')}
                </p>
              </div>
              
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-amber-600 dark:text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200">{t('autoGrantDurationTitle')}</h4>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                      {t('autoGrantDurationDescription')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </ModalSection>

          {/* Content Delivery Settings */}
          <ModalSection title={t('contentDelivery')}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('contentDeliveryType')}
                </label>
                <select
                  value={formData.content_delivery_type}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    content_delivery_type: e.target.value as 'redirect' | 'content'
                  }))}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="content">{t('contentItems')}</option>
                  <option value="redirect">{t('redirect')}</option>
                </select>
              </div>

              {formData.content_delivery_type === 'redirect' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('redirectUrl')}
                  </label>
                  <input
                    type="text"
                    placeholder={t('redirectPlaceholder')}
                    value={(formData.content_config as { redirect_url?: string })?.redirect_url || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      content_config: { redirect_url: e.target.value }
                    }))}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {t('redirectDescription')}
                  </p>
                </div>
              )}

              {formData.content_delivery_type === 'content' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('contentItems')}
                  </label>

                  {/* Helpful info boxes - show based on what types exist */}
                  {((formData.content_config as ProductContentConfig)?.content_items || []).some(item => item.type === 'video_embed') && (
                    <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">Supported Video Platforms</h4>
                          <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                            Paste any URL format - we'll convert it to the proper embed URL automatically!
                          </p>
                          <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                            📺 YouTube • 🎬 Vimeo • 🐰 Bunny.net • 🎥 Loom • 📹 Wistia • 🎞️ DailyMotion • 🎮 Twitch
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {((formData.content_config as ProductContentConfig)?.content_items || []).some(item => item.type === 'download_link') && (
                    <div className="mb-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h4 className="text-sm font-medium text-green-800 dark:text-green-200">Trusted Storage Providers for Downloads</h4>
                          <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                            Download URLs must use HTTPS and be from trusted storage providers for security.
                          </p>
                          <div className="mt-2 text-xs text-green-600 dark:text-green-400 leading-relaxed">
                            <div>☁️ Cloud: AWS S3, Google Cloud Storage, Supabase Storage</div>
                            <div>📁 Personal: Google Drive, Dropbox, OneDrive, Box, SharePoint</div>
                            <div>🌐 CDN: Bunny CDN, Cloudinary, Imgix, Fastly</div>
                            <div>📤 File Sharing: Mega, MediaFire, WeTransfer, SendSpace</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {(formData.content_config as ProductContentConfig)?.content_items?.map((item, index) => (
                      <div key={index} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center space-x-2 mb-2">
                        <select
                          value={item.type}
                          onChange={(e) => {
                            const newItems = [...((formData.content_config as ProductContentConfig)?.content_items || [])];
                            newItems[index] = { ...item, type: e.target.value as 'video_embed' | 'download_link' };
                            setFormData(prev => ({
                              ...prev,
                              content_config: { ...prev.content_config, content_items: newItems }
                            }));

                            // Clear validation for this item when type changes
                            setUrlValidation(prev => {
                              const newValidation = { ...prev };
                              delete newValidation[index];
                              return newValidation;
                            });
                          }}
                          className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                        >
                          <option value="video_embed">{t('videoEmbed')}</option>
                          <option value="download_link">{t('downloadLink')}</option>
                        </select>
                        <input
                          type="text"
                          placeholder={t('title')}
                          value={item.title}
                          onChange={(e) => {
                            const newItems = [...((formData.content_config as ProductContentConfig)?.content_items || [])];
                            newItems[index] = { ...item, title: e.target.value };
                            setFormData(prev => ({ 
                              ...prev, 
                              content_config: { ...prev.content_config, content_items: newItems }
                            }));
                          }}
                          className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                        />
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            placeholder={t('url')}
                            value={item.config?.embed_url || item.config?.download_url || ''}
                            onChange={(e) => {
                              const newItems = [...((formData.content_config as ProductContentConfig)?.content_items || [])];
                              const configKey = item.type === 'video_embed' ? 'embed_url' : 'download_url';
                              newItems[index] = {
                                ...item,
                                config: { ...item.config, [configKey]: e.target.value }
                              };
                              setFormData(prev => ({
                                ...prev,
                                content_config: { ...prev.content_config, content_items: newItems }
                              }));
                            }}
                            onBlur={(e) => {
                              // Validate URL on blur (only for video_embed and download_link)
                              const url = e.target.value;
                              if (url && (item.type === 'video_embed' || item.type === 'download_link')) {
                                const validation = validateContentItemUrl(url, item.type);
                                setUrlValidation(prev => ({
                                  ...prev,
                                  [index]: validation
                                }));
                              } else {
                                // Remove validation if URL is empty
                                setUrlValidation(prev => {
                                  const newValidation = { ...prev };
                                  delete newValidation[index];
                                  return newValidation;
                                });
                              }
                            }}
                            className={`w-full px-2 py-1 pr-8 border rounded text-sm dark:bg-gray-700 dark:text-white ${
                              urlValidation[index]
                                ? urlValidation[index].isValid
                                  ? 'border-green-500 dark:border-green-600'
                                  : 'border-red-500 dark:border-red-600'
                                : 'border-gray-300 dark:border-gray-600'
                            }`}
                          />
                          {urlValidation[index] && (
                            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                              {urlValidation[index].isValid ? (
                                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              )}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const newItems = ((formData.content_config as ProductContentConfig)?.content_items || []).filter((_, i) => i !== index);
                            setFormData(prev => ({
                              ...prev,
                              content_config: { ...prev.content_config, content_items: newItems }
                            }));

                            // Rebuild validation state with shifted indices
                            setUrlValidation(prev => {
                              const newValidation: Record<number, { isValid: boolean; message: string }> = {};
                              Object.keys(prev).forEach(key => {
                                const idx = parseInt(key);
                                if (idx < index) {
                                  // Keep items before removed index
                                  newValidation[idx] = prev[idx];
                                } else if (idx > index) {
                                  // Shift items after removed index down by 1
                                  newValidation[idx - 1] = prev[idx];
                                }
                                // Skip the removed index
                              });
                              return newValidation;
                            });
                          }}
                          className="px-2 py-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                        >
                          {t('remove')}
                        </button>
                        </div>

                        {/* URL Validation Message */}
                        {urlValidation[index] && (
                          <div className={`mt-2 text-xs flex items-start space-x-1 ${
                            urlValidation[index].isValid ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                          }`}>
                            {urlValidation[index].isValid ? (
                              <svg className="w-3 h-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-3 h-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
                              </svg>
                            )}
                            <span>{urlValidation[index].message}</span>
                          </div>
                        )}

                        {/* Video Embed Options */}
                        {item.type === 'video_embed' && (
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                            <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Video Options</div>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                              <label className="flex items-center space-x-1 text-xs cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={item.config?.autoplay || false}
                                  onChange={(e) => {
                                    const newItems = [...((formData.content_config as ProductContentConfig)?.content_items || [])];
                                    newItems[index] = {
                                      ...item,
                                      config: { ...item.config, autoplay: e.target.checked }
                                    };
                                    setFormData(prev => ({
                                      ...prev,
                                      content_config: { ...prev.content_config, content_items: newItems }
                                    }));
                                  }}
                                  className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <span className="text-gray-700 dark:text-gray-300">Autoplay</span>
                              </label>

                              <label className="flex items-center space-x-1 text-xs cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={item.config?.loop || false}
                                  onChange={(e) => {
                                    const newItems = [...((formData.content_config as ProductContentConfig)?.content_items || [])];
                                    newItems[index] = {
                                      ...item,
                                      config: { ...item.config, loop: e.target.checked }
                                    };
                                    setFormData(prev => ({
                                      ...prev,
                                      content_config: { ...prev.content_config, content_items: newItems }
                                    }));
                                  }}
                                  className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <span className="text-gray-700 dark:text-gray-300">Loop</span>
                              </label>

                              <label className="flex items-center space-x-1 text-xs cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={item.config?.muted || false}
                                  onChange={(e) => {
                                    const newItems = [...((formData.content_config as ProductContentConfig)?.content_items || [])];
                                    newItems[index] = {
                                      ...item,
                                      config: { ...item.config, muted: e.target.checked }
                                    };
                                    setFormData(prev => ({
                                      ...prev,
                                      content_config: { ...prev.content_config, content_items: newItems }
                                    }));
                                  }}
                                  className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <span className="text-gray-700 dark:text-gray-300">Muted</span>
                              </label>

                              <label className="flex items-center space-x-1 text-xs cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={item.config?.preload || false}
                                  onChange={(e) => {
                                    const newItems = [...((formData.content_config as ProductContentConfig)?.content_items || [])];
                                    newItems[index] = {
                                      ...item,
                                      config: { ...item.config, preload: e.target.checked }
                                    };
                                    setFormData(prev => ({
                                      ...prev,
                                      content_config: { ...prev.content_config, content_items: newItems }
                                    }));
                                  }}
                                  className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <span className="text-gray-700 dark:text-gray-300">Preload</span>
                              </label>

                              <label className="flex items-center space-x-1 text-xs cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={item.config?.controls !== false}
                                  onChange={(e) => {
                                    const newItems = [...((formData.content_config as ProductContentConfig)?.content_items || [])];
                                    newItems[index] = {
                                      ...item,
                                      config: { ...item.config, controls: e.target.checked }
                                    };
                                    setFormData(prev => ({
                                      ...prev,
                                      content_config: { ...prev.content_config, content_items: newItems }
                                    }));
                                  }}
                                  className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <span className="text-gray-700 dark:text-gray-300">Controls</span>
                              </label>
                            </div>
                            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                              💡 Options support varies by platform (YouTube, Vimeo, Bunny.net, etc.)
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const currentItems = ((formData.content_config as ProductContentConfig)?.content_items || []);
                        const newItems = [...currentItems, {
                          id: `temp-${Date.now()}`,
                          type: 'video_embed' as const,
                          title: '',
                          config: { embed_url: '' },
                          order: currentItems.length + 1,
                          is_active: true
                        }];
                        setFormData(prev => ({ 
                          ...prev, 
                          content_config: { ...prev.content_config, content_items: newItems }
                        }));
                      }}
                      className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
                    >
                      {t('addContentItem')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </ModalSection>

          {/* Post-Purchase Redirect (Funnels/OTO) */}
          <ModalSection title={t('postPurchase.title')}>
            <div className="space-y-4">
              <div className="space-y-3">
                <label htmlFor="success_redirect_url" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('postPurchase.redirectUrl')}
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">({t('postPurchase.optional')})</span>
                </label>
                
                {/* Product Dropdown */}
                <select
                  onChange={handleProductSelect}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  defaultValue=""
                  disabled={loadingProducts}
                >
                  <option value="" disabled>{loadingProducts ? 'Loading...' : t('postPurchase.selectProductPlaceholder')}</option>
                  {products.map(p => (
                    <option key={p.id} value={p.slug}>
                      {p.name}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  id="success_redirect_url"
                  name="success_redirect_url"
                  value={formData.success_redirect_url || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder={t('postPurchase.redirectUrlPlaceholder')}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {t('postPurchase.redirectUrlHelp')}
                </p>
              </div>

              {/* Hide Order Bump Checkbox */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="hide_bump"
                  checked={formData.success_redirect_url?.includes('hide_bump=true') || false}
                  onChange={handleHideBumpChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="hide_bump" className="ml-3 block text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer">
                  {t('postPurchase.hideBump')}
                </label>
              </div>
              <p className="ml-7 text-xs text-gray-500 dark:text-gray-400">
                {t('postPurchase.hideBumpHelp')}
              </p>

              <div className="flex items-center pt-2 border-t border-gray-200 dark:border-gray-700 mt-4">
                <input
                  type="checkbox"
                  id="pass_params_to_redirect"
                  name="pass_params_to_redirect"
                  checked={formData.pass_params_to_redirect}
                  onChange={handleCheckboxChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="pass_params_to_redirect" className="ml-3 block text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer">
                  {t('postPurchase.passParams')}
                </label>
              </div>
              <p className="ml-7 text-xs text-gray-500 dark:text-gray-400">
                {t('postPurchase.passParamsHelp')}
              </p>
            </div>
          </ModalSection>

          {/* Organization / Categories */}
          <ModalSection title={t('organization', { defaultValue: 'Organization' })}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('categories', { defaultValue: 'Categories' })}
                </label>
                <div className="border border-gray-300 dark:border-gray-600 rounded-lg max-h-40 overflow-y-auto p-2 bg-white dark:bg-gray-700">
                  {loadingCategories ? (
                    <div className="text-sm text-gray-500 p-2">Loading categories...</div>
                  ) : allCategories.length === 0 ? (
                    <div className="text-sm text-gray-500 p-2">No categories found. Create one in Settings &gt; Categories.</div>
                  ) : (
                    <div className="space-y-2">
                      {allCategories.map((cat) => (
                        <label key={cat.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 p-1 rounded">
                          <input
                            type="checkbox"
                            checked={formData.categories.includes(cat.id)}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setFormData((prev) => ({
                                ...prev,
                                categories: checked
                                  ? [...prev.categories, cat.id]
                                  : prev.categories.filter((id) => id !== cat.id),
                              }));
                            }}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="text-sm text-gray-900 dark:text-gray-100">{cat.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </ModalSection>

          {/* Advanced Settings */}
          <ModalSection title={t('advancedSettings')}>            <div className="space-y-4">
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
                  {t('productActive')}
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
                  {t('featuredProduct')}
                </label>
              </div>
            </div>
          </ModalSection>
        </form>
      </ModalBody>

      <ModalFooter>
        <Button onClick={onClose} variant="secondary">
          {t('cancel')}
        </Button>
        <Button
          type="submit"
          form="product-form"
          disabled={isSubmitting}
          loading={isSubmitting}
          variant="primary"
        >
          {product ? t('updateProduct') : t('createProduct')}
        </Button>
      </ModalFooter>
    </BaseModal>
  );
};

export default ProductFormModal;