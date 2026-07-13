'use client';

import Link from 'next/link';
import { useState } from 'react';

interface PublicNavbarProps {
  theme?: 'dark' | 'light';
}

export default function PublicNavbar({ theme = 'dark' }: PublicNavbarProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const navClasses = {
    dark: 'border-slate-900 bg-slate-950/80',
    light: 'border-gray-200 bg-white/80',
  };

  const logoTextClasses = {
    dark: 'text-white',
    light: 'text-slate-900',
  };

  const linkClasses = {
    dark: 'text-slate-400 hover:text-white',
    light: 'text-slate-500 hover:text-slate-900',
  };

  const mobileButtonClasses = {
    dark: 'text-slate-400 hover:text-white focus:ring-white',
    light: 'text-slate-500 hover:text-slate-900 focus:ring-slate-900',
  };
  
  const drawerBgClasses = {
    dark: 'bg-slate-900',
    light: 'bg-white',
  }

  const drawerLinkClasses = {
    dark: 'text-slate-100 hover:text-emerald-400',
    light: 'text-slate-900 hover:text-emerald-600',
  }

  return (
    <nav className={`backdrop-blur-md sticky top-0 z-50 px-6 py-4 border-b ${navClasses[theme]}`}>
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        <Link href="/" className={`text-xl font-bold tracking-tight flex items-center gap-2 ${logoTextClasses[theme]}`}>
          <span className="h-6 w-6 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-md shadow-emerald-500/20 text-white shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white">
              <path d="M12 3c.12 4.96-3.03 9.04-7.96 9.17C8.96 12.29 12 16.31 12 21c0-4.69 3.04-8.71 7.96-8.83C15.03 12.04 11.88 7.96 12 3z" />
            </svg>
          </span>
          Prado
        </Link>

        {/* Mobile menu button (hamburger icon) - visible only on small screens */}
        <div className="md:hidden">
          <button
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            className={`focus:outline-none focus:ring-2 focus:ring-inset ${mobileButtonClasses[theme]}`}
            aria-label="Toggle menu"
          >
            {isDrawerOpen ? (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Desktop navigation links - hidden on small screens */}
        <div className="hidden md:flex items-center gap-4">
          <Link href="/pricing" className={`text-sm font-medium transition ${linkClasses[theme]}`}>Pricing</Link>
          <Link href="/demo" className={`text-sm font-medium transition ${linkClasses[theme]}`}>Book Demo</Link>
          <Link href="/login" className={`text-sm font-medium transition ${linkClasses[theme]}`}>Sign In</Link>
          <Link href="/signup" className="text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-lg transition">Start Free Trial</Link>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-[999]">
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => setIsDrawerOpen(false)}
          ></div>
          {/* Drawer content */}
          <div className={`fixed top-0 right-0 w-64 h-full shadow-lg p-6 transform transition-transform ease-in-out duration-300 translate-x-0 ${drawerBgClasses[theme]}`}>
            <button
              onClick={() => setIsDrawerOpen(false)}
              className={`absolute top-4 right-4 focus:outline-none ${mobileButtonClasses[theme]}`}
              aria-label="Close menu"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="flex flex-col gap-4 mt-8">
              <Link href="/pricing" className={`text-lg font-medium transition ${drawerLinkClasses[theme]}`} onClick={() => setIsDrawerOpen(false)}>Pricing</Link>
              <Link href="/demo" className={`text-lg font-medium transition ${drawerLinkClasses[theme]}`} onClick={() => setIsDrawerOpen(false)}>Book Demo</Link>
              <Link href="/login" className={`text-lg font-medium transition ${drawerLinkClasses[theme]}`} onClick={() => setIsDrawerOpen(false)}>Sign In</Link>
              <Link href="/signup" className="text-lg font-semibold bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-lg transition text-center" onClick={() => setIsDrawerOpen(false)}>Start Free Trial</Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
