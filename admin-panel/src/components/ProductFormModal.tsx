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
import { getDefaultCurrency, getShopConfig } from '@/lib/actions/shop-config';

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
  image_url?: string | null; // Product image URL (e.g., from ImgBB)
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
  // EU Omnibus Directive
  omnibus_exempt: boolean;
  // Sale price (promotional pricing)
  sale_price?: number | null;
  sale_price_until?: string | null;
  sale_quantity_limit?: number | null;
  sale_quantity_sold?: number;
  // Refund settings
  is_refundable: boolean;
  refund_period_days?: number | null;
  // OTO (One-Time Offer) configuration
  oto_enabled?: boolean;
  oto_product_id?: string | null;
  oto_discount_type?: 'percentage' | 'fixed';
  oto_discount_value?: number;
  oto_duration_minutes?: number;
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
    image_url: null,
    available_from: '',
    available_until: '',
    auto_grant_duration_days: null,
    content_delivery_type: 'content',
    content_config: {
      content_items: []
    },
    success_redirect_url: '',
    pass_params_to_redirect: false,
    categories: [],
    omnibus_exempt: false,
    sale_price: null,
    sale_price_until: null,
    sale_quantity_limit: null,
    sale_quantity_sold: 0,
    is_refundable: false,
    refund_period_days: null
  });

  // Separate state for the displayed price input value
  const [priceDisplayValue, setPriceDisplayValue] = useState<string>('');
  const [salePriceDisplayValue, setSalePriceDisplayValue] = useState<string>('');

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

  // Omnibus Directive global setting
  const [omnibusEnabled, setOmnibusEnabled] = useState<boolean>(true);

  // OTO (One-Time Offer) state
  const [otoEnabled, setOtoEnabled] = useState<boolean>(false);
  const [otoProductId, setOtoProductId] = useState<string>('');
  const [otoDiscountType, setOtoDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [otoDiscountValue, setOtoDiscountValue] = useState<number>(20);
  const [otoDurationMinutes, setOtoDurationMinutes] = useState<number>(15);

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

        // Fetch Omnibus Directive global setting
        getShopConfig().then(config => {
            if (config) {
                setOmnibusEnabled(config.omnibus_enabled);
            }
        }).catch(err => {
            console.error('Failed to fetch shop config', err);
        });
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
        image_url: product.image_url || null,
        available_from: product.available_from || '',
        available_until: product.available_until || '',
        auto_grant_duration_days: product.auto_grant_duration_days || null,
        content_delivery_type: product.content_delivery_type || 'content',
        content_config: product.content_config || { content_items: [] },
        success_redirect_url: product.success_redirect_url || '',
        pass_params_to_redirect: product.pass_params_to_redirect || false,
        categories: [], // Will be populated below
        omnibus_exempt: product.omnibus_exempt || false,
        sale_price: product.sale_price || null,
        sale_price_until: product.sale_price_until || null,
        sale_quantity_limit: product.sale_quantity_limit || null,
        sale_quantity_sold: product.sale_quantity_sold || 0,
        is_refundable: (product as Product & { is_refundable?: boolean }).is_refundable || false,
        refund_period_days: (product as Product & { refund_period_days?: number | null }).refund_period_days || null
      });

      // Fetch assigned categories
      getProductCategories(product.id).then(catIds => {
          setFormData(prev => ({ ...prev, categories: catIds }));
      }).catch(err => console.error(err));

      // Fetch OTO configuration for this product
      fetch(`/api/admin/products/${product.id}/oto`)
        .then(res => res.json())
        .then(data => {
          if (data.has_oto) {
            setOtoEnabled(true);
            setOtoProductId(data.oto_product_id || '');
            setOtoDiscountType(data.discount_type || 'percentage');
            setOtoDiscountValue(data.discount_value || 20);
            setOtoDurationMinutes(data.duration_minutes || 15);
          } else {
            setOtoEnabled(false);
            setOtoProductId('');
            setOtoDiscountType('percentage');
            setOtoDiscountValue(20);
            setOtoDurationMinutes(15);
          }
        })
        .catch(err => {
          console.error('Failed to fetch OTO config:', err);
        });

      // Set display value for price - always show the value, even for zero
      setPriceDisplayValue(product.price.toString().replace('.', ','));
      setSalePriceDisplayValue(product.sale_price ? product.sale_price.toString().replace('.', ',') : '');
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
        image_url: null,
        available_from: '',
        available_until: '',
        auto_grant_duration_days: null,
        content_delivery_type: 'content',
        content_config: { content_items: [] },
        success_redirect_url: '',
        pass_params_to_redirect: false,
        categories: [],
        omnibus_exempt: false,
        sale_price: null,
        sale_price_until: null,
        sale_quantity_limit: null,
        sale_quantity_sold: 0,
        is_refundable: false,
        refund_period_days: null
      });
      setPriceDisplayValue('');
      setSalePriceDisplayValue('');
      setSlugModified(false);
      // Reset OTO state for new products
      setOtoEnabled(false);
      setOtoProductId('');
      setOtoDiscountType('percentage');
      setOtoDiscountValue(20);
      setOtoDurationMinutes(15);
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
    if (!selectedSlug) {
      // Clear redirect and OTO
      setFormData(prev => ({ ...prev, success_redirect_url: '' }));
      setOtoProductId('');
      setOtoEnabled(false);
      return;
    }

    // Find the selected product to get its ID
    const selectedProduct = products.find(p => p.slug === selectedSlug);

    // Preserve existing query params if any
    const currentUrl = formData.success_redirect_url || '';
    const queryParams = currentUrl.includes('?') ? currentUrl.split('?')[1] : '';

    // Construct new URL
    const newUrl = `/checkout/${selectedSlug}${queryParams ? `?${queryParams}` : ''}`;
    setFormData(prev => ({ ...prev, success_redirect_url: newUrl }));

    // Set OTO product ID if product is not free
    if (selectedProduct && selectedProduct.price > 0) {
      setOtoProductId(selectedProduct.id);
    } else {
      setOtoProductId('');
      setOtoEnabled(false);
    }
  };

  // Helper to detect if redirect URL points to an internal product
  const getSelectedProductFromUrl = (): Product | null => {
    const url = formData.success_redirect_url || '';
    const match = url.match(/\/checkout\/([^/?]+)/);
    if (match) {
      const slug = match[1];
      return products.find(p => p.slug === slug) || null;
    }
    return null;
  };

  const selectedRedirectProduct = getSelectedProductFromUrl();
  const canShowOtoOption = selectedRedirectProduct && selectedRedirectProduct.price > 0 && selectedRedirectProduct.id !== product?.id;

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

    // Include OTO data in the form submission
    const submitData: ProductFormData = {
      ...formData,
      oto_enabled: otoEnabled,
      oto_product_id: otoEnabled && otoProductId ? otoProductId : null,
      oto_discount_type: otoDiscountType,
      oto_discount_value: otoDiscountValue,
      oto_duration_minutes: otoDurationMinutes,
    };

    onSubmit(submitData);
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
        title={product && product.id ? t('editProduct') : t('createNewProduct')}
        subtitle={product && product.id ? t('editing', { name: product.name }) : t('addToYourCatalog')}
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

            {/* Product Image URL */}
            <div className="mt-6">
              <label htmlFor="image_url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('imageUrl')}
              </label>
              <input
                type="url"
                id="image_url"
                name="image_url"
                value={formData.image_url || ''}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://i.ibb.co/..."
              />
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Wgraj zdjęcie produktu na <a href="https://imgbb.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 underline">ImgBB</a> lub inny serwis hostingowy i wklej tutaj URL.
              </p>
            </div>
          </ModalSection>

          {/* Sale Price (Promotional Pricing) */}
          <ModalSection title={t('salePrice')} collapsible defaultExpanded={!!formData.sale_price}>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="sale_price" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('salePriceLabel')}
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
                      id="sale_price"
                      name="sale_price"
                      value={salePriceDisplayValue}
                      onChange={(e) => {
                        const inputValue = e.target.value;

                        if (inputValue === '') {
                          setSalePriceDisplayValue('');
                          setFormData(prev => ({ ...prev, sale_price: null }));
                          return;
                        }

                        if (!/^[\d,.]*$/.test(inputValue)) return;

                        const processedValue = inputValue.replace(',', '.');
                        const dotCount = (processedValue.match(/\./g) || []).length;
                        if (dotCount > 1) return;

                        if (/^\d*\.?\d{0,2}$/.test(processedValue)) {
                          const numericValue = parseFloat(processedValue);
                          setSalePriceDisplayValue(inputValue);
                          setFormData(prev => ({
                            ...prev,
                            sale_price: isNaN(numericValue) ? null : numericValue
                          }));
                        }
                      }}
                      placeholder={formData.currency === 'PLN' || formData.currency === 'CHF' ? `0,00 ${getCurrencySymbol(formData.currency)}` : "0.00"}
                      className={`${(formData.currency === 'PLN' || formData.currency === 'CHF') ? 'pl-3' : 'pl-12'} pr-12 w-full py-2.5 border ${formData.sale_price && formData.sale_price >= formData.price ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white`}
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 dark:text-gray-400 text-sm">
                        {formData.currency}
                      </span>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {t('salePriceDescription')}
                  </p>
                  {formData.sale_price && formData.sale_price >= formData.price && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                      {t('salePriceMustBeLower')}
                    </p>
                  )}
                </div>

                <DateTimePicker
                  label={t('salePriceUntil')}
                  value={formData.sale_price_until || ''}
                  onChange={(value) => setFormData(prev => ({ ...prev, sale_price_until: value }))}
                  placeholder={t('selectEndDate')}
                  description={t('salePriceUntilDescription')}
                  showTimeSelect={true}
                  minDate={new Date()}
                />
              </div>

              {/* Quantity Limit */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="sale_quantity_limit" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('saleQuantityLimit', { defaultValue: 'Quantity Limit' })}
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">({t('optional')})</span>
                  </label>
                  <input
                    type="number"
                    id="sale_quantity_limit"
                    min="1"
                    value={formData.sale_quantity_limit || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      sale_quantity_limit: e.target.value ? parseInt(e.target.value, 10) : null
                    }))}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder={t('saleQuantityLimitPlaceholder', { defaultValue: 'No limit' })}
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {t('saleQuantityLimitDescription', { defaultValue: 'Max units at sale price. Leave empty for unlimited.' })}
                  </p>
                </div>

                {/* Quantity Sold Display & Reset */}
                {formData.sale_quantity_sold !== undefined && formData.sale_quantity_sold > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('saleQuantitySoldLabel', { defaultValue: 'Sold at Sale Price' })}
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <span className="text-lg font-semibold text-gray-900 dark:text-white">
                          {formData.sale_quantity_sold}
                        </span>
                        {formData.sale_quantity_limit && (
                          <span className="text-gray-500 dark:text-gray-400">
                            {' / '}{formData.sale_quantity_limit}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, sale_quantity_sold: 0 }))}
                        className="px-3 py-2.5 text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-800 transition-colors"
                        title={t('resetSaleCounter', { defaultValue: 'Reset counter' })}
                      >
                        {t('reset', { defaultValue: 'Reset' })}
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {t('saleQuantitySoldDescription', { defaultValue: 'Number of units sold at the promotional price.' })}
                    </p>
                  </div>
                )}
              </div>

              {formData.sale_price && formData.sale_price < formData.price && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    ℹ️ {t('salePriceActiveInfo')}
                  </p>
                </div>
              )}

              {/* Warning when quantity limit is reached */}
              {formData.sale_quantity_limit && formData.sale_quantity_sold !== undefined && formData.sale_quantity_sold >= formData.sale_quantity_limit && (
                <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-700">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    ⚠️ {t('saleQuantityLimitReached', { defaultValue: 'Sale quantity limit reached. Customers will see the regular price.' })}
                  </p>
                </div>
              )}
            </div>
          </ModalSection>

          {/* Temporal Availability Settings */}
          <ModalSection title={t('temporalAvailability')} collapsible defaultExpanded={!!(formData.available_from || formData.available_until)}>
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
          <ModalSection title={t('autoGrantAccessSettings')} collapsible defaultExpanded={!!formData.auto_grant_duration_days}>
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
          <ModalSection title={t('contentDelivery')} collapsible defaultExpanded={formData.content_delivery_type === 'redirect' || ((formData.content_config as any)?.content_items?.length > 0)}>
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

          {/* After Purchase - Combined Redirect & OTO */}
          <ModalSection title={t('postPurchase.title')} collapsible defaultExpanded={!!formData.success_redirect_url || otoEnabled}>
            <div className="space-y-4">
              {/* Product Selection */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('postPurchase.redirectProduct', { defaultValue: 'Redirect to product' })}
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">({t('postPurchase.optional')})</span>
                </label>

                <select
                  value={selectedRedirectProduct?.slug || ''}
                  onChange={handleProductSelect}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  disabled={loadingProducts}
                >
                  <option value="">{loadingProducts ? 'Loading...' : t('postPurchase.selectProductPlaceholder')}</option>
                  {products
                    .filter(p => p.id !== product?.id) // Exclude current product
                    .map(p => (
                      <option key={p.id} value={p.slug}>
                        {p.icon} {p.name} {p.price === 0 ? '(Free)' : `- ${p.price} ${p.currency}`}
                      </option>
                    ))
                  }
                </select>

                {/* Show selected product info */}
                {selectedRedirectProduct && (
                  <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <span className="text-2xl">{selectedRedirectProduct.icon}</span>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">{selectedRedirectProduct.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {selectedRedirectProduct.price === 0 ? 'Free' : `${selectedRedirectProduct.price} ${selectedRedirectProduct.currency}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleProductSelect({ target: { value: '' } } as any)}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}

                {/* Custom URL (alternative to product selection) */}
                <div className="relative">
                  <input
                    type="text"
                    id="success_redirect_url"
                    name="success_redirect_url"
                    value={formData.success_redirect_url || ''}
                    onChange={(e) => {
                      handleInputChange(e);
                      // Clear OTO if URL doesn't match a product
                      const match = e.target.value.match(/\/checkout\/([^/?]+)/);
                      if (!match) {
                        setOtoEnabled(false);
                        setOtoProductId('');
                      }
                    }}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder={t('postPurchase.redirectUrlPlaceholder')}
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('postPurchase.redirectUrlHelp')}
                </p>
              </div>

              {/* Options (only show when redirect is set) */}
              {formData.success_redirect_url && (
                <div className="space-y-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="hide_bump"
                      checked={formData.success_redirect_url?.includes('hide_bump=true') || false}
                      onChange={handleHideBumpChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="hide_bump" className="ml-3 block text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                      {t('postPurchase.hideBump')}
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="pass_params_to_redirect"
                      name="pass_params_to_redirect"
                      checked={formData.pass_params_to_redirect}
                      onChange={handleCheckboxChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="pass_params_to_redirect" className="ml-3 block text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                      {t('postPurchase.passParams')}
                    </label>
                  </div>
                </div>
              )}

              {/* OTO Option - Only show when internal product is selected */}
              {canShowOtoOption && (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  {/* OTO Toggle */}
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {t('oto.addDiscount', { defaultValue: 'Add time-limited discount' })}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {t('oto.addDiscountDesc', { defaultValue: 'Offer "{product}" at a special price', product: selectedRedirectProduct?.name })}
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={otoEnabled}
                        onChange={(e) => {
                          setOtoEnabled(e.target.checked);
                          if (e.target.checked && selectedRedirectProduct) {
                            setOtoProductId(selectedRedirectProduct.id);
                          }
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                    </label>
                  </div>

                  {/* OTO Configuration */}
                  {otoEnabled && (
                    <div className="mt-4 space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                      {/* Discount Configuration */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t('oto.discountType', { defaultValue: 'Discount Type' })}
                          </label>
                          <select
                            value={otoDiscountType}
                            onChange={(e) => setOtoDiscountType(e.target.value as 'percentage' | 'fixed')}
                            className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                          >
                            <option value="percentage">{t('oto.percentage', { defaultValue: 'Percentage (%)' })}</option>
                            <option value="fixed">{t('oto.fixed', { defaultValue: 'Fixed Amount' })}</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t('oto.discountValue', { defaultValue: 'Discount Value' })}
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              value={otoDiscountValue}
                              onChange={(e) => setOtoDiscountValue(Math.max(0, Number(e.target.value)))}
                              min="0"
                              max={otoDiscountType === 'percentage' ? 100 : undefined}
                              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white pr-10"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                              {otoDiscountType === 'percentage' ? '%' : formData.currency}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Duration */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('oto.duration', { defaultValue: 'Offer Duration' })}
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            value={otoDurationMinutes}
                            onChange={(e) => setOtoDurationMinutes(Math.max(1, Math.min(1440, Number(e.target.value))))}
                            min="1"
                            max="1440"
                            className="w-24 px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                          />
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {t('oto.minutes', { defaultValue: 'minutes' })}
                          </span>
                          <div className="flex gap-2 ml-auto">
                            {[5, 15, 30, 60].map(mins => (
                              <button
                                key={mins}
                                type="button"
                                onClick={() => setOtoDurationMinutes(mins)}
                                className={`px-2 py-1 text-xs rounded ${otoDurationMinutes === mins
                                  ? 'bg-purple-600 text-white'
                                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                }`}
                              >
                                {mins}m
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Preview Box */}
                      <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg border border-purple-200 dark:border-purple-700">
                        <p className="text-sm text-purple-800 dark:text-purple-200">
                          <span className="font-medium">{t('oto.preview', { defaultValue: 'Preview:' })}</span>{' '}
                          {t('oto.previewText', {
                            defaultValue: 'After purchasing this product, customer will see a {discount} discount on "{product}" for {duration} minutes.',
                            discount: otoDiscountType === 'percentage' ? `${otoDiscountValue}%` : `${otoDiscountValue} ${formData.currency}`,
                            product: selectedRedirectProduct?.name || 'selected product',
                            duration: otoDurationMinutes
                          })}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Info when no product selected */}
              {!formData.success_redirect_url && (
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('postPurchase.noRedirectInfo', { defaultValue: 'Select a product above to create a sales funnel with optional time-limited discount (OTO).' })}
                  </p>
                </div>
              )}
            </div>
          </ModalSection>

          {/* Organization / Categories */}
          <ModalSection title={t('organization', { defaultValue: 'Organization' })} collapsible defaultExpanded={formData.categories.length > 0}>
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

          {/* Refund Settings */}
          <ModalSection title={t('refundSettings.title', { defaultValue: 'Refund Policy' })}>
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_refundable"
                  name="is_refundable"
                  checked={formData.is_refundable}
                  onChange={handleCheckboxChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_refundable" className="ml-3 block text-sm font-medium text-gray-900 dark:text-gray-100">
                  {t('refundSettings.allowRefunds', { defaultValue: 'Allow customers to request refunds' })}
                </label>
              </div>

              {formData.is_refundable && (
                <div className="ml-7 space-y-4">
                  <div>
                    <label htmlFor="refund_period_days" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('refundSettings.refundPeriod', { defaultValue: 'Refund period (days)' })}
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">({t('optional')})</span>
                    </label>
                    <input
                      type="number"
                      id="refund_period_days"
                      name="refund_period_days"
                      value={formData.refund_period_days || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        refund_period_days: e.target.value ? Number(e.target.value) : null
                      }))}
                      min="1"
                      max="365"
                      className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      placeholder={t('refundSettings.refundPeriodPlaceholder', { defaultValue: 'e.g., 14, 30' })}
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {t('refundSettings.refundPeriodHelp', { defaultValue: 'Number of days from purchase within which customer can request a refund. Leave empty for no time limit.' })}
                    </p>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                          {t('refundSettings.infoTitle', { defaultValue: 'How refunds work' })}
                        </h4>
                        <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                          {t('refundSettings.infoDescription', { defaultValue: 'Customers can submit refund requests from their purchase history. You will review and approve/reject each request. Admins can always issue refunds regardless of the time limit.' })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ModalSection>

          {/* Advanced Settings */}
          <ModalSection title={t('advancedSettings')} collapsible defaultExpanded={!formData.is_active || formData.is_featured || formData.omnibus_exempt}>
            <div className="space-y-4">
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

              {omnibusEnabled && (
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="omnibus_exempt"
                    name="omnibus_exempt"
                    checked={formData.omnibus_exempt}
                    onChange={handleCheckboxChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="omnibus_exempt" className="ml-3 block text-sm font-medium text-gray-900 dark:text-gray-100">
                    {t('omnibusExempt')}
                  </label>
                  <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                    {t('omnibusExemptHelp')}
                  </span>
                </div>
              )}
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
          {product && product.id ? t('updateProduct') : t('createProduct')}
        </Button>
      </ModalFooter>
    </BaseModal>
  );
};

export default ProductFormModal;