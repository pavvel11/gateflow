// components/admin/PaymentStatsCards.tsx
// Payment statistics cards for admin dashboard

'use client';

import { useTranslations } from 'next-intl';

interface PaymentStats {
  totalTransactions: number;
  totalRevenue: number;
  pendingSessions: number;
  refundedAmount: number;
  todayRevenue: number;
  thisMonthRevenue: number;
}

interface PaymentStatsCardsProps {
  stats: PaymentStats;
}

export default function PaymentStatsCards({ stats }: PaymentStatsCardsProps) {
  const t = useTranslations('admin.payments.stats');
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD', // You can make this dynamic based on your needs
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const statsCards = [
    {
      title: t('totalRevenue'),
      value: formatCurrency(stats.totalRevenue),
      icon: '💰',
      color: 'bg-green-500',
      change: '+12.5%',
      changeType: 'positive' as const,
    },
    {
      title: t('totalTransactions'),
      value: formatNumber(stats.totalTransactions),
      icon: '📊',
      color: 'bg-blue-500',
      change: '+8.2%',
      changeType: 'positive' as const,
    },
    {
      title: t('todayRevenue'),
      value: formatCurrency(stats.todayRevenue),
      icon: '📈',
      color: 'bg-purple-500',
      change: '+15.3%',
      changeType: 'positive' as const,
    },
    {
      title: t('pendingSessions'),
      value: formatNumber(stats.pendingSessions),
      icon: '⏳',
      color: 'bg-yellow-500',
      change: stats.pendingSessions > 10 ? t('high') : t('normal'),
      changeType: stats.pendingSessions > 10 ? 'warning' : 'neutral' as const,
    },
    {
      title: t('thisMonthRevenue'),
      value: formatCurrency(stats.thisMonthRevenue),
      icon: '📅',
      color: 'bg-indigo-500',
      change: '+22.1%',
      changeType: 'positive' as const,
    },
    {
      title: t('refundedAmount'),
      value: formatCurrency(stats.refundedAmount),
      icon: '↩️',
      color: 'bg-red-500',
      change: '-2.1%',
      changeType: 'negative' as const,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {statsCards.map((card, index) => (
        <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {card.title}
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
                {card.value}
              </p>
            </div>
            <div className={`w-12 h-12 ${card.color} rounded-lg flex items-center justify-center text-white text-xl`}>
              {card.icon}
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <span className={`text-sm font-medium ${
              card.changeType === 'positive' 
                ? 'text-green-600 dark:text-green-400'
                : card.changeType === 'negative'
                ? 'text-red-600 dark:text-red-400'
                : card.changeType === 'warning'
                ? 'text-yellow-600 dark:text-yellow-400'
                : 'text-gray-600 dark:text-gray-400'
            }`}>
              {card.change}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
              {t('vsLastPeriod')}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
