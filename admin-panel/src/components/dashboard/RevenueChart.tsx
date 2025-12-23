'use client';

import { useEffect, useState, useCallback } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getSalesChartData, getHourlyRevenueStats } from '@/lib/actions/analytics';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useRealtime } from '@/contexts/RealtimeContext';
import DateRangeFilter from './DateRangeFilter';

type ViewMode = 'daily' | 'hourly';

export default function RevenueChart() {
  const t = useTranslations('admin.dashboard');
  const searchParams = useSearchParams();
  const productId = searchParams.get('productId') || undefined;
  const { addRefreshListener, removeRefreshListener } = useRealtime();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  
  // Default to 30 days for daily view
  const [dateRange, setDateRange] = useState<{ start: Date | null, end: Date | null }>({
    start: new Date(new Date().setDate(new Date().getDate() - 30)),
    end: new Date()
  });

  const handleRangeChange = (start: Date | null, end: Date | null) => {
    setDateRange({ start, end });
    // When a custom range is selected, force view mode to daily
    if (start && end) {
      setViewMode('daily'); 
    }
  };

  const setPredefinedRange = (days: number) => {
    if (days === 0) { // "Today" button
      setViewMode('hourly');
      // For hourly view, the backend defaults to current date, so we can reset dateRange or leave it
      setDateRange({ start: new Date(), end: new Date() }); 
    } else {
      setViewMode('daily');
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - days);
      setDateRange({ start, end });
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (viewMode === 'hourly') {
        const hourlyData = await getHourlyRevenueStats(undefined, productId);
        setData(hourlyData);
      } else { // daily view mode
        if (dateRange.start && dateRange.end) {
          // Pass explicit dates to getSalesChartData
          const chartData = await getSalesChartData(0, dateRange.start, dateRange.end, productId);
          setData(chartData);
        } else {
          // Fallback for daily view if dates are somehow null, though shouldn't happen
          const chartData = await getSalesChartData(30, undefined, undefined, productId); // Default to 30 days
          setData(chartData);
        }
      }
    } catch (err) {
      console.error('Failed to fetch chart data', err);
      setData([]); // Ensure data is empty on error
    } finally {
      setLoading(false);
    }
  }, [viewMode, dateRange, productId]);

  useEffect(() => {
    // Register listener for global refresh events from RealtimeContext
    // This ensures chart data is refreshed when new orders come in
    const refreshListener = () => {
      console.log('[RevenueChart] Refresh requested via context.');
      fetchData();
    };
    addRefreshListener(refreshListener);
    
    fetchData(); // Initial fetch

    return () => {
      removeRefreshListener(refreshListener);
    };
  }, [fetchData, addRefreshListener, removeRefreshListener]);

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD', // TODO: Make dynamic from config
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value / 100);
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 h-[400px] animate-pulse">
        <div className="h-6 w-1/3 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
        <div className="h-full bg-gray-100 dark:bg-gray-700/50 rounded"></div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {viewMode === 'daily' 
              ? t('revenueChart.title', { defaultValue: 'Revenue Trend' })
              : t('revenueChart.hourlyTitle', { defaultValue: "Today's Revenue" })}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {viewMode === 'daily'
              ? t('revenueChart.subtitle', { defaultValue: 'Performance over time' })
              : t('revenueChart.hourlySubtitle', { defaultValue: 'Hourly breakdown' })}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setPredefinedRange(0)}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'hourly'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setPredefinedRange(7)}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'daily' && dateRange.start && (new Date().getTime() - dateRange.start.getTime()) < 8 * 24 * 3600 * 1000 // Roughly check if 7 days
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              7d
            </button>
            <button
              onClick={() => setPredefinedRange(30)}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'daily' && dateRange.start && (new Date().getTime() - dateRange.start.getTime()) > 20 * 24 * 3600 * 1000
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              30d
            </button>
          </div>
          
          <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-1 hidden sm:block"></div>
          
          <DateRangeFilter 
            startDate={dateRange.start} 
            endDate={dateRange.end} 
            onChange={handleRangeChange} 
          />
        </div>
      </div>

      {(!data || data.length === 0) ? (
        <div className="h-[300px] flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">No Revenue Data Yet</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-xs">
            {viewMode === 'daily' ? 'Once you start making sales, your revenue trend will appear here.' : 'No sales recorded today yet.'}
          </p>
        </div>
      ) : (
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis 
                dataKey={viewMode === 'daily' ? 'date' : 'hour'} 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6B7280', fontSize: 12 }}
                dy={10}
                tickFormatter={(value) => {
                  if (viewMode === 'hourly') return `${value}:00`;
                  const date = new Date(value)
                  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6B7280', fontSize: 12 }}
                tickFormatter={formatCurrency}
                width={60}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                  borderRadius: '8px', 
                  border: '1px solid #E5E7EB',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' 
                }}
                formatter={(value: number | string | (number | string)[] | undefined) => {
                  const numericValue = typeof value === 'number' ? value : 0;
                  return [formatCurrency(numericValue), 'Revenue'];
                }}
                labelFormatter={(label) => {
                  if (viewMode === 'hourly') return `Today, ${label}:00 - ${label}:59`;
                  return new Date(label).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                }}
              />
              <Area 
                type="monotone" 
                dataKey="amount" 
                stroke="#3B82F6" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorRevenue)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
