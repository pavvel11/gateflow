'use client';

import { Product } from '@/types';
import { useProductAccess } from '@/hooks/useProductAccess';
import ProductAccessView from './ProductAccessView';
import ProductLoadingState from './ProductLoadingState';
import ProductInactiveState from './ProductInactiveState';
import ProductTemporalState from './ProductTemporalState';
import ProductExpiredState from './ProductExpiredState';
import FloatingToolbar from '@/components/FloatingToolbar';

interface ProductViewProps {
  product: Product;
}

export default function ProductView({ product }: ProductViewProps) {
  const { accessData, loading } = useProductAccess(product);

  // Loading state - show loading while checking access
  if (loading) {
    return <ProductLoadingState />;
  }

  // Check if user has access
  if (accessData?.hasAccess) {
    return (
      <div>
        {/* Unified Floating Toolbar */}
        <FloatingToolbar position="top-right" />
        
        <ProductAccessView product={product} />
      </div>
    );
  }

  // Handle different reasons for lack of access
  if (accessData && !accessData.hasAccess) {
    switch (accessData.reason) {
      case 'inactive':
        return <ProductInactiveState product={product} />;
      
      case 'temporal':
        return <ProductTemporalState product={product} />;
      
      case 'expired':
        return <ProductExpiredState product={product} />;
      
      default:
        // This includes 'no_access' case - should redirect to checkout
        // but if we're here it means redirect didn't work, so show fallback
        break;
    }
  }

  // Fallback for edge cases or while waiting for redirect
  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Unified Floating Toolbar */}
      <FloatingToolbar position="top-right" />
      
      <div className="max-w-4xl mx-auto p-8 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl text-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-white">Redirecting...</p>
      </div>
    </div>
  );
}
