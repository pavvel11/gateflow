'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { getRevenueStats, getRevenueGoal, setRevenueGoal, CurrencyAmount } from '@/lib/actions/analytics';
import { useRealtime } from '@/contexts/RealtimeContext';
import { useUserPreferences } from '@/contexts/UserPreferencesContext';
import { useSearchParams } from 'next/navigation';

export default function RevenueGoal() {
  const t = useTranslations('admin.dashboard');
  const searchParams = useSearchParams();
  const productId = searchParams.get('productId') || undefined;
  const { addRefreshListener, removeRefreshListener } = useRealtime();
  const { hideValues } = useUserPreferences();
  
  const [goal, setGoal] = useState(1000000); // Default $10k in cents
  // Goal start date determines the period for 'currentRevenue' displayed on the goal bar
  const [goalStartDate, setGoalStartDate] = useState<string | null>(null);
  const [currentRevenue, setCurrentRevenue] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(true);

  // Helper to sum all currency amounts to a single number (stable, no dependencies)
  const sumAllCurrencies = useCallback((amounts: CurrencyAmount): number => {
    return Object.values(amounts).reduce((sum, amount) => sum + amount, 0);
  }, []);

  // Fetch both Goal configuration and Current Revenue
  const fetchData = useCallback(async () => {
    try {
      // 1. Get Goal Config from DB
      const goalData = await getRevenueGoal(productId);
      let startDateForStats = undefined;

      if (goalData) {
        setGoal(goalData.amount);
        setGoalStartDate(goalData.startDate);
        startDateForStats = new Date(goalData.startDate);
      } else {
        // No goal set for this context? Use defaults or fallback to global if implemented on backend
        // For now, if no goal, we default to 1M and no start date (all time revenue)
        setGoal(1000000);
        setGoalStartDate(null);
      }

      // 2. Get Revenue Stats based on goal start date
      const stats = await getRevenueStats(productId, startDateForStats);
      if (stats) {
        // Sum all currencies for the goal comparison
        setCurrentRevenue(sumAllCurrencies(stats.totalRevenue));
      }
    } catch (err) {
      console.error('Failed to fetch revenue data', err);
    } finally {
      setLoading(false);
    }
  }, [productId, sumAllCurrencies]);

  useEffect(() => {
    // Load goal and start date from local storage (backup/optimistic)
    if (typeof window !== 'undefined') {
        const savedGoal = localStorage.getItem('revenue_goal');
        if (savedGoal) {
          setGoal(parseInt(savedGoal, 10));
        }
        const savedStartDate = localStorage.getItem('revenue_goal_start_date');
        if (savedStartDate) {
          setGoalStartDate(savedStartDate);
        }
    }
    
    fetchData();
    addRefreshListener(fetchData);

    return () => {
      removeRefreshListener(fetchData);
    };
  }, [fetchData, addRefreshListener, removeRefreshListener]);

  const handleSave = async () => {
    const newGoalCents = parseFloat(inputValue) * 100;
    if (isNaN(newGoalCents)) return;
    
    const startDate = goalStartDate || new Date().toISOString();

    try {
      await setRevenueGoal(newGoalCents, startDate, productId);
      setGoal(newGoalCents);
      setGoalStartDate(startDate);
      setIsEditing(false);
      fetchData(); 
    } catch (err) {
      console.error('Failed to save goal', err);
    }
  };

  const handleResetGoal = async () => {
    const now = new Date().toISOString();
    
    try {
      await setRevenueGoal(goal, now, productId); 
      setGoalStartDate(now);
      setIsEditing(false);
      fetchData(); 
    } catch (err) {
      console.error('Failed to reset goal', err);
    }
  };

  const rawPercentage = goal > 0 ? Math.round((currentRevenue / goal) * 100) : 0;
  const visualPercentage = Math.min(rawPercentage, 100);

  const formatCurrency = (amount: number) => {
    if (hideValues) return '****';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount / 100);
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 h-[140px] animate-pulse">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
        <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
          {t('revenueGoal', { defaultValue: 'Revenue Goal' })}
        </h3>
        {isEditing ? (
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={hideValues ? '****' : (goal / 100).toString()}
              className="w-24 px-2 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              autoFocus
            />
            <button 
              onClick={handleSave}
              className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
            >
              Save
            </button>
            <button 
              onClick={handleResetGoal}
              className="text-xs text-gray-500 dark:text-gray-400 hover:underline"
              title="Reset progress (start counting from now)"
            >
              Reset
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => {
                setInputValue((goal / 100).toString());
                setIsEditing(true);
              }}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              {t('setGoal', { defaultValue: 'Set Goal' })}
            </button>
             {goalStartDate && (
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                ({t('stats.since', { date: new Date(goalStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) })})
              </span>
            )}
          </div>
        )}
      </div>

      <div className="relative pt-1">
        <div className="flex mb-2 items-center justify-between">
          <div>
            <span className={`text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full ${
              rawPercentage >= 100 
                ? 'text-green-600 bg-green-200 dark:bg-green-900 dark:text-green-200' 
                : 'text-blue-600 bg-blue-200 dark:bg-blue-900 dark:text-blue-200'
            }`}>
              {hideValues ? '***%' : `${rawPercentage}%`}
            </span>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold inline-block text-blue-600 dark:text-blue-400">
              {formatCurrency(currentRevenue)} / {formatCurrency(goal)}
            </span>
          </div>
        </div>
        <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200 dark:bg-gray-700">
          <div 
            style={{ width: `${visualPercentage}%` }} 
            className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-500 ${
              rawPercentage >= 100 ? 'bg-green-500' : 'bg-blue-500'
            }`}
          ></div>
        </div>
      </div>
    </div>
  );
}
