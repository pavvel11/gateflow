'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Product } from '@/types';
import { ProductContentConfig } from '@/types';
import { getIconEmoji } from '@/utils/themeUtils';
import { getCategories, getProductCategories, Category } from '@/lib/actions/categories';
import { getDefaultCurrency, getShopConfig } from '@/lib/actions/shop-config';
import { parseVideoUrl, isTrustedVideoPlatform } from '@/lib/videoUtils';
import {
  ProductFormData,
  OtoState,
  UrlValidation,
  initialFormData,
  initialOtoState,
} from '../types';

interface UseProductFormProps {
  product?: Product | null;
  isOpen: boolean;
  onSubmit: (formData: ProductFormData) => Promise<void>;
}

export function useProductForm({ product, isOpen, onSubmit }: UseProductFormProps) {
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
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
  const [oto, setOto] = useState<OtoState>(initialOtoState);

  // URL validation state - maps content item index to validation status
  const [urlValidation, setUrlValidation] = useState<Record<number, UrlValidation>>({});

  // Fetch categories, default currency, and omnibus setting
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

  // Initialize form data when product changes or modal opens
  useEffect(() => {
    if (product) {
      // For existing products
      setFormData({
        name: product.name,
        slug: product.slug,
        description: product.description,
        long_description: product.long_description || '',
        price: product.price,
        currency: product.currency || 'USD',
        is_active: product.is_active,
        is_featured: product.is_featured || false,
        icon: product.icon || getIconEmoji('rocket'),
        image_url: product.image_url || null,
        available_from: product.available_from || '',
        available_until: product.available_until || '',
        auto_grant_duration_days: product.auto_grant_duration_days || null,
        content_delivery_type: product.content_delivery_type || 'content',
        content_config: product.content_config || { content_items: [] },
        success_redirect_url: product.success_redirect_url || '',
        pass_params_to_redirect: product.pass_params_to_redirect || false,
        categories: [],
        omnibus_exempt: product.omnibus_exempt || false,
        sale_price: product.sale_price || null,
        sale_price_until: product.sale_price_until || null,
        sale_quantity_limit: product.sale_quantity_limit || null,
        sale_quantity_sold: product.sale_quantity_sold || 0,
        is_refundable: (product as Product & { is_refundable?: boolean }).is_refundable || false,
        refund_period_days: (product as Product & { refund_period_days?: number | null }).refund_period_days || null,
        // Pay What You Want / Custom Pricing
        allow_custom_price: product.allow_custom_price || false,
        custom_price_min: product.custom_price_min || 5.00,
        show_price_presets: product.show_price_presets !== false, // default true
        custom_price_presets: Array.isArray(product.custom_price_presets) ? product.custom_price_presets : [5, 10, 25]
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
            setOto({
              enabled: true,
              productId: data.oto_product_id || '',
              discountType: data.discount_type || 'percentage',
              discountValue: data.discount_value || 20,
              durationMinutes: data.duration_minutes || 15
            });
          } else {
            setOto(initialOtoState);
          }
        })
        .catch(err => {
          console.error('Failed to fetch OTO config:', err);
        });

      // Set display value for price
      setPriceDisplayValue(product.price.toString().replace('.', ','));
      setSalePriceDisplayValue(product.sale_price ? product.sale_price.toString().replace('.', ',') : '');
      setSlugModified(true);
    } else {
      // For new products
      setFormData({
        ...initialFormData,
        currency: defaultCurrency,
        icon: getIconEmoji('rocket'),
      });
      setPriceDisplayValue('');
      setSalePriceDisplayValue('');
      setSlugModified(false);
      setOto(initialOtoState);
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
      const origin = window.location.origin;
      const mainDomain = origin.replace(/\/\/admin\./, '//');
      setCurrentDomain(mainDomain);
    }
  }, [isOpen]);

  // Generate slug from product name
  const generateSlug = useCallback((name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/--+/g, '-')
      .trim();
  }, []);

  // Validate content item URL
  const validateContentItemUrl = useCallback((url: string, type: 'video_embed' | 'download_link'): UrlValidation => {
    if (!url || url.trim() === '') {
      return { isValid: false, message: 'URL is required' };
    }

    if (type === 'video_embed') {
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
      try {
        const urlObj = new URL(url);

        if (urlObj.protocol !== 'https:') {
          return {
            isValid: false,
            message: 'Download URL must use HTTPS'
          };
        }

        const trustedStorageProviders = [
          'amazonaws.com', 'googleapis.com', 'supabase.co', 'cdn.', 'storage.',
          'bunny.net', 'b-cdn.net', 'drive.google.com', 'docs.google.com',
          'dropbox.com', 'dl.dropboxusercontent.com', 'onedrive.live.com',
          '1drv.ms', 'sharepoint.com', 'box.com', 'mega.nz', 'mediafire.com',
          'wetransfer.com', 'sendspace.com', 'cloudinary.com', 'imgix.net', 'fastly.net'
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

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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
  }, [slugModified, generateSlug]);

  const handleCheckboxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }));
  }, []);

  const handleIconSelect = useCallback((icon: string) => {
    setFormData(prev => ({
      ...prev,
      icon: icon
    }));
  }, []);

  // Handler for product select dropdown (redirect URL)
  const handleProductSelect = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedSlug = e.target.value;
    if (!selectedSlug) {
      setFormData(prev => ({ ...prev, success_redirect_url: '' }));
      setOto(prev => ({ ...prev, productId: '', enabled: false }));
      return;
    }

    const selectedProduct = products.find(p => p.slug === selectedSlug);
    const currentUrl = formData.success_redirect_url || '';
    const queryParams = currentUrl.includes('?') ? currentUrl.split('?')[1] : '';
    const newUrl = `/checkout/${selectedSlug}${queryParams ? `?${queryParams}` : ''}`;

    setFormData(prev => ({ ...prev, success_redirect_url: newUrl }));

    if (selectedProduct && selectedProduct.price > 0) {
      setOto(prev => ({ ...prev, productId: selectedProduct.id }));
    } else {
      setOto(prev => ({ ...prev, productId: '', enabled: false }));
    }
  }, [products, formData.success_redirect_url]);

  // Helper to detect if redirect URL points to an internal product
  const getSelectedProductFromUrl = useCallback((): Product | null => {
    const url = formData.success_redirect_url || '';
    const match = url.match(/\/checkout\/([^/?]+)/);
    if (match) {
      const slug = match[1];
      return products.find(p => p.slug === slug) || null;
    }
    return null;
  }, [formData.success_redirect_url, products]);

  const selectedRedirectProduct = getSelectedProductFromUrl();
  const canShowOtoOption = selectedRedirectProduct && selectedRedirectProduct.price > 0 && selectedRedirectProduct.id !== product?.id;

  // Handler for hide bump checkbox
  const handleHideBumpChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    let currentUrl = formData.success_redirect_url || '';

    try {
      const isRelative = currentUrl.startsWith('/');
      const baseUrl = 'http://dummy.com';
      const urlObj = new URL(currentUrl, baseUrl);

      if (isChecked) {
        urlObj.searchParams.set('hide_bump', 'true');
      } else {
        urlObj.searchParams.delete('hide_bump');
      }

      const newUrlString = isRelative
        ? urlObj.pathname + urlObj.search
        : urlObj.toString();

      setFormData(prev => ({ ...prev, success_redirect_url: newUrlString }));
    } catch {
      if (isChecked && !currentUrl.includes('hide_bump=true')) {
        const separator = currentUrl.includes('?') ? '&' : '?';
        setFormData(prev => ({ ...prev, success_redirect_url: `${currentUrl}${separator}hide_bump=true` }));
      } else if (!isChecked) {
        setFormData(prev => ({ ...prev, success_redirect_url: currentUrl.replace(/[?&]hide_bump=true/, '') }));
      }
    }
  }, [formData.success_redirect_url]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
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
              setUrlValidation(prev => ({
                ...prev,
                [index]: validation
              }));
            }
          }
        }
      });

      if (invalidItems.length > 0) {
        return;
      }
    }

    // Include OTO data in the form submission
    const submitData: ProductFormData = {
      ...formData,
      oto_enabled: oto.enabled,
      oto_product_id: oto.enabled && oto.productId ? oto.productId : null,
      oto_discount_type: oto.discountType,
      oto_discount_value: oto.discountValue,
      oto_duration_minutes: oto.durationMinutes,
    };

    onSubmit(submitData);
  }, [formData, oto, onSubmit, validateContentItemUrl]);

  return {
    // Form data
    formData,
    setFormData,
    priceDisplayValue,
    setPriceDisplayValue,
    salePriceDisplayValue,
    setSalePriceDisplayValue,
    slugModified,
    setSlugModified,
    currentDomain,
    nameInputRef,

    // Products
    products,
    loadingProducts,

    // Categories
    allCategories,
    loadingCategories,

    // Settings
    defaultCurrency,
    omnibusEnabled,

    // OTO
    oto,
    setOto,
    selectedRedirectProduct,
    canShowOtoOption,

    // URL validation
    urlValidation,
    setUrlValidation,

    // Handlers
    handleInputChange,
    handleCheckboxChange,
    handleIconSelect,
    handleProductSelect,
    handleHideBumpChange,
    handleSubmit,

    // Utilities
    generateSlug,
    validateContentItemUrl,
  };
}
