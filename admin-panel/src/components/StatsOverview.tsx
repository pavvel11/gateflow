'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { getDashboardStats } from '@/lib/actions/dashboard';
import { getRevenueStats, RevenueStats } from '@/lib/actions/analytics';
import { useRealtime } from '@/contexts/RealtimeContext';
import { useUserPreferences } from '@/contexts/UserPreferencesContext';
import NewOrderNotification from './dashboard/NewOrderNotification';

interface DashboardStats {
  totalProducts: number;
  totalUsers: number;
  totalAccess: number;
  activeUsers: number;
  totalRevenue: number;
}

interface NewOrder {
  amount: string;
  currency: string;
  id: string; // unique ID to force re-render
}

export default function StatsOverview() {
  const t = useTranslations('admin.dashboard');
  const searchParams = useSearchParams();
  const productId = searchParams.get('productId') || undefined;
  const { addRefreshListener, removeRefreshListener } = useRealtime();
  const { hideValues } = useUserPreferences();
  
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [revenueStats, setRevenueStats] = useState<RevenueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [newOrder, setNewOrder] = useState<NewOrder | null>(null); // State to trigger notification

  // Store previous order time to detect new orders for notification purposes
  const prevLastOrderTimeRef = useRef<string | null>(null);
  const prevTotalRevenueRef = useRef<number>(0); // Track previous revenue using ref to avoid dependency loop
  const isInitialLoadRef = useRef(true);

  // Stable fetch function - only depends on productId, NOT on revenueStats to avoid infinite loop
  const fetchAllStats = useCallback(async () => {
    try {
      const [dashboardData, revenueData] = await Promise.all([
        getDashboardStats(), // Currently global
        getRevenueStats(productId), // Filtered by product
      ]);

      if (dashboardData) setStats(dashboardData as DashboardStats);
      if (revenueData) {
        setRevenueStats(revenueData);

        // Trigger notification if a new order has arrived AND it's not the initial load
        if (!isInitialLoadRef.current && prevLastOrderTimeRef.current && revenueData.lastOrderAt && revenueData.lastOrderAt !== prevLastOrderTimeRef.current) {
           const currentTotalRevenue = revenueData.totalRevenue;
           const previousTotalRevenue = prevTotalRevenueRef.current; // Use ref instead of state
           const newAmount = (currentTotalRevenue - previousTotalRevenue) / 100;

           if (newAmount > 0) {
             const formattedAmount = newAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' }); // Assuming USD for now or logic to get currency
             setNewOrder({
               amount: formattedAmount,
               currency: 'USD',
               id: Date.now().toString()
             });
           }
        }

        if (revenueData.lastOrderAt) {
          prevLastOrderTimeRef.current = revenueData.lastOrderAt;
        }
        // Update ref with current revenue for next comparison
        prevTotalRevenueRef.current = revenueData.totalRevenue;
      }
    } catch (err) {
      console.error('Failed to fetch stats', err);
    } finally {
      setLoading(false);
      isInitialLoadRef.current = false;
    }
  }, [productId]); // ONLY productId - removing revenueStats prevents infinite loop

  useEffect(() => {
    // Initial fetch
    setLoading(true);
    fetchAllStats();

    // Register listener for global refresh events
    // Pass fetchAllStats directly as it's stable via useCallback
    addRefreshListener(fetchAllStats);

    return () => {
      removeRefreshListener(fetchAllStats);
    };
  }, [addRefreshListener, removeRefreshListener, fetchAllStats]); // fetchAllStats depends on productId

  const formatCurrency = (amount: number) => {
    if (hideValues) return '****';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100);
  };

  const formatNumber = (num: number) => {
    if (hideValues) return '****';
    return num.toLocaleString();
  };

  const timeAgo = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const statItems = [
    {
      id: 'total-revenue',
      name: t('stats.totalRevenue', { defaultValue: 'Total Revenue' }),
      value: formatCurrency(revenueStats?.totalRevenue ?? 0),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'from-green-500 to-green-600',
      bgColor: 'from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20',
      change: revenueStats?.todayRevenue ? `+${formatCurrency(revenueStats.todayRevenue)} today` : null,
      changeType: 'positive'
    },
    {
      id: 'today-orders',
      name: t('stats.todayOrders', { defaultValue: "Today's Orders" }),
      value: formatNumber(revenueStats?.todayOrders ?? 0),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      ),
      color: 'from-blue-500 to-blue-600',
      bgColor: 'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20',
      change: revenueStats?.lastOrderAt ? `Last: ${timeAgo(revenueStats.lastOrderAt)}` : null,
    },
    {
      id: 'total-users',
      name: t('totalUsers'),
      value: formatNumber(stats?.totalUsers ?? 0),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
      ),
      color: 'from-purple-500 to-purple-600',
      bgColor: 'from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20',
    },
    {
      id: 'active-users',
      name: t('activeUsers'),
      value: formatNumber(stats?.activeUsers ?? 0),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      color: 'from-yellow-500 to-yellow-600',
      bgColor: 'from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-4"></div>
              <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      {newOrder && (
        <NewOrderNotification 
          key={newOrder.id}
          amount={newOrder.amount} 
          currency={newOrder.currency} 
          onClose={() => setNewOrder(null)} 
        />
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statItems.map((item) => (
          <div
            key={item.id}
            data-testid={`stat-card-${item.id}`}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <div className="relative z-10">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {item.name}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {item.value}
                </p>
                {item.change && (
                   <p className={`text-xs font-medium mt-1 ${item.changeType === 'positive' ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`}>
                     {item.change}
                   </p>
                )}
              </div>
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${item.bgColor} flex items-center justify-center relative z-10`}>
                <div className={`text-white bg-gradient-to-r ${item.color} rounded-lg p-2`}>
                  {item.icon}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}