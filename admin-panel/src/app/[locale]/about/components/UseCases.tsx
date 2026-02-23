import { getTranslations } from 'next-intl/server';
import { GraduationCap, Package, Gift } from 'lucide-react';
import { ScrollReveal } from './motion/ScrollReveal';
import { StaggerReveal } from './motion/StaggerReveal';

import type { LucideIcon } from 'lucide-react';

interface UseCase {
  icon: LucideIcon;
  key: string;
}

const useCases: UseCase[] = [
  { icon: GraduationCap, key: 'courses' },
  { icon: Package, key: 'digital' },
  { icon: Gift, key: 'leads' },
];

export async function UseCases() {
  const t = await getTranslations('landing');

  return (
    <section className="py-24 md:py-32 bg-gf-base">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gf-heading mb-4">
            {t('useCases.title')}
          </h2>
          <p className="text-xl text-gf-body max-w-3xl mx-auto">
            {t('useCases.subtitle')}
          </p>
        </ScrollReveal>

        <StaggerReveal className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {useCases.map((useCase) => {
            const Icon = useCase.icon;
            return (
              <div
                key={useCase.key}
                className="p-8 rounded-2xl bg-gf-raised/60 backdrop-blur-sm border border-gf-border shadow-[var(--gf-shadow)] hover:shadow-[var(--gf-shadow-accent)] hover:border-gf-border-accent transition-[border-color,box-shadow] duration-300"
              >
                <div className="w-14 h-14 bg-gf-accent-soft rounded-2xl flex items-center justify-center mb-6">
                  <Icon className="w-7 h-7 text-gf-accent" />
                </div>
                <h3 className="text-xl font-bold text-gf-heading mb-3">
                  {t(`useCases.${useCase.key}.title`)}
                </h3>
                <p className="text-gf-body mb-6 leading-relaxed">
                  {t(`useCases.${useCase.key}.desc`)}
                </p>
                <ul className="space-y-2">
                  {(['feature1', 'feature2', 'feature3'] as const).map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-gf-body">
                      <span className="w-1.5 h-1.5 rounded-full bg-gf-accent shrink-0" />
                      {t(`useCases.${useCase.key}.${feature}`)}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </StaggerReveal>
      </div>
    </section>
  );
}
