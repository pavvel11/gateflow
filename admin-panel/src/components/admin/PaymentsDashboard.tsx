// components/admin/PaymentsDashboard.tsx
// Main payments dashboard for admin panel

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useToast } from '@/contexts/ToastContext';
import PaymentStatsCards from './PaymentStatsCards';
import PaymentTransactionsTable from './PaymentTransactionsTable';
import PaymentSessionsTable from './PaymentSessionsTable';
import PaymentFilters from './PaymentFilters';
import type { PaymentTransaction, PaymentSession } from '@/types/payment';

interface PaymentStats {
  totalTransactions: number;
  totalRevenue: number;
  pendingSessions: number;
  refundedAmount: number;
  todayRevenue: number;
  thisMonthRevenue: number;
}

export default function PaymentsDashboard() {
  const t = useTranslations('admin.payments');
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<'transactions' | 'sessions'>('transactions');
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [sessions, setSessions] = useState<PaymentSession[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'all',
    dateRange: '30',
    searchTerm: '',
  });

  // Fetch payment data
  const fetchPaymentData = useCallback(async () => {
    setLoading(true);
    try {
      const [transactionsRes, sessionsRes, statsRes] = await Promise.all([
        fetch('/api/admin/payments/transactions'),
        fetch('/api/admin/payments/sessions'),
        fetch('/api/admin/payments/stats'),
      ]);

      if (transactionsRes.ok) {
        const transactionsData = await transactionsRes.json();
        setTransactions(transactionsData);
      }

      if (sessionsRes.ok) {
        const sessionsData = await sessionsRes.json();
        setSessions(sessionsData);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error('Error fetching payment data:', error);
      addToast('Failed to load payment data', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchPaymentData();
  }, [fetchPaymentData, filters.status, filters.dateRange, filters.searchTerm]);

  // Filter transactions based on current filters
  const filteredTransactions = transactions.filter(transaction => {
    if (filters.status !== 'all' && transaction.status !== filters.status) {
      return false;
    }
    
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      return (
        transaction.id.toLowerCase().includes(searchLower) ||
        transaction.user_id.toLowerCase().includes(searchLower) ||
        transaction.stripe_payment_intent_id?.toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  });

  // Filter sessions based on current filters
  const filteredSessions = sessions.filter(session => {
    if (filters.status !== 'all' && session.status !== filters.status) {
      return false;
    }
    
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      return (
        session.session_id.toLowerCase().includes(searchLower) ||
        session.customer_email.toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  });

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">{t('loading')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t('subtitle')}
        </p>
      </div>

      {/* Payment Statistics */}
      {stats && <PaymentStatsCards stats={stats} />}

      {/* Filters */}
      <PaymentFilters 
        filters={filters} 
        onFiltersChange={setFilters}
        onRefresh={fetchPaymentData}
      />

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6 py-4">
            <button
              onClick={() => setActiveTab('transactions')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'transactions'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {t('transactions.title')} ({filteredTransactions.length})
            </button>
            <button
              onClick={() => setActiveTab('sessions')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'sessions'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {t('sessions.title')} ({filteredSessions.length})
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'transactions' ? (
            <PaymentTransactionsTable 
              transactions={filteredTransactions}
              onRefreshData={fetchPaymentData}
            />
          ) : (
            <PaymentSessionsTable 
              sessions={filteredSessions}
              onRefreshData={fetchPaymentData}
            />
          )}
        </div>
      </div>
    </div>
  );
}
