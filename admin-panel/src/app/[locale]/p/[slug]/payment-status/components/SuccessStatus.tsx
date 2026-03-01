import { useTranslations } from 'next-intl';
import { Product, WindowDimensions } from '../types';

interface SuccessStatusProps {
  product: Product;
  windowDimensions: WindowDimensions;
  countdown: number;
}

export default function SuccessStatus({ 
  product, 
  countdown
}: SuccessStatusProps) {
  const t = useTranslations('paymentStatus');

  return (
    <>
      <p className="text-sf-body mb-6">
        {t('accessGrantedToProduct', { productName: product.name })}
      </p>
      <div className="text-6xl font-bold text-sf-heading tabular-nums">{countdown}</div>
      <p className="text-sf-muted mt-2">{t('redirectingToProduct')}</p>
    </>
  );
}
