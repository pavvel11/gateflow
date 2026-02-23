import { getTranslations } from 'next-intl/server';
import { NumberCounter } from './motion/NumberCounter';

export async function SocialProofBar() {
  const t = await getTranslations('landing');

  const stats = [
    { value: '100%', label: t('socialProof.openSource') },
    { value: '$0', label: t('socialProof.monthlyFees') },
    { value: '∞', label: t('socialProof.products') },
    { value: 'MIT', label: t('socialProof.license') },
  ];

  return (
    <section className="relative py-12 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: [
            'radial-gradient(ellipse at 30% 50%, var(--gf-accent-glow) 0%, transparent 70%)',
            'radial-gradient(ellipse at 70% 50%, rgba(0,170,255,0.08) 0%, transparent 60%)',
            'var(--gf-bg-base)',
          ].join(', '),
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((stat) => (
            <div key={stat.value}>
              <NumberCounter
                value={stat.value}
                className="block text-4xl md:text-5xl font-black text-gf-heading mb-2"
              />
              <div className="text-sm md:text-base font-medium text-gf-muted">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
