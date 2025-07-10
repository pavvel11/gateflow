'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { UserWithAccess, Product } from '@/types';

interface AccessManagementModalProps {
  user: UserWithAccess;
  isOpen: boolean;
  onClose: () => void;
  onAccessChange: () => void;
}

interface UserAccess {
  id: string;
  product_id: string;
  granted_at: string;
  granted_by: string;
  products: {
    id: string;
    name: string;
    description: string;
    is_active: boolean;
  };
}

const AccessManagementModal: React.FC<AccessManagementModalProps> = ({
  user,
  isOpen,
  onClose,
  onAccessChange
}) => {
  const [userAccess, setUserAccess] = useState<UserAccess[]>([]);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchUserAccess = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/users/${user.id}/access`);
      if (!response.ok) {
        throw new Error('Failed to fetch user access');
      }
      
      const data = await response.json();
      setUserAccess(data.access || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch user access');
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  const fetchAvailableProducts = useCallback(async () => {
    try {
      const response = await fetch('/api/products');
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      
      const data = await response.json();
      setAvailableProducts(data.products || []);
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  }, []);

  // Fetch user's current access and available products
  useEffect(() => {
    if (isOpen && user) {
      fetchUserAccess();
      fetchAvailableProducts();
    }
  }, [isOpen, user, fetchUserAccess, fetchAvailableProducts]);

  const handleGrantAccess = async () => {
    if (!selectedProductId) {
      setError('Please select a product');
      return;
    }

    try {
      setActionLoading('grant');
      setError(null);
      
      const response = await fetch(`/api/users/${user.id}/access`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_id: selectedProductId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to grant access');
      }

      // Refresh user access
      await fetchUserAccess();
      setShowAddForm(false);
      setSelectedProductId('');
      onAccessChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to grant access');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveAccess = async (productId: string) => {
    try {
      setActionLoading(productId);
      setError(null);
      
      const response = await fetch(`/api/users/${user.id}/access?product_id=${productId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove access');
      }

      // Refresh user access
      await fetchUserAccess();
      onAccessChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove access');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAvailableProductsForUser = () => {
    const userProductIds = userAccess.map(access => access.product_id);
    return availableProducts.filter(product => 
      product.is_active && !userProductIds.includes(product.id)
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white dark:bg-gray-800">
        <div className="mt-3">
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Manage Access for {user.email}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading access...</p>
            </div>
          ) : (
            <>
              {/* Current Access List */}
              <div className="space-y-3 mb-6">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">Current Access</h4>
                {userAccess.length > 0 ? (
                  userAccess.map((access) => (
                    <div key={access.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {access.products.name}
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              access.products.is_active 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                            }`}>
                              {access.products.is_active ? 'Active' : 'Inactive'}
                            </span>
                            <button
                              onClick={() => handleRemoveAccess(access.product_id)}
                              disabled={actionLoading === access.product_id}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 text-sm disabled:opacity-50"
                            >
                              {actionLoading === access.product_id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                              ) : (
                                'Remove'
                              )}
                            </button>
                          </div>
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Granted: {formatDate(access.granted_at)}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                    No product access granted
                  </p>
                )}
              </div>

              {/* Add Access Form */}
              {showAddForm ? (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Grant New Access</h4>
                  <div className="space-y-3">
                    <select
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">Select a product...</option>
                      {getAvailableProductsForUser().map(product => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                        </option>
                      ))}
                    </select>
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => {
                          setShowAddForm(false);
                          setSelectedProductId('');
                          setError(null);
                        }}
                        className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded-md"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleGrantAccess}
                        disabled={actionLoading === 'grant' || !selectedProductId}
                        className="px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-md"
                      >
                        {actionLoading === 'grant' ? (
                          <div className="flex items-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Granting...
                          </div>
                        ) : (
                          'Grant Access'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <button
                    onClick={() => setShowAddForm(true)}
                    disabled={getAvailableProductsForUser().length === 0}
                    className="w-full px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {getAvailableProductsForUser().length === 0 ? 'No products available' : 'Add New Access'}
                  </button>
                </div>
              )}

              {/* Footer */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded-md"
                >
                  Close
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccessManagementModal;
