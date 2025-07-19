'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Product } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { formatPrice } from '@/lib/constants';
import { useAuth } from '@/contexts/AuthContext';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function ProductsLanding() {
  const t = useTranslations('storefront');
  const { user, isAdmin } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('is_active', true)
          .order('is_featured', { ascending: false }) // Featured products first
          .order('price', { ascending: true });

        if (error) {
          setError(t('loadError'));
          return;
        }

        setProducts(data || []);
      } catch {
        setError(t('unexpectedError'));
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [t]);

  const freeProducts = products.filter(p => p.price === 0);
  const paidProducts = products.filter(p => p.price > 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-300">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-white mb-2">{t('unableToLoad')}</h1>
          <p className="text-gray-300 mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            {t('tryAgain')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Navigation */}
      <nav className="relative z-10 bg-black/20 backdrop-blur-md border-b border-white/10 sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link href="/" className="flex items-center group">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center group-hover:shadow-lg group-hover:scale-105 transition-all">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <span className="ml-3 text-xl font-bold text-white group-hover:text-purple-200 transition-colors">
                  {t('navigation.gateflow')}
                </span>
              </Link>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-3">
              {/* Language Switcher */}
              <LanguageSwitcher />
              
              {user ? (
                <>
                  <Link
                    href="/my-products"
                    className="px-4 py-2 bg-purple-600/80 hover:bg-purple-600 backdrop-blur-sm text-white rounded-lg transition-all font-medium hover:scale-105 hover:shadow-lg"
                  >
                    {t('navigation.myProducts')}
                  </Link>
                  {isAdmin && (
                    <Link
                      href="/dashboard"
                      className="px-4 py-2 bg-blue-600/80 hover:bg-blue-600 backdrop-blur-sm text-white rounded-lg transition-all font-medium hover:scale-105 hover:shadow-lg"
                    >
                      {t('navigation.adminPanel')}
                    </Link>
                  )}
                </>
              ) : (
                <Link
                  href="/login"
                  className="px-4 py-2 bg-purple-600/80 hover:bg-purple-600 backdrop-blur-sm text-white rounded-lg transition-all font-medium hover:scale-105 hover:shadow-lg"
                >
                  {t('navigation.login')}
                </Link>
              )}
            </div>

            {/* Mobile Navigation */}
            <div className="md:hidden flex items-center space-x-2">
              {/* Language Switcher */}
              <LanguageSwitcher />
              
              {/* Mobile Menu Button */}
              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Toggle mobile menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        
        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-black/30 backdrop-blur-md border-t border-white/10">
            <div className="px-4 py-4 space-y-3">
              {user ? (
                <>
                  <Link
                    href="/my-products"
                    className="block px-4 py-2 text-center bg-purple-600/80 hover:bg-purple-600 text-white rounded-lg transition-all font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t('navigation.myProducts')}
                  </Link>
                  {isAdmin && (
                    <Link
                      href="/dashboard"
                      className="block px-4 py-2 text-center bg-blue-600/80 hover:bg-blue-600 text-white rounded-lg transition-all font-medium"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {t('navigation.adminPanel')}
                    </Link>
                  )}
                </>
              ) : (
                <Link
                  href="/login"
                  className="block px-4 py-2 text-center bg-purple-600/80 hover:bg-purple-600 text-white rounded-lg transition-all font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('navigation.login')}
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>
      
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 overflow-hidden">
        {/* Background aurora effect */}
        <div 
          className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_20%_20%,#3a2d5b_0%,transparent_40%),radial-gradient(circle_at_80%_70%,#0f3460_0%,transparent_40%)]"
          style={{ animation: 'aurora 20s infinite linear' }}
        />
        
        <style jsx>{`
          @keyframes aurora {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
        `}</style>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            {t('hero.title')}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400">
              {" "}{t('hero.titleHighlight')}
            </span>
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            {t('hero.subtitle')}
          </p>
          
          {products.length > 0 && (
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <div className="flex items-center px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-full">
                <svg className="w-5 h-5 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                <span className="text-green-300 font-medium">{t('hero.freeResources', { count: freeProducts.length })}</span>
              </div>
              
              {paidProducts.length > 0 && (
                <div className="flex items-center px-4 py-2 bg-purple-500/20 border border-purple-500/30 rounded-full">
                  <svg className="w-5 h-5 text-purple-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                  <span className="text-purple-300 font-medium">{t('hero.premiumSolutions', { count: paidProducts.length })}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Free Products Section */}
      {freeProducts.length > 0 && (
        <section className="py-16 relative z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                {t('freeSection.title')}
              </h2>
              <p className="text-lg text-gray-300 max-w-2xl mx-auto">
                {t('freeSection.subtitle')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {freeProducts.map((product) => (
                <div
                  key={product.id}
                  className="group bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all duration-300 hover:scale-105 hover:shadow-2xl relative overflow-hidden"
                >
                  {/* Featured badge */}
                  {product.is_featured && (
                    <div className="absolute top-4 right-4">
                      <div className="flex items-center px-3 py-1 bg-yellow-500/20 border border-yellow-500/30 rounded-full text-xs font-medium text-yellow-300">
                        <svg className="w-3 h-3 text-yellow-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        {t('freeSection.featured')}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center mb-4">
                    <div className="text-4xl mr-4">{product.icon}</div>
                    <div>
                      <h3 className="text-xl font-semibold text-white group-hover:text-green-300 transition-colors">
                        {product.name}
                      </h3>
                      <div className="flex items-center mt-1">
                        <span className="inline-flex items-center px-2 py-1 bg-green-500/20 border border-green-500/30 rounded text-xs font-medium text-green-300">
                          {t('freeSection.free')}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-gray-300 mb-6 min-h-[3rem]">
                    {product.description}
                  </p>
                  
                  <Link
                    href={`/p/${product.slug}`}
                    className="block w-full bg-green-600 hover:bg-green-700 text-white text-center font-semibold py-3 px-4 rounded-lg transition-all duration-200 hover:shadow-lg"
                  >
                    {t('freeSection.getFreeAccess')}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Premium Products Section */}
      {paidProducts.length > 0 && (
        <section className="py-16 relative z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                {t('premiumSection.title')}
              </h2>
              <p className="text-lg text-gray-300 max-w-2xl mx-auto">
                {t('premiumSection.subtitle')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {paidProducts.map((product) => (
                <div
                  key={product.id}
                  className="group bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all duration-300 hover:scale-105 hover:shadow-2xl relative overflow-hidden"
                >
                  {/* Premium badge */}
                  <div className="absolute top-4 right-4 flex flex-col gap-2">
                    <div className="flex items-center px-2 py-1 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-full">
                      <svg className="w-3 h-3 text-purple-400 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                      <span className="text-xs font-medium text-purple-300">{t('premiumSection.premium')}</span>
                    </div>
                    {product.is_featured && (
                      <div className="flex items-center px-3 py-1 bg-yellow-500/20 border border-yellow-500/30 rounded-full text-xs font-medium text-yellow-300">
                        <svg className="w-3 h-3 text-yellow-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        {t('premiumSection.featured')}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center mb-4">
                    <div className="text-4xl mr-4">{product.icon}</div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-white group-hover:text-purple-300 transition-colors">
                        {product.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="text-2xl font-bold text-purple-400">
                          {formatPrice(product.price, product.currency)}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-gray-300 mb-6 min-h-[3rem]">
                    {product.description}
                  </p>
                  
                  <Link
                    href={`/p/${product.slug}`}
                    className="block w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-center font-semibold py-3 px-4 rounded-lg transition-all duration-200 hover:shadow-lg"
                  >
                    {t('premiumSection.purchaseAccess')}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Empty State */}
      {products.length === 0 && (
        <section className="py-32 relative z-10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="text-6xl mb-8">📦</div>
            <h2 className="text-3xl font-bold text-white mb-4">
              {t('emptyState.title')}
            </h2>
            <p className="text-lg text-gray-300 mb-8">
              {t('emptyState.subtitle')}
            </p>
            <Link
              href="/"
              className="inline-flex items-center px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h14" />
              </svg>
              {t('emptyState.backToHome')}
            </Link>
          </div>
        </section>
      )}

      {/* Call to Action Section */}
      {products.length > 0 && (
        <section className="py-20 relative z-10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 backdrop-blur-md border border-purple-500/30 rounded-2xl p-8">
              <h2 className="text-3xl font-bold text-white mb-4">
                {t('cta.title')}
              </h2>
              <p className="text-lg text-gray-300 mb-8">
                {t('cta.subtitle')}
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {!user && (
                  <Link
                    href="/login"
                    className="inline-flex items-center px-8 py-4 bg-white text-purple-600 hover:bg-gray-100 rounded-lg font-semibold transition-colors"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    {t('cta.createAccount')}
                  </Link>
                )}
                
                <Link
                  href="/"
                  className="inline-flex items-center px-8 py-4 border border-white/30 text-white hover:bg-white/10 rounded-lg font-semibold transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {t('cta.learnMore')}
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="relative z-10 bg-black/30 backdrop-blur-md border-t border-white/10 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-white">{t('navigation.gateflow')}</span>
            </div>
            <div className="text-gray-400 text-sm">
              <p>{t('footer.copyright')}</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
