/**
 * Products Hook for v1 API
 *
 * Provides a consistent interface for products operations,
 * translating between the v1 API cursor pagination and the
 * frontend's offset-based pagination UI.
 */

import { useState, useCallback } from 'react';
import { Product } from '@/types';
import { api, ApiError } from '@/lib/api/client';

interface UseProductsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'all' | 'active' | 'inactive';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface UseProductsResult {
  products: Product[];
  loading: boolean;
  error: string | null;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasMore: boolean;
  };
  fetchProducts: () => Promise<void>;
  createProduct: (data: ProductCreateData) => Promise<Product>;
  updateProduct: (id: string, data: ProductUpdateData) => Promise<Product>;
  deleteProduct: (id: string) => Promise<void>;
  toggleStatus: (id: string, currentStatus: boolean) => Promise<void>;
  toggleFeatured: (id: string, currentFeatured: boolean) => Promise<void>;
}

interface ProductCreateData {
  name: string;
  slug?: string;
  description?: string;
  price: number;
  currency?: string;
  is_active?: boolean;
  is_featured?: boolean;
  icon?: string | null;
  content_delivery_type?: string;
  content_config?: Record<string, unknown>;
  email_config?: Record<string, unknown>;
  access_duration_type?: string;
  access_duration_days?: number | null;
  // OTO fields
  oto_enabled?: boolean;
  oto_product_id?: string | null;
  oto_discount_type?: string | null;
  oto_discount_value?: number | null;
  oto_duration_minutes?: number | null;
}

interface ProductUpdateData extends Partial<ProductCreateData> {}

/**
 * Hook for products CRUD operations using v1 API
 */
export function useProducts(params: UseProductsParams = {}): UseProductsResult {
  const {
    page = 1,
    limit = 10,
    search = '',
    status = 'all',
    sortBy = 'created_at',
    sortOrder = 'desc',
  } = params;

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    hasMore: false,
  });

  /**
   * Fetch products from v1 API
   *
   * Note: v1 API uses cursor pagination, but we emulate offset pagination
   * by fetching enough items to cover the requested page.
   */
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Build sort param (v1 uses "-field" for desc, "field" for asc)
      const sort = sortOrder === 'desc' ? `-${sortBy}` : sortBy;

      // For offset pagination emulation, we fetch all items up to a reasonable limit
      // In production, you might want to implement proper cursor caching
      const fetchLimit = Math.max(limit * page, 100); // Fetch at least 100 or enough for current page

      const response = await api.list<Product>('products', {
        limit: fetchLimit,
        search: search || undefined,
        status: status === 'all' ? undefined : status,
        sort,
      });

      const allProducts = response.data;
      const totalItems = allProducts.length;

      // Calculate pagination info based on fetched data
      const totalPages = Math.ceil(totalItems / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const pageProducts = allProducts.slice(startIndex, endIndex);

      setProducts(pageProducts);
      setPagination({
        currentPage: page,
        totalPages: Math.max(totalPages, 1),
        totalItems,
        hasMore: response.pagination.has_more || endIndex < totalItems,
      });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load products. Please try again later.');
      }
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, status, sortBy, sortOrder]);

  /**
   * Create a new product
   */
  const createProduct = useCallback(async (data: ProductCreateData): Promise<Product> => {
    // Extract OTO fields - they're handled separately
    const { oto_enabled, oto_product_id, oto_discount_type, oto_discount_value, oto_duration_minutes, ...productData } = data;

    // Create the product
    const product = await api.create<Product>('products', productData);

    // If OTO is enabled, save OTO configuration
    // Note: OTO endpoint might not be migrated to v1 yet, use old endpoint
    if (oto_enabled && oto_product_id && product.id) {
      try {
        await fetch(`/api/admin/products/${product.id}/oto`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            oto_enabled,
            oto_product_id,
            oto_discount_type,
            oto_discount_value,
            oto_duration_minutes,
          }),
        });
      } catch (otoErr) {
        console.error('Failed to save OTO configuration:', otoErr);
        // Don't throw - product was created successfully
      }
    }

    return product;
  }, []);

  /**
   * Update an existing product
   */
  const updateProduct = useCallback(async (id: string, data: ProductUpdateData): Promise<Product> => {
    // Extract OTO fields - they're handled separately
    const { oto_enabled, oto_product_id, oto_discount_type, oto_discount_value, oto_duration_minutes, ...productData } = data;

    // Update the product
    const product = await api.update<Product>('products', id, productData);

    // Save OTO configuration (create/update/delete)
    // Note: OTO endpoint might not be migrated to v1 yet, use old endpoint
    try {
      await fetch(`/api/admin/products/${id}/oto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oto_enabled: oto_enabled ?? false,
          oto_product_id: oto_product_id ?? null,
          oto_discount_type: oto_discount_type ?? 'percentage',
          oto_discount_value: oto_discount_value ?? 0,
          oto_duration_minutes: oto_duration_minutes ?? 30,
        }),
      });
    } catch (otoErr) {
      console.error('Failed to save OTO configuration:', otoErr);
      // Don't throw - product was updated successfully
    }

    return product;
  }, []);

  /**
   * Delete a product
   */
  const deleteProduct = useCallback(async (id: string): Promise<void> => {
    await api.delete('products', id);
  }, []);

  /**
   * Toggle product active status
   */
  const toggleStatus = useCallback(async (id: string, currentStatus: boolean): Promise<void> => {
    await api.update<Product>('products', id, { is_active: !currentStatus });
  }, []);

  /**
   * Toggle product featured status
   */
  const toggleFeatured = useCallback(async (id: string, currentFeatured: boolean): Promise<void> => {
    await api.update<Product>('products', id, { is_featured: !currentFeatured });
  }, []);

  return {
    products,
    loading,
    error,
    pagination,
    fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    toggleStatus,
    toggleFeatured,
  };
}

/**
 * Hook for fetching products dropdown (simple list for selects)
 */
export function useProductsDropdown(status: 'all' | 'active' = 'active') {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.list<Product>('products', {
        limit: 1000, // Get all products for dropdown
        status: status === 'all' ? undefined : status,
        sort: 'name',
      });

      setProducts(response.data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load products');
      }
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [status]);

  return { products, loading, error, fetchProducts };
}
