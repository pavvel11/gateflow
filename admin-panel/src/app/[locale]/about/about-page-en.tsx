'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import FloatingLanguageSwitcher from '@/components/FloatingLanguageSwitcher';
import { useTranslations } from 'next-intl';

export function AboutPageEN() {
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
                Home
              </Link>
              <Link href="/" className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                Products
              </Link>
              <a href="https://github.com/pavvel11/gateflow" target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                GitHub
              </a>
              {isLoggedIn ? (
                <Link
                  href={isAdmin ? "/dashboard" : "/my-products"}
                  className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  {isAdmin ? "Dashboard" : "My Products"}
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Get Started
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
              <span className="text-sm font-semibold text-gray-900 dark:text-white">Open Source • Self-Hosted • Enterprise-Ready</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-gray-900 dark:text-white mb-8 leading-tight">
              Your Products.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 animate-gradient">
                Your Rules.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-12 max-w-4xl mx-auto leading-relaxed">
              Sell digital products on your own terms — without giving away revenue to platforms.
              <span className="font-semibold text-gray-900 dark:text-white"> Self-hosted</span>,
              <span className="font-semibold text-gray-900 dark:text-white"> secure</span>, and
              <span className="font-semibold text-gray-900 dark:text-white"> fully yours</span>.
              <br />
              No monthly fees. No middlemen. Complete control from day one.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <a
                href="#deployment"
                className="group relative inline-flex items-center px-8 py-4 rounded-xl text-lg font-bold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 transform hover:scale-105"
              >
                <span className="relative z-10">Deploy for Free</span>
                <svg className="ml-3 w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </a>

              <a
                href="https://gateflow.cytr.us"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center px-8 py-4 rounded-xl text-lg font-bold text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-2 border-amber-400 dark:border-amber-500 hover:border-amber-500 dark:hover:border-amber-400 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <svg className="mr-3 w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Try Live Demo
              </a>

              <a
                href="https://github.com/pavvel11/gateflow"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center px-8 py-4 rounded-xl text-lg font-bold text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <svg className="mr-3 w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                View on GitHub
                <span className="ml-2 px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-xs font-semibold">MIT</span>
              </a>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap justify-center items-center gap-8 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                No monthly fees
              </div>
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Own your data
              </div>
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Deploy anywhere
              </div>
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Enterprise security
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
              <div className="text-4xl md:text-5xl font-black text-white mb-2">$0</div>
              <div className="text-sm md:text-base font-medium text-purple-100">Monthly Fees</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-black text-white mb-2">∞</div>
              <div className="text-sm md:text-base font-medium text-purple-100">Products</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-black text-white mb-2">MIT</div>
              <div className="text-sm md:text-base font-medium text-purple-100">License</div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Statement */}
      <section className="py-24 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">
            Tired of paying monthly fees BEFORE making your first sale?
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
            EasyCart charges <span className="font-bold text-red-600">$25/month</span> even if you're just collecting leads with free products.
            <span className="block mt-4 text-2xl font-bold text-gray-900 dark:text-white">
              That's $300/year risk BEFORE any revenue! 💸
            </span>
          </p>
          <div className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto">
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800">
              <div className="text-red-600 dark:text-red-400 font-bold mb-2">❌ EasyCart</div>
              <div className="text-sm text-gray-700 dark:text-gray-300">Pay $25/mo to collect leads</div>
            </div>
            <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-700">
              <div className="text-green-600 dark:text-green-400 font-bold mb-2">✅ GateFlow</div>
              <div className="text-sm text-gray-900 dark:text-white">Collect leads FREE, pay only when selling premium</div>
            </div>
          </div>

          {/* CTA after Problem Statement */}
          <div className="text-center mt-12">
            <Link
              href="/login"
              className="inline-flex items-center px-8 py-4 rounded-xl text-lg font-bold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 transform hover:scale-105"
            >
              Stop Overpaying - Deploy Now
              <svg className="ml-3 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Bento Grid Features */}
      <section className="py-24 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Everything you need to sell digital products
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Built-in features that usually cost $100s/month in SaaS subscriptions
            </p>
          </div>

          {/* Masonry Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-[180px]">

            {/* Analytics - tall */}
            <div className="md:col-span-1 lg:row-span-2 group p-6 rounded-3xl bg-gradient-to-br from-blue-500 to-cyan-500 hover:scale-[1.02] transition-all duration-300 shadow-xl">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Live Dashboard</h3>
              <p className="text-sm text-blue-50 leading-relaxed">
                See exactly what's working — revenue in 20+ currencies, sales goals, and trends at a glance.
              </p>
            </div>

            {/* Stripe - wide */}
            <div className="md:col-span-2 lg:col-span-2 group p-6 rounded-3xl bg-gradient-to-br from-purple-500 to-pink-500 overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Stripe Payments</h3>
              <p className="text-sm text-purple-50 leading-relaxed">
                Customers pay without leaving your page. 20+ currencies, guest checkout, keys encrypted with AES-256.
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
              <p className="text-sm text-green-50">Earn 30-50% more per order with one-click add-ons.</p>
            </div>

            {/* Coupons */}
            <div className="group p-6 rounded-3xl bg-gradient-to-br from-orange-500 to-red-500 hover:scale-[1.02] transition-all duration-300 shadow-xl">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Smart Coupons</h3>
              <p className="text-sm text-orange-50">Targeted promos that apply automatically. Set limits, stay profitable.</p>
            </div>

            {/* Webhooks - wide */}
            <div className="md:col-span-2 group p-6 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 hover:scale-[1.02] transition-all duration-300 shadow-xl">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Webhooks & Automation</h3>
              <p className="text-sm text-indigo-50">Connect to Zapier, Make, or your own endpoints — with secure delivery and auto-retries.</p>
            </div>

            {/* Leads - tall */}
            <div className="lg:row-span-2 group p-6 rounded-3xl bg-gradient-to-br from-pink-500 to-rose-500 hover:scale-[1.02] transition-all duration-300 shadow-xl">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Lead Collection</h3>
              <p className="text-sm text-pink-50 leading-relaxed">
                Grow your email list for free. Magic-link access, no passwords. Then sell premium to your audience.
              </p>
            </div>

            {/* Content Delivery */}
            <div className="group p-6 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-500 hover:scale-[1.02] transition-all duration-300 shadow-xl">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Content Delivery</h3>
              <p className="text-sm text-amber-50">Deliver your way — host files directly or redirect buyers to your platform.</p>
            </div>

            {/* Omnibus */}
            <div className="group p-6 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-600 hover:scale-[1.02] transition-all duration-300 shadow-xl">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">EU Omnibus</h3>
              <p className="text-sm text-blue-50">Stay EU-compliant. Automatic price history per Directive 2019/2161.</p>
            </div>

            {/* Timed & Quantity Limits */}
            <div className="group p-6 rounded-3xl bg-gradient-to-br from-cyan-500 to-teal-500 hover:scale-[1.02] transition-all duration-300 shadow-xl">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Sale Limits</h3>
              <p className="text-sm text-cyan-50">Create real urgency with time or quantity limits and live counters.</p>
            </div>

            {/* Sales Funnels - wide */}
            <div className="md:col-span-2 group p-6 rounded-3xl bg-gradient-to-br from-violet-500 to-fuchsia-600 hover:scale-[1.02] transition-all duration-300 shadow-xl">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">True OTO & Funnels</h3>
              <p className="text-sm text-violet-50">Turn one buyer into a repeat customer. Post-purchase offers, time-limited coupons, and full funnels — validated server-side.</p>
            </div>

            {/* Refund System */}
            <div className="group p-6 rounded-3xl bg-gradient-to-br from-rose-500 to-red-500 hover:scale-[1.02] transition-all duration-300 shadow-xl">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Refund System</h3>
              <p className="text-sm text-rose-50">Handle refunds without headaches. Per-product policies, customer form, one-click Stripe refunds.</p>
            </div>

            {/* NOTE: GUS API card intentionally excluded from English version - it's Poland-specific feature */}

          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-24 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Built for creators, developers, and entrepreneurs
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Whatever you sell, GateFlow handles it
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Use Case 1 */}
            <div className="group p-8 rounded-2xl bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-2xl transition-all duration-300">
              <div className="text-5xl mb-6">🎓</div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Online Courses</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Host video courses with temporal access control. Simple and effective content delivery.
              </p>
              <ul className="space-y-3 text-gray-700 dark:text-gray-400">
                <li className="flex items-center">
                  <svg className="w-5 h-5 mr-3 text-purple-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Video progress tracking (Coming Soon)
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 mr-3 text-purple-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Temporal access (30/90 days)
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 mr-3 text-purple-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Bunny.net CDN integration
                </li>
              </ul>
            </div>

            {/* Use Case 2 */}
            <div className="group p-8 rounded-2xl bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-2xl transition-all duration-300">
              <div className="text-5xl mb-6">📦</div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Digital Products</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Sell ebooks, templates, software licenses, or files. Better than Gumroad with zero commission.
              </p>
              <ul className="space-y-3 text-gray-700 dark:text-gray-400">
                <li className="flex items-center">
                  <svg className="w-5 h-5 mr-3 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Instant delivery
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 mr-3 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Unlimited products
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 mr-3 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Coupon system
                </li>
              </ul>
            </div>

            {/* Use Case 3 */}
            <div className="group p-8 rounded-2xl bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600 hover:shadow-2xl transition-all duration-300">
              <div className="text-5xl mb-6">🎁</div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Lead Magnets & Funnels</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Free ebook → collect email → sell premium course. Zero friction signup with magic links.
              </p>
              <ul className="space-y-3 text-gray-700 dark:text-gray-400">
                <li className="flex items-center">
                  <svg className="w-5 h-5 mr-3 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Free products for lead collection
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 mr-3 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  No forms, no passwords needed
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 mr-3 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  All in one database
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Word Picture CTA */}
      <section className="py-16 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <p className="text-2xl md:text-3xl text-white/90 leading-relaxed mb-8 italic">
            Imagine waking up to a notification: <span className="font-bold text-white not-italic">&quot;You made a sale while you slept.&quot;</span> No platform took a cut. No monthly fee ate into your profit. Just your product, your customer, your revenue.
          </p>
          <a
            href="#deployment"
            className="inline-flex items-center px-8 py-4 rounded-xl text-lg font-bold text-purple-700 bg-white hover:bg-gray-100 shadow-2xl transition-all duration-300 transform hover:scale-105"
          >
            Start Selling on Your Terms
            <svg className="ml-3 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </a>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-24 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Built on technology you can trust
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Reliable, proven tools for performance, security, and growth
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
            {[
              { name: 'Next.js 16', description: 'React framework with Turbopack', icon: '⚛️', color: 'from-black to-gray-700' },
              { name: 'TypeScript', description: 'Type-safe development', icon: '📘', color: 'from-blue-600 to-blue-800' },
              { name: 'Supabase', description: 'PostgreSQL + Auth + Realtime', icon: '🚀', color: 'from-green-600 to-emerald-700' },
              { name: 'Tailwind CSS', description: 'Utility-first styling', icon: '🎨', color: 'from-cyan-500 to-blue-600' },
              { name: 'Stripe', description: 'Payment processing', icon: '💳', color: 'from-purple-600 to-indigo-700' },
              { name: 'Docker', description: 'Containerization', icon: '🐳', color: 'from-blue-500 to-cyan-600' },
              { name: 'PostgreSQL', description: 'Reliable database', icon: '🐘', color: 'from-blue-700 to-indigo-800' },
              { name: 'Bunny.net', description: 'CDN & Video hosting', icon: '🐰', color: 'from-orange-500 to-red-600' },
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
              View full tech stack on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Pricing Comparison */}
      <section className="py-24 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-purple-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Stop paying monthly fees forever
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              See how much you save vs SaaS alternatives
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* EasyCart Comparison */}
            <div className="p-8 rounded-2xl bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-600 hover:shadow-xl transition-all duration-300">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">EasyCart</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Choose your trap</p>
                </div>
                <div className="text-3xl">😢</div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">Monthly subscription</span>
                  <span className="text-red-600 font-bold">$25/mo</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">❌ Pay even with $0 sales</span>
                  <span className="text-red-600 font-bold">$300/year risk</span>
                </div>
              </div>

              <div className="border-t-2 border-gray-200 dark:border-gray-700 pt-6 mb-6">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 text-center font-semibold">At $75K revenue/year:</p>

                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-600 dark:text-gray-400">Starter Plan</span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">$237/yr + 3% fees</span>
                    </div>
                    <div className="text-xl font-bold text-red-600">~$4,650/year*</div>
                  </div>

                  <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-600 dark:text-gray-400">Professional Plan</span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">$1,047/yr + 1% fees</span>
                    </div>
                    <div className="text-xl font-bold text-red-600">~$3,990/year*</div>
                  </div>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-500 mt-3 text-center italic">Either way, you overpay!</p>
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
                  <span className="text-gray-900 dark:text-white font-medium">Monthly subscription</span>
                  <span className="text-green-600 dark:text-green-400 font-bold">$0/mo</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-green-100 dark:bg-green-900/40 border-l-4 border-green-500">
                  <span className="text-gray-900 dark:text-white font-medium">✅ Pay ONLY when you sell</span>
                  <span className="text-green-600 dark:text-green-400 font-bold">$0 risk</span>
                </div>
              </div>

              <div className="border-t-2 border-green-300 dark:border-green-700 pt-6">
                <p className="text-sm text-green-700 dark:text-green-400 mb-4 text-center font-semibold">At $75K revenue/year:</p>

                <div className="p-4 rounded-lg bg-green-100 dark:bg-green-900/40 text-center">
                  <div className="text-xs text-green-700 dark:text-green-400 mb-2">Only Stripe fees (~2.9%)</div>
                  <div className="text-3xl font-black text-green-600 dark:text-green-400">$2,175/year</div>
                </div>

                <div className="mt-6 p-4 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white text-center">
                  <div className="text-sm mb-1">YOU SAVE</div>
                  <div className="text-2xl font-black">$1,800-2,500/year</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
              * Including Stripe payment processing. EasyCart charges subscription + platform fees + Stripe fees. GateFlow charges only Stripe fees.
            </p>

            {/* CTA after Pricing - Most Important */}
            <div className="mt-8">
              <Link
                href="/login"
                className="inline-flex items-center px-10 py-5 rounded-xl text-xl font-bold text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-2xl hover:shadow-green-500/50 transition-all duration-300 transform hover:scale-105"
              >
                <span className="mr-3">💰</span>
                Save $2,500/year - Deploy GateFlow
                <svg className="ml-3 w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">No monthly fees. No commissions. No commitments.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Your Stripe Account — MoR Comparison */}
      <section className="py-24 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Your Stripe account, your money
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Merchant of Record platforms charge 5–10% and your customer data lives on their platform. With GateFlow, payments go directly to your Stripe account.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {/* MoR Card */}
            <div className="p-8 rounded-2xl bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-600 hover:shadow-xl transition-all duration-300">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Merchant of Record</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Paddle, LemonSqueezy, Gumroad</p>
                </div>
                <div className="text-3xl">🏦</div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">Platform fees</span>
                  <span className="text-red-600 font-bold">5–10%</span>
                </div>
                <div className="flex items-center p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500">
                  <span className="text-gray-700 dark:text-gray-300">❌ Customer data belongs to the platform</span>
                </div>
                <div className="flex items-center p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500">
                  <span className="text-gray-700 dark:text-gray-300">❌ Platform risk — account freezes, shutdowns</span>
                </div>
              </div>
            </div>

            {/* GateFlow + Own Stripe Card */}
            <div className="p-8 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-2 border-green-300 dark:border-green-700 hover:border-green-400 dark:hover:border-green-600 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">GateFlow + Own Stripe</h3>
                  <p className="text-sm text-green-700 dark:text-green-400 font-semibold">Direct payments to your account</p>
                </div>
                <div className="text-3xl">💳</div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center p-3 rounded-lg bg-green-100 dark:bg-green-900/40 border-l-4 border-green-500">
                  <span className="text-gray-900 dark:text-white font-medium">Platform fees</span>
                  <span className="text-green-600 dark:text-green-400 font-bold">$0</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-green-100 dark:bg-green-900/40 border-l-4 border-green-500">
                  <span className="text-gray-900 dark:text-white font-medium">Only{' '}<a href="https://stripe.com/pricing" target="_blank" rel="noopener noreferrer" className="underline">Stripe fees</a></span>
                  <span className="text-green-600 dark:text-green-400 font-bold">~2.9%</span>
                </div>
                <div className="flex items-center p-3 rounded-lg bg-green-100 dark:bg-green-900/40 border-l-4 border-green-500">
                  <span className="text-gray-900 dark:text-white">✅ You own all customer data</span>
                </div>
                <div className="flex items-center p-3 rounded-lg bg-green-100 dark:bg-green-900/40 border-l-4 border-green-500">
                  <span className="text-gray-900 dark:text-white">✅ You use your own tax thresholds</span>
                </div>
                <div className="flex items-center p-3 rounded-lg bg-green-100 dark:bg-green-900/40 border-l-4 border-green-500">
                  <span className="text-gray-900 dark:text-white">✅ Self-hosted — no platform risk</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tax Growth Path */}
          <div className="max-w-4xl mx-auto p-8 rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border-2 border-blue-200 dark:border-blue-800">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">Tax compliance grows with your business</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-xl font-bold mb-3">1</div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-2">Starting out</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Below{' '}<a href="https://vat-one-stop-shop.ec.europa.eu/" target="_blank" rel="noopener noreferrer" className="underline text-blue-600 dark:text-blue-400">€10,000 EU cross-border</a>{' '}sales — handle VAT in your own country only
                </p>
              </div>

              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-xl font-bold mb-3">2</div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-2">Growing</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Above €10,000 — register for EU OSS (one form) and add{' '}<a href="https://stripe.com/tax/pricing" target="_blank" rel="noopener noreferrer" className="underline text-blue-600 dark:text-blue-400">Stripe Tax</a>{' '}(+0.5%) for automatic VAT calculation
                </p>
              </div>

              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-xl font-bold mb-3">3</div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-2">Scaling</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Optional:{' '}<a href="https://stripe.com/managed-payments" target="_blank" rel="noopener noreferrer" className="underline text-blue-600 dark:text-blue-400">Stripe Managed Payments</a>{' '}(Stripe as MoR) or a tax accountant for full compliance
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mt-6 text-center italic">
              This is general information, not tax or legal advice. Tax obligations vary by country and business type. Consult a qualified tax professional for your specific situation.
            </p>
          </div>
        </div>
      </section>

      {/* Deployment Options */}
      <section id="deployment" className="py-24 bg-gray-50 dark:bg-gray-900 scroll-mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Deploy anywhere, your way
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              From $3/month VPS for hobbyists to production-ready infrastructure
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Option 1 */}
            <div className="p-8 rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border-2 border-blue-200 dark:border-blue-800">
              <div className="text-4xl mb-4">🚀</div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Quick Start</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm">
                mikr.us (free SSL) or any VPS + Caddy
              </p>
              <ul className="space-y-2 text-gray-700 dark:text-gray-400 text-sm mb-6">
                <li className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  PM2 process manager
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Auto SSL included
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Supabase Cloud
                </li>
              </ul>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">~$3/mo</div>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">~300MB RAM footprint</p>
            </div>

            {/* Option 2 */}
            <div className="p-8 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border-2 border-purple-200 dark:border-purple-800 transform scale-105 shadow-2xl">
              <div className="inline-block px-3 py-1 rounded-full bg-purple-600 text-white text-xs font-bold mb-4">RECOMMENDED</div>
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Production</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Best price/performance ratio
              </p>
              <ul className="space-y-2 text-gray-700 dark:text-gray-400 text-sm mb-6">
                <li className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  PM2 or Docker
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Managed database
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Zero-downtime deploys
                </li>
              </ul>
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">~$4-14/mo</div>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">2-core CPU, 8GB RAM, 100GB NVMe</p>
            </div>
          </div>

          <div className="mt-12 p-6 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-200 dark:border-amber-800 max-w-2xl mx-auto text-center">
            <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Want to see it in action first?
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Explore the full admin panel, test checkout with Stripe test cards, and browse sample products — no setup required.
            </p>
            <a
              href="https://gateflow.cytr.us"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold transition-colors"
            >
              <svg className="mr-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Try Live Demo
            </a>
          </div>

          <div className="mt-8 text-center">
            <a
              href="https://github.com/pavvel11/gateflow#deployment"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-6 py-3 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
            >
              View deployment guides
              <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 bg-white dark:bg-gray-950">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-6">
            {[
              {
                q: "Is GateFlow really free?",
                a: "Yes. The software is free forever (MIT license). You pay only for hosting ($3-14/mo) and Stripe processing (~2.9%). No platform fees, no subscriptions, no lock-in."
              },
              {
                q: "How is it different from Gumroad or Teachable?",
                a: "Gumroad takes 10% per sale. Teachable charges $39-665/mo. GateFlow charges nothing — you self-host it, own the code and data, and keep everything minus Stripe fees."
              },
              {
                q: "Do I need to be a developer?",
                a: "Not really. If you can follow step-by-step instructions and type a few SSH commands, you can deploy GateFlow. We provide Docker configs and detailed guides."
              },
              {
                q: "What about payment processing?",
                a: "GateFlow uses Stripe (free to set up). Standard fees: ~2.9% + 30¢ per transaction. MoR platforms charge 5-10% total — significantly more."
              },
              {
                q: "Can I white-label it?",
                a: "Yes. MIT license — change everything: branding, colors, domain, code. It's fully your platform."
              },
              {
                q: "Is it production-ready?",
                a: "Yes. Next.js + PostgreSQL + Supabase with RLS policies, HMAC webhooks, AES-256 key encryption, and input validation out of the box."
              },
              {
                q: "What if I need help?",
                a: "Check the docs and GitHub issues. Any Next.js developer can customize or extend it for you."
              },
              {
                q: "Can it handle high traffic?",
                a: "Yes. Next.js 16 + PostgreSQL scale horizontally. Deploy on anything from a $3 VPS to Kubernetes. Supabase handles connection pooling."
              },
              {
                q: "Do I need a Merchant of Record to sell digital products?",
                a: "Most small creators don't. MoR platforms handle taxes but take 5-10% and tie your customer data to their platform. Below €10,000 EU cross-border, you handle VAT only in your country. Own Stripe = full control at ~2.9%. Add Stripe Tax (+0.5%) when you grow."
              },
              {
                q: "How do I handle VAT/taxes with my own Stripe account?",
                a: "Below €10,000/year EU cross-border B2C — handle VAT in your country only. Above that — register EU OSS (one form, all countries). Stripe Tax automates calculation for 0.5%. Consult a tax professional for your case."
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
            Ready to Start?
          </h2>
          <p className="text-xl text-purple-100 mb-8 max-w-2xl mx-auto">
            Deploy GateFlow in 10 minutes. Start selling without monthly fees.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <a
              href="https://github.com/pavvel11/gateflow#deployment"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center px-10 py-5 rounded-xl text-xl font-bold text-purple-600 bg-white hover:bg-gray-100 shadow-2xl transition-all duration-300 transform hover:scale-105"
            >
              Deploy for Free
              <svg className="ml-3 w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>

            <a
              href="https://github.com/pavvel11/gateflow"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-8 py-5 rounded-xl text-lg font-bold text-white border-2 border-white hover:bg-white/10 transition-all duration-300"
            >
              <svg className="mr-3 w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              View on GitHub
            </a>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-6 text-sm text-purple-100">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-white mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              10-minute deployment
            </div>
            <div className="flex items-center">
              <svg className="w-5 h-5 text-white mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Full source code
            </div>
            <div className="flex items-center">
              <svg className="w-5 h-5 text-white mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              MIT License
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
                Open source platform for digital product sales. Self-hosted, secure, and fully customizable.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/" className="hover:text-white transition-colors">Features</Link></li>
                <li><a href="https://github.com/pavvel11/gateflow" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Documentation</a></li>
                <li><Link href="/" className="hover:text-white transition-colors">Products</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="https://github.com/pavvel11/gateflow" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a></li>
                <li><a href="https://github.com/pavvel11/gateflow/blob/main/docs/DEPLOYMENT-MIKRUS.md" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Deploy Guide</a></li>
                <li><a href="https://github.com/pavvel11/gateflow/issues" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Support</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="https://github.com/pavvel11/gateflow/blob/main/LICENSE" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">License (MIT)</a></li>
                <li><Link href="/" className="hover:text-white transition-colors">Privacy</Link></li>
                <li><Link href="/" className="hover:text-white transition-colors">Terms</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm mb-4 md:mb-0">
              &copy; 2025 GateFlow. Open source and self-hosted with ❤️
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
