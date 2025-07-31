import { useTranslations } from 'next-intl';
import FloatingToolbar from '@/components/FloatingToolbar';

export default function ProductLoadingState() {
  const t = useTranslations('productView');

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Unified Floating Toolbar */}
      <FloatingToolbar position="top-right" />
      
      <div className="max-w-4xl mx-auto p-8 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-white">{t('loading')}</p>
        </div>
      </div>
    </div>
  );
}
