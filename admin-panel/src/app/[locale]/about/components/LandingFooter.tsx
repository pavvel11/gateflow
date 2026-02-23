import { getTranslations } from 'next-intl/server';
import { Github } from 'lucide-react';
import Link from 'next/link';

export async function LandingFooter() {
  const t = await getTranslations('landing');

  return (
    <footer className="bg-gf-deep text-gf-muted py-16 border-t border-gf-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div>
            <p className="text-lg font-bold text-gf-heading mb-4">GateFlow</p>
            <p className="text-sm text-gf-muted mb-4">
              {t('footer.description')}
            </p>
            <a
              href="https://github.com/jurczykpawel/gateflow"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex text-gf-muted hover:text-gf-heading transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gf-accent rounded"
            >
              <Github className="h-5 w-5" />
            </a>
          </div>

          {/* Product */}
          <div>
            <p className="text-sm font-semibold text-gf-heading mb-4 uppercase tracking-wider">
              {t('footer.product')}
            </p>
            <nav className="space-y-1">
              <a
                href="#features"
                className="block text-sm text-gf-muted hover:text-gf-heading transition-colors duration-200 py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gf-accent rounded"
              >
                {t('footer.features')}
              </a>
              <a
                href="https://github.com/jurczykpawel/gateflow#readme"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-gf-muted hover:text-gf-heading transition-colors duration-200 py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gf-accent rounded"
              >
                {t('footer.documentation')}
              </a>
              <Link
                href="/store"
                className="block text-sm text-gf-muted hover:text-gf-heading transition-colors duration-200 py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gf-accent rounded"
              >
                {t('footer.products')}
              </Link>
            </nav>
          </div>

          {/* Resources */}
          <div>
            <p className="text-sm font-semibold text-gf-heading mb-4 uppercase tracking-wider">
              {t('footer.resources')}
            </p>
            <nav className="space-y-1">
              <a
                href="https://github.com/jurczykpawel/gateflow"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-gf-muted hover:text-gf-heading transition-colors duration-200 py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gf-accent rounded"
              >
                {t('footer.github')}
              </a>
              <a
                href="https://github.com/jurczykpawel/gateflow#deployment"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-gf-muted hover:text-gf-heading transition-colors duration-200 py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gf-accent rounded"
              >
                {t('footer.deployGuide')}
              </a>
              <a
                href="https://github.com/jurczykpawel/gateflow/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-gf-muted hover:text-gf-heading transition-colors duration-200 py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gf-accent rounded"
              >
                {t('footer.support')}
              </a>
            </nav>
          </div>

          {/* Legal */}
          <div>
            <p className="text-sm font-semibold text-gf-heading mb-4 uppercase tracking-wider">
              {t('footer.legal')}
            </p>
            <nav className="space-y-1">
              <a
                href="https://github.com/jurczykpawel/gateflow/blob/main/LICENSE"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-gf-muted hover:text-gf-heading transition-colors duration-200 py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gf-accent rounded"
              >
                {t('footer.licenseMIT')}
              </a>
              <Link
                href="/privacy"
                className="block text-sm text-gf-muted hover:text-gf-heading transition-colors duration-200 py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gf-accent rounded"
              >
                {t('footer.privacy')}
              </Link>
              <Link
                href="/terms"
                className="block text-sm text-gf-muted hover:text-gf-heading transition-colors duration-200 py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gf-accent rounded"
              >
                {t('footer.terms')}
              </Link>
            </nav>
          </div>
        </div>

        <div className="border-t border-gf-border pt-8">
          <p className="text-center text-sm text-gf-muted">
            {t('footer.copyright', { year: new Date().getFullYear() })}
          </p>
        </div>
      </div>
    </footer>
  );
}
