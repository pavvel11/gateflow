import { getTranslations } from 'next-intl/server';
import { Rocket, Link2, ShoppingBag } from 'lucide-react';
import { ScrollReveal } from './motion/ScrollReveal';
import { StaggerReveal } from './motion/StaggerReveal';

import type { LucideIcon } from 'lucide-react';

interface Step {
  icon: LucideIcon;
  key: string;
  number: string;
}

const steps: Step[] = [
  { icon: Rocket, key: 'step1', number: '01' },
  { icon: Link2, key: 'step2', number: '02' },
  { icon: ShoppingBag, key: 'step3', number: '03' },
];

export async function HowItWorks() {
  const t = await getTranslations('landing');

  return (
    <section className="py-24 md:py-32 bg-gf-base">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gf-heading mb-4">
            {t('howItWorks.title')}
          </h2>
          <p className="text-xl text-gf-body max-w-3xl mx-auto">
            {t('howItWorks.subtitle')}
          </p>
        </ScrollReveal>

        <StaggerReveal className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.key} className="text-center">
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gf-accent flex items-center justify-center shadow-[var(--gf-shadow-accent)]">
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <div className="text-sm font-bold text-gf-accent mb-2">
                  {step.number}
                </div>
                <h3 className="text-xl font-bold text-gf-heading mb-3">
                  {t(`howItWorks.${step.key}.title`)}
                </h3>
                <p className="text-gf-body leading-relaxed">
                  {t(`howItWorks.${step.key}.desc`)}
                </p>
              </div>
            );
          })}
        </StaggerReveal>
      </div>
    </section>
  );
}
