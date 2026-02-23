import { getTranslations } from 'next-intl/server';
import { ExternalLink, Play } from 'lucide-react';
import { ScrollReveal } from './motion/ScrollReveal';

export async function DemoSection() {
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
        <h2 className="text-3xl md:text-4xl font-bold text-gf-heading mb-4">
          {t('demo.title')}
        </h2>
        <p className="text-lg text-gf-body mb-8 max-w-2xl mx-auto">
          {t('demo.subtitle')}
        </p>

        <a
          href="https://gateflow.cytr.us/login"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-8 py-4 rounded-xl text-lg font-bold text-white bg-gf-accent hover:bg-gf-accent-hover shadow-[var(--gf-shadow-accent)] hover:shadow-[0_6px_40px_-4px_var(--gf-accent-glow)] transition-[background-color,box-shadow] duration-200 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gf-accent gap-3"
        >
          <Play className="h-5 w-5" />
          {t('demo.cta')}
          <ExternalLink className="h-5 w-5" />
        </a>

        <p className="text-sm text-gf-muted mt-4">
          Stripe test mode — no real charges
        </p>
      </ScrollReveal>
    </section>
  );
}
