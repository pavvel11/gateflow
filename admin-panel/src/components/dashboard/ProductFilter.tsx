'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getProductsList, ProductListItem } from '@/lib/actions/products';
import { useTranslations } from 'next-intl';

export default function ProductFilter() {
  const t = useTranslations('common');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>(searchParams.get('productId') || '');

  useEffect(() => {
    async function loadProducts() {
      const data = await getProductsList();
      setProducts(data);
    }
    loadProducts();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const productId = e.target.value;
    setSelectedProduct(productId);
    
    const params = new URLSearchParams(searchParams.toString());
    if (productId) {
      params.set('productId', productId);
    } else {
      params.delete('productId');
    }
    
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="relative">
      <select
        value={selectedProduct}
        onChange={handleChange}
        className="appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 py-2 pl-3 pr-8 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
      >
        <option value="">{t('allProducts', { defaultValue: 'All Products' })}</option>
        {products.map((product) => (
          <option key={product.id} value={product.id}>
            {product.name}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500 dark:text-gray-400">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}
