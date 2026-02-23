import { getTranslations } from 'next-intl/server';
import { Heart, Coffee } from 'lucide-react';
import { ScrollReveal } from './motion/ScrollReveal';

export async function DonateSection() {
  const t = await getTranslations('landing');

  return (
    <section className="relative py-20 md:py-28 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: [
            'radial-gradient(ellipse at 50% 50%, var(--gf-accent-glow) 0%, transparent 60%)',
            'var(--gf-bg-base)',
          ].join(', '),
        }}
      />

      <ScrollReveal className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        <Heart className="w-12 h-12 text-gf-accent mx-auto mb-6" />

        <h2 className="text-3xl md:text-4xl font-bold text-gf-heading mb-4">
          {t('donate.title')}
        </h2>
        <p className="text-lg text-gf-body mb-8 max-w-2xl mx-auto">
          {t('donate.subtitle')}
        </p>

        <a
          href="#"
          className="inline-flex items-center px-8 py-4 rounded-xl text-lg font-bold text-white bg-gf-accent hover:bg-gf-accent-hover shadow-[var(--gf-shadow-accent)] hover:shadow-[0_6px_40px_-4px_var(--gf-accent-glow)] transition-[background-color,box-shadow] duration-200 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gf-accent gap-3"
        >
          <Coffee className="h-5 w-5" />
          {t('donate.cta')}
        </a>

        <p className="text-sm text-gf-muted mt-4">
          {t('donate.note')}
        </p>
      </ScrollReveal>
    </section>
  );
}
