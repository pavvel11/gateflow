/**
 * Users Hook for v1 API
 *
 * Provides a consistent interface for users operations,
 * translating between the v1 API cursor pagination and the
 * frontend's offset-based pagination UI.
 */

import { useState, useCallback } from 'react';
import { UserWithAccess } from '@/types';
import { api, ApiError } from '@/lib/api/client';

interface UseUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface UseUsersResult {
  users: UserWithAccess[];
  loading: boolean;
  error: string | null;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasMore: boolean;
  };
  fetchUsers: () => Promise<void>;
}

/**
 * Hook for users list operations using v1 API
 */
export function useUsers(params: UseUsersParams = {}): UseUsersResult {
  const {
    page = 1,
    limit = 10,
    search = '',
    sortBy = 'created_at',
    sortOrder = 'desc',
  } = params;

  const [users, setUsers] = useState<UserWithAccess[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    hasMore: false,
  });

  /**
   * Fetch users from v1 API
   *
   * Fetches only the needed items for the current page.
   * Uses limit+1 pattern to detect if there are more pages.
   */
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Build sort param (v1 uses "-field" for desc, "field" for asc)
      const sort = sortOrder === 'desc' ? `-${sortBy}` : sortBy;

      // Fetch limit+1 to detect if there's a next page
      const response = await api.list<UserWithAccess>('users', {
        limit: limit + 1,
        search: search || undefined,
        sort,
      });

      const allUsers = response.data;
      const hasMore = allUsers.length > limit;

      // Take only the requested limit
      const pageUsers = allUsers.slice(0, limit);

      setUsers(pageUsers);
      setPagination({
        currentPage: page,
        totalPages: hasMore ? page + 1 : page,
        totalItems: pageUsers.length + (hasMore ? 1 : 0),
        hasMore,
      });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load users. Please try again later.');
      }
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, sortBy, sortOrder]);

  return {
    users,
    loading,
    error,
    pagination,
    fetchUsers,
  };
}
