'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { formatPrice } from '@/lib/constants';
import { getIconEmoji } from '@/utils/themeUtils';

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
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white dark:bg-gray-800">
        <div className="mt-3">
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              User Details
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
              <p className="text-red-700 dark:text-red-300">{error}</p>
              <button 
                className="mt-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                onClick={fetchUserProfile}
              >
                Try again
              </button>
            </div>
          ) : userProfile ? (
            <div className="space-y-6">
              {/* User Basic Info */}
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-12 w-12">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center">
                      <span className="text-lg font-medium text-white">
                        {userProfile.user.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white">{userProfile.user.email}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      User ID: {userProfile.user.id}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Joined on</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatDate(userProfile.user.created_at)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Email verified</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {userProfile.user.email_confirmed_at ? 'Yes' : 'No'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Last sign in</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatDate(userProfile.user.last_sign_in_at)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      userProfile.user.email_confirmed_at 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    }`}>
                      {userProfile.user.email_confirmed_at ? 'Verified' : 'Pending'}
                    </span>
                  </div>
                </div>
              </div>

              {/* User Statistics */}
              <div>
                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-2">Statistics</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-600">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Products</p>
                    <p className="text-xl font-semibold text-gray-900 dark:text-white">
                      {userProfile.stats.total_products}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-600">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Value</p>
                    <p className="text-xl font-semibold text-gray-900 dark:text-white">
                      {userProfile.stats.total_value > 0
                        ? formatPrice(userProfile.stats.total_value, 'USD')
                        : 'Free'}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-600">
                    <p className="text-sm text-gray-500 dark:text-gray-400">First Access</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {formatDate(userProfile.stats.first_access_granted_at)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Product Access List */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-md font-medium text-gray-900 dark:text-white">Product Access</h4>
                  <button
                    onClick={onManageAccess}
                    className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Manage Access
                  </button>
                </div>

                {userProfile.access.length > 0 ? (
                  <div className="bg-white dark:bg-gray-700 rounded-lg shadow border border-gray-200 dark:border-gray-600 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Product
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Price
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Granted On
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                        {userProfile.access.map((access) => (
                          <tr key={access.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-8 w-8">
                                  <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-lg">
                                    {access.product_icon?.length === 2 || access.product_icon?.match(/\p{Emoji}/u) 
                                      ? access.product_icon 
                                      : getIconEmoji(access.product_icon)}
                                  </div>
                                </div>
                                <div className="ml-3">
                                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                                    {access.product_name}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {access.product_slug}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {access.product_price === 0 ? (
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-700 dark:text-blue-100">
                                  Free
                                </span>
                              ) : (
                                <div className="text-sm text-gray-900 dark:text-white">
                                  {formatPrice(access.product_price, access.product_currency)}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                access.product_is_active 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-100' 
                                  : 'bg-red-100 text-red-800 dark:bg-red-700 dark:text-red-100'
                              }`}>
                                {access.product_is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {formatDate(access.granted_at)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-600 text-center">
                    <p className="text-gray-500 dark:text-gray-400">No products assigned to this user</p>
                    <button
                      onClick={onManageAccess}
                      className="mt-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                    >
                      Grant Access
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* Footer */}
          {!loading && !error && userProfile && (
            <div className="mt-6 flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded-md mr-2"
              >
                Close
              </button>
              <button
                onClick={onManageAccess}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
              >
                Manage Access
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserDetailsModal;
