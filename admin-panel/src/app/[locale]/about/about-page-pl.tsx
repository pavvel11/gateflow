'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import FloatingLanguageSwitcher from '@/components/FloatingLanguageSwitcher';
import { useTranslations } from 'next-intl';

export function AboutPagePL() {
  const [mounted, setMounted] = useState(false);
  const { user, isAdmin, loading } = useAuth();
  const t = useTranslations('about');

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  const isLoggedIn = !!user;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 rounded-xl flex items-center justify-center transform group-hover:scale-110 transition-transform duration-200">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                GateFlow
              </span>
            </Link>

            <div className="flex items-center space-x-6">
              <Link href="/" className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                Start
              </Link>
              <Link href="/" className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                Produkty
              </Link>
              <a href="https://github.com/pavvel11/gateflow" target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                GitHub
              </a>
              {isLoggedIn ? (
                <Link
                  href={isAdmin ? "/dashboard" : "/my-products"}
                  className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  {isAdmin ? "Panel" : "Moje Produkty"}
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Rozpocznij
                </Link>
              )}
              <FloatingLanguageSwitcher mode="static" variant="compact" />
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section - Revolutionary Design */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Animated Gradient Mesh Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-950 dark:to-blue-950">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-300 dark:bg-purple-800 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-30 animate-blob"></div>
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-pink-300 dark:bg-pink-800 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-blue-300 dark:bg-blue-800 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            {/* Badge */}
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-purple-200 dark:border-purple-800 mb-8 shadow-lg">
              <span className="relative flex h-2 w-2 mr-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">Open Source • Self-Hosted • Gotowe dla Firm</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-gray-900 dark:text-white mb-8 leading-tight">
              Twoje Produkty.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 animate-gradient">
                Twoje Zasady.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-12 max-w-4xl mx-auto leading-relaxed">
              Platforma klasy enterprise do sprzedaży produktów cyfrowych.
              <span className="font-semibold text-gray-900 dark:text-white"> Self-hosted</span>,
              <span className="font-semibold text-gray-900 dark:text-white"> bezpieczna</span> i
              <span className="font-semibold text-gray-900 dark:text-white"> w pełni konfigurowalna</span>.
              <br />
              Bez opłat miesięcznych. Bez uzależnienia od dostawcy. Pełna kontrola.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <Link
                href="/login"
                className="group relative inline-flex items-center px-8 py-4 rounded-xl text-lg font-bold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 transform hover:scale-105"
              >
                <span className="relative z-10">Wdróż za 0 zł</span>
                <svg className="ml-3 w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>

              <a
                href="https://github.com/pavvel11/gateflow"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center px-8 py-4 rounded-xl text-lg font-bold text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <svg className="mr-3 w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                Zobacz na GitHub
                <span className="ml-2 px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-xs font-semibold">MIT</span>
              </a>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap justify-center items-center gap-8 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Bez opłat miesięcznych
              </div>
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Własność danych
              </div>
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Wdrożenie wszędzie
              </div>
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Bezpieczeństwo korporacyjne
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar - Social Proof */}
      <section className="py-12 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl md:text-5xl font-black text-white mb-2">100%</div>
              <div className="text-sm md:text-base font-medium text-purple-100">Open Source</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-black text-white mb-2">0 zł</div>
              <div className="text-sm md:text-base font-medium text-purple-100">Opłaty Miesięczne</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-black text-white mb-2">∞</div>
              <div className="text-sm md:text-base font-medium text-purple-100">Produkty</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-black text-white mb-2">MIT</div>
              <div className="text-sm md:text-base font-medium text-purple-100">Licencja</div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Statement */}
      <section className="py-24 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">
            Zmęczony płaceniem abonamentu ZANIM cokolwiek sprzedasz?
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
            EasyCart pobiera <span className="font-bold text-red-600">100 zł/miesiąc</span> nawet jeśli tylko zbierasz leady darmowymi produktami.
            <span className="block mt-4 text-2xl font-bold text-gray-900 dark:text-white">
              To 1,200 zł/rok ryzyko PRZED pierwszym przychodem! 💸
            </span>
          </p>
          <div className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto">
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800">
              <div className="text-red-600 dark:text-red-400 font-bold mb-2">❌ EasyCart</div>
              <div className="text-sm text-gray-700 dark:text-gray-300">Płać 100 zł/mies żeby zbierać leady</div>
            </div>
            <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-700">
              <div className="text-green-600 dark:text-green-400 font-bold mb-2">✅ GateFlow</div>
              <div className="text-sm text-gray-900 dark:text-white">Zbieraj leady ZA DARMO, płać tylko przy sprzedaży premium</div>
            </div>
          </div>

          {/* CTA after Problem Statement */}
          <div className="text-center mt-12">
            <Link
              href="/login"
              className="inline-flex items-center px-8 py-4 rounded-xl text-lg font-bold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 transform hover:scale-105"
            >
              Przestań przepłacać - Wdróż teraz
              <svg className="ml-3 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Bento Grid Funkcjas */}
      <section className="py-24 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Wszystko, czego potrzebujesz do sprzedaży produktów cyfrowych
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Wbudowane funkcje, które zwykle kosztują setki złotych miesięcznie w abonamentach SaaS
            </p>
          </div>

          {/* Masonry Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-[180px]">

            {/* Analityka - tall */}
            <div className="md:col-span-1 lg:row-span-2 group p-6 rounded-3xl bg-gradient-to-br from-blue-500 to-cyan-500 hover:scale-[1.02] transition-all duration-300 shadow-xl">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Dashboard na żywo</h3>
              <p className="text-sm text-blue-50 leading-relaxed">
                Przychody w czasie rzeczywistym. 20+ walut. Konwersja automatyczna. Cele sprzedażowe.
              </p>
            </div>

            {/* Stripe - wide */}
            <div className="md:col-span-2 lg:col-span-2 group p-6 rounded-3xl bg-gradient-to-br from-purple-500 to-pink-500 overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Płatności Stripe</h3>
              <p className="text-sm text-purple-50 leading-relaxed">
                Bez przekierowań. 20+ walut. Płatności dla gości. Bezpieczne API keys (AES-256).
              </p>
            </div>

            {/* Upsell */}
            <div className="group p-6 rounded-3xl bg-gradient-to-br from-green-500 to-emerald-500 hover:scale-[1.02] transition-all duration-300 shadow-xl">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Order Bumps</h3>
              <p className="text-sm text-green-50">Zwiększ AOV o 30-50%</p>
            </div>

            {/* Kupony */}
            <div className="group p-6 rounded-3xl bg-gradient-to-br from-orange-500 to-red-500 hover:scale-[1.02] transition-all duration-300 shadow-xl">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Smart Kupony</h3>
              <p className="text-sm text-orange-50">Auto-apply. Limity. Targetowanie</p>
            </div>

            {/* Webhooks - wide */}
            <div className="md:col-span-2 group p-6 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 hover:scale-[1.02] transition-all duration-300 shadow-xl">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Webhooks & Automatyzacja</h3>
              <p className="text-sm text-indigo-50">Zapier, Make, custom endpoints. HMAC security. Retry logic.</p>
            </div>

            {/* Leady - tall */}
            <div className="lg:row-span-2 group p-6 rounded-3xl bg-gradient-to-br from-pink-500 to-rose-500 hover:scale-[1.02] transition-all duration-300 shadow-xl">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Zbieranie Leadów</h3>
              <p className="text-sm text-pink-50 leading-relaxed">
                Darmowe produkty. Magic links bez haseł. Zbieraj emaile. Buduj listę. Sprzedawaj premium.
              </p>
            </div>

            {/* Content Delivery */}
            <div className="group p-6 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-500 hover:scale-[1.02] transition-all duration-300 shadow-xl">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Dostarczanie Treści</h3>
              <p className="text-sm text-amber-50">Wideo, pliki, przekierowania. Hostuj LUB linkuj do swojej platformy.</p>
            </div>

            {/* Omnibus */}
            <div className="group p-6 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-600 hover:scale-[1.02] transition-all duration-300 shadow-xl">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Omnibus UE</h3>
              <p className="text-sm text-blue-50">Historia cen. Dyrektywa 2019/2161</p>
            </div>

            {/* GUS */}
            <div className="group p-6 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-500 hover:scale-[1.02] transition-all duration-300 shadow-xl">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">GUS API (PL)</h3>
              <p className="text-sm text-emerald-50">NIP → automatycznie. REGON. B2B</p>
            </div>

            {/* Lejki Sprzedażowe - wide */}
            <div className="md:col-span-2 group p-6 rounded-3xl bg-gradient-to-br from-violet-500 to-fuchsia-600 hover:scale-[1.02] transition-all duration-300 shadow-xl">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Prawdziwe OTO & Lejki</h3>
              <p className="text-sm text-violet-50">Kupony po zakupie (czasowe, email-bound). Lead magnet → Upsell → Premium. Walidacja server-side.</p>
            </div>

            {/* System Zwrotów */}
            <div className="group p-6 rounded-3xl bg-gradient-to-br from-rose-500 to-red-500 hover:scale-[1.02] transition-all duration-300 shadow-xl">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">System Zwrotów</h3>
              <p className="text-sm text-rose-50">Konfiguracja per-produkt. Formularz klienta. Panel admina. Auto zwroty Stripe.</p>
            </div>

            {/* Timed & Quantity Limits */}
            <div className="group p-6 rounded-3xl bg-gradient-to-br from-cyan-500 to-sky-500 hover:scale-[1.02] transition-all duration-300 shadow-xl">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Limity Promocji</h3>
              <p className="text-sm text-cyan-50">Czas LUB ilość. "Zostało tylko 5!" na checkout.</p>
            </div>

          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-24 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Stworzone dla twórców, programistów i przedsiębiorców
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Cokolwiek sprzedajesz, GateFlow to obsługuje
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Use Case 1 */}
            <div className="group p-8 rounded-2xl bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-2xl transition-all duration-300">
              <div className="text-5xl mb-6">🎓</div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Kursy Online</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Hostuj kursy wideo z kontrolą dostępu czasowego. Prosta i skuteczna dostawa treści.
              </p>
              <ul className="space-y-3 text-gray-700 dark:text-gray-400">
                <li className="flex items-center">
                  <svg className="w-5 h-5 mr-3 text-purple-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Śledzenie postępu wideo (Wkrótce)
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 mr-3 text-purple-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Czasowy dostęp (30/90 dni)
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 mr-3 text-purple-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Integracja Bunny.net CDN
                </li>
              </ul>
            </div>

            {/* Use Case 2 */}
            <div className="group p-8 rounded-2xl bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-2xl transition-all duration-300">
              <div className="text-5xl mb-6">📦</div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Produkty Cyfrowe</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Sprzedawaj e-booki, szablony, licencje oprogramowania lub pliki. Lepsze niż Gumroad z zerową prowizją.
              </p>
              <ul className="space-y-3 text-gray-700 dark:text-gray-400">
                <li className="flex items-center">
                  <svg className="w-5 h-5 mr-3 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Natychmiastowa dostawa
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 mr-3 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Nieograniczona liczba produktów
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 mr-3 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  System kuponów
                </li>
              </ul>
            </div>

            {/* Use Case 3 */}
            <div className="group p-8 rounded-2xl bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600 hover:shadow-2xl transition-all duration-300">
              <div className="text-5xl mb-6">🎁</div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Lead Magnety i Lejki</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Darmowy ebook → zbierz email → sprzedaj kurs premium. Zero friction signup z magic linkami.
              </p>
              <ul className="space-y-3 text-gray-700 dark:text-gray-400">
                <li className="flex items-center">
                  <svg className="w-5 h-5 mr-3 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Darmowe produkty do zbierania leadów
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 mr-3 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Bez formularzy, bez haseł
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 mr-3 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Wszystko w jednej bazie
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-24 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Zbudowane na nowoczesnej, sprawdzonej technologii
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Stos korporacyjny dla wydajności, bezpieczeństwa i skalowalności
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
            {[
              { name: 'Next.js 16', description: 'Framework React z Turbopack', icon: '⚛️', color: 'from-black to-gray-700' },
              { name: 'TypeScript', description: 'Bezpieczne typy', icon: '📘', color: 'from-blue-600 to-blue-800' },
              { name: 'Supabase', description: 'PostgreSQL + Auth + Realtime', icon: '🚀', color: 'from-green-600 to-emerald-700' },
              { name: 'Tailwind CSS', description: 'Stylowanie utility-first', icon: '🎨', color: 'from-cyan-500 to-blue-600' },
              { name: 'Stripe', description: 'Przetwarzanie płatności', icon: '💳', color: 'from-purple-600 to-indigo-700' },
              { name: 'Docker', description: 'Konteneryzacja', icon: '🐳', color: 'from-blue-500 to-cyan-600' },
              { name: 'PostgreSQL', description: 'Niezawodna baza danych', icon: '🐘', color: 'from-blue-700 to-indigo-800' },
              { name: 'Bunny.net', description: 'CDN i hosting wideo', icon: '🐰', color: 'from-orange-500 to-red-600' },
            ].map((tech) => (
              <div key={tech.name} className="group p-6 rounded-2xl bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-800 hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-xl transition-all duration-300">
                <div className="text-4xl mb-3">{tech.icon}</div>
                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{tech.name}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{tech.description}</p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <a
              href="https://github.com/pavvel11/gateflow"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-6 py-3 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              Zobacz pełny stack na GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Pricing Comparison */}
      <section className="py-24 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-purple-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Przestań płacić miesięczne opłaty na zawsze
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Zobacz ile oszczędzasz vs alternatywy SaaS
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* EasyCart Comparison */}
            <div className="p-8 rounded-2xl bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-600 hover:shadow-xl transition-all duration-300">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">EasyCart</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Wybierz swoją pułapkę</p>
                </div>
                <div className="text-3xl">😢</div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">Abonament miesięczny</span>
                  <span className="text-red-600 font-bold">100 zł/mies</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">❌ Płacisz nawet przy 0 zł sprzedaży</span>
                  <span className="text-red-600 font-bold">1,200 zł/rok ryzyko</span>
                </div>
              </div>

              <div className="border-t-2 border-gray-200 dark:border-gray-700 pt-6 mb-6">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 text-center font-semibold">Przy 300 000 zł przychodu/rok:</p>

                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-600 dark:text-gray-400">Plan Starter</span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">948 zł/rok + 3% prowizji</span>
                    </div>
                    <div className="text-xl font-bold text-red-600">~18,650 zł/rok*</div>
                  </div>

                  <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-600 dark:text-gray-400">Plan Profesjonalista</span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">4,188 zł/rok + 1% prowizji</span>
                    </div>
                    <div className="text-xl font-bold text-red-600">~15,900 zł/rok*</div>
                  </div>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-500 mt-3 text-center italic">Niezależnie od wyboru, przepłacasz!</p>
              </div>
            </div>

            {/* GateFlow Comparison */}
            <div className="p-8 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-2 border-green-300 dark:border-green-700 hover:border-green-400 dark:hover:border-green-600 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">GateFlow</h3>
                  <p className="text-sm text-green-700 dark:text-green-400 font-semibold">Self-hosted, open source</p>
                </div>
                <div className="text-3xl">🚀</div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center p-3 rounded-lg bg-green-100 dark:bg-green-900/40 border-l-4 border-green-500">
                  <span className="text-gray-900 dark:text-white font-medium">Abonament miesięczny</span>
                  <span className="text-green-600 dark:text-green-400 font-bold">0 zł/mies</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-green-100 dark:bg-green-900/40 border-l-4 border-green-500">
                  <span className="text-gray-900 dark:text-white font-medium">✅ Płacisz TYLKO gdy sprzedajesz</span>
                  <span className="text-green-600 dark:text-green-400 font-bold">0 zł ryzyko</span>
                </div>
              </div>

              <div className="border-t-2 border-green-300 dark:border-green-700 pt-6">
                <p className="text-sm text-green-700 dark:text-green-400 mb-4 text-center font-semibold">Przy 300 000 zł przychodu/rok:</p>

                <div className="p-4 rounded-lg bg-green-100 dark:bg-green-900/40 text-center">
                  <div className="text-xs text-green-700 dark:text-green-400 mb-2">Tylko opłaty Stripe (~2,9%)</div>
                  <div className="text-3xl font-black text-green-600 dark:text-green-400">8,700 zł/rok</div>
                </div>

                <div className="mt-6 p-4 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white text-center">
                  <div className="text-sm mb-1">OSZCZĘDZASZ</div>
                  <div className="text-2xl font-black">7,200-10,000 zł/rok</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
              * Łącznie z opłatami Stripe. EasyCart pobiera abonament + prowizję platformy + opłaty Stripe. GateFlow pobiera tylko opłaty Stripe.
            </p>

            {/* CTA after Pricing - Most Important */}
            <div className="mt-8">
              <Link
                href="/login"
                className="inline-flex items-center px-10 py-5 rounded-xl text-xl font-bold text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-2xl hover:shadow-green-500/50 transition-all duration-300 transform hover:scale-105"
              >
                <span className="mr-3">💰</span>
                Oszczędź 10,000 zł/rok - Wdróż GateFlow
                <svg className="ml-3 w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">Bez opłat miesięcznych. Bez prowizji. Bez zobowiązań.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Deployment Options */}
      <section className="py-24 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Wdróż gdzie chcesz, jak chcesz
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Od 11 zł/mies VPS dla hobbystów do gotowej infrastruktury produkcyjnej
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Option 1 */}
            <div className="p-8 rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border-2 border-blue-200 dark:border-blue-800">
              <div className="text-4xl mb-4">🚀</div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Szybki Start</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm">
                mikr.us (darmowy SSL) lub inny VPS + Caddy
              </p>
              <ul className="space-y-2 text-gray-700 dark:text-gray-400 text-sm mb-6">
                <li className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Menedżer procesów PM2
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Automatyczny SSL
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Supabase Cloud
                </li>
              </ul>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">~11 zł/mies</div>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">~300MB zużycia RAM</p>
            </div>

            {/* Option 2 */}
            <div className="p-8 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border-2 border-purple-200 dark:border-purple-800 transform scale-105 shadow-2xl">
              <div className="inline-block px-3 py-1 rounded-full bg-purple-600 text-white text-xs font-bold mb-4">POLECANE</div>
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Produkcja</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Najlepszy stosunek ceny do wydajności
              </p>
              <ul className="space-y-2 text-gray-700 dark:text-gray-400 text-sm mb-6">
                <li className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  PM2 lub Docker
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Zarządzana baza danych
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Wdrożenia bez przestojów
                </li>
              </ul>
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">~17-56 zł/mies</div>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">2-rdzeniowy CPU, 8GB RAM, 100GB NVMe</p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <a
              href="https://github.com/pavvel11/gateflow/blob/main/DEPLOYMENT.md"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-6 py-3 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
            >
              Zobacz przewodniki wdrażania
              <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Najczęściej Zadawane Pytania
            </h2>
          </div>

          <div className="space-y-6">
            {[
              {
                q: "Czy GateFlow naprawdę jest darmowy?",
                a: "Tak! GateFlow jest w 100% open source (licencja MIT). Płacisz tylko za hosting (11-56 zł/mies za VPS) i opłaty Stripe za przetwarzanie płatności (2,9% + 1,20 zł). Bez opłat platformy, bez miesięcznych abonamentów, bez uzależnienia od dostawcy."
              },
              {
                q: "Czym różni się od Gumroad czy Teachable?",
                a: "Te platformy pobierają 5-10% od każdej sprzedaży PLUS miesięczne opłaty. GateFlow ma zerowe opłaty platformy, ponieważ hostujesz go sam. Jesteś właścicielem kodu, danych i zatrzymujesz 100% przychodów (minus standardowe opłaty Stripe)."
              },
              {
                q: "Czy muszę być programistą?",
                a: "Przydaje się podstawowa znajomość serwera, ale nasze przewodniki wdrażania sprawiają, że to proste. Jeśli potrafisz postępować zgodnie z instrukcjami krok po kroku i używać SSH, możesz wdrożyć GateFlow. Udostępniamy konfiguracje Docker Compose i szczegółowe tutoriale."
              },
              {
                q: "Co z przetwarzaniem płatności?",
                a: "GateFlow integruje się ze Stripe do płatności. Potrzebujesz konta Stripe (darmowe do utworzenia). Opłaty Stripe są standardowe: 2,9% + 1,20 zł za transakcję - takie same jak te, które Gumroad/Teachable pobierają NA DODATEK do swoich opłat platformy."
              },
              {
                q: "Czy mogę usunąć branding?",
                a: "Oczywiście! GateFlow ma licencję MIT. Możesz dostosować wszystko - branding, kolory, domenę, nawet kod źródłowy. To Twoja platforma."
              },
              {
                q: "Czy jest gotowy do produkcji?",
                a: "Tak! GateFlow jest zbudowany na technologiach korporacyjnych (Next.js, PostgreSQL, Supabase). Zawiera funkcje bezpieczeństwa takie jak polityki RLS, webhooki zabezpieczone HMAC, zaszyfrowane przechowywanie kluczy i kompleksową walidację danych wejściowych."
              },
              {
                q: "Co jeśli potrzebuję pomocy?",
                a: "Sprawdź naszą obszerną dokumentację i problemy na GitHub. Ponieważ jest to open source, możesz również zatrudnić dowolnego programistę Next.js, aby dostosował go do Twoich potrzeb."
              },
              {
                q: "Czy poradzi sobie z dużym ruchem?",
                a: "Tak! Zbudowany na Next.js 16 i PostgreSQL, skaluje się horyzontalnie. Możesz wdrożyć na dowolnej infrastrukturze - od VPS za 11 zł do klastrów Kubernetes. Supabase zapewnia pooling połączeń domyślnie."
              }
            ].map((faq, i) => (
              <div key={i} className="p-6 rounded-xl bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 transition-colors">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{faq.q}</h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
            Gotowy na start?
          </h2>
          <p className="text-xl text-purple-100 mb-8 max-w-2xl mx-auto">
            Wdróż GateFlow w 10 minut. Zacznij sprzedawać bez miesięcznych opłat.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <Link
              href="/login"
              className="group inline-flex items-center px-10 py-5 rounded-xl text-xl font-bold text-purple-600 bg-white hover:bg-gray-100 shadow-2xl transition-all duration-300 transform hover:scale-105"
            >
              Wdróż za 0 zł
              <svg className="ml-3 w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>

            <a
              href="https://github.com/pavvel11/gateflow"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-8 py-5 rounded-xl text-lg font-bold text-white border-2 border-white hover:bg-white/10 transition-all duration-300"
            >
              <svg className="mr-3 w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              Zobacz na GitHub
            </a>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-6 text-sm text-purple-100">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-white mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Wdrożenie w 10 min
            </div>
            <div className="flex items-center">
              <svg className="w-5 h-5 text-white mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Pełny kod źródłowy
            </div>
            <div className="flex items-center">
              <svg className="w-5 h-5 text-white mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Licencja MIT
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <span className="text-xl font-bold">GateFlow</span>
              </div>
              <p className="text-gray-400 text-sm">
                Platforma open source do sprzedaży produktów cyfrowych. Self-hosted, bezpieczna i w pełni konfigurowalna.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Produkt</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/" className="hover:text-white transition-colors">Funkcje</Link></li>
                <li><a href="https://github.com/pavvel11/gateflow" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Dokumentacja</a></li>
                <li><Link href="/" className="hover:text-white transition-colors">Produkty</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Zasoby</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="https://github.com/pavvel11/gateflow" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a></li>
                <li><a href="https://github.com/pavvel11/gateflow/blob/main/DEPLOYMENT.md" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Przewodnik wdrażania</a></li>
                <li><a href="https://github.com/pavvel11/gateflow/issues" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Wsparcie</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Prawne</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="https://github.com/pavvel11/gateflow/blob/main/LICENSE" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Licencja (MIT)</a></li>
                <li><Link href="/" className="hover:text-white transition-colors">Prywatność</Link></li>
                <li><Link href="/" className="hover:text-white transition-colors">Warunki</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm mb-4 md:mb-0">
              &copy; 2025 GateFlow. Open source i self-hosted
            </p>
            <div className="flex items-center space-x-6">
              <a href="https://github.com/pavvel11/gateflow" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Animation Styles */}
      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </div>
  );
}
