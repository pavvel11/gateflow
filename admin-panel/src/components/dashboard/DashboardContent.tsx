'use client';

import StatsOverview from '@/components/StatsOverview';
import RecentActivity from '@/components/RecentActivity';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

interface DashboardContentProps {
  failedWebhooksCount: number;
}

export default function DashboardContent({ failedWebhooksCount }: DashboardContentProps) {
  const t = useTranslations('admin.dashboard');

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t('title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          {t('welcome')}
        </p>
      </div>
      
      {/* Webhook Failures Alert */}
      {failedWebhooksCount > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 dark:border-red-600 p-4 rounded-r-lg shadow-sm">
          <div className="flex justify-between items-center">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400 dark:text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700 dark:text-red-200 font-medium">
                  {t('webhookFailuresAlert', { count: failedWebhooksCount })}
                </p>
              </div>
            </div>
            <Link 
              href="/dashboard/webhooks" 
              className="text-sm font-bold text-red-700 dark:text-red-300 hover:text-red-600 dark:hover:text-red-200 whitespace-nowrap ml-4 flex items-center bg-white/50 dark:bg-black/20 px-3 py-1.5 rounded-md hover:bg-white/80 transition-colors"
            >
              {t('fixNow')} <span aria-hidden="true" className="ml-1">&rarr;</span>
            </Link>
          </div>
        </div>
      )}
      
      <StatsOverview />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            {t('quickActions')}
          </h2>
          <div className="space-y-3">
            <Link
              href="/dashboard/products"
              className="block p-4 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30 transition-all"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">{t('createProduct')}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('createProductDescription')}</p>
                </div>
              </div>
            </Link>
            
            <Link
              href="/dashboard/users"
              className="block p-4 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 hover:from-green-100 hover:to-emerald-100 dark:hover:from-green-900/30 dark:hover:to-emerald-900/30 transition-all"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">{t('manageUsers')}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('manageUsersDescription')}</p>
                </div>
              </div>
            </Link>
          </div>
        </div>
        
        <RecentActivity />
      </div>
    </div>
  );
}
