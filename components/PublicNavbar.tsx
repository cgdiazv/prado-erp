'use client';

import Link from 'next/link';
import PradoLogo from '@/components/PradoLogo';
import { useState } from 'react';
import { getTranslations } from '@/lib/translations';
import WorkspaceSetupModal from '@/components/WorkspaceSetupModal';

interface PublicNavbarProps {
  theme?: 'dark' | 'light';
  locale?: string;
}

export default function PublicNavbar({ theme = 'dark', locale = 'en' }: PublicNavbarProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const translations = getTranslations(locale);

  const navClasses = {
    dark: 'border-slate-900 bg-slate-950 text-white',
    light: 'border-gray-200 bg-white text-slate-900',
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

  const openTrialModal = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDrawerOpen(false);
    setIsModalOpen(true);
  };

  return (
    <>
      <nav className={`sticky top-0 z-50 px-6 py-4 border-b ${navClasses[theme]}`}>
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Link href="/" className="hover:opacity-95 transition">
            <PradoLogo theme={theme} iconType="layers" subtitle="Job & Field Operations" />
          </Link>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsDrawerOpen(!isDrawerOpen)}
              className={`focus:outline-none p-1 rounded-md transition cursor-pointer ${mobileButtonClasses[theme]}`}
              aria-label={translations.nav.menuAriaLabel}
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
            <Link href="/pricing" className={`text-sm font-medium transition ${linkClasses[theme]}`}>{translations.nav.pricing}</Link>
            <Link href="/demo" className={`text-sm font-medium transition ${linkClasses[theme]}`}>{translations.nav.liveDemo}</Link>
            <Link href="/login" className={`text-sm font-medium transition ${linkClasses[theme]}`}>{translations.nav.signIn}</Link>
            <button 
              onClick={openTrialModal} 
              className="text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-lg transition shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              {translations.nav.startFreeTrial}
            </button>
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
              <div className="flex justify-between items-center mb-10">
                <Link 
                  href="/" 
                  className="hover:opacity-95 transition"
                  onClick={() => setIsDrawerOpen(false)}
                >
                  <PradoLogo theme={theme} iconType="layers" subtitle="Job & Field Operations" />
                </Link>

                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className={`p-1 focus:outline-none transition cursor-pointer ${mobileButtonClasses[theme]}`}
                  aria-label={translations.nav.closeMenuAriaLabel}
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="flex flex-col gap-2">
                <Link href="/pricing" className={`rounded-lg px-3 py-2 text-lg font-medium transition ${drawerLinkClasses[theme]}`} onClick={() => setIsDrawerOpen(false)}>
                  {translations.nav.pricing}
                </Link>
                <Link href="/demo" className={`rounded-lg px-3 py-2 text-lg font-medium transition ${drawerLinkClasses[theme]}`} onClick={() => setIsDrawerOpen(false)}>
                  {translations.nav.liveDemo}
                </Link>
                <Link href="/login" className={`rounded-lg px-3 py-2 text-lg font-medium transition ${drawerLinkClasses[theme]}`} onClick={() => setIsDrawerOpen(false)}>
                  {translations.nav.signIn}
                </Link>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-700/20">
              <button 
                onClick={openTrialModal} 
                className="w-full text-center text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-3 rounded-lg transition shadow-md cursor-pointer"
              >
                {translations.nav.startFreeTrial}
              </button>
            </div>
          </div>

        </div>
      )}

      <WorkspaceSetupModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        locale={locale}
      />
    </>
  );
}