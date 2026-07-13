'use client';

import Link from 'next/link';
import { useState } from 'react';

interface PublicNavbarProps {
  theme?: 'dark' | 'light';
}

export default function PublicNavbar({ theme = 'dark' }: PublicNavbarProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const navClasses = {
    dark: 'border-slate-900 bg-slate-950 text-white',
    light: 'border-gray-200 bg-white text-slate-900',
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
    dark: 'text-slate-400 hover:text-white',
    light: 'text-slate-500 hover:text-slate-900',
  };
  
  const drawerBgClasses = {
    dark: 'bg-slate-900 border-l border-slate-800 text-white',
    light: 'bg-white border-l border-gray-200 text-slate-900',
  };

  const drawerLinkClasses = {
    dark: 'text-slate-200 hover:text-emerald-400',
    light: 'text-slate-800 hover:text-emerald-600',
  };

  return (
    <>
      <nav className={`sticky top-0 z-50 px-6 py-4 border-b ${navClasses[theme]}`}>
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Link href="/" className={`text-xl font-bold tracking-tight flex items-center gap-2 ${logoTextClasses[theme]}`}>
            <span className="h-6 w-6 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white">
                <path d="M12 3c.12 4.96-3.03 9.04-7.96 9.17C8.96 12.29 12 16.31 12 21c0-4.69 3.04-8.71 7.96-8.83C15.03 12.04 11.88 7.96 12 3z" />
              </svg>
            </span>
            Prado
          </Link>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsDrawerOpen(!isDrawerOpen)}
              className={`focus:outline-none p-1 rounded-md transition cursor-pointer ${mobileButtonClasses[theme]}`}
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

          {/* Desktop navigation links */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/pricing" className={`text-sm font-medium transition ${linkClasses[theme]}`}>Pricing</Link>
            <Link href="/demo" className={`text-sm font-medium transition ${linkClasses[theme]}`}>Live Demo</Link>
            <Link href="/login" className={`text-sm font-medium transition ${linkClasses[theme]}`}>Sign In</Link>
            <Link href="/signup" className="text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-lg transition">Start Free Trial</Link>
          </div>
        </div>
      </nav>

      {/* MOBILE DRAWER SYSTEM LAYER */}
      {isDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-[999] flex justify-end">
          
          {/* Overlay Darkener Background */}
          <div
            className="fixed inset-0 bg-black bg-opacity-60"
            onClick={() => setIsDrawerOpen(false)}
          />
          
          {/* Main Mobile Sidebar Drawer Content container */}
          <div className={`fixed top-0 right-0 w-72 h-screen max-h-screen p-6 flex flex-col justify-between z-[1000] ${drawerBgClasses[theme]}`}>
            <div>
              {/* Header Row: Replaced text string layout with authentic brand mark components */}
              <div className="flex justify-between items-center mb-10">
                <Link 
                  href="/" 
                  className={`text-xl font-bold tracking-tight flex items-center gap-2 ${logoTextClasses[theme]}`}
                  onClick={() => setIsDrawerOpen(false)}
                >
                  <span className="h-6 w-6 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white">
                      <path d="M12 3c.12 4.96-3.03 9.04-7.96 9.17C8.96 12.29 12 16.31 12 21c0-4.69 3.04-8.71 7.96-8.83C15.03 12.04 11.88 7.96 12 3z" />
                    </svg>
                  </span>
                  Prado
                </Link>

                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className={`p-1 focus:outline-none transition cursor-pointer ${mobileButtonClasses[theme]}`}
                  aria-label="Close menu"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="flex flex-col gap-6">
                <Link href="/pricing" className={`text-lg font-medium transition ${drawerLinkClasses[theme]}`} onClick={() => setIsDrawerOpen(false)}>
                  Pricing
                </Link>
                <Link href="/demo" className={`text-lg font-medium transition ${drawerLinkClasses[theme]}`} onClick={() => setIsDrawerOpen(false)}>
                  Live Demo
                </Link>
                <Link href="/login" className={`text-lg font-medium transition ${drawerLinkClasses[theme]}`} onClick={() => setIsDrawerOpen(false)}>
                  Sign In
                </Link>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-700/20">
              <Link 
                href="/signup" 
                className="block w-full text-center text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-3 rounded-lg transition"
                onClick={() => setIsDrawerOpen(false)}
              >
                Start Free Trial
              </Link>
            </div>
          </div>

        </div>
      )}
    </>
  );
}