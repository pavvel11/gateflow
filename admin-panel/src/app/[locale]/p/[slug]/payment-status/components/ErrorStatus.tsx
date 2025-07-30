import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Product } from '../types';

interface ErrorStatusProps {
  product: Product;
  errorMessage: string;
}

export default function ErrorStatus({ product, errorMessage }: ErrorStatusProps) {
  const t = useTranslations('paymentStatus');
  const router = useRouter();

  return (
    <>
      <p className="text-gray-300 mb-6">{errorMessage}</p>
      
      <div className="space-y-4">
        <button
          onClick={() => router.push(`/p/${product.slug}`)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
        >
          {t('tryAgain')}
        </button>
        <p className="text-gray-400 text-sm">
          {t('havingTrouble')} <span className="text-blue-400 cursor-pointer hover:underline">{t('contactSupport')}</span>
        </p>
      </div>
    </>
  );
}
