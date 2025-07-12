'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Product } from '@/types';
import FilterBar from './FilterBar';
import ProductsTable from './ProductsTable';
import { useToast } from '@/contexts/ToastContext';
import ProductFormModal, { ProductFormData } from './ProductFormModal';
import { exportProductsToCsv } from '@/utils/csvExport';

const ProductsPageContent: React.FC = () => {
  const { addToast } = useToast();
  const addButtonRef = useRef<HTMLButtonElement>(null);

  // State for products and loading status
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for modals
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [showExportConfirmation, setShowExportConfirmation] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  
  // State for filtering and sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  // Debounce search term to avoid excessive API calls
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => {
      clearTimeout(timerId);
    };
  }, [searchTerm]);

  // Fetch products from the API
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        search: debouncedSearchTerm,
        sortBy,
        sortOrder,
        status: statusFilter
      });
      
      const response = await fetch(`/api/products?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setProducts(data.products || []);
      
      if (data.pagination) {
        setTotalPages(data.pagination.totalPages);
        setTotalItems(data.pagination.total);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load products. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, limit, debouncedSearchTerm, sortBy, sortOrder, statusFilter]);

  // Re-fetch products when dependencies change
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // CRUD Handlers
  const handleCreateProduct = async (formData: ProductFormData) => {
    setSubmitting(true);
    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create product');
      }
      setShowProductForm(false);
      await fetchProducts();
      addToast(`Product "${formData.name}" was successfully created`, 'success');
      setTimeout(() => {
        addButtonRef.current?.focus();
      }, 0);
    } catch (err) {
      console.error('Error creating product:', err);
      addToast(err instanceof Error ? err.message : 'Failed to create product', 'error');
      return Promise.reject(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateProduct = async (formData: ProductFormData) => {
    if (!editingProduct) return Promise.reject(new Error('No product selected for editing'));
    setSubmitting(true);
    try {
      const response = await fetch(`/api/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update product');
      }
      setShowProductForm(false);
      setEditingProduct(null);
      await fetchProducts();
      addToast(`Product "${formData.name}" was successfully updated`, 'success');
    } catch (err) {
      console.error('Error updating product:', err);
      addToast(err instanceof Error ? err.message : 'Failed to update product', 'error');
      return Promise.reject(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleProductSubmit = async (formData: ProductFormData) => {
    if (editingProduct) {
      return handleUpdateProduct(formData);
    } else {
      return handleCreateProduct(formData);
    }
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;
    
    try {
      const response = await fetch(`/api/products/${productToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete product');
      }

      const productName = productToDelete.name;
      
      await fetchProducts();
      setProductToDelete(null);
      
      addToast(`Product "${productName}" was successfully deleted`, 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to delete product', 'error');
    }
  };

  // UI Handlers
  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setShowProductForm(true);
  };

  const handlePreviewProduct = (product: Product) => {
    window.open(`/p/${product.slug}`, '_blank');
  };

  const handlePreviewRedirect = (product: Product) => {
    if (product.redirect_url) {
      window.open(product.redirect_url, '_blank');
    } else {
      addToast('This product does not have a redirect URL.', 'warning');
    }
  };

  const handleDeleteProductClick = (product: Product) => {
    setProductToDelete(product);
  };

  const handleAddNewProduct = () => {
    setEditingProduct(null);
    setShowProductForm(true);
  };

  const handleSearchChange = (newSearchTerm: string) => {
    setSearchTerm(newSearchTerm);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleExportCsv = useCallback(() => {
    if (products.length === 0) {
      addToast('No products to export', 'warning');
      return;
    }
    setShowExportConfirmation(true);
  }, [products, addToast]);
  
  const confirmExport = () => {
    const filename = `products_${new Date().toISOString().split('T')[0]}.csv`;
    exportProductsToCsv(products, filename);
    setShowExportConfirmation(false);
    addToast(`${products.length} products exported successfully`, 'success');
  };

  return (
    <div className="space-y-6">
      <FilterBar
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        statusFilter={statusFilter}
        onStatusFilterChange={handleStatusFilterChange}
        onAddProduct={handleAddNewProduct}
        onExport={handleExportCsv}
        onRefresh={fetchProducts}
        addButtonRef={addButtonRef}
      />
      <ProductsTable
        products={products}
        loading={loading}
        error={error}
        onEditProduct={handleEditProduct}
        onDeleteProduct={handleDeleteProductClick}
        onPreviewProduct={handlePreviewProduct}
        onPreviewRedirect={handlePreviewRedirect}
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        onPageChange={handlePageChange}
        limit={limit}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
      />

      {showProductForm && (
        <ProductFormModal
          isOpen={showProductForm}
          onClose={() => {
            setShowProductForm(false);
            setEditingProduct(null);
          }}
          onSubmit={handleProductSubmit}
          product={editingProduct}
          isSubmitting={submitting}
          error={null} // Pass error state if you have one for the form
        />
      )}

      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Confirm Deletion</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {`Are you sure you want to delete the product "${productToDelete.name}"? This action cannot be undone.`}
            </p>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-500 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showExportConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Confirm Export</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Are you sure you want to export the current list of {products.length} products to a CSV file?
            </p>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowExportConfirmation(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-500 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={confirmExport}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Export
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsPageContent;
