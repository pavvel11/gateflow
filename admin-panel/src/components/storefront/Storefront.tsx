'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Product } from '@/types';
import { formatPrice } from '@/lib/constants';

interface StorefrontProps {
  products: Product[];
  shopName: string;
  featuredProducts: Product[];
  freeProducts: Product[];
  paidProducts: Product[];
}

export default function Storefront({
  products,
  shopName,
  featuredProducts,
  freeProducts,
  paidProducts,
}: StorefrontProps) {
  const t = useTranslations('storefront');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Hero Section */}
      <section className="relative pt-20 pb-16 overflow-hidden">
        {/* Background aurora effect */}
        <div
          className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_20%_20%,#3a2d5b_0%,transparent_40%),radial-gradient(circle_at_80%_70%,#0f3460_0%,transparent_40%)]"
          style={{ animation: 'aurora 20s infinite linear' }}
        />

        <style jsx>{`
          @keyframes aurora {
            0% {
              background-position: 0% 50%;
            }
            50% {
              background-position: 100% 50%;
            }
            100% {
              background-position: 0% 50%;
            }
          }
        `}</style>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          {/* Shop Name Badge */}
          <div className="mb-6 inline-block">
            <div className="px-6 py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full">
              <span className="text-sm font-medium text-gray-300">{shopName}</span>
            </div>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            {t('hero.welcome', { shopName })}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400">
              {" "}
              {t('hero.defaultTagline')}
            </span>
          </h1>

          {products.length > 0 && (
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              {freeProducts.length > 0 && (
                <div className="flex items-center px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-full">
                  <svg
                    className="w-5 h-5 text-green-400 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                    />
                  </svg>
                  <span className="text-green-300 font-medium">
                    {freeProducts.length}{' '}
                    {freeProducts.length === 1 ? 'Free Resource' : 'Free Resources'}
                  </span>
                </div>
              )}

              {paidProducts.length > 0 && (
                <div className="flex items-center px-4 py-2 bg-purple-500/20 border border-purple-500/30 rounded-full">
                  <svg
                    className="w-5 h-5 text-purple-400 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                    />
                  </svg>
                  <span className="text-purple-300 font-medium">
                    {paidProducts.length}{' '}
                    {paidProducts.length === 1 ? 'Premium Product' : 'Premium Products'}
                  </span>
                </div>
              )}
            </div>
          )}

          <Link
            href="/products"
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            {t('sections.viewAll')}
            <svg
              className="w-5 h-5 ml-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </Link>
        </div>
      </section>

      {/* Featured Products Section */}
      {featuredProducts.length > 0 && (
        <section className="py-16 relative z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                {t('featured.title')}
              </h2>
              <p className="text-lg text-gray-300 max-w-2xl mx-auto">
                {t('featured.subtitle')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredProducts.slice(0, 3).map((product) => (
                <div
                  key={product.id}
                  className="group bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all duration-300 hover:scale-105 hover:shadow-2xl relative overflow-hidden"
                >
                  {/* Featured badge */}
                  <div className="absolute top-4 right-4">
                    <div className="flex items-center px-3 py-1 bg-yellow-500/20 border border-yellow-500/30 rounded-full text-xs font-medium text-yellow-300">
                      <svg
                        className="w-3 h-3 text-yellow-400 mr-1"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      Featured
                    </div>
                  </div>

                  <div className="flex items-center mb-4">
                    <div className="text-4xl mr-4">{product.icon || '📦'}</div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-white group-hover:text-purple-300 transition-colors">
                        {product.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        {product.price === 0 ? (
                          <span className="inline-flex items-center px-2 py-1 bg-green-500/20 border border-green-500/30 rounded text-xs font-medium text-green-300">
                            Free
                          </span>
                        ) : (
                          <div className="text-2xl font-bold text-purple-400">
                            {formatPrice(product.price, product.currency)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <p className="text-gray-300 mb-6 min-h-[3rem]">{product.description}</p>

                  <Link
                    href={`/p/${product.slug}`}
                    className={`block w-full text-white text-center font-semibold py-3 px-4 rounded-lg transition-all duration-200 hover:shadow-lg ${
                      product.price === 0
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                    }`}
                  >
                    {product.price === 0 ? 'Get Free Access' : 'Purchase Access'}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Free Products Section */}
      {freeProducts.length > 0 && (
        <section className="py-16 relative z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Free Resources
              </h2>
              <p className="text-lg text-gray-300 max-w-2xl mx-auto">
                Start learning today with our free content
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {freeProducts.slice(0, 3).map((product) => (
                <div
                  key={product.id}
                  className="group bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all duration-300 hover:scale-105 hover:shadow-2xl relative overflow-hidden"
                >
                  <div className="flex items-center mb-4">
                    <div className="text-4xl mr-4">{product.icon || '📦'}</div>
                    <div>
                      <h3 className="text-xl font-semibold text-white group-hover:text-green-300 transition-colors">
                        {product.name}
                      </h3>
                      <div className="flex items-center mt-1">
                        <span className="inline-flex items-center px-2 py-1 bg-green-500/20 border border-green-500/30 rounded text-xs font-medium text-green-300">
                          Free
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-gray-300 mb-6 min-h-[3rem]">{product.description}</p>

                  <Link
                    href={`/p/${product.slug}`}
                    className="block w-full bg-green-600 hover:bg-green-700 text-white text-center font-semibold py-3 px-4 rounded-lg transition-all duration-200 hover:shadow-lg"
                  >
                    Get Free Access
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
                Premium Products
              </h2>
              <p className="text-lg text-gray-300 max-w-2xl mx-auto">
                Unlock exclusive content and advanced features
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {paidProducts.slice(0, 3).map((product) => (
                <div
                  key={product.id}
                  className="group bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all duration-300 hover:scale-105 hover:shadow-2xl relative overflow-hidden"
                >
                  {/* Premium badge */}
                  <div className="absolute top-4 right-4">
                    <div className="flex items-center px-2 py-1 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-full">
                      <svg
                        className="w-3 h-3 text-purple-400 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                        />
                      </svg>
                      <span className="text-xs font-medium text-purple-300">Premium</span>
                    </div>
                  </div>

                  <div className="flex items-center mb-4">
                    <div className="text-4xl mr-4">{product.icon || '📦'}</div>
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

                  <p className="text-gray-300 mb-6 min-h-[3rem]">{product.description}</p>

                  <Link
                    href={`/p/${product.slug}`}
                    className="block w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-center font-semibold py-3 px-4 rounded-lg transition-all duration-200 hover:shadow-lg"
                  >
                    Purchase Access
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-20 relative z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 backdrop-blur-md border border-purple-500/30 rounded-2xl p-8">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-lg text-gray-300 mb-8">
              Browse our full catalog of products and start your journey today
            </p>

            <Link
              href="/products"
              className="inline-flex items-center px-8 py-4 bg-white text-purple-600 hover:bg-gray-100 rounded-lg font-semibold transition-colors"
            >
              {t('sections.viewAll')}
              <svg
                className="w-5 h-5 ml-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
