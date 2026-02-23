import { getTranslations } from 'next-intl/server';
import { ScrollReveal } from './motion/ScrollReveal';
import { StaggerReveal } from './motion/StaggerReveal';

const techs = ['nextjs', 'supabase', 'stripe', 'tailwind', 'typescript', 'docker', 'postgresql', 'bunny'] as const;

export async function TechStackGrid() {
  const t = await getTranslations('landing');

  return (
    <section className="py-24 md:py-32 bg-gf-deep">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gf-heading mb-4">
            {t('techStack.title')}
          </h2>
          <p className="text-xl text-gf-body max-w-3xl mx-auto">
            {t('techStack.subtitle')}
          </p>
        </ScrollReveal>

        <StaggerReveal className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {techs.map((tech) => (
            <div
              key={tech}
              className="p-6 rounded-2xl bg-gf-raised/60 backdrop-blur-sm border border-gf-border text-center hover:border-gf-border-accent hover:shadow-[var(--gf-shadow-accent)] transition-[border-color,box-shadow] duration-300"
            >
              <p className="text-base font-bold text-gf-heading mb-1">
                {t(`techStack.${tech}.name`)}
              </p>
              <p className="text-xs text-gf-muted">
                {t(`techStack.${tech}.desc`)}
              </p>
            </div>
          ))}
        </StaggerReveal>

        <div className="text-center mt-12">
          <a
            href="https://github.com/jurczykpawel/gateflow"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-gf-accent hover:text-gf-accent-hover transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gf-accent rounded"
          >
            {t('techStack.viewStack')}
          </a>
        </div>
      </div>
    </section>
  );
}
