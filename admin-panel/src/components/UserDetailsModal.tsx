'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { formatPrice } from '@/lib/constants';
import { BaseModal, ModalHeader, ModalBody, ModalFooter, ModalSection, Button, Message } from '@/components/ui/Modal';

interface UserDetailsModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onManageAccess: () => void;
}

interface UserProfile {
  user: {
    id: string;
    email: string;
    created_at: string;
    email_confirmed_at: string | null;
    last_sign_in_at: string | null;
    user_metadata: Record<string, unknown> | null;
  };
  stats: {
    total_products: number;
    total_value: number;
    last_access_granted_at: string | null;
    first_access_granted_at: string | null;
  };
  access: Array<{
    id: string;
    product_id: string;
    product_name: string;
    product_slug: string;
    product_price: number;
    product_currency: string;
    product_icon: string;
    product_is_active: boolean;
    granted_at: string;
  }>;
}

const UserDetailsModal: React.FC<UserDetailsModalProps> = ({
  userId,
  isOpen,
  onClose,
  onManageAccess
}) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/users/${userId}/profile`);
      if (!response.ok) {
        throw new Error(`Failed to fetch user profile: ${response.status}`);
      }

      const data = await response.json();
      setUserProfile(data);
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setError('Failed to load user profile');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserProfile();
    }
  }, [isOpen, userId, fetchUserProfile]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalHeader
        title="User Details"
        subtitle={userProfile?.user.email || "Loading user information..."}
        icon={
          userProfile ? (
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center">
              <span className="text-sm font-medium text-white">
                {userProfile.user.email.charAt(0).toUpperCase()}
              </span>
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 animate-pulse" />
          )
        }
        badge={userProfile ? 
          { text: `${userProfile.access.length} Product${userProfile.access.length === 1 ? '' : 's'}`, variant: 'neutral' } : 
          undefined
        }
      />

      <ModalBody>
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <Message
            type="error"
            title="Failed to load user details"
            message={error}
            className="mb-6"
          />
        ) : userProfile ? (
          <div className="space-y-6">
            {/* User Basic Info */}
            <ModalSection title="Account Information">
              <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                <div className="flex-shrink-0 h-12 w-12">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center">
                    <span className="text-lg font-medium text-white">
                      {userProfile.user.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                    {userProfile.user.email}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                    {userProfile.user.id}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Joined</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatDate(userProfile.user.created_at)}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Last Sign In</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatDate(userProfile.user.last_sign_in_at)}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Email Status</p>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      userProfile.user.email_confirmed_at
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                    }`}>
                      {userProfile.user.email_confirmed_at ? 'Verified' : 'Pending'}
                    </span>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Value</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatPrice(userProfile.stats.total_value, 'USD')}
                  </p>
                </div>
              </div>
            </ModalSection>

            {/* Activity Stats */}
            <ModalSection title="Activity Summary">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {userProfile.stats.total_products}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Products Accessed</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {formatPrice(userProfile.stats.total_value, 'USD')}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Value</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatDate(userProfile.stats.first_access_granted_at)}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">First Access</p>
                </div>
              </div>
            </ModalSection>

            {/* Product Access */}
            <ModalSection title="Product Access">
              {userProfile.access.length > 0 ? (
                <div className="overflow-hidden border border-gray-200 dark:border-gray-700 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Product</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Price</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Granted</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                      {userProfile.access.map((access) => (
                        <tr key={access.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center">
                              <span className="text-xl mr-3">{access.product_icon}</span>
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {access.product_name}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                                  /{access.product_slug}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              access.product_price === 0 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                            }`}>
                              {access.product_price === 0 ? 'Free' : formatPrice(access.product_price, access.product_currency)}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              access.product_is_active
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                            }`}>
                              {access.product_is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {formatDate(access.granted_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 p-8 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
                  <div className="text-gray-400 dark:text-gray-500 mb-4">
                    <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-4.5" />
                    </svg>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">No products assigned to this user</p>
                  <Button onClick={onManageAccess} variant="primary" size="sm">
                    Grant Access
                  </Button>
                </div>
              )}
            </ModalSection>
          </div>
        ) : null}
      </ModalBody>

      <ModalFooter>
        <Button onClick={onClose} variant="secondary">
          Close
        </Button>
        {userProfile && !loading && !error && (
          <Button onClick={onManageAccess} variant="primary">
            Manage Access
          </Button>
        )}
      </ModalFooter>
    </BaseModal>
  );
};

export default UserDetailsModal;
