'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { UserWithAccess } from '@/types';
import UsersTable from './UsersTable';
import { useToast } from '@/contexts/ToastContext';
import UserDetailsModal from './UserDetailsModal';
import AccessManagementModal from './AccessManagementModal';

const UsersPageContent: React.FC = () => {
  const { addToast } = useToast();

  // State for users and loading status
  const [users, setUsers] = useState<UserWithAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for search and sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // State for modals
  const [selectedUser, setSelectedUser] = useState<UserWithAccess | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);

  // Debounce search term to avoid excessive API calls
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
        search: debouncedSearchTerm,
        sortBy,
        sortOrder
      });
      
      const response = await fetch(`/api/users?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setUsers(data.users || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchTerm, sortBy, sortOrder]);

  // Re-fetch users when dependencies change
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleViewUserDetails = (user: UserWithAccess) => {
    setSelectedUser(user);
    setShowDetailsModal(true);
  };

  const handleManageAccess = (user: UserWithAccess) => {
    setSelectedUser(user);
    setShowAccessModal(true);
  };

  const handleAccessChange = async () => {
    addToast('User access updated successfully', 'success');
    await fetchUsers();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
        <UsersTable 
          users={users}
          loading={loading}
          error={error}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={(column) => {
            if (sortBy === column) {
              setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
            } else {
              setSortBy(column);
              setSortOrder('asc');
            }
          }}
          onViewDetails={handleViewUserDetails}
          onManageAccess={handleManageAccess}
          onRefresh={fetchUsers}
        />
      </div>

      {/* User Details Modal */}
      {selectedUser && showDetailsModal && (
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
