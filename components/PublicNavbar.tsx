'use client';

import Link from 'next/link';
import PradoLogo from '@/components/PradoLogo';
import { useState } from 'react';
import { getTranslations } from '@/lib/translations';
import WorkspaceSetupModal from '@/components/WorkspaceSetupModal';
import LiveDemoModal from '@/components/LiveDemoModal';
import { ArrowUpRight, Menu, X } from 'lucide-react';

interface PublicNavbarProps {
  theme?: 'dark' | 'light';
  locale?: string;
  onOpenTrial?: () => void;
  onOpenLiveDemo?: () => void;
}

export default function PublicNavbar({
  theme = 'light',
  locale = 'en',
  onOpenTrial,
  onOpenLiveDemo,
}: PublicNavbarProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isInternalModalOpen, setIsInternalModalOpen] = useState(false);
  const [isInternalDemoModalOpen, setIsInternalDemoModalOpen] = useState(false);
  const isEs = locale.toLowerCase().startsWith('es');
  const translations = getTranslations(locale);

  const isLight = theme === 'light';

  const handleOpenTrial = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDrawerOpen(false);
    if (onOpenTrial) {
      onOpenTrial();
    } else {
      setIsInternalModalOpen(true);
    }
  };

  const handleOpenLiveDemo = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setIsDrawerOpen(false);
    if (onOpenLiveDemo) {
      onOpenLiveDemo();
    } else {
      setIsInternalDemoModalOpen(true);
    }
  };

  return (
    <>
      <nav
        className={`sticky top-0 z-50 px-6 md:px-12 py-3.5 transition-colors border-b ${
          isLight
            ? 'bg-white/95 backdrop-blur-md border-[#eaecf0] text-[#101828]'
            : 'bg-slate-950/95 backdrop-blur-md border-slate-900 text-white'
        }`}
      >
        <div className="max-w-7xl mx-auto flex justify-between items-center h-12">
          {/* Logo brand */}
          <div className="flex items-center gap-3">
            <Link href={`/${locale}`} className="flex items-center gap-2 hover:opacity-95 transition cursor-pointer">
              <PradoLogo theme={theme} size="md" subtitle="JOB & FIELD OPERATIONS" />
            </Link>
          </div>

          {/* Desktop Center Navigation Links */}
          <div className="hidden md:flex items-center gap-8">
            <a
              href="#platform"
              className={`text-sm font-medium transition cursor-pointer ${
                isLight ? 'text-[#344054] hover:text-[#101828]' : 'text-slate-400 hover:text-white'
              }`}
            >
              {isEs ? 'Plataforma' : 'Platform'}
            </a>
            <a
              href="#industries"
              className={`text-sm font-medium transition cursor-pointer ${
                isLight ? 'text-[#344054] hover:text-[#101828]' : 'text-slate-400 hover:text-white'
              }`}
            >
              {isEs ? 'Industrias' : 'Industries'}
            </a>
            <a
              href="#pricing"
              className={`text-sm font-medium transition cursor-pointer ${
                isLight ? 'text-[#344054] hover:text-[#101828]' : 'text-slate-400 hover:text-white'
              }`}
            >
              {isEs ? 'Precios' : 'Pricing'}
            </a>
            <button
              type="button"
              onClick={handleOpenLiveDemo}
              className={`text-sm font-medium transition cursor-pointer ${
                isLight ? 'text-[#344054] hover:text-[#101828]' : 'text-slate-400 hover:text-white'
              }`}
            >
              {isEs ? 'Demo en Vivo' : 'Live Demo'}
            </button>
          </div>

          {/* Desktop Right Actions */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              href={`/${locale}/login`}
              className={`text-sm font-medium transition cursor-pointer ${
                isLight ? 'text-[#101828] hover:text-[#0a9d73]' : 'text-white hover:text-emerald-400'
              }`}
            >
              {isEs ? 'Iniciar Sesión' : 'Sign In'}
            </Link>
            <button
              type="button"
              onClick={handleOpenTrial}
              className="inline-flex items-center gap-2 text-sm font-semibold bg-[#0a9d73] hover:bg-[#088763] text-white px-5 py-2.5 rounded-xl transition-all shadow-sm hover:shadow-md cursor-pointer"
            >
              <span>{isEs ? 'Prueba Gratis de 30 Días' : '30-day Free Trial'}</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile menu trigger */}
          <div className="md:hidden flex items-center">
            <button
              type="button"
              onClick={() => setIsDrawerOpen(!isDrawerOpen)}
              className={`p-2 rounded-lg transition cursor-pointer ${
                isLight ? 'text-[#344054] hover:bg-slate-100' : 'text-slate-300 hover:bg-slate-900'
              }`}
              aria-label="Toggle menu"
            >
              {isDrawerOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      {isDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-[999] flex justify-end">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsDrawerOpen(false)}
          />

          <div
            className={`fixed top-0 right-0 w-80 h-full p-6 flex flex-col justify-between z-[1000] shadow-2xl transition-transform ${
              isLight ? 'bg-white border-l border-[#eaecf0]' : 'bg-slate-900 border-l border-slate-800 text-white'
            }`}
          >
            <div>
              <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-100">
                <PradoLogo theme={theme} size="sm" subtitle="JOB & FIELD OPERATIONS" />
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-col gap-3">
                <a
                  href="#platform"
                  onClick={() => setIsDrawerOpen(false)}
                  className="px-3 py-2 text-base font-medium rounded-lg text-[#344054] hover:bg-slate-50"
                >
                  {isEs ? 'Plataforma' : 'Platform'}
                </a>
                <a
                  href="#industries"
                  onClick={() => setIsDrawerOpen(false)}
                  className="px-3 py-2 text-base font-medium rounded-lg text-[#344054] hover:bg-slate-50"
                >
                  {isEs ? 'Industrias' : 'Industries'}
                </a>
                <a
                  href="#pricing"
                  onClick={() => setIsDrawerOpen(false)}
                  className="px-3 py-2 text-base font-medium rounded-lg text-[#344054] hover:bg-slate-50"
                >
                  {isEs ? 'Precios' : 'Pricing'}
                </a>
                <button
                  type="button"
                  onClick={handleOpenLiveDemo}
                  className="px-3 py-2 text-base font-medium rounded-lg text-left text-[#344054] hover:bg-slate-50 cursor-pointer"
                >
                  {isEs ? 'Demo en Vivo' : 'Live Demo'}
                </button>
                <Link
                  href={`/${locale}/login`}
                  onClick={() => setIsDrawerOpen(false)}
                  className="px-3 py-2 text-base font-medium rounded-lg text-[#101828] hover:bg-slate-50"
                >
                  {isEs ? 'Iniciar Sesión' : 'Sign In'}
                </Link>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100">
              <button
                type="button"
                onClick={handleOpenTrial}
                className="w-full inline-flex items-center justify-center gap-2 text-sm font-semibold bg-[#0a9d73] hover:bg-[#088763] text-white px-4 py-3 rounded-xl transition shadow-md cursor-pointer"
              >
                <span>{isEs ? 'Prueba Gratis de 30 Días' : '30-day Free Trial'}</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {!onOpenTrial && (
        <WorkspaceSetupModal
          isOpen={isInternalModalOpen}
          onClose={() => setIsInternalModalOpen(false)}
          locale={locale}
        />
      )}

      {!onOpenLiveDemo && (
        <LiveDemoModal
          isOpen={isInternalDemoModalOpen}
          onClose={() => setIsInternalDemoModalOpen(false)}
          locale={locale}
        />
      )}
    </>
  );
}