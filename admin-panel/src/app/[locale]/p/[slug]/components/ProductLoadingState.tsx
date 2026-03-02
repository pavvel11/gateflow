import { useTranslations } from 'next-intl';
import FloatingToolbar from '@/components/FloatingToolbar';

export default function ProductLoadingState() {
  const t = useTranslations('productView');

  return (
    <div className="flex justify-center items-center min-h-screen bg-sf-deep">
      {/* Unified Floating Toolbar */}
      <FloatingToolbar position="top-right" />

      <div className="max-w-4xl mx-auto p-8 bg-sf-raised/80 border border-sf-border rounded-2xl shadow-[var(--sf-shadow-accent)]">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-sf-accent border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-sf-heading">{t('loading')}</p>
        </div>
      </div>
    </div>
  );
}
