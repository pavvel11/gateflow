'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { UserWithAccess, Product } from '@/types';
import { BaseModal, ModalHeader, ModalBody, ModalFooter, ModalSection, Button, Message } from './ui/Modal';
import { useTranslations } from 'next-intl';

interface AccessManagementModalProps {
  user: UserWithAccess;
  isOpen: boolean;
  onClose: () => void;
  onAccessChange: () => void;
}

interface UserAccess {
  id: string;
  product_id: string;
  product_name: string;
  product_description: string;
  product_price: number;
  product_currency: string;
  product_is_active: boolean;
  access_created_at: string;
  access_expires_at?: string | null;
  access_duration_days?: number | null;
  product_slug: string;
}

const AccessManagementModal: React.FC<AccessManagementModalProps> = ({
  user,
  isOpen,
  onClose,
  onAccessChange
}) => {
  const t = useTranslations('admin.users.accessModal');
  const [userAccess, setUserAccess] = useState<UserAccess[]>([]);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [accessDuration, setAccessDuration] = useState<number | ''>('');
  const [accessExpiration, setAccessExpiration] = useState<string>('');
  const [accessType, setAccessType] = useState<'permanent' | 'duration' | 'expiration'>('permanent');
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
      setError(err instanceof Error ? err.message : t('errorFetch'));
    } finally {
      setLoading(false);
    }
  }, [user.id, t]);

  const fetchAvailableProducts = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/products');
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
      setError(t('selectProduct'));
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
          product_id: selectedProductId,
          access_type: accessType,
          access_duration_days: accessType === 'duration' ? accessDuration : null,
          access_expires_at: accessType === 'expiration' ? accessExpiration : null
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t('grantAccessError'));
      }

      // Refresh user access
      await fetchUserAccess();
      setShowAddForm(false);
      setSelectedProductId('');
      setAccessDuration('');
      setAccessExpiration('');
      setAccessType('permanent');
      onAccessChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('grantAccessError'));
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
        throw new Error(errorData.error || t('removeAccessError'));
      }

      // Refresh user access
      await fetchUserAccess();
      onAccessChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('removeAccessError'));
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
    <BaseModal isOpen={isOpen} onClose={onClose} size="lg" closeOnBackdropClick={false}>
      <ModalHeader
        title={t('title')}
        subtitle={t('subtitle', { email: user.email })}
        icon={
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        }
      />

      <ModalBody>
        {error && (
          <Message
            type="error"
            title={t('error')}
            message={error}
            className="mb-4"
          />
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('loadingAccess')}</p>
          </div>
        ) : (
          <div className="space-y-6">
            <ModalSection title={t('currentAccess')}>
              {userAccess.length > 0 ? (
                <div className="space-y-3">
                  {userAccess.map((access) => (
                    <div key={access.id} className="group relative">
                      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {access.product_name}
                            </h4>
                            <div className="flex items-center space-x-2 ml-4">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                access.product_is_active 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                              }`}>
                                {access.product_is_active ? t('active') : t('inactive')}
                              </span>
                              <Button
                                onClick={() => handleRemoveAccess(access.product_id)}
                                disabled={actionLoading === access.product_id}
                                loading={actionLoading === access.product_id}
                                variant="danger"
                                size="sm"
                              >
                                {t('remove')}
                              </Button>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {t('granted')}: {formatDate(access.access_created_at)}
                            {access.access_expires_at && (
                              <span className="block text-orange-600 dark:text-orange-400">
                                {t('expires')}: {formatDate(access.access_expires_at)}
                              </span>
                            )}
                            {access.access_duration_days && (
                              <span className="block text-blue-600 dark:text-blue-400">
                                {t('duration')}: {access.access_duration_days} {t('days')}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 font-medium">No product access granted</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">This user doesn&apos;t have access to any products yet.</p>
                </div>
              )}
            </ModalSection>

            <ModalSection title="Grant New Access">
              {showAddForm ? (
                <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <div>
                    <label htmlFor="product-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Select Product
                    </label>
                    <select
                      id="product-select"
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">Choose a product to grant access...</option>
                      {getAvailableProductsForUser().map(product => (
                        <option key={product.id} value={product.id}>
                          {product.name} {product.price > 0 ? `(${product.currency} ${product.price})` : '(Free)'}
                        </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="access-type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Access Type
                    </label>
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => setAccessType('permanent')}
                        variant={accessType === 'permanent' ? 'primary' : 'secondary'}
                        className="flex-1"
                      >
                        Permanent
                      </Button>
                      <Button
                        onClick={() => setAccessType('duration')}
                        variant={accessType === 'duration' ? 'primary' : 'secondary'}
                        className="flex-1"
                      >
                        Duration
                      </Button>
                      <Button
                        onClick={() => setAccessType('expiration')}
                        variant={accessType === 'expiration' ? 'primary' : 'secondary'}
                        className="flex-1"
                      >
                        Expiration
                      </Button>
                    </div>
                  </div>

                  {accessType === 'duration' && (
                    <div>
                      <label htmlFor="access-duration" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Duration (in days)
                      </label>
                      <input
                        id="access-duration"
                        type="number"
                        value={accessDuration}
                        onChange={(e) => setAccessDuration(Number(e.target.value))}
                        className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        placeholder="Enter duration in days"
                      />
                    </div>
                  )}

                  {accessType === 'expiration' && (
                    <div>
                      <label htmlFor="access-expiration" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Expiration Date
                      </label>
                      <input
                        id="access-expiration"
                        type="date"
                        value={accessExpiration}
                        onChange={(e) => setAccessExpiration(e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  )}

                  <div className="flex justify-end space-x-3">
                    <Button
                      onClick={() => {
                        setShowAddForm(false);
                        setSelectedProductId('');
                        setAccessDuration('');
                        setAccessExpiration('');
                        setAccessType('permanent');
                        setError(null);
                      }}
                      variant="secondary"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleGrantAccess}
                      disabled={!selectedProductId}
                      loading={actionLoading === 'grant'}
                      variant="primary"
                    >
                      Grant Access
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={() => setShowAddForm(true)}
                  disabled={getAvailableProductsForUser().length === 0}
                  variant="primary"
                  className="w-full"
                >
                  {getAvailableProductsForUser().length === 0 ? (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      No Products Available
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add New Access
                    </>
                  )}
                </Button>
              )}
            </ModalSection>
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        <Button onClick={onClose} variant="secondary">
          Close
        </Button>
      </ModalFooter>
    </BaseModal>
  );
};

export default AccessManagementModal;
