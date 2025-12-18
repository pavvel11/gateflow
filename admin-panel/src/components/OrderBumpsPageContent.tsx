'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Product } from '@/types';
import { useToast } from '@/contexts/ToastContext';
import OrderBumpFormModal from './OrderBumpFormModal';
import { useTranslations } from 'next-intl';

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
  created_at: string;
  updated_at: string;
  main_product: {
    id: string;
    name: string;
    slug: string;
  };
  bump_product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    currency: string;
  };
}

const OrderBumpsPageContent: React.FC = () => {
  const { addToast } = useToast();
  const t = useTranslations('admin.orderBumps');

  // State for order bumps and loading status
  const [orderBumps, setOrderBumps] = useState<OrderBumpWithDetails[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for modals
  const [showBumpForm, setShowBumpForm] = useState(false);
  const [editingBump, setEditingBump] = useState<OrderBumpWithDetails | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [bumpToDelete, setBumpToDelete] = useState<OrderBumpWithDetails | null>(null);

  // Fetch products for dropdown
  const fetchProducts = useCallback(async () => {
    try {
      setLoadingProducts(true);
      const response = await fetch('/api/admin/products?limit=1000&status=active');

      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }

      const data = await response.json();
      setProducts(data.products || []);
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  // Fetch order bumps from the API
  const fetchOrderBumps = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/order-bumps');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setOrderBumps(data || []);
    } catch (err) {
      setError('Failed to load order bumps. Please try again later.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchOrderBumps();
    fetchProducts();
  }, [fetchOrderBumps, fetchProducts]);

  // CRUD Handlers
  const handleCreateBump = async (formData: {
    main_product_id: string;
    bump_product_id: string;
    bump_price: number | null;
    bump_title: string;
    bump_description: string | null;
    is_active: boolean;
    display_order: number;
  }) => {
    setSubmitting(true);
    try {
      const response = await fetch('/api/admin/order-bumps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create order bump');
      }

      setShowBumpForm(false);
      await fetchOrderBumps();
      addToast('Order bump created successfully', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to create order bump', 'error');
      return Promise.reject(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateBump = async (formData: {
    bump_product_id?: string;
    bump_price?: number | null;
    bump_title?: string;
    bump_description?: string | null;
    is_active?: boolean;
    display_order?: number;
  }) => {
    if (!editingBump) return Promise.reject(new Error('No bump selected for editing'));
    setSubmitting(true);

    try {
      const response = await fetch(`/api/admin/order-bumps/${editingBump.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update order bump');
      }

      setShowBumpForm(false);
      setEditingBump(null);
      await fetchOrderBumps();
      addToast('Order bump updated successfully', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to update order bump', 'error');
      return Promise.reject(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBump = async (bump: OrderBumpWithDetails) => {
    try {
      const response = await fetch(`/api/admin/order-bumps/${bump.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete order bump');
      }

      setBumpToDelete(null);
      await fetchOrderBumps();
      addToast('Order bump deleted successfully', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to delete order bump', 'error');
    }
  };

  const handleToggleActive = async (bump: OrderBumpWithDetails) => {
    try {
      const response = await fetch(`/api/admin/order-bumps/${bump.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !bump.is_active }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to toggle bump status');
      }

      await fetchOrderBumps();
      addToast(
        `Order bump ${!bump.is_active ? 'activated' : 'deactivated'} successfully`,
        'success'
      );
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to toggle bump status', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Order Bumps
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Increase AOV with one-click upsells during checkout
          </p>
        </div>
        <button
          onClick={() => {
            setEditingBump(null);
            setShowBumpForm(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Create Order Bump</span>
        </button>
      </div>

      {/* Stats Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Bumps</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {orderBumps.length}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Bumps</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {orderBumps.filter(b => b.is_active).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Inactive Bumps</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {orderBumps.filter(b => !b.is_active).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="text-center p-12">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        ) : orderBumps.length === 0 ? (
          <div className="text-center p-12">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No order bumps yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Create your first order bump to increase average order value
            </p>
            <button
              onClick={() => {
                setEditingBump(null);
                setShowBumpForm(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Order Bump
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Main Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Bump Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Bump Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {orderBumps.map((bump) => (
                  <tr key={bump.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {bump.main_product.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        /{bump.main_product.slug}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {bump.bump_product.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Regular: {bump.bump_product.price} {bump.bump_product.currency}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white max-w-xs truncate">
                        {bump.bump_title}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                        {bump.bump_price !== null ? bump.bump_price : bump.bump_product.price} {bump.bump_product.currency}
                      </div>
                      {bump.bump_price !== null && bump.bump_price < bump.bump_product.price && (
                        <div className="text-xs text-green-600 dark:text-green-400">
                          Save {bump.bump_product.price - bump.bump_price}!
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleActive(bump)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          bump.is_active
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/30'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {bump.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => {
                            setEditingBump(bump);
                            setShowBumpForm(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setBumpToDelete(bump)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Bump Form Modal */}
      {showBumpForm && (
        <OrderBumpFormModal
          products={products}
          loadingProducts={loadingProducts}
          editingBump={editingBump}
          onSubmit={editingBump ? handleUpdateBump : handleCreateBump}
          onClose={() => {
            setShowBumpForm(false);
            setEditingBump(null);
          }}
          isSubmitting={submitting}
        />
      )}

      {/* Delete Confirmation Modal */}
      {bumpToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Delete Order Bump?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete the order bump for{' '}
              <strong>{bumpToDelete.main_product.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setBumpToDelete(null)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteBump(bumpToDelete)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderBumpsPageContent;
