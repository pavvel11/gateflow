'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function NotFound() {
  const [mounted, setMounted] = useState(false);
  const { user, isAdmin, loading } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || loading) {
    return null;
  }

  // Determine user type
  const isLoggedIn = !!user;
  
  // Get personalized content based on user type
  const getPersonalizedContent = () => {
    if (isAdmin) {
      return {
        title: "Admin Gate Locked",
        description: "Even admins can't access pages that don't exist! Your administrative powers are strong, but not strong enough to conjure missing routes.",
        actionText: "Return to Command Center",
        actionHref: "/dashboard",
        quickLinks: [
          { href: "/dashboard", label: "Dashboard", icon: "dashboard", color: "purple" },
          { href: "/dashboard/products", label: "Manage Products", icon: "products", color: "blue" },
          { href: "/dashboard/users", label: "Manage Users", icon: "users", color: "green" }
        ],
        footerMessage: "With great power comes great responsibility... but not the ability to access non-existent pages! 👑🔐"
      };
    } else if (isLoggedIn) {
      return {
        title: "Access Gate Closed",
        description: "Looks like you've wandered into uncharted territory! This page might be restricted or simply doesn't exist in your current access level.",
        actionText: "Back to Safety",
        actionHref: "/dashboard", 
        quickLinks: [
          { href: "/dashboard", label: "My Dashboard", icon: "dashboard", color: "blue" },
          { href: "/dashboard/products", label: "Available Products", icon: "products", color: "purple" },
          { href: "/login", label: "Account Settings", icon: "settings", color: "green" }
        ],
        footerMessage: "Your digital journey continues, just not on this particular path! 🚀✨"
      };
    } else {
      return {
        title: "Entry Gate Secured",
        description: "This area requires proper credentials! You might need to log in first, or this page simply doesn't exist in our digital realm.",
        actionText: "Get Access",
        actionHref: "/login",
        quickLinks: [
          { href: "/login", label: "Login", icon: "login", color: "blue" },
          { href: "/", label: "Home", icon: "home", color: "purple" },
          { href: "/about", label: "Learn More", icon: "info", color: "green" }
        ],
        footerMessage: "Every great journey begins with a single step... and proper authentication! 🔑🌟"
      };
    }
  };

  const content = getPersonalizedContent();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900 flex items-center justify-center px-4">
      <div className="text-center max-w-2xl mx-auto">
        {/* Animated GateFlow Logo */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="w-24 h-24 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center transform rotate-12 animate-pulse">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            {/* Floating particles */}
            <div className="absolute -top-2 -right-2 w-3 h-3 bg-yellow-400 rounded-full animate-bounce"></div>
            <div className="absolute -bottom-1 -left-2 w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.5s' }}></div>
            <div className="absolute top-1/2 -right-4 w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '1s' }}></div>
          </div>
        </div>

        {/* 404 Number with Glitch Effect */}
        <div className="mb-6 relative">
          <h1 className="text-8xl md:text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 dark:from-purple-400 dark:via-blue-400 dark:to-cyan-400 animate-pulse">
            404
          </h1>
          {/* Glitch overlay */}
          <div className="absolute inset-0 text-8xl md:text-9xl font-bold text-red-500 opacity-20 animate-ping" style={{ animationDuration: '2s' }}>
            404
          </div>
        </div>

        {/* Main Message */}
        <h2 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-white mb-4">
          {content.title}
        </h2>
        
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
          {content.description}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
          <Link
            href={content.actionHref}
            className="inline-flex items-center px-6 py-3 border border-transparent rounded-lg text-base font-medium text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <svg className="-ml-1 mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            {content.actionText}
          </Link>
          
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-base font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200 shadow-md hover:shadow-lg"
          >
            <svg className="-ml-1 mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Go Back
          </button>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto">
          {content.quickLinks.map((link, index) => {
            const getIcon = (iconName: string) => {
              const icons = {
                dashboard: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2v10z" />
                ),
                products: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                ),
                users: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                ),
                login: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                ),
                home: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                ),
                info: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                ),
                settings: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                )
              };
              return icons[iconName as keyof typeof icons] || icons.dashboard;
            };

            const getColorClasses = (color: string) => {
              const colorMap = {
                purple: "hover:border-purple-300 dark:hover:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 text-purple-600 dark:text-purple-400 group-hover:text-purple-700 dark:group-hover:text-purple-300",
                blue: "hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300",
                green: "hover:border-green-300 dark:hover:border-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 dark:text-green-400 group-hover:text-green-700 dark:group-hover:text-green-300"
              };
              return colorMap[color as keyof typeof colorMap] || colorMap.blue;
            };

            return (
              <Link
                key={index}
                href={link.href}
                className={`group p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 transition-all duration-200 ${getColorClasses(link.color)}`}
              >
                <div className="mb-2">
                  <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {getIcon(link.icon)}
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {link.label}
                </p>
              </Link>
            );
          })}
        </div>

        {/* Fun Footer Message */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {content.footerMessage}
          </p>
        </div>
      </div>

      {/* Background Animation */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-200 dark:bg-purple-800 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-blue-200 dark:bg-blue-800 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-pink-200 dark:bg-pink-800 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
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
      `}</style>
    </div>
  );
}
