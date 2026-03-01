import { useTranslations } from 'next-intl';

export default function ProcessingStatus() {
  const t = useTranslations('paymentStatus');

  return (
    <>
      <div className="animate-spin h-8 w-8 border-4 border-gf-accent border-t-transparent rounded-full mx-auto mb-4"></div>
      <p className="text-gf-body">{t('pleaseWaitVerifying')}</p>
    </>
  );
}
