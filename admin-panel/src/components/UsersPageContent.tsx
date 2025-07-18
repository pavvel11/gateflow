'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { UserWithAccess } from '@/types';
import UsersFilterBar from './UsersFilterBar';
import UsersTable from './UsersTable';
import { useToast } from '@/contexts/ToastContext';
import UserDetailsModal from './UserDetailsModal';
import AccessManagementModal from './AccessManagementModal';
import { useTranslations } from 'next-intl';

const UsersPageContent: React.FC = () => {
  const { addToast } = useToast();
  const t = useTranslations('admin.users');

  // State for users and loading status
  const [users, setUsers] = useState<UserWithAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for modals
  const [selectedUser, setSelectedUser] = useState<UserWithAccess | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  // State for filtering and sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('user_created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  // Debounce search term
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => {
      clearTimeout(timerId);
    };
  }, [searchTerm]);

  // Fetch users from the API
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        search: debouncedSearchTerm,
        sortBy,
        sortOrder,
      });

      const response = await fetch(`/api/users?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setUsers(data.users || []);
      if (data.pagination) {
        setTotalPages(data.pagination.totalPages);
        setTotalItems(data.pagination.total);
      }
    } catch {
      setError(t('errorLoadingUsers'));
    } finally {
      setLoading(false);
    }
  }, [currentPage, limit, debouncedSearchTerm, sortBy, sortOrder, t]);

  // Re-fetch users when dependencies change
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // UI Handlers
  const handleViewUserDetails = (user: UserWithAccess) => {
    setSelectedUser(user);
    setShowDetailsModal(true);
  };

  const handleManageAccess = (user: UserWithAccess) => {
    setSelectedUser(user);
    setShowAccessModal(true);
  };

  const handleAccessChange = async () => {
    addToast(t('accessUpdated'), 'success');
    await fetchUsers();
  };

  return (
    <div className="space-y-6">
       <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-gray-600 dark:text-gray-400">{t('description')}</p>
      </div>
      <UsersFilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onRefresh={fetchUsers}
      />
      <UsersTable
        users={users}
        loading={loading}
        error={error}
        onViewDetails={handleViewUserDetails}
        onManageAccess={handleManageAccess}
        onRefresh={fetchUsers}
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        onPageChange={setCurrentPage}
        limit={limit}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
      />

      {selectedUser && (
        <UserDetailsModal
          userId={selectedUser.id}
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedUser(null);
          }}
          onManageAccess={() => {
            setShowDetailsModal(false);
            setShowAccessModal(true);
          }}
        />
      )}

      {/* Access Management Modal */}
      {selectedUser && showAccessModal && (
        <AccessManagementModal
          user={selectedUser}
          isOpen={showAccessModal}
          onClose={() => {
            setShowAccessModal(false);
            setSelectedUser(null);
          }}
          onAccessChange={handleAccessChange}
        />
      )}
    </div>
  );
};

export default UsersPageContent;
