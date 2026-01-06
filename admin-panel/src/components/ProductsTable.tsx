'use client';

import React from 'react';
import { Product } from '@/types';
import { formatPrice } from '@/lib/constants';
import { formatUTCForDisplay } from '@/lib/timezone';
import Pagination from './Pagination';
import { getIconEmoji } from '@/utils/themeUtils';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { useToast } from '@/contexts/ToastContext';

interface ProductsTableProps {
  products: Product[];
  loading: boolean;
  error: string | null;
  onEditProduct: (product: Product) => void;
  onDuplicateProduct: (product: Product) => void;
  onDeleteProduct: (product: Product) => void;
  onPreviewProduct: (product: Product) => void;
  onPreviewRedirect: (product: Product) => void;
  onGenerateCode: (product: Product) => void;
  onToggleStatus: (productId: string, currentStatus: boolean) => void;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSort: (column: string) => void;
}

const ProductsTable: React.FC<ProductsTableProps> = ({
  products,
  loading,
  error,
  onEditProduct,
  onDuplicateProduct,
  onDeleteProduct,
  onPreviewProduct,
  onPreviewRedirect,
  onGenerateCode,
  onToggleStatus,
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
  limit,
  sortBy,
  sortOrder,
  onSort,
}) => {
  const t = useTranslations('admin.products');
  const locale = useLocale();
  const { addToast } = useToast();
  const startIndex = (currentPage - 1) * limit + 1;
  const endIndex = Math.min(startIndex + products.length - 1, totalItems);

  const SortableHeader = ({ column, title, className = "" }: { column: string; title: string; className?: string }) => (
    <th
      scope="col"
      className={`px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer whitespace-nowrap ${className}`}
      onClick={() => onSort(column)}
    >
      <div className="flex items-center">
        <span>{title}</span>
        {sortBy === column && (
          <span className="ml-1 flex-shrink-0">
            {sortOrder === 'asc' ? '▲' : '▼'}
          </span>
        )}
      </div>
    </th>
  );

  if (loading) {
    return (
      <div className="text-center py-10">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">{t('loadingProducts')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg" role="alert">
        <strong className="font-bold">{t('error')}:</strong>
        <span className="block sm:inline"> {error}</span>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{t('noProducts')}</h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {t('noProductsMessage')}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
          <div className="shadow-lg overflow-hidden border-b border-gray-200 dark:border-gray-700 sm:rounded-lg bg-white dark:bg-gray-800">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <SortableHeader column="name" title={t('name')} />
                  <SortableHeader column="price" title={t('price')} />
                  <SortableHeader column="is_active" title={t('status')} />
                  <SortableHeader column="available_from" title={t('availableFrom')} className="hidden 2xl:table-cell" />
                  <SortableHeader column="available_until" title={t('availableUntil')} className="hidden 2xl:table-cell" />
                  <SortableHeader column="auto_grant_duration_days" title={t('autoDuration')} className="hidden 2xl:table-cell" />
                  <SortableHeader column="created_at" title={t('createdAt')} className="hidden xl:table-cell" />
                  <th scope="col" className="relative px-3 py-3">
                    <span className="sr-only">{t('actions')}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
                    <td className="px-3 py-4">
                      <div className="flex items-center max-w-[300px]">
                        <div className="flex-shrink-0 h-8 w-8">
                          <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-lg">
                            {product.icon?.length === 2 || product.icon?.match(/\p{Emoji}/u) ? product.icon : getIconEmoji(product.icon)}
                          </div>
                        </div>
                        <div className="ml-3 min-w-0 flex-1 overflow-hidden">
                          <div className="flex items-center gap-1">
                            <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{product.name}</div>
                            {product.is_featured && (
                              <span
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 flex-shrink-0"
                                title={t('featuredProduct')}
                              >
                                ⭐
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{product.slug}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(product.id);
                                addToast(t('idCopied'), 'success', 2000);
                              }}
                              className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] font-mono text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                              title={`${t('copyId')}: ${product.id}`}
                            >
                              <span className="hidden sm:inline">{product.id.slice(0, 8)}...</span>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-center">
                      {product.price === 0 ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-700 dark:text-blue-100">
                          {t('free')}
                        </span>
                      ) : (
                        <div className="text-sm text-gray-900 dark:text-white">{formatPrice(product.price, product.currency)}</div>
                      )}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => onToggleStatus(product.id, product.is_active)}
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full cursor-pointer transition-colors hover:opacity-80 ${
                          product.is_active
                            ? 'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-100'
                            : 'bg-red-100 text-red-800 dark:bg-red-700 dark:text-red-100'
                        }`}
                      >
                        {product.is_active ? t('active') : t('inactive')}
                      </button>
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 hidden 2xl:table-cell whitespace-nowrap">
                      {product.available_from ? formatUTCForDisplay(product.available_from, {
                        year: '2-digit',
                        month: 'short',
                        day: 'numeric'
                      }) : '-'}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 hidden 2xl:table-cell whitespace-nowrap">
                      {product.available_until ? formatUTCForDisplay(product.available_until, {
                        year: '2-digit',
                        month: 'short',
                        day: 'numeric'
                      }) : '-'}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 hidden 2xl:table-cell text-center whitespace-nowrap">
                      {product.auto_grant_duration_days ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                          {product.auto_grant_duration_days}d
                        </span>
                      ) : (
                        <span className="text-gray-400">∞</span>
                      )}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 hidden xl:table-cell whitespace-nowrap">
                      {formatUTCForDisplay(product.created_at, {
                        year: '2-digit',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                    <td className="px-3 py-4 text-right text-sm font-medium whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-1">
                        <button 
                          onClick={() => onGenerateCode(product)}
                          className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors p-1"
                          aria-label={t('generateCodeLabel', { name: product.name })}
                          title={t('generateCode')}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                          </svg>
                        </button>
                        <button
                          onClick={() => onPreviewProduct(product)}
                          className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 transition-colors p-1"
                          aria-label={t('previewLabel', { name: product.name })}
                          title={t('preview')}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => onPreviewRedirect(product)}
                          className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300 transition-colors p-1 hidden sm:block"
                          aria-label={t('previewRedirectLabel', { name: product.name })}
                          title={t('previewRedirect')}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </button>
                        <button
                          onClick={() => onEditProduct(product)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors p-1"
                          aria-label={t('editLabel', { name: product.name })}
                          title={t('edit')}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z"></path>
                          </svg>
                        </button>
                        <button
                          onClick={() => onDuplicateProduct(product)}
                          className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 transition-colors p-1"
                          aria-label={t('duplicateLabel', { name: product.name })}
                          title={t('duplicate')}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => onDeleteProduct(product)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors p-1"
                          aria-label={t('deleteLabel', { name: product.name })}
                          title={t('delete')}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-3 sm:px-6 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  {t('showing')} <span className="font-medium">{startIndex}</span> {t('to')} <span className="font-medium">{endIndex}</span> {t('of')} <span className="font-medium">{totalItems}</span> {t('results')}
                </div>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={onPageChange}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductsTable;