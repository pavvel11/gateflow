import { useTranslations } from 'next-intl';
import { Product } from '@/types';
import FloatingToolbar from '@/components/FloatingToolbar';
import WaitlistForm from '@/components/WaitlistForm';

interface ProductInactiveStateProps {
  product: Product;
}

export default function ProductInactiveState({ product }: ProductInactiveStateProps) {
  const t = useTranslations('productView');

  // If waitlist is enabled, show the waitlist form
  if (product.enable_waitlist) {
    return (
      <div>
        <FloatingToolbar position="top-right" />
        <WaitlistForm product={product} unavailableReason="inactive" />
      </div>
    );
  }

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
        <div className="text-4xl mb-4">⚠️</div>
        <h2 className="text-2xl font-semibold text-white mb-2">{t('productInactiveTitle')}</h2>
        <p className="text-gray-400 mb-6">{t('productInactiveMessage')}</p>
      </div>
    </div>
  );
}
