import { useTranslations } from 'next-intl';
import { Product } from '@/types';
import FloatingToolbar from '@/components/FloatingToolbar';

interface ProductTemporalStateProps {
  product: Product;
}

export default function ProductTemporalState({ product }: ProductTemporalStateProps) {
  const t = useTranslations('productView');
  
  const now = new Date();
  const availableFrom = product.available_from ? new Date(product.available_from) : null;
  const availableUntil = product.available_until ? new Date(product.available_until) : null;
  const isNotYetAvailable = availableFrom && availableFrom > now;
  const isExpired = availableUntil && availableUntil < now;

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Unified Floating Toolbar */}
      <FloatingToolbar position="top-right" />
      
      <div className="max-w-4xl mx-auto p-8 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl text-center">
        {/* Product Header */}
        <div className="text-6xl mb-4">{product.icon || '📦'}</div>
        <h1 className="text-3xl font-bold text-white mb-2">{product.name}</h1>
        {product.description && (
          <p className="text-gray-300 mb-6 max-w-2xl mx-auto">{product.description}</p>
        )}
        <div className="text-xl font-semibold text-blue-300 mb-8">
          {product.price === 0 ? 'FREE' : `$${product.price}`}
        </div>
        
        {/* Status Message */}
        <div className="text-4xl mb-4">⏰</div>
        <h2 className="text-2xl font-semibold text-white mb-2">
          {isNotYetAvailable ? t('comingSoon') : t('offerExpired')}
        </h2>
        <p className="text-gray-400 mb-6">
          {isNotYetAvailable ? t('comingSoonMessage') : t('offerExpiredMessage')}
        </p>
        
        {/* Date Information */}
        {availableFrom && isNotYetAvailable && (
          <div className="bg-blue-800/30 border border-blue-500/30 rounded-lg p-4 text-blue-200 mb-6">
            <p className="text-sm">Available from: {availableFrom.toLocaleDateString()}</p>
          </div>
        )}
        
        {availableUntil && isExpired && (
          <div className="bg-red-800/30 border border-red-500/30 rounded-lg p-4 text-red-200 mb-6">
            <p className="text-sm">Was available until: {availableUntil.toLocaleDateString()}</p>
          </div>
        )}
        
        {isExpired && (
          <div className="bg-red-800/30 border border-red-500/30 rounded-lg p-4 text-red-200">
            <p className="text-sm">{t('previousAccessNote')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
