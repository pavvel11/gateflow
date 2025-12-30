/**
 * Coupons Management Page Component
 * 
 * 🤖 AI MAINTAINER NOTE:
 * This component manages the lifecycle of discount codes (Smart Coupons).
 * Key features:
 * - List all coupons with stable sorting (created_at DESC, id ASC)
 * - Create/Edit coupons via CouponFormModal
 * - Frictionless auto-apply logic is handled separately in PaidProductForm
 * - Supports global, product-specific, and email-restricted coupons
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Coupon } from '@/types/coupon';
import { useToast } from '@/contexts/ToastContext';
import CouponFormModal from './CouponFormModal';
import { Product } from '@/types';
import { useTranslations } from 'next-intl';

const CouponsPageContent: React.FC = () => {
  const t = useTranslations('admin.coupons');
  const { addToast } = useToast();
  
  // State
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modals
  const [showForm, setShowForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [couponToDelete, setCouponToDelete] = useState<Coupon | null>(null);

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [couponsRes, productsRes] = await Promise.all([
        fetch('/api/admin/coupons'),
        fetch('/api/admin/products?limit=1000&status=active')
      ]);

      if (!couponsRes.ok) throw new Error('Failed to fetch coupons');
      if (!productsRes.ok) throw new Error('Failed to fetch products');

      const couponsData = await couponsRes.json();
      const productsData = await productsRes.json();

      setCoupons(couponsData);
      setProducts(productsData.products || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load coupons');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // CRUD Handlers
  const handleCreate = async (formData: any) => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create coupon');
      }

      await fetchData();
      setShowForm(false);
      addToast(t('createSuccess'), 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to create coupon', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (formData: any) => {
    if (!editingCoupon) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/coupons/${editingCoupon.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update coupon');
      }

      await fetchData();
      setShowForm(false);
      setEditingCoupon(null);
      addToast(t('updateSuccess'), 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to update coupon', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (coupon: Coupon) => {
    try {
      const res = await fetch(`/api/admin/coupons/${coupon.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete coupon');

      await fetchData();
      setCouponToDelete(null);
      addToast(t('deleteSuccess'), 'success');
    } catch (err) {
      addToast('Failed to delete coupon', 'error');
    }
  };

  const handleToggleActive = async (coupon: Coupon) => {
    try {
      const res = await fetch(`/api/admin/coupons/${coupon.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !coupon.is_active }),
      });

      if (!res.ok) throw new Error('Failed to toggle status');

      await fetchData();
      addToast(t('toggleSuccess', { status: t(!coupon.is_active ? 'activated' : 'deactivated') }), 'success');
    } catch (err) {
      addToast('Failed to update status', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">{t('description')}</p>
        </div>
        <button
          onClick={() => { setEditingCoupon(null); setShowForm(true); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>{t('create')}</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="text-center p-12 text-red-500">{error}</div>
        ) : coupons.length === 0 ? (
          <div className="text-center p-12 text-gray-500">{t('noCoupons')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">{t('code')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">{t('discount')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">{t('usage')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">{t('status')}</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {coupons.map((coupon) => (
                  <tr key={coupon.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4">
                      <div className="font-mono font-bold text-blue-600 dark:text-blue-400">{coupon.code}</div>
                      {coupon.name && <div className="text-xs text-gray-500">{coupon.name}</div>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {coupon.discount_type === 'percentage' 
                        ? `${coupon.discount_value}%` 
                        : `${coupon.discount_value} ${coupon.currency || t('allCurrencies')}`}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {t(coupon.usage_limit_global ? 'usageCount' : 'usageUnlimited', { 
                        current: coupon.current_usage_count, 
                        limit: coupon.usage_limit_global || 0
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleActive(coupon)}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          coupon.is_active 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                        }`}
                      >
                        {t(coupon.is_active ? 'active' : 'inactive')}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button onClick={() => { setEditingCoupon(coupon); setShowForm(true); }} className="text-blue-600 hover:text-blue-900 dark:text-blue-400">{t('edit')}</button>
                      <button onClick={() => setCouponToDelete(coupon)} className="text-red-600 hover:text-red-900 dark:text-red-400">{t('delete')}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {showForm && (
        <CouponFormModal
          products={products}
          editingCoupon={editingCoupon}
          onSubmit={editingCoupon ? handleUpdate : handleCreate}
          onClose={() => { setShowForm(false); setEditingCoupon(null); }}
          isSubmitting={isSubmitting}
        />
      )}
      
      {/* Delete Confirmation */}
      {couponToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">{t('confirmDelete')}</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {t('deleteMessage', { code: couponToDelete.code })}
            </p>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setCouponToDelete(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">{t('form.cancel')}</button>
              <button onClick={() => handleDelete(couponToDelete)} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">{t('delete')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CouponsPageContent;
